import { describe, it, expect, vi, afterEach } from 'vitest';

// Offline, a session's questions come from the pack on the device. The pack
// keeps its order, so asking for a few used to return the same first few every
// session; now that sessions ask for a pool sized to them (poolLimit), the
// offline answer is sampled from the whole slice, across topics, as the
// server's is.

vi.mock('../config/firebaseDb', () => ({
    auth: { currentUser: { uid: 'u1', getIdToken: vi.fn(async () => 'tok') } },
}));
vi.mock('idb-keyval', () => ({ get: vi.fn(async () => null), set: vi.fn(async () => {}) }));

const PACK = Array.from({ length: 300 }, (_, i) => ({ id: `q${i}`, subject: 'EE', subtopic: `Topic ${Math.floor(i / 30)}`, text: 'x', options: ['a', 'b'], answer: 'a' }));
const getOfflineQuestions = vi.fn(async () => PACK);
vi.mock('./offlinePack', () => ({
    getOfflineQuestions: (...a) => getOfflineQuestions(...a), writeOfflinePack: vi.fn(), getOfflinePackMeta: vi.fn(),
    getOfflinePack: vi.fn(), OFFLINE_SUBJECTS: [], getPackSize: vi.fn(), packSizeOf: vi.fn(),
    getReferenceCardsCache: vi.fn(), writeReferenceCardsCache: vi.fn(),
}));

const { fetchVaultQuestions } = await import('./dbQueries');

afterEach(() => vi.restoreAllMocks());

describe('fetchVaultQuestions offline', () => {
    it('samples the asked number from the whole pack slice, across its topics', async () => {
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
        const out = await fetchVaultQuestions('EE', 'All', 20);
        expect(getOfflineQuestions).toHaveBeenCalledWith('EE', 'All', Infinity);
        expect(out).toHaveLength(20);
        // Ten topics of thirty in pack order: the first 20 were all "Topic 0".
        expect(new Set(out.map((q) => q.subtopic)).size).toBe(10);
    });

    it('gives the whole slice when it is smaller than what was asked', async () => {
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
        expect(await fetchVaultQuestions('EE', 'All', 1000)).toHaveLength(300);
    });
});
