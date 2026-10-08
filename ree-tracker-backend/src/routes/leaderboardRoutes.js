const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { isStale, refreshLeaderboard, noteLeaderboardDemand } = require('../services/leaderboardService');
const { fallbackDisplayName, effectiveStreak, dayBefore, todayManila } = require('@ree/shared');

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

// Streaks on LIVE User rows. The stored streak is only rewritten when answers
// are recorded, so on its own it outlived a missed day ("3 STREAK" days after
// the run broke). Live rows therefore join the ActivityLog rows dated yesterday
// or later — the only days that keep a streak alive, so at most two per user —
// and serve the streak as it stands today. Not lastActive: the profile route
// re-stamps that on every app open. (Snapshot rows already carry the judged
// value; buildEntries applies the same rule at refresh time.)
const liveSelect = (today) => ({
    ...SELECT_FIELDS,
    activityLogs: { where: { date: { gte: dayBefore(today) } }, select: { date: true } },
});

// A live row (one selected with liveSelect) carries its recent ActivityLog
// rows; its streak is judged from them here, in the one function every row
// passes through, so a new live-row path can't serve the stale stored value.
// Snapshot rows (entryToAgent) carry no activityLogs: buildEntries already
// judged them at refresh time.
function rowStreak(u) {
    if (!Array.isArray(u.activityLogs)) return u.globalStreak;
    let lastStudyDay = null;
    for (const { date } of u.activityLogs) {
        if (!lastStudyDay || date > lastStudyDay) lastStudyDay = date;
    }
    return effectiveStreak(u.globalStreak, lastStudyDay, todayManila());
}

function toAgent(u) {
    const streak = rowStreak(u);
    return {
        uid: u.id,
        displayName: u.displayName || fallbackDisplayName(u.id),
        role: u.role,
        thetaRating: u.thetaRating,
        streak,
        globalStreak: streak,
        // Ranking stats (default 0 for live-fallback User rows that don't carry
        // them; the snapshot path threads the real values via entryToAgent, and the
        // self-row paths merge computeUserStats before calling toAgent).
        activeDays: u.activeDays ?? 0,
        questionsAnswered: u.questionsAnswered ?? 0,
        accuracy: u.accuracy ?? 0,
        lastActive: u.lastActive,
        gauntletLevel: 1,
    };
}

// Snapshot row → the same public agent shape the live path produced.
const entryToAgent = (e) => toAgent({
    id: e.userId,
    displayName: e.displayName,
    role: e.role,
    thetaRating: e.thetaRating,
    globalStreak: e.globalStreak,
    activeDays: e.activeDays,
    questionsAnswered: e.questionsAnswered,
    accuracy: e.accuracy,
    lastActive: e.lastActive,
});

// Cheap per-user stats for the SELF row (not N+1 — called once for the one
// requesting user, not per leaderboard row). Mirrors the snapshot aggregates.
async function computeUserStats(userId) {
    const [days, grouped] = await Promise.all([
        prisma.activityLog.count({ where: { userId } }),
        prisma.questionAttempt.groupBy({ by: ['isCorrect'], where: { userId }, _count: { _all: true } }),
    ]);
    let total = 0, correct = 0;
    for (const g of grouped) { total += g._count._all; if (g.isCorrect) correct += g._count._all; }
    return { activeDays: days, questionsAnswered: total, accuracy: total > 0 ? correct / total : 0 };
}

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
// refreshLeaderboard is single-flight, so N concurrent stale requests share one
// rebuild instead of launching N of them.
function kickRefresh() {
    noteLeaderboardDemand();
    refreshLeaderboard().catch(() => {});
}

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const snapshotAt = await snapshotFreshness();
        if (isStale(snapshotAt)) {
            kickRefresh();
            return liveFallbackMe(req, res);
        }

        const today = todayManila();
        const [entry, total, me] = await Promise.all([
            prisma.leaderboardEntry.findUnique({ where: { userId: req.user.id } }),
            prisma.leaderboardEntry.count(),
            prisma.user.findUnique({ where: { id: req.user.id }, select: liveSelect(today) }),
        ]);

        // Unranked = the user exists but hasn't earned a theta score yet
        // (zero or default), or isn't in the active snapshot at all.
        const unranked = !entry || (entry.thetaRating ?? 0) <= 0;

        // Self stats: reuse the snapshot row if present, else a cheap live count.
        let self = null;
        if (me) {
            const s = entry
                ? { activeDays: entry.activeDays, questionsAnswered: entry.questionsAnswered, accuracy: entry.accuracy }
                : await computeUserStats(req.user.id);
            self = toAgent({ id: req.user.id, ...me, ...s });
        }

        res.status(200).json({
            rank: unranked ? null : entry.rank,
            total,
            thetaRating: entry?.thetaRating ?? me?.thetaRating ?? 0,
            unranked,
            self,
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
                const today = todayManila();
                const [me, meStats] = await Promise.all([
                    prisma.user.findUnique({ where: { id: req.user.id }, select: liveSelect(today) }),
                    computeUserStats(req.user.id),
                ]);
                if (me) items = [{ ...toAgent({ ...me, ...meStats }), isSelf: true, offBoard: true }, ...items];
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
        const today = todayManila();
        const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: liveSelect(today) });

        const [total, above] = await Promise.all([
            prisma.user.count({ where: activeWindow() }),
            me ? prisma.user.count({
                where: { ...activeWindow(), thetaRating: { gt: me.thetaRating } },
            }) : Promise.resolve(0),
        ]);

        const unranked = !me || (me.thetaRating ?? 0) <= 0;

        const self = me
            ? toAgent({ id: req.user.id, ...me, ...(await computeUserStats(req.user.id)) })
            : null;

        res.status(200).json({
            rank: unranked ? null : above + 1,
            total,
            thetaRating: me?.thetaRating ?? 0,
            unranked,
            self,
        });
    } catch (error) {
        logger.error('leaderboard/me fallback error', { error: error.message });
        res.status(500).json({ error: 'Failed to compute rank.' });
    }
}

async function liveFallbackList(req, res, limit) {
    try {
        const today = todayManila();
        const users = await prisma.user.findMany({
            where: activeWindow(),
            orderBy: { thetaRating: 'desc' },
            take: limit,
            select: liveSelect(today),
        });
        res.status(200).json({ success: true, leaderboard: users.map((u) => toAgent(u)) });
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
        const today = todayManila();
        const users = await prisma.user.findMany({
            where: activeWindow(),
            orderBy: { thetaRating: 'desc' },
            take: limit + 1,
            select: liveSelect(today),
        });
        const hasMore = users.length > limit;
        if (hasMore) users.pop();

        let items = users.map((u) => toAgent(u));
        const meVisible = items.some((u) => u.uid === req.user.id);
        if (!meVisible) {
            const [me, meStats] = await Promise.all([
                prisma.user.findUnique({ where: { id: req.user.id }, select: liveSelect(today) }),
                computeUserStats(req.user.id),
            ]);
            if (me) items = [{ ...toAgent({ ...me, ...meStats }), isSelf: true, offBoard: true }, ...items];
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
