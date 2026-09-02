import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// refreshLeaderboard is the most expensive recurring operation in the process:
// a findMany over every User plus TWO whole-table groupBys, one of them an
// unfiltered aggregate over the entire QuestionAttempt table, followed by a
// deleteMany + createMany rewrite of LeaderboardEntry.
//
// It is fired from a 45s interval AND from kickRefresh() on every stale
// observation in /leaderboard/me (polled at up to 60/min/user), /leaderboard and
// /paginated. With no guard, the moment the snapshot fell behind, N concurrent
// stale requests each launched a full rebuild — N whole-table groupBys and N
// transactions contending on the same rows. Load amplified instead of
// recovering.
//
// Follows the codebase's established pattern of spying on the shared Prisma
// singleton rather than mocking the module (see reviewServiceBulkRetry.test.js).
const prisma = require('../src/config/db');
const { refreshLeaderboard } = require('../src/services/leaderboardService');

let resolveGroupBy;
let attemptGroupByCalls;

beforeEach(() => {
    attemptGroupByCalls = 0;

    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.activityLog, 'groupBy').mockResolvedValue([]);
    // Held open so a second caller arrives while the first is still running.
    vi.spyOn(prisma.questionAttempt, 'groupBy').mockImplementation(() => {
        attemptGroupByCalls += 1;
        return new Promise((resolve) => { resolveGroupBy = () => resolve([]); });
    });
    vi.spyOn(prisma, '$transaction').mockResolvedValue([]);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('refreshLeaderboard single-flight', () => {
    it('collapses concurrent callers onto ONE rebuild', async () => {
        const a = refreshLeaderboard();
        const b = refreshLeaderboard();
        const c = refreshLeaderboard();

        // The expensive aggregate must have been issued exactly once, not once
        // per caller.
        expect(attemptGroupByCalls).toBe(1);

        resolveGroupBy();
        const results = await Promise.all([a, b, c]);

        // All three callers observe the same result.
        expect(results[0]).toBe(results[1]);
        expect(results[1]).toBe(results[2]);
    });

    it('allows a NEW rebuild once the in-flight one settles', async () => {
        const first = refreshLeaderboard();
        resolveGroupBy();
        await first;
        expect(attemptGroupByCalls).toBe(1);

        const second = refreshLeaderboard();
        expect(attemptGroupByCalls).toBe(2);
        resolveGroupBy();
        await second;
    });

    it('releases the guard even when the rebuild throws', async () => {
        prisma.questionAttempt.groupBy.mockRejectedValueOnce(new Error('db down'));

        // refreshLeaderboard swallows the failure and returns null by design —
        // the routes fall back to live queries — but it must not leave the
        // single-flight slot occupied, or every later refresh would be skipped
        // for the life of the process.
        await expect(refreshLeaderboard()).resolves.toBeNull();

        const next = refreshLeaderboard();
        resolveGroupBy();
        await next;
        // A fresh attempt actually ran rather than joining a dead promise.
        expect(attemptGroupByCalls).toBeGreaterThanOrEqual(1);
    });
});
