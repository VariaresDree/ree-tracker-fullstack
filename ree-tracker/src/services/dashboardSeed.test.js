import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The seed exists to delete ONE request — the duplicate
// GET /api/analytics/dashboard/:uid that AuthContext and Dashboard each fire at
// boot, a second apart. The risk it introduces is showing numbers that are one
// write out of date, which is the exact bug the server's dashboardCache
// invalidation was extracted to fix. So each of the four guards gets a test
// that fails if the guard is removed; a green suite here is what makes the
// optimisation safe rather than merely fast.

vi.mock('../config/firebaseDb', () => ({
    auth: { currentUser: { uid: 'u1', getIdToken: vi.fn(async () => 'tok') } },
}));
vi.mock('idb-keyval', () => ({ get: vi.fn(async () => null), set: vi.fn(async () => {}) }));
vi.mock('./offlinePack', () => ({
    getOfflineQuestions: vi.fn(), writeOfflinePack: vi.fn(), getOfflinePackMeta: vi.fn(),
    getOfflinePack: vi.fn(), OFFLINE_SUBJECTS: [], getReferenceCardsCache: vi.fn(),
    writeReferenceCardsCache: vi.fn(),
}));

const {
    seedDashboardRequest, takeDashboardSeed, invalidateDashboardSeed, __SEED_MAX_AGE_MS,
} = await import('./dashboardSeed');

const payload = { profile: { totalAnswered: 20, role: 'USER' }, microTopics: {} };

// The slot holds a REQUEST, so every fixture is a promise. `settled` stands for
// "AuthContext's response already arrived"; `pending` for "still in flight",
// which is the case the first version of this module got wrong in production.
const settled = (v = payload) => Promise.resolve(v);
const pending = () => { let r; const p = new Promise((res) => { r = res; }); p.resolveWith = r; return p; };

beforeEach(() => invalidateDashboardSeed());
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('guard 1 — uid match', () => {
    it('hands the payload to the account it was fetched for', async () => {
        seedDashboardRequest('u1', settled());
        await expect(takeDashboardSeed('u1')).resolves.toEqual(payload);
    });

    it('never hands one account the numbers fetched for another', async () => {
        seedDashboardRequest('u1', settled());
        expect(takeDashboardSeed('u2')).toBeNull();
        // and the rightful owner is not robbed by the mismatched attempt
        await expect(takeDashboardSeed('u1')).resolves.toEqual(payload);
    });
});

describe('guard 2 — single use', () => {
    it('gives the payload away exactly once', async () => {
        seedDashboardRequest('u1', settled());
        await expect(takeDashboardSeed('u1')).resolves.toEqual(payload);
        expect(takeDashboardSeed('u1')).toBeNull();
        expect(takeDashboardSeed('u1')).toBeNull();
    });
});

describe('guard 3 — age bound', () => {
    it('serves a payload inside the window', async () => {
        vi.useFakeTimers();
        seedDashboardRequest('u1', settled());
        vi.advanceTimersByTime(__SEED_MAX_AGE_MS - 1);
        await expect(takeDashboardSeed('u1')).resolves.toEqual(payload);
    });

    it('refuses one past the window', async () => {
        vi.useFakeTimers();
        seedDashboardRequest('u1', settled());
        vi.advanceTimersByTime(__SEED_MAX_AGE_MS + 1);
        expect(takeDashboardSeed('u1')).toBeNull();
    });

    it('clears an expired entry rather than re-testing it forever', async () => {
        vi.useFakeTimers();
        seedDashboardRequest('u1', settled());
        vi.advanceTimersByTime(__SEED_MAX_AGE_MS + 1);
        takeDashboardSeed('u1');

        // If the expired entry had been left in place, moving the clock back
        // would resurrect it. It must be gone, not merely rejected.
        vi.setSystemTime(Date.now() - __SEED_MAX_AGE_MS);
        expect(takeDashboardSeed('u1')).toBeNull();
    });
});

describe('the offer is made at request time, not response time', () => {
    // Production caught this and the old tests did not: they only ever seeded
    // an already-settled payload, so the race was invisible. Here the request
    // has NOT come back when the reader arrives — the real ordering, since
    // AuthContext's fetch took 1740ms while Dashboard mounted at 1567ms.
    it('hands over a request that has not resolved yet', async () => {
        const inFlight = pending();
        seedDashboardRequest('u1', inFlight);

        const taken = takeDashboardSeed('u1');
        expect(taken).not.toBeNull();          // the old version returned null here

        inFlight.resolveWith(payload);
        await expect(taken).resolves.toEqual(payload);
    });

    it('lets the reader see a rejection so it can fall back', async () => {
        seedDashboardRequest('u1', Promise.reject(new Error('boom')));
        await expect(takeDashboardSeed('u1')).rejects.toThrow('boom');
    });

    it('rejects non-promise offers rather than storing them', () => {
        seedDashboardRequest('u1', payload);   // a payload, not a request
        expect(takeDashboardSeed('u1')).toBeNull();
    });
});

describe('guard 4 — any mutation drops it', () => {
    it('is cleared by invalidate', async () => {
        seedDashboardRequest('u1', settled());
        invalidateDashboardSeed();
        expect(takeDashboardSeed('u1')).toBeNull();
    });

    // The wiring, not just the function: this is the guard that makes the
    // whole design safe, and it lives on one line inside apiRequest.
    it('is cleared by a POST through apiRequest, but not by a GET', async () => {
        const { apiRequest } = await import('./dbQueries');
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: true, status: 200, json: async () => ({ data: {} }),
        })));

        seedDashboardRequest('u1', settled());
        await apiRequest('/api/analytics/dashboard/u1', 'GET');
        await expect(takeDashboardSeed('u1')).resolves.toEqual(payload);   // reads are harmless

        seedDashboardRequest('u1', settled());
        await apiRequest('/api/analytics/telemetry-bulk', 'POST', { attempts: [] });
        expect(takeDashboardSeed('u1')).toBeNull();          // a write invalidates
    });
});

describe('a failed fetch cannot seed', () => {
    it('ignores null and undefined payloads', async () => {
        seedDashboardRequest('u1', null);
        expect(takeDashboardSeed('u1')).toBeNull();
        seedDashboardRequest('u1', undefined);
        expect(takeDashboardSeed('u1')).toBeNull();
    });

    it('ignores a missing uid', async () => {
        seedDashboardRequest(null, settled());
        expect(takeDashboardSeed('u1')).toBeNull();
    });
});
