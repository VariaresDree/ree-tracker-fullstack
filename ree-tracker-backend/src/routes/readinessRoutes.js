const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// GET /api/readiness — compute composite readiness score
router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { thetaRating: true, standardError: true }
        });

        const [totalSubtopics, coveredSubtopics] = await Promise.all([
            prisma.question.findMany({ where: { isFlagged: false }, select: { subtopic: true }, distinct: ['subtopic'] }),
            prisma.questionAttempt.findMany({ where: { userId: req.user.id }, select: { subtopic: true }, distinct: ['subtopic'] })
        ]);

        const topicCoverage = totalSubtopics.length > 0
            ? coveredSubtopics.length / totalSubtopics.length
            : 0;

        const [totalAttempts, correctAttempts] = await Promise.all([
            prisma.questionAttempt.count({ where: { userId: req.user.id } }),
            prisma.questionAttempt.count({ where: { userId: req.user.id, isCorrect: true } })
        ]);
        const accuracyRate = totalAttempts > 0 ? correctAttempts / totalAttempts : 0;

        const theta = user?.thetaRating || 0;
        const normalizedTheta = Math.min(1, Math.max(0, (theta + 3) / 6));

        const recentSessions = await prisma.studySession.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 14,
            select: { createdAt: true }
        });

        let consistency = 0;
        if (recentSessions.length >= 2) {
            const uniqueDays = new Set(recentSessions.map(s =>
                s.createdAt.toISOString().split('T')[0]
            ));
            consistency = Math.min(1, uniqueDays.size / 7);
        }

        const subtopicPerf = await prisma.questionAttempt.groupBy({
            by: ['subtopic'],
            where: { userId: req.user.id },
            _count: { id: true }
        });

        const correctBySubtopic = await prisma.questionAttempt.groupBy({
            by: ['subtopic'],
            where: { userId: req.user.id, isCorrect: true },
            _count: { id: true }
        });

        const correctMap = {};
        correctBySubtopic.forEach(c => { correctMap[c.subtopic] = c._count.id; });

        let blindSpotCount = 0;
        subtopicPerf.forEach(s => {
            const acc = (correctMap[s.subtopic] || 0) / s._count.id;
            if (acc < 0.4 && s._count.id >= 3) blindSpotCount++;
        });
        const blindSpotRatio = subtopicPerf.length > 0 ? blindSpotCount / subtopicPerf.length : 0;

        // Composite score: topic coverage (30%), accuracy (30%), theta (20%), consistency (10%), blind spots (10%)
        const score = Math.round((
            topicCoverage * 0.30 +
            accuracyRate * 0.30 +
            normalizedTheta * 0.20 +
            consistency * 0.10 +
            (1 - blindSpotRatio) * 0.10
        ) * 100);

        res.status(200).json({
            score: Math.min(100, Math.max(0, score)),
            breakdown: {
                topicCoverage: Math.round(topicCoverage * 100),
                accuracyRate: Math.round(accuracyRate * 100),
                thetaNormalized: Math.round(normalizedTheta * 100),
                consistency: Math.round(consistency * 100),
                blindSpotRatio: Math.round(blindSpotRatio * 100),
                blindSpotCount,
                totalSubtopics: totalSubtopics.length,
                coveredSubtopics: coveredSubtopics.length
            }
        });
    } catch (error) {
        logger.error('Readiness score error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to compute readiness score.' });
    }
});

// GET /api/readiness/history — fetch readiness snapshots
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const snapshots = await prisma.readinessSnapshot.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 30
        });
        res.status(200).json({ items: snapshots });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch readiness history.' });
    }
});

// POST /api/readiness/snapshot — save a readiness snapshot (called after computing score)
router.post('/snapshot', authMiddleware, async (req, res) => {
    try {
        const { score, topicCoverage, accuracyRate, theta, consistency, blindSpotRatio } = req.body;

        const snapshot = await prisma.readinessSnapshot.create({
            data: {
                userId: req.user.id,
                score: score || 0,
                topicCoverage: topicCoverage || 0,
                accuracyRate: accuracyRate || 0,
                theta: theta || 0,
                consistency: consistency || 0,
                blindSpotRatio: blindSpotRatio || 0
            }
        });

        res.status(201).json({ success: true, id: snapshot.id });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save readiness snapshot.' });
    }
});

module.exports = router;
