const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const { TIME_MIN_MS, TIME_MAX_MS } = require('../config/telemetryBounds');
const { buildScoreProgression, aggregateDailyStudy } = require('../services/deepAnalyticsHelpers');
const { normalizeSubject } = require('../utils/subject');

// Manila calendar date of an instant — same formatter the telemetry service
// keys ActivityLog on, so "a study day" means the same thing everywhere.
const MANILA_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });
const manilaDateOf = (d) => MANILA_FMT.format(new Date(d));

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

        // Re-bucket by CANONICAL subject: legacy attempt rows carry historical
        // spellings ('Math' vs 'Mathematics'), which used to render as separate
        // radar rows and disagree with the dashboard's normalized numbers.
        const buckets = new Map();
        const addTo = (subject, totals, correct) => {
            const key = normalizeSubject(subject);
            const b = buckets.get(key) || { subject: key, total: 0, correct: 0 };
            b.total += totals;
            b.correct += correct;
            buckets.set(key, b);
        };
        const correctMap = {};
        correctBySubject.forEach(c => { correctMap[c.subject] = c._count.id; });
        subjects.forEach(s => addTo(s.subject, s._count.id, correctMap[s.subject] || 0));

        const result = [...buckets.values()].map(b => ({
            ...b,
            accuracy: b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0,
        }));

        res.status(200).json({ items: result });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch subject radar.' });
    }
});

// GET /api/analytics/deep/study-time — daily totals keyed by MANILA date,
// merging Active Review sessions with exam-session time (aggregation logic in
// deepAnalyticsHelpers so the day-keying is unit-tested — UTC keying used to
// shift evening sessions onto the wrong day, and simulator time never showed).
router.get('/study-time', authMiddleware, async (req, res) => {
    try {
        const [studySessions, examSessions] = await Promise.all([
            prisma.studySession.findMany({
                where: { userId: req.user.id },
                orderBy: { createdAt: 'desc' },
                take: 90,
                select: { createdAt: true, durationSecs: true },
            }),
            prisma.examSession.findMany({
                where: { userId: req.user.id },
                orderBy: { createdAt: 'desc' },
                take: 90,
                select: { createdAt: true, timeTakenSecs: true, totalQuestions: true },
            }),
        ]);

        const daily = aggregateDailyStudy(studySessions, examSessions, manilaDateOf);
        res.status(200).json({ daily });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch study time data.' });
    }
});

// GET /api/analytics/deep/score-progression — REAL exams only (Board Sim /
// Gauntlet), with the percentage computed server-side. ExamSession.score is a
// raw correct count; the old payload let the UI render "7%" for 7/10.
router.get('/score-progression', authMiddleware, async (req, res) => {
    try {
        const exams = await prisma.examSession.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'asc' },
            take: 100,
            select: { score: true, totalQuestions: true, targetSubject: true, createdAt: true, verdict: true, mode: true }
        });

        res.status(200).json({ items: buildScoreProgression(exams) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch score progression.' });
    }
});

module.exports = router;
