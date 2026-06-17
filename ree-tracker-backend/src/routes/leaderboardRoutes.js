// src/routes/leaderboardRoutes.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const users = await prisma.user.findMany({
            orderBy: { thetaRating: 'desc' },
            take: limit,
            select: { id: true, role: true, thetaRating: true, globalStreak: true } // Hide sensitive info
        });
        res.status(200).json({ success: true, leaderboard: users });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch leaderboard.' });
    }
});

// Alias for paginated fetch
router.get('/paginated', async (req, res) => {
    try {
        const users = await prisma.user.findMany({ orderBy: { thetaRating: 'desc' }, take: 20 });
        res.status(200).json({ success: true, items: users });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch paginated leaderboard.' });
    }
});

module.exports = router;