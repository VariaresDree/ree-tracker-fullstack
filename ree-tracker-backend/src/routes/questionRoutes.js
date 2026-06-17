// src/routes/questionRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 0. FETCH GLOBAL QUESTION STATS (Must be above the '/' route)
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const total = await prisma.question.count({ where: { isFlagged: false } });
        const math = await prisma.question.count({ where: { subject: 'Math', isFlagged: false } });
        const esas = await prisma.question.count({ where: { subject: 'ESAS', isFlagged: false } });
        const ee = await prisma.question.count({ where: { subject: 'EE', isFlagged: false } });
        
        return res.status(200).json({ 
            totalQuestions: total, 
            breakdown: { Math: math, ESAS: esas, EE: ee } 
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

// 1. FETCH QUESTIONS (Populates the Library)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { subject, subtopic, limit = 50 } = req.query;

        const whereClause = {};
        if (subject && subject !== 'All') whereClause.subject = subject;
        if (subtopic && subtopic !== 'All') whereClause.subtopic = subtopic;

        const questions = await prisma.question.findMany({
            where: whereClause,
            take: parseInt(limit),
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({ items: questions });
    } catch (error) {
        console.error("Library Fetch Error:", error);
        return res.status(500).json({ error: 'Failed to fetch question bank.' });
    }
});

// 2. ADD A NEW QUESTION (Manual Entry for Admins)
router.post('/', authMiddleware, async (req, res) => {
    try {
        // Verify Admin Status
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin clearance required.' });

        const data = req.body;
        const newQuestion = await prisma.question.create({
            data: {
                subject: data.subject || 'Unknown',
                subtopic: data.subtopic || 'General',
                questionText: data.question || data.questionText || '',
                options: data.options || [],
                correctAnswer: data.answer || data.correctAnswer || '',
                difficultyTheta: parseFloat(data.difficultyTheta) || 0.0,
                cachedExplanation: data.cachedExplanation || null
            }
        });

        return res.status(201).json({ success: true, id: newQuestion.id });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to insert question.' });
    }
});

// FETCH ACTIVE RECALL REVIEW QUESTIONS
router.post('/review', authMiddleware, async (req, res) => {
    try {
        const { subject, limit = 20 } = req.body;
        
        // Randomly select questions for the flashcard/active recall session
        const questions = await prisma.$queryRawUnsafe(`
            SELECT id, subject, subtopic, "questionText" as question, options, "cachedExplanation", "difficultyTheta"
            FROM "Question"
            WHERE "isFlagged" = false ${subject && subject !== 'All' ? `AND subject = '${subject}'` : ''}
            ORDER BY RANDOM()
            LIMIT ${parseInt(limit)};
        `);

        return res.status(200).json({ success: true, items: questions });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to initialize active recall.' });
    }
});

// Flag a question anomaly
router.patch('/:id/flag', authMiddleware, async (req, res) => {
    try {
        await prisma.question.update({ where: { id: req.params.id }, data: { isFlagged: true } });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to flag question.' });
    }
});

module.exports = router;