const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { studySessionSchema } = require('../schemas/studySessionSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// Record a completed study session
router.post('/', authMiddleware, validate(studySessionSchema), async (req, res) => {
    try {
        // Fields are schema-validated + coerced to numbers/bounded strings.
        const { mode, subject, subtopic, totalQuestions, correctAnswers, durationSecs } = req.body;

        const session = await prisma.studySession.create({
            data: {
                userId: req.user.id,
                mode,
                subject,
                subtopic: subtopic || null,
                totalQuestions,
                correctAnswers,
                durationSecs
            }
        });

        res.status(201).json({ success: true, id: session.id });
    } catch (error) {
        logger.error('Study session create error', { error: error.message, stack: error.stack });
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
