import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// One read of the live formula-card deck serves every screen for ten minutes
// (fetchReferenceCards). Library's tabs remounted on each switch and read the
// whole deck again, and the missed-question links kept a second copy of their own.

vi.mock('../config/firebaseDb', () => ({
    auth: { currentUser: { uid: 'u1', getIdToken: vi.fn(async () => 'tok') } },
}));
vi.mock('idb-keyval', () => ({ get: vi.fn(async () => null), set: vi.fn(async () => {}) }));
const DEVICE = [{ id: 'saved', name: 'Saved on this device' }];
const writeReferenceCardsCache = vi.fn(async () => {});
vi.mock('./offlinePack', () => ({
    getOfflineQuestions: vi.fn(), writeOfflinePack: vi.fn(), getOfflinePackMeta: vi.fn(),
    getOfflinePack: vi.fn(), OFFLINE_SUBJECTS: [], getPackSize: vi.fn(), packSizeOf: vi.fn(),
    getReferenceCardsCache: vi.fn(async () => ({ items: DEVICE })),
    writeReferenceCardsCache: (...a) => writeReferenceCardsCache(...a),
}));

const { fetchReferenceCards, forgetReferenceCards, deleteReferenceCard } = await import('./dbQueries');

const DECK = [{ id: 'c1', name: 'Ohm' }];
const ok = (body) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => body });
let fetchSpy;
const cardReads = () => fetchSpy.mock.calls.filter(([url, opts]) => String(url).endsWith('/api/reference-cards') && opts.method === 'GET').length;

beforeEach(() => {
    forgetReferenceCards();
    writeReferenceCardsCache.mockClear();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ok({ items: DECK }));
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('fetchReferenceCards', () => {
    it('shares one request between overlapping callers, and keeps it', async () => {
        const [a, b] = await Promise.all([fetchReferenceCards(), fetchReferenceCards()]);
        expect(a).toEqual(DECK);
        expect(b).toBe(a);
        await fetchReferenceCards();
        expect(cardReads()).toBe(1);
        expect(writeReferenceCardsCache).toHaveBeenCalledTimes(1);
    });

    it('reads again after ten minutes, or when asked fresh', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        await fetchReferenceCards();
        await fetchReferenceCards({ fresh: true });
        expect(cardReads()).toBe(2);
        vi.setSystemTime(Date.now() + 10 * 60 * 1000 + 1);
        await fetchReferenceCards();
        expect(cardReads()).toBe(3);
    });

    it('a card write drops the kept read', async () => {
        await fetchReferenceCards();
        await deleteReferenceCard('c1');
        await fetchReferenceCards();
        expect(cardReads()).toBe(2);
    });

    it('offline, the device copy answers and nothing is kept, so back online reads the server', async () => {
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
        expect(await fetchReferenceCards()).toEqual(DEVICE);
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
        expect(await fetchReferenceCards()).toEqual(DECK);
        expect(cardReads()).toBe(1);
    });

    it('a failed read is not kept', async () => {
        fetchSpy.mockImplementationOnce(async () => ({ ok: false, status: 500, headers: { get: () => null }, json: async () => ({ error: 'boom' }) }));
        await expect(fetchReferenceCards()).rejects.toThrow('boom');
        expect(await fetchReferenceCards()).toEqual(DECK);
        expect(cardReads()).toBe(2);
    });
});
