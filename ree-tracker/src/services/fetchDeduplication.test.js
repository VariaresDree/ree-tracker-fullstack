import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Pins the request COUNT on a dashboard load. A mobile Lighthouse trace showed
// /api/analytics/dashboard fetched three times, /api/readiness twice and
// /api/forecast twice on one page load — every response identical, so nothing
// looked wrong on screen. That is exactly why it needs a test: the output is
// correct either way, and only the network panel disagrees.
//
// Two independent causes, tested separately:
//   1. a TOS change re-ran the dashboard fetch effect (sequential duplicate)
//   2. two components calling useForecast raced each other (concurrent pair)

vi.mock('../services/dbQueries', () => ({
    apiRequest: vi.fn(),
    fetchForecast: vi.fn(),
    recomputeForecast: vi.fn(),
    safeApiRequest: vi.fn(),
}));

vi.mock('../store/useStore', () => {
    const state = { dynamicTOS: {}, stats: {}, setStats: vi.fn() };
    const store = { getState: () => state };
    return { useStore: store, default: store, __state: state };
});

const { apiRequest, fetchForecast } = await import('../services/dbQueries');
const {
    syncDashboardStats,
    renormalizeDashboardStats,
    __resetDashboardCache,
} = await import('./analyticsSync');
const { loadForecastOnce, __resetForecastInFlight } = await import('../hooks/useForecast');
const { seedDashboardRequest } = await import('./dashboardSeed');

const payload = { data: { profile: { totalAnswered: 20 }, microTopics: { Algebra: { attempts: 3 } } } };

beforeEach(() => {
    vi.clearAllMocks();
    __resetDashboardCache();
    __resetForecastInFlight();
});

afterEach(() => vi.restoreAllMocks());

describe('dashboard aggregate is fetched once per load', () => {
    it('re-normalizes on a TOS change instead of re-fetching', async () => {
        apiRequest.mockResolvedValue(payload);

        await syncDashboardStats('uid-1');
        expect(apiRequest).toHaveBeenCalledTimes(1);

        // This is what a TOS arrival now triggers. Before the fix it was a
        // full re-run of the fetch effect.
        const again = renormalizeDashboardStats();
        const third = renormalizeDashboardStats();

        expect(apiRequest).toHaveBeenCalledTimes(1);   // still ONE request
        expect(again).not.toBeNull();
        expect(third).not.toBeNull();
    });

    it('returns null from re-normalize before anything has been fetched', () => {
        expect(renormalizeDashboardStats()).toBeNull();
        expect(apiRequest).not.toHaveBeenCalled();     // never fetches on its own
    });

    it('still hits the network when the uid or sync tick genuinely changes', async () => {
        apiRequest.mockResolvedValue(payload);
        await syncDashboardStats('uid-1');
        await syncDashboardStats('uid-2');
        expect(apiRequest).toHaveBeenCalledTimes(2);
    });

    // The boot handoff: AuthContext fetched this endpoint for profile.role a
    // second earlier, so Dashboard's mount should not fetch it again.
    it('uses the seeded payload from AuthContext instead of a second request', async () => {
        apiRequest.mockResolvedValue(payload);

        seedDashboardRequest('uid-1', Promise.resolve(payload));
        const normalized = await syncDashboardStats('uid-1');

        expect(apiRequest).not.toHaveBeenCalled();   // the whole point
        expect(normalized).not.toBeNull();
        expect(normalized.profile.totalAnswered).toBe(20);

        // A seed answers once. Everything after it is a real refresh again.
        await syncDashboardStats('uid-1');
        expect(apiRequest).toHaveBeenCalledTimes(1);
    });

    it('re-normalizes a seeded payload too, when the TOS lands after it', async () => {
        seedDashboardRequest('uid-1', Promise.resolve(payload));
        await syncDashboardStats('uid-1');

        expect(renormalizeDashboardStats()).not.toBeNull();
        expect(apiRequest).not.toHaveBeenCalled();
    });

    it('does not cache a failed response', async () => {
        apiRequest.mockResolvedValueOnce(null);
        expect(await syncDashboardStats('uid-1')).toBeNull();
        expect(renormalizeDashboardStats()).toBeNull();
    });
});

describe('concurrent forecast requests are coalesced', () => {
    // Mirrors the real trace: PrescriptionPanel and TrajectoryCard mounting
    // together, their two GETs 0.6ms apart. Drives the SAME loader the hook
    // calls, so what is verified is what runs.
    it('two overlapping callers produce ONE request and share the result', async () => {
        let resolve;
        fetchForecast.mockReturnValue(new Promise((r) => { resolve = r; }));

        const a = loadForecastOnce();
        const b = loadForecastOnce();

        expect(fetchForecast).toHaveBeenCalledTimes(1);

        resolve({ snapshot: { passProbability: 0.8 } });
        const [ra, rb] = await Promise.all([a, b]);
        expect(ra).toBe(rb);
        expect(ra.snapshot.passProbability).toBe(0.8);
    });

    it('is coalescing, NOT caching — a later call fetches again', async () => {
        fetchForecast.mockResolvedValue({ snapshot: {} });

        await loadForecastOnce();
        expect(fetchForecast).toHaveBeenCalledTimes(1);

        // The first has settled, so this is a genuine new request, not a
        // duplicate. If this ever returns the old promise, refresh() and
        // recompute() would silently stop reaching the server.
        await loadForecastOnce();
        expect(fetchForecast).toHaveBeenCalledTimes(2);
    });

    it('releases the shared promise after a rejection', async () => {
        fetchForecast.mockRejectedValueOnce(new Error('boom'));
        await expect(loadForecastOnce()).rejects.toThrow('boom');

        // A failed request must not wedge every later caller onto the same
        // rejected promise.
        fetchForecast.mockResolvedValueOnce({ snapshot: { ok: true } });
        await expect(loadForecastOnce()).resolves.toEqual({ snapshot: { ok: true } });
        expect(fetchForecast).toHaveBeenCalledTimes(2);
    });
});
