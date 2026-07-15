import { describe, it, expect } from 'vitest';
const { buildEntries, isStale, ACTIVE_WINDOW_MS, STALE_AFTER_MS } = require('../src/services/leaderboardService');
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

describe('leaderboardService.buildEntries', () => {
    it('ranks active users by theta desc with 1-based contiguous ranks', () => {
        const entries = buildEntries([mkUser('a', 0.5), mkUser('b', 2.1), mkUser('c', -0.3)], {}, NOW);
        expect(entries.map((e) => [e.rank, e.userId])).toEqual([[1, 'b'], [2, 'a'], [3, 'c']]);
        expect(entries.every((e) => e.snapshotAt === NOW)).toBe(true);
    });

    it('applies the same 30-day active window as the legacy live query', () => {
        const entries = buildEntries([
            mkUser('fresh', 1.0, 29),
            mkUser('stale', 3.0, 31),   // higher theta but inactive → excluded
        ], {}, NOW);
        expect(entries.map((e) => e.userId)).toEqual(['fresh']);
        expect(ACTIVE_WINDOW_MS).toBe(30 * 24 * 60 * 60 * 1000);
    });

    it('breaks theta ties deterministically (lastActive desc, then id) — ranks don\'t shuffle between refreshes', () => {
        const users = [mkUser('b', 1.0, 5), mkUser('a', 1.0, 5), mkUser('c', 1.0, 2)];
        const first = buildEntries(users, {}, NOW).map((e) => e.userId);
        const second = buildEntries([...users].reverse(), {}, NOW).map((e) => e.userId);
        expect(first).toEqual(second);
        expect(first[0]).toBe('c'); // most recently active tie-winner
    });

    it('fills defensive defaults for sparse rows', () => {
        const [e] = buildEntries([{ id: 'x', lastActive: daysAgo(1) }], {}, NOW);
        expect(e).toMatchObject({ thetaRating: 0, eloRating: 1200, tier: 'BRONZE', globalStreak: 0, role: 'USER', displayName: null });
    });

    it('merges the pre-aggregated per-user stats (active days / answered / accuracy)', () => {
        const activeDays = new Map([['a', 12]]);
        const attempts = new Map([['a', { total: 40, correct: 30 }]]);
        const [e] = buildEntries([mkUser('a', 1.0)], { activeDays, attempts }, NOW);
        expect(e).toMatchObject({ activeDays: 12, questionsAnswered: 40 });
        expect(e.accuracy).toBeCloseTo(0.75, 5);
    });

    it('defaults the 3 stats to 0 when a user has no aggregates', () => {
        const [e] = buildEntries([mkUser('z', 1.0)], {}, NOW);
        expect(e).toMatchObject({ activeDays: 0, questionsAnswered: 0, accuracy: 0 });
    });
});

describe('leaderboardService.isStale', () => {
    it('missing snapshot is stale; fresh one is not; old one is', () => {
        const now = NOW.getTime();
        expect(isStale(null, now)).toBe(true);
        expect(isStale(new Date(now - 45_000), now)).toBe(false);
        expect(isStale(new Date(now - STALE_AFTER_MS - 1), now)).toBe(true);
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
