const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { isStale, refreshLeaderboard } = require('../services/leaderboardService');

// Phase 4.1: reads are served from the materialized LeaderboardEntry snapshot
// (rebuilt every ~45s by leaderboardService) instead of sorting/counting the
// live User table per request. If the snapshot is missing or stale (first boot
// before the initial build, refresh interval died), each endpoint falls back
// to the legacy live query ONCE and fires a refresh in the background.

const SELECT_FIELDS = {
    id: true,
    displayName: true,
    role: true,
    thetaRating: true,
    globalStreak: true,
    lastActive: true,
};

const toAgent = (u) => ({
    uid: u.id,
    displayName: u.displayName || `Agent-${u.id.slice(0, 6)}`,
    role: u.role,
    thetaRating: u.thetaRating,
    streak: u.globalStreak,
    globalStreak: u.globalStreak,
    lastActive: u.lastActive,
    gauntletLevel: 1,
});

// Snapshot row → the same public agent shape the live path produced.
const entryToAgent = (e) => toAgent({
    id: e.userId,
    displayName: e.displayName,
    role: e.role,
    thetaRating: e.thetaRating,
    globalStreak: e.globalStreak,
    lastActive: e.lastActive,
});

// "Active" = touched the app in the last 30 days. We surface this as the
// denominator so a brand-new install isn't stuck on "Out of 0 Agents".
// (The snapshot builder applies the same window.)
const ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const activeWindow = () => ({ lastActive: { gte: new Date(Date.now() - ACTIVE_WINDOW_MS) } });

// One newest row tells us whether the whole snapshot is fresh (all rows share
// a snapshotAt). Returns null when the table is empty.
async function snapshotFreshness() {
    const newest = await prisma.leaderboardEntry.findFirst({
        orderBy: { snapshotAt: 'desc' },
        select: { snapshotAt: true },
    });
    return newest?.snapshotAt ?? null;
}

// Stale/empty snapshot → serve the legacy live path once and kick a refresh.
function kickRefresh() {
    refreshLeaderboard().catch(() => {});
}

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const snapshotAt = await snapshotFreshness();
        if (isStale(snapshotAt)) {
            kickRefresh();
            return liveFallbackMe(req, res);
        }

        const [entry, total, me] = await Promise.all([
            prisma.leaderboardEntry.findUnique({ where: { userId: req.user.id } }),
            prisma.leaderboardEntry.count(),
            prisma.user.findUnique({
                where: { id: req.user.id },
                select: { thetaRating: true, displayName: true, globalStreak: true, lastActive: true, role: true },
            }),
        ]);

        // Unranked = the user exists but hasn't earned a theta score yet
        // (zero or default), or isn't in the active snapshot at all.
        const unranked = !entry || (entry.thetaRating ?? 0) <= 0;

        res.status(200).json({
            rank: unranked ? null : entry.rank,
            total,
            thetaRating: entry?.thetaRating ?? me?.thetaRating ?? 0,
            unranked,
            self: me ? toAgent({ id: req.user.id, ...me }) : null,
        });
    } catch (error) {
        logger.error('leaderboard/me error', { error: error.message });
        res.status(500).json({ error: 'Failed to compute rank.' });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 200);

        const snapshotAt = await snapshotFreshness();
        if (isStale(snapshotAt)) {
            kickRefresh();
            return liveFallbackList(req, res, limit);
        }

        const entries = await prisma.leaderboardEntry.findMany({
            orderBy: { rank: 'asc' },
            take: limit,
        });
        res.status(200).json({ success: true, leaderboard: entries.map(entryToAgent) });
    } catch (error) {
        logger.error('leaderboard error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch leaderboard.' });
    }
});

router.get('/paginated', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        // Rank-keyed cursor (opaque to the client — it round-trips nextCursor).
        const cursorRank = Number.parseInt(req.query.cursor, 10);
        const afterRank = Number.isFinite(cursorRank) ? cursorRank : 0;

        const snapshotAt = await snapshotFreshness();
        if (isStale(snapshotAt)) {
            kickRefresh();
            return liveFallbackPaginated(req, res, limit);
        }

        const entries = await prisma.leaderboardEntry.findMany({
            where: { rank: { gt: afterRank } },
            orderBy: { rank: 'asc' },
            take: limit + 1,
        });

        const hasMore = entries.length > limit;
        if (hasMore) entries.pop();

        // First page: prepend the current user if they're not visible in the
        // top slice (Discord-style "you are here"). Lets users always find
        // themselves without scrolling through thousands of rows.
        let items = entries.map(entryToAgent);
        if (!afterRank) {
            const meVisible = items.some((u) => u.uid === req.user.id);
            if (!meVisible) {
                const me = await prisma.user.findUnique({
                    where: { id: req.user.id },
                    select: SELECT_FIELDS,
                });
                if (me) items = [{ ...toAgent(me), isSelf: true, offBoard: true }, ...items];
            }
        }

        res.status(200).json({
            success: true,
            items,
            nextCursor: hasMore ? String(entries[entries.length - 1].rank) : null,
        });
    } catch (error) {
        logger.error('leaderboard paginated error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch paginated leaderboard.' });
    }
});

// ---------------------------------------------------------------------------
// Legacy live-query fallbacks — served only while the snapshot is missing or
// stale. Identical response shapes to the snapshot paths.
// ---------------------------------------------------------------------------

async function liveFallbackMe(req, res) {
    try {
        const me = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { thetaRating: true, displayName: true, globalStreak: true, lastActive: true, role: true },
        });

        const [total, above] = await Promise.all([
            prisma.user.count({ where: activeWindow() }),
            me ? prisma.user.count({
                where: { ...activeWindow(), thetaRating: { gt: me.thetaRating } },
            }) : Promise.resolve(0),
        ]);

        const unranked = !me || (me.thetaRating ?? 0) <= 0;

        res.status(200).json({
            rank: unranked ? null : above + 1,
            total,
            thetaRating: me?.thetaRating ?? 0,
            unranked,
            self: me ? toAgent({ id: req.user.id, ...me }) : null,
        });
    } catch (error) {
        logger.error('leaderboard/me fallback error', { error: error.message });
        res.status(500).json({ error: 'Failed to compute rank.' });
    }
}

async function liveFallbackList(req, res, limit) {
    try {
        const users = await prisma.user.findMany({
            where: activeWindow(),
            orderBy: { thetaRating: 'desc' },
            take: limit,
            select: SELECT_FIELDS,
        });
        res.status(200).json({ success: true, leaderboard: users.map(toAgent) });
    } catch (error) {
        logger.error('leaderboard fallback error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch leaderboard.' });
    }
}

async function liveFallbackPaginated(req, res, limit) {
    try {
        // The live path can't rank-cursor; serve the first page (the common
        // case during the brief stale window) and let the next poll hit the
        // rebuilt snapshot.
        const users = await prisma.user.findMany({
            where: activeWindow(),
            orderBy: { thetaRating: 'desc' },
            take: limit + 1,
            select: SELECT_FIELDS,
        });
        const hasMore = users.length > limit;
        if (hasMore) users.pop();

        let items = users.map(toAgent);
        const meVisible = items.some((u) => u.uid === req.user.id);
        if (!meVisible) {
            const me = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: SELECT_FIELDS,
            });
            if (me) items = [{ ...toAgent(me), isSelf: true, offBoard: true }, ...items];
        }

        res.status(200).json({
            success: true,
            items,
            nextCursor: hasMore ? String(limit) : null,
        });
    } catch (error) {
        logger.error('leaderboard paginated fallback error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch paginated leaderboard.' });
    }
}

module.exports = router;
