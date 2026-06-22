const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// Fetch due SRS cards for review
router.get('/due', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);

        const dueCards = await prisma.sRSCard.findMany({
            where: {
                userId: req.user.id,
                nextReviewDate: { lte: new Date() }
            },
            include: {
                question: {
                    select: {
                        id: true, subject: true, subtopic: true,
                        text: true, options: true, difficulty: true, type: true
                    }
                }
            },
            orderBy: { nextReviewDate: 'asc' },
            take: limit
        });

        res.status(200).json({ items: dueCards });
    } catch (error) {
        logger.error('SRS due fetch error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to fetch due cards.' });
    }
});

// Record a review action (updates SRS scheduling)
router.post('/review', authMiddleware, async (req, res) => {
    try {
        const { questionId, quality, easeFactor, interval, repetitions } = req.body;

        if (!questionId || quality === undefined) {
            return res.status(400).json({ error: 'questionId and quality are required.' });
        }

        // SM-2 algorithm: calculate next review date from interval (in days)
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + (interval || 1));

        const card = await prisma.sRSCard.upsert({
            where: {
                userId_questionId: { userId: req.user.id, questionId }
            },
            update: {
                easeFactor: easeFactor || 2.5,
                interval: interval || 0,
                repetitions: repetitions || 0,
                nextReviewDate,
                lastReviewed: new Date()
            },
            create: {
                userId: req.user.id,
                questionId,
                easeFactor: easeFactor || 2.5,
                interval: interval || 0,
                repetitions: repetitions || 0,
                nextReviewDate,
                lastReviewed: new Date()
            }
        });

        res.status(200).json({ success: true, card });
    } catch (error) {
        logger.error('SRS review error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to update SRS card.' });
    }
});

// Get SRS stats for user
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const [total, due, mastered] = await Promise.all([
            prisma.sRSCard.count({ where: { userId: req.user.id } }),
            prisma.sRSCard.count({ where: { userId: req.user.id, nextReviewDate: { lte: new Date() } } }),
            prisma.sRSCard.count({ where: { userId: req.user.id, interval: { gte: 21 } } })
        ]);

        res.status(200).json({ total, due, mastered });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch SRS stats.' });
    }
});

module.exports = router;
