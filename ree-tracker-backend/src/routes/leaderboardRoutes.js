const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');

router.get('/', authMiddleware, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const users = await prisma.user.findMany({
            orderBy: { thetaRating: 'desc' },
            take: limit,
            select: { id: true, role: true, thetaRating: true, globalStreak: true }
        });
        res.status(200).json({ success: true, leaderboard: users });
    } catch (error) {
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
            select: { id: true, role: true, thetaRating: true, globalStreak: true },
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
        });

        const hasMore = users.length > limit;
        if (hasMore) users.pop();

        res.status(200).json({
            success: true,
            items: users,
            nextCursor: hasMore ? users[users.length - 1].id : null
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch paginated leaderboard.' });
    }
});

module.exports = router;
