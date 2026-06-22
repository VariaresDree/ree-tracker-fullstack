const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// GET /api/smart-drill — fetch questions from user's weakest subtopics
router.get('/', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);

        const subtopicStats = await prisma.questionAttempt.groupBy({
            by: ['subtopic', 'subject'],
            where: { userId: req.user.id },
            _count: { id: true },
            _sum: { isCorrect: false },
            having: { id: { _count: { gte: 3 } } }
        });

        const correctCounts = await prisma.questionAttempt.groupBy({
            by: ['subtopic'],
            where: { userId: req.user.id, isCorrect: true },
            _count: { id: true }
        });

        const correctMap = {};
        correctCounts.forEach(c => { correctMap[c.subtopic] = c._count.id; });

        const ranked = subtopicStats.map(s => ({
            subtopic: s.subtopic,
            subject: s.subject,
            total: s._count.id,
            correct: correctMap[s.subtopic] || 0,
            accuracy: (correctMap[s.subtopic] || 0) / s._count.id
        })).sort((a, b) => a.accuracy - b.accuracy);

        const weakSubtopics = ranked.slice(0, 5).map(r => r.subtopic);

        if (weakSubtopics.length === 0) {
            return res.status(200).json({ items: [], weakAreas: [] });
        }

        const wrongQuestionIds = await prisma.questionAttempt.findMany({
            where: {
                userId: req.user.id,
                isCorrect: false,
                subtopic: { in: weakSubtopics }
            },
            select: { questionId: true },
            distinct: ['questionId'],
            take: limit
        });

        let questionIds = wrongQuestionIds.map(q => q.questionId);

        if (questionIds.length < limit) {
            const extra = await prisma.question.findMany({
                where: {
                    subtopic: { in: weakSubtopics },
                    isFlagged: false,
                    id: { notIn: questionIds }
                },
                select: { id: true },
                take: limit - questionIds.length
            });
            questionIds = [...questionIds, ...extra.map(q => q.id)];
        }

        const questions = await prisma.question.findMany({
            where: { id: { in: questionIds } },
            select: {
                id: true, subject: true, subtopic: true,
                text: true, options: true, difficulty: true, type: true
            }
        });

        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }

        res.status(200).json({
            items: questions,
            weakAreas: ranked.slice(0, 5)
        });
    } catch (error) {
        logger.error('Smart drill error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to generate smart drill.' });
    }
});

module.exports = router;
