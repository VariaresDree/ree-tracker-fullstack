import { describe, it, expect } from 'vitest';
const { buildEntries, isStale, ACTIVE_WINDOW_MS, STALE_AFTER_MS, RANK_MIN_ANSWERS } = require('../src/services/leaderboardService');
const { featureFlagSchema } = require('../src/schemas/configSchemas');

// Phase 4 gate: "leaderboard aggregated (not live-queried); offline exclusion
// verified in aggregation." buildEntries is the ONLY producer of the snapshot,
// and it consumes exclusively User.thetaRating/eloRating — fields whose sole
// writers are the server-graded paths (telemetryService.recordAttempts and the
// battle finalizer). No client-supplied score can reach this aggregation; the
// unverifiable-offline-credit rule is asserted in telemetryMapping.test.js.

const NOW = new Date('2026-07-10T12:00:00Z');
const daysAgo = (d) => new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000);

const mkUser = (id, theta, lastActiveDays = 1, extra = {}) => ({
    id, displayName: `User ${id}`, role: 'USER',
    thetaRating: theta, eloRating: 1200, tier: 'BRONZE', globalStreak: 3,
    lastActive: daysAgo(lastActiveDays),
    ...extra,
});

// Enough answers to be ranked, for every user given.
const answered = (users, total = RANK_MIN_ANSWERS) => ({
    attempts: new Map(users.map((u) => [u.id, { total, correct: Math.floor(total / 2) }])),
});
const rankAll = (users, now = NOW) => buildEntries(users, answered(users), now);

describe('leaderboardService.buildEntries', () => {
    it('ranks active users by theta desc with 1-based contiguous ranks', () => {
        const entries = rankAll([mkUser('a', 0.5), mkUser('b', 2.1), mkUser('c', -0.3)]);
        expect(entries.map((e) => [e.rank, e.userId])).toEqual([[1, 'b'], [2, 'a'], [3, 'c']]);
        expect(entries.every((e) => e.snapshotAt === NOW)).toBe(true);
    });

    // θ is centred on 0: a negative one is an estimate, not "no score"
    // (2026-11-26: 3,947 answers at θ −0.8 read "Not ranked yet").
    it('ranks a negative θ, below the positive ones', () => {
        const entries = rankAll([mkUser('low', -0.8), mkUser('high', 0.4)]);
        expect(entries.map((e) => [e.rank, e.userId, e.thetaRating])).toEqual([[1, 'high', 0.4], [2, 'low', -0.8]]);
    });

    it('ranks only learners with at least 20 answers; an account that never answered no longer sits above them', () => {
        const users = [mkUser('never', 0), mkUser('nineteen', 1.5), mkUser('twenty', -0.8)];
        const attempts = new Map([['nineteen', { total: 19, correct: 19 }], ['twenty', { total: 20, correct: 8 }]]);
        const entries = buildEntries(users, { attempts }, NOW);
        expect(RANK_MIN_ANSWERS).toBe(20);
        expect(entries.map((e) => [e.rank, e.userId])).toEqual([[1, 'twenty']]);
    });

    it('applies the same 30-day active window as the legacy live query', () => {
        const entries = rankAll([
            mkUser('fresh', 1.0, 29),
            mkUser('stale', 3.0, 31),   // higher theta but inactive → excluded
        ]);
        expect(entries.map((e) => e.userId)).toEqual(['fresh']);
        expect(ACTIVE_WINDOW_MS).toBe(30 * 24 * 60 * 60 * 1000);
    });

    it('breaks theta ties deterministically (lastActive desc, then id) — ranks don\'t shuffle between refreshes', () => {
        const users = [mkUser('b', 1.0, 5), mkUser('a', 1.0, 5), mkUser('c', 1.0, 2)];
        const first = rankAll(users).map((e) => e.userId);
        const second = rankAll([...users].reverse()).map((e) => e.userId);
        expect(first).toEqual(second);
        expect(first[0]).toBe('c'); // most recently active tie-winner
    });

    it('fills defensive defaults for sparse rows', () => {
        const [e] = rankAll([{ id: 'x', lastActive: daysAgo(1) }]);
        expect(e).toMatchObject({ thetaRating: 0, eloRating: 1200, tier: 'BRONZE', globalStreak: 0, role: 'USER', displayName: null });
    });

    it('merges the pre-aggregated per-user stats (active days / answered / accuracy)', () => {
        const activeDays = new Map([['a', 12]]);
        const attempts = new Map([['a', { total: 40, correct: 30 }]]);
        const [e] = buildEntries([mkUser('a', 1.0)], { activeDays, attempts }, NOW);
        expect(e).toMatchObject({ activeDays: 12, questionsAnswered: 40 });
        expect(e.accuracy).toBeCloseTo(0.75, 5);
    });

    it('leaves out a user with no aggregates: no answers, no rank', () => {
        expect(buildEntries([mkUser('z', 1.0)], {}, NOW)).toEqual([]);
    });

    it('defaults active days to 0 when a ranked user has no study-day aggregate', () => {
        const [e] = rankAll([mkUser('z', 1.0)]);
        expect(e).toMatchObject({ activeDays: 0, questionsAnswered: 20, accuracy: 0.5 });
    });

    // The stored streak is only rewritten when answers are recorded, so it
    // outlived missed days ("3 STREAK" on Rankings days after the run broke).
    // The snapshot stores it as it stands at refresh time, judged from each
    // user's last ActivityLog day — not lastActive, which an app open re-stamps.
    it('stores each streak as it stands on the snapshot\'s Manila day', () => {
        // NOW is 2026-07-10 20:00 in Manila. Every user was lastActive yesterday.
        const lastStudyDay = new Map([
            ['today', '2026-07-10'],
            ['yesterday', '2026-07-09'],
            ['broken', '2026-07-07'],
        ]);
        const users = ['today', 'yesterday', 'broken', 'never'].map((id) => mkUser(id, 1.0));
        const streaks = Object.fromEntries(
            buildEntries(users, { lastStudyDay, ...answered(users) }, NOW).map((e) => [e.userId, e.globalStreak]),
        );
        expect(streaks).toEqual({ today: 3, yesterday: 3, broken: 0, never: 0 });
    });
});

describe('leaderboardService.isStale', () => {
    it('missing snapshot is stale; fresh one is not; old one is', () => {
        const now = NOW.getTime();
        expect(isStale(null, now)).toBe(true);
        expect(isStale(new Date(now - 45_000), now)).toBe(false);
        expect(isStale(new Date(now - STALE_AFTER_MS - 1), now)).toBe(true);
    });

    it('a snapshot built before Manila midnight is stale after it, however new', () => {
        // Its streaks were judged on the day it was built. 16:00 UTC is midnight in Manila.
        const before = new Date('2026-07-10T15:59:30Z');
        expect(isStale(before, new Date('2026-07-10T15:59:50Z').getTime())).toBe(false);
        expect(isStale(before, new Date('2026-07-10T16:00:10Z').getTime())).toBe(true);
    });
});

describe('featureFlagSchema (PUT /api/config/flags/:key contract)', () => {
    it('accepts the minimal and full shapes', () => {
        expect(featureFlagSchema.safeParse({ enabled: true }).success).toBe(true);
        expect(featureFlagSchema.safeParse({ enabled: false, payload: { pct: 50 }, description: 'canary' }).success).toBe(true);
    });

    it('rejects a missing/non-boolean enabled', () => {
        expect(featureFlagSchema.safeParse({}).success).toBe(false);
        expect(featureFlagSchema.safeParse({ enabled: 'yes' }).success).toBe(false);
    });
});
