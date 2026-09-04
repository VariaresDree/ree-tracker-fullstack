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
    seedDashboardPayload, takeDashboardSeed, invalidateDashboardSeed, __SEED_MAX_AGE_MS,
} = await import('./dashboardSeed');

const payload = { profile: { totalAnswered: 20, role: 'USER' }, microTopics: {} };

beforeEach(() => invalidateDashboardSeed());
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('guard 1 — uid match', () => {
    it('hands the payload to the account it was fetched for', () => {
        seedDashboardPayload('u1', payload);
        expect(takeDashboardSeed('u1')).toEqual(payload);
    });

    it('never hands one account the numbers fetched for another', () => {
        seedDashboardPayload('u1', payload);
        expect(takeDashboardSeed('u2')).toBeNull();
        // and the rightful owner is not robbed by the mismatched attempt
        expect(takeDashboardSeed('u1')).toEqual(payload);
    });
});

describe('guard 2 — single use', () => {
    it('gives the payload away exactly once', () => {
        seedDashboardPayload('u1', payload);
        expect(takeDashboardSeed('u1')).toEqual(payload);
        expect(takeDashboardSeed('u1')).toBeNull();
        expect(takeDashboardSeed('u1')).toBeNull();
    });
});

describe('guard 3 — age bound', () => {
    it('serves a payload inside the window', () => {
        vi.useFakeTimers();
        seedDashboardPayload('u1', payload);
        vi.advanceTimersByTime(__SEED_MAX_AGE_MS - 1);
        expect(takeDashboardSeed('u1')).toEqual(payload);
    });

    it('refuses one past the window', () => {
        vi.useFakeTimers();
        seedDashboardPayload('u1', payload);
        vi.advanceTimersByTime(__SEED_MAX_AGE_MS + 1);
        expect(takeDashboardSeed('u1')).toBeNull();
    });

    it('clears an expired entry rather than re-testing it forever', () => {
        vi.useFakeTimers();
        seedDashboardPayload('u1', payload);
        vi.advanceTimersByTime(__SEED_MAX_AGE_MS + 1);
        takeDashboardSeed('u1');

        // If the expired entry had been left in place, moving the clock back
        // would resurrect it. It must be gone, not merely rejected.
        vi.setSystemTime(Date.now() - __SEED_MAX_AGE_MS);
        expect(takeDashboardSeed('u1')).toBeNull();
    });
});

describe('guard 4 — any mutation drops it', () => {
    it('is cleared by invalidate', () => {
        seedDashboardPayload('u1', payload);
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

        seedDashboardPayload('u1', payload);
        await apiRequest('/api/analytics/dashboard/u1', 'GET');
        expect(takeDashboardSeed('u1')).toEqual(payload);   // reads are harmless

        seedDashboardPayload('u1', payload);
        await apiRequest('/api/analytics/telemetry-bulk', 'POST', { attempts: [] });
        expect(takeDashboardSeed('u1')).toBeNull();          // a write invalidates
    });
});

describe('a failed fetch cannot seed', () => {
    it('ignores null and undefined payloads', () => {
        seedDashboardPayload('u1', null);
        expect(takeDashboardSeed('u1')).toBeNull();
        seedDashboardPayload('u1', undefined);
        expect(takeDashboardSeed('u1')).toBeNull();
    });

    it('ignores a missing uid', () => {
        seedDashboardPayload(null, payload);
        expect(takeDashboardSeed('u1')).toBeNull();
    });
});
