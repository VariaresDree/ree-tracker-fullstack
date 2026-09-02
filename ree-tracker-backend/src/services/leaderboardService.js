// src/services/leaderboardService.js
// Materialized leaderboard (Phase 4.1). The read endpoints used to sort/count
// the live User table on every request; now a snapshot table
// (LeaderboardEntry) is rebuilt on an interval and reads are a single indexed
// scan. Staleness is bounded by the refresh cadence (default 45s — inside the
// roadmap's <60s acceptable-delay bound).
//
// Integrity note (Phase 4 gate — "offline exclusion verified in aggregation"):
// the snapshot is built EXCLUSIVELY from User.thetaRating/eloRating, whose only
// writers are the server-side estimators in telemetryService.recordAttempts
// (server-graded; an offline attempt can never claim credit without a
// server-gradable userAnswer — see telemetryHelpers.mapAttemptRows) and the
// battle finalizer (server-keyed grading). No client-supplied score ever
// reaches this aggregation.
const prisma = require('../config/db');
const logger = require('../utils/logger');

// Same "active" window the legacy live queries used.
const ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// Snapshot older than this (interval died, first boot pre-refresh) → routes
// fall back to the legacy live query once and fire a refresh.
const STALE_AFTER_MS = 5 * 60 * 1000;

const USER_SELECT = {
    id: true,
    displayName: true,
    role: true,
    thetaRating: true,
    eloRating: true,
    tier: true,
    globalStreak: true,
    lastActive: true,
};

/**
 * Pure: rank the active users into snapshot rows.
 * Order: thetaRating desc, then lastActive desc, then id (stable determinism —
 * equal-theta users don't shuffle ranks between refreshes).
 *
 * `stats` carries the pre-aggregated per-user counters (built once from batched
 * groupBys in refreshLeaderboard — NOT per user, so no N+1):
 *   - activeDays: Map<userId, number>        (distinct Manila study days)
 *   - attempts:   Map<userId, {total,correct}> (questions answered + accuracy)
 */
function buildEntries(users, stats = {}, now = new Date()) {
    const cutoff = now.getTime() - ACTIVE_WINDOW_MS;
    const snapshotAt = now;
    const activeDays = stats.activeDays instanceof Map ? stats.activeDays : new Map();
    const attempts = stats.attempts instanceof Map ? stats.attempts : new Map();
    return (users || [])
        .filter((u) => u.lastActive && new Date(u.lastActive).getTime() >= cutoff)
        .sort((a, b) =>
            (b.thetaRating ?? 0) - (a.thetaRating ?? 0) ||
            new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime() ||
            String(a.id).localeCompare(String(b.id)),
        )
        .map((u, i) => {
            const at = attempts.get(u.id) || { total: 0, correct: 0 };
            return {
                rank: i + 1,
                userId: u.id,
                displayName: u.displayName ?? null,
                role: u.role ?? 'USER',
                thetaRating: u.thetaRating ?? 0,
                eloRating: u.eloRating ?? 1200,
                tier: u.tier ?? 'BRONZE',
                globalStreak: u.globalStreak ?? 0,
                activeDays: activeDays.get(u.id) ?? 0,
                questionsAnswered: at.total,
                accuracy: at.total > 0 ? at.correct / at.total : 0,
                lastActive: u.lastActive,
                snapshotAt,
            };
        });
}

/**
 * Rebuild the snapshot table. Never throws — a failed refresh logs and keeps
 * the previous snapshot (routes fall back to live queries once it goes stale).
 * Cost per refresh = 1 findMany + 2 whole-table groupBys (constant, not per-user).
 * @returns {Promise<number|null>} row count written, or null on failure
 */
// Single-flight guard. refreshLeaderboard is fired from the interval AND from
// kickRefresh() on every stale observation in /me, / and /paginated — with no
// guard, N concurrent stale requests launched N full rebuilds, each running two
// whole-table groupBys and each contending on the same LeaderboardEntry rows in
// its own transaction. The moment the snapshot fell behind, load amplified
// instead of recovering. Callers now share one in-flight rebuild.
let inFlightRefresh = null;

