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
 */
function buildEntries(users, now = new Date()) {
    const cutoff = now.getTime() - ACTIVE_WINDOW_MS;
    const snapshotAt = now;
    return (users || [])
        .filter((u) => u.lastActive && new Date(u.lastActive).getTime() >= cutoff)
        .sort((a, b) =>
            (b.thetaRating ?? 0) - (a.thetaRating ?? 0) ||
            new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime() ||
            String(a.id).localeCompare(String(b.id)),
        )
        .map((u, i) => ({
            rank: i + 1,
            userId: u.id,
            displayName: u.displayName ?? null,
            role: u.role ?? 'USER',
            thetaRating: u.thetaRating ?? 0,
            eloRating: u.eloRating ?? 1200,
            tier: u.tier ?? 'BRONZE',
            globalStreak: u.globalStreak ?? 0,
            lastActive: u.lastActive,
            snapshotAt,
        }));
}

/**
 * Rebuild the snapshot table. Never throws — a failed refresh logs and keeps
 * the previous snapshot (routes fall back to live queries once it goes stale).
 * @returns {Promise<number|null>} row count written, or null on failure
 */
async function refreshLeaderboard() {
    try {
        const users = await prisma.user.findMany({ select: USER_SELECT });
        const entries = buildEntries(users);
        await prisma.$transaction([
            prisma.leaderboardEntry.deleteMany({}),
            prisma.leaderboardEntry.createMany({ data: entries }),
        ]);
        return entries.length;
    } catch (err) {
        logger.warn('leaderboard refresh failed — keeping previous snapshot', { error: err.message });
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
    refreshTimer = setInterval(refreshLeaderboard, intervalMs);
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
    isStale,
    ACTIVE_WINDOW_MS,
    STALE_AFTER_MS,
};
