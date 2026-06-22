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
        const users = await prisma.user.findMany({
            orderBy: { thetaRating: 'desc' },
            take: 20,
            select: { id: true, role: true, thetaRating: true, globalStreak: true }
        });
        res.status(200).json({ success: true, items: users });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch paginated leaderboard.' });
    }
});

module.exports = router;
