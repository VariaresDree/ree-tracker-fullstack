// src/routes/bookmarkRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// GET all bookmarks for a user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const bookmarks = await prisma.bookmark.findMany({
            where: { userId: req.user.id },
            include: { question: true }, // Joins the actual question data
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(bookmarks.map(b => b.question));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookmarks.' });
    }
});

// Add other standard POST/DELETE routes if needed
module.exports = router;