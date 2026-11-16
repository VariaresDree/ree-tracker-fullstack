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

describe('fetchVaultQuestions with several topics (2026-11-16)', () => {
    it('online, sends each topic as ?topics=', async () => {
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        await fetchVaultQuestions('Mathematics', 'All', 20, 'random', { topics: ['Algebra', 'Complex Numbers'] });
        const url = new URL(String(fetchSpy.mock.calls[0][0]), 'http://x');
        expect(url.searchParams.getAll('topics')).toEqual(['Algebra', 'Complex Numbers']);
        expect(url.searchParams.get('subtopic')).toBe('All');
    });

    it('offline, draws from just those topics of the pack', async () => {
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
        const out = await fetchVaultQuestions('EE', 'All', 1000, 'random', { topics: ['Topic 1', 'Topic 4'] });
        expect(out).toHaveLength(60);
        expect(new Set(out.map((q) => q.subtopic))).toEqual(new Set(['Topic 1', 'Topic 4']));
    });
});
