const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');

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

// "Active" = touched the app in the last 30 days. We surface this as the
// denominator so a brand-new install isn't stuck on "Out of 0 Agents".
const ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const activeWindow = () => ({ lastActive: { gte: new Date(Date.now() - ACTIVE_WINDOW_MS) } });

router.get('/me', authMiddleware, async (req, res) => {
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

        // Unranked = the user exists but hasn't earned a theta score yet
        // (zero or default). Frontend renders friendly copy instead of N/A.
        const unranked = !me || (me.thetaRating ?? 0) <= 0;

        res.status(200).json({
            rank: unranked ? null : above + 1,
            total,
            thetaRating: me?.thetaRating ?? 0,
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
        const users = await prisma.user.findMany({
            where: activeWindow(),
            orderBy: { thetaRating: 'desc' },
            take: limit,
            select: SELECT_FIELDS,
        });
        res.status(200).json({ success: true, leaderboard: users.map(toAgent) });
    } catch (error) {
        logger.error('leaderboard error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch leaderboard.' });
    }
});

router.get('/paginated', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const cursor = req.query.cursor;

        const users = await prisma.user.findMany({
            where: activeWindow(),
            orderBy: { thetaRating: 'desc' },
            take: limit + 1,
            select: SELECT_FIELDS,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = users.length > limit;
        if (hasMore) users.pop();

        // First page: prepend the current user if they're not visible in the
        // top slice (Discord-style "you are here"). Lets users always find
        // themselves without scrolling through thousands of rows.
        let items = users.map(toAgent);
        if (!cursor) {
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
            nextCursor: hasMore ? users[users.length - 1].id : null,
        });
    } catch (error) {
        logger.error('leaderboard paginated error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch paginated leaderboard.' });
    }
});

module.exports = router;