// Consecutive failures. Every failure used to be swallowed at warn level and
// return null, so a permanently-failing refresh was indistinguishable from a
// healthy one — the routes just quietly served the live fallback forever.
let consecutiveFailures = 0;

// Last time a request actually asked for leaderboard data. The interval rebuild
// used to run every 45 seconds forever whether or not anyone was looking, which
// on an idle instance is a repeating full scan of the entire attempt table.
let lastDemandAt = 0;
function noteLeaderboardDemand() {
    lastDemandAt = Date.now();
}

async function refreshLeaderboard() {
    // Join the in-flight rebuild rather than starting a second one.
    if (inFlightRefresh) return inFlightRefresh;
    inFlightRefresh = doRefresh().finally(() => { inFlightRefresh = null; });
    return inFlightRefresh;
}

async function doRefresh() {
    try {
        const [users, dayRows, attemptRows] = await Promise.all([
            prisma.user.findMany({ select: USER_SELECT }),
            prisma.activityLog.groupBy({ by: ['userId'], _count: { _all: true } }),
            prisma.questionAttempt.groupBy({ by: ['userId', 'isCorrect'], _count: { _all: true } }),
        ]);
        // active days = one ActivityLog row per Manila day → count of rows.
        const activeDays = new Map(dayRows.map((r) => [r.userId, r._count._all]));
        // questions answered + accuracy from the isCorrect split.
        const attempts = new Map();
        for (const r of attemptRows) {
            const cur = attempts.get(r.userId) || { total: 0, correct: 0 };
            cur.total += r._count._all;
            if (r.isCorrect) cur.correct += r._count._all;
            attempts.set(r.userId, cur);
        }
        const entries = buildEntries(users, { activeDays, attempts });
        await prisma.$transaction([
            prisma.leaderboardEntry.deleteMany({}),
            prisma.leaderboardEntry.createMany({ data: entries }),
        ]);
        consecutiveFailures = 0;
        return entries.length;
    } catch (err) {
        consecutiveFailures += 1;
        // Escalate once this stops looking like a blip. A silently-failing
        // refresh means every leaderboard request falls back to a live per-user
        // aggregate forever, which is both slower and invisible.
        const log = consecutiveFailures >= 3 ? logger.error : logger.warn;
        log.call(logger, 'leaderboard refresh failed — keeping previous snapshot', {
            error: err.message,
            consecutiveFailures,
        });
        return null;
    }
}

let refreshTimer = null;

/**
 * Boot hook: immediate refresh + steady interval. Called from server.js once
 * the DB is confirmed available; safe to call more than once (re-arms).
 */
function startLeaderboardRefresh(intervalMs = Number(process.env.LEADERBOARD_REFRESH_MS) || 45_000) {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshLeaderboard().then((n) => {
        if (n != null) logger.info('leaderboard snapshot built', { entries: n });
    });
    // Demand-gated: rebuild on the interval only if someone has asked for
    // leaderboard data within the last few cycles. An idle instance no longer
    // runs an unfiltered groupBy over the whole QuestionAttempt table every 45
    // seconds in perpetuity.
    const idleAfterMs = intervalMs * 4;
    refreshTimer = setInterval(() => {
        if (Date.now() - lastDemandAt > idleAfterMs) return;
        refreshLeaderboard();
    }, intervalMs);
    // Don't hold the process open for the timer (tests, graceful shutdown).
    if (typeof refreshTimer.unref === 'function') refreshTimer.unref();
    return refreshTimer;
}

/** True when the snapshot is missing or too old to trust. */
function isStale(snapshotAt, now = Date.now()) {
    if (!snapshotAt) return true;
    return now - new Date(snapshotAt).getTime() > STALE_AFTER_MS;
}

module.exports = {
    buildEntries,
    refreshLeaderboard,
    startLeaderboardRefresh,
    noteLeaderboardDemand,
    isStale,
    ACTIVE_WINDOW_MS,
    STALE_AFTER_MS,
};
