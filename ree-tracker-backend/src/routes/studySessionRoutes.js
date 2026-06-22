const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');

// Record a completed study session
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { mode, subject, subtopic, totalQuestions, correctAnswers, durationSecs } = req.body;

        if (!mode || !subject || totalQuestions === undefined) {
            return res.status(400).json({ error: 'mode, subject, and totalQuestions are required.' });
        }

        const session = await prisma.studySession.create({
            data: {
                userId: req.user.id,
                mode,
                subject,
                subtopic: subtopic || null,
                totalQuestions: parseInt(totalQuestions),
                correctAnswers: parseInt(correctAnswers) || 0,
                durationSecs: parseInt(durationSecs) || 0
            }
        });

        res.status(201).json({ success: true, id: session.id });
    } catch (error) {
        console.error("Study Session Create Error:", error);
        res.status(500).json({ error: 'Failed to record study session.' });
    }
});

// Fetch study session history
router.get('/', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const cursor = req.query.cursor;

        const sessions = await prisma.studySession.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
        });

        const hasMore = sessions.length > limit;
        if (hasMore) sessions.pop();

        res.status(200).json({
            items: sessions,
            nextCursor: hasMore ? sessions[sessions.length - 1].id : null
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch study sessions.' });
    }
});

// Get aggregate study stats
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const [totalSessions, aggregates] = await Promise.all([
            prisma.studySession.count({ where: { userId: req.user.id } }),
            prisma.studySession.aggregate({
                where: { userId: req.user.id },
                _sum: { totalQuestions: true, correctAnswers: true, durationSecs: true }
            })
        ]);

        res.status(200).json({
            totalSessions,
            totalQuestions: aggregates._sum.totalQuestions || 0,
            totalCorrect: aggregates._sum.correctAnswers || 0,
            totalStudyTimeSecs: aggregates._sum.durationSecs || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch study stats.' });
    }
});

module.exports = router;
