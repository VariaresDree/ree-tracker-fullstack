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
    // gauntletLevel is per-user local state on the frontend; default 1 server-side
    gauntletLevel: 1,
});

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const me = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { thetaRating: true },
        });
        if (!me) return res.status(200).json({ rank: null, total: 0 });

        const [total, above] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { thetaRating: { gt: me.thetaRating } } }),
        ]);
        res.status(200).json({ rank: above + 1, total, thetaRating: me.thetaRating });
    } catch (error) {
        logger.error('leaderboard/me error', { error: error.message });
        res.status(500).json({ error: 'Failed to compute rank.' });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 200);
        const users = await prisma.user.findMany({
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
            orderBy: { thetaRating: 'desc' },
            take: limit + 1,
            select: SELECT_FIELDS,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = users.length > limit;
        if (hasMore) users.pop();

        res.status(200).json({
            success: true,
            items: users.map(toAgent),
            nextCursor: hasMore ? users[users.length - 1].id : null,
        });
    } catch (error) {
        logger.error('leaderboard paginated error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch paginated leaderboard.' });
    }
});

module.exports = router;
