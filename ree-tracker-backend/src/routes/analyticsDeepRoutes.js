const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const { TIME_MIN_MS, TIME_MAX_MS } = require('../config/telemetryBounds');

// GET /api/analytics/deep/time-analysis — time-per-question by topic.
// Excludes corrupt timing rows (0ms/inflated) so the averages are truthful.
// Attempts attribute through Question→Topic (Phase 3.3), falling back to the
// attempt's stored label for unmapped rows, so a topic's timing never splits
// across a legacy string and its canonical name. Tagged template = bound params.
router.get('/time-analysis', authMiddleware, async (req, res) => {
    try {
        const data = await prisma.$queryRaw`
            SELECT
                COALESCE(t."name", qa."subtopic") AS "subtopic",
                ROUND(AVG(qa."timeSpentMs"))::int AS "avgTimeMs",
                SUM(qa."timeSpentMs")::bigint     AS "totalTimeMs",
                COUNT(*)::int                     AS "count"
            FROM "QuestionAttempt" qa
            JOIN "Question" q ON q."id" = qa."questionId"
            LEFT JOIN "Topic" t ON t."id" = q."topicId"
            WHERE qa."userId" = ${req.user.id}
              AND qa."timeSpentMs" BETWEEN ${TIME_MIN_MS} AND ${TIME_MAX_MS}
            GROUP BY 1
        `;

        const result = data.map(d => ({
            subtopic: d.subtopic,
            avgTimeMs: d.avgTimeMs || 0,
            totalTimeMs: Number(d.totalTimeMs) || 0,
            count: d.count
        })).sort((a, b) => b.avgTimeMs - a.avgTimeMs);

        res.status(200).json({ items: result });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch time analysis.' });
    }
});

// GET /api/analytics/deep/confidence-calibration — confidence vs accuracy
router.get('/confidence-calibration', authMiddleware, async (req, res) => {
    try {
        const levels = ['LOW', 'MED', 'HIGH'];
        const result = [];

        for (const level of levels) {
            const [total, correct] = await Promise.all([
                prisma.questionAttempt.count({
                    where: { userId: req.user.id, confidenceLevel: level }
                }),
                prisma.questionAttempt.count({
                    where: { userId: req.user.id, confidenceLevel: level, isCorrect: true }
                })
            ]);

            result.push({
                confidence: level,
                total,
                correct,
                accuracy: total > 0 ? Math.round((correct / total) * 100) : 0
            });
        }

        res.status(200).json({ items: result });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch confidence calibration.' });
    }
});

// GET /api/analytics/deep/subject-radar — accuracy by subject
router.get('/subject-radar', authMiddleware, async (req, res) => {
    try {
        const subjects = await prisma.questionAttempt.groupBy({
            by: ['subject'],
            where: { userId: req.user.id },
            _count: { id: true }
        });

        const correctBySubject = await prisma.questionAttempt.groupBy({
            by: ['subject'],
            where: { userId: req.user.id, isCorrect: true },
            _count: { id: true }
        });

        const correctMap = {};
        correctBySubject.forEach(c => { correctMap[c.subject] = c._count.id; });

        const result = subjects.map(s => ({
            subject: s.subject,
            total: s._count.id,
            correct: correctMap[s.subject] || 0,
            accuracy: Math.round(((correctMap[s.subject] || 0) / s._count.id) * 100)
        }));

        res.status(200).json({ items: result });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch subject radar.' });
    }
});

// GET /api/analytics/deep/study-time — daily/weekly aggregations
router.get('/study-time', authMiddleware, async (req, res) => {
    try {
        const sessions = await prisma.studySession.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 90,
            select: { createdAt: true, durationSecs: true, mode: true }
        });

        const dailyMap = {};
        sessions.forEach(s => {
            const day = s.createdAt.toISOString().split('T')[0];
            if (!dailyMap[day]) dailyMap[day] = { totalSecs: 0, sessions: 0 };
            dailyMap[day].totalSecs += s.durationSecs;
            dailyMap[day].sessions += 1;
        });

        const daily = Object.entries(dailyMap)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date));

        res.status(200).json({ daily });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch study time data.' });
    }
});

// GET /api/analytics/deep/score-progression — exam scores over time
router.get('/score-progression', authMiddleware, async (req, res) => {
    try {
        const exams = await prisma.examSession.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'asc' },
            take: 50,
            select: { score: true, totalQuestions: true, targetSubject: true, createdAt: true, verdict: true }
        });

        res.status(200).json({ items: exams });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch score progression.' });
    }
});

module.exports = router;
