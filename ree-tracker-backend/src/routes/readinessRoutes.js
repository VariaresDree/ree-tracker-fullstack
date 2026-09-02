const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { readinessSnapshotSchema } = require('../schemas/readinessSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const readinessCache = require('../services/readinessCache');
const { computeReadiness, CONSISTENCY_WINDOW_DAYS } = require('../services/readinessService');

// Manila calendar date of an instant — same helper telemetryService keys
// ActivityLog/streaks on, so "an active study day" means the same thing here.
// Was toISOString() (UTC), which mis-dated every session in 00:00–08:00 Manila
// to the previous day and skewed the consistency term.
const { manilaDateOf } = require('../utils/manilaDate');

// GET /api/readiness — compute composite readiness score
router.get('/', authMiddleware, async (req, res) => {
    try {
        // Slow-moving metric behind ~7 aggregate queries — serve a 60s cache to
        // avoid recomputing on rapid refreshes.
        const cached = readinessCache.get(req.user.id);
        if (cached) return res.status(200).json(cached);

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { thetaRating: true, standardError: true }
        });

        // Coverage counts TOPICS via the taxonomy (Phase 3.3), not raw attempt
        // strings: after the canonicalization migration a user's pre-rename
        // attempts ("Calculus 1") and post-rename attempts ("Differential
        // Calculus") would otherwise count as two covered topics. Attempts
        // attribute through their question's topicId; unmapped/legacy rows
        // COALESCE back to the stored label. Tagged templates = bound params.
        const [[totalRow], [coveredRow]] = await Promise.all([
            prisma.$queryRaw`
                SELECT COUNT(DISTINCT COALESCE(t."name", q."subtopic"))::int AS "n"
                FROM "Question" q
                LEFT JOIN "Topic" t ON t."id" = q."topicId"
                WHERE q."isFlagged" = false
            `,
            prisma.$queryRaw`
                SELECT COUNT(DISTINCT COALESCE(t."name", qa."subtopic"))::int AS "n"
                FROM "QuestionAttempt" qa
                JOIN "Question" q ON q."id" = qa."questionId"
                LEFT JOIN "Topic" t ON t."id" = q."topicId"
                WHERE qa."userId" = ${req.user.id}
                  AND q."isFlagged" = false
            `,
        ]);
        const totalTopicCount = totalRow?.n ?? 0;
        const coveredTopicCount = coveredRow?.n ?? 0;

        // The isFlagged filter is now applied to BOTH sides. Without it the
        // numerator counted topics the user had attempted INCLUDING flagged
        // questions while the denominator excluded them, so a topic whose
        // questions all got flagged stayed in the numerator and left the
        // denominator — pushing topicCoverage above 1 and inflating the readiness
        // score by up to 30 points before the final clamp hid it.
        // Math.min is belt-and-braces for any future asymmetry.

        const [totalAttempts, correctAttempts] = await Promise.all([
            prisma.questionAttempt.count({ where: { userId: req.user.id } }),
            prisma.questionAttempt.count({ where: { userId: req.user.id, isCorrect: true } })
        ]);


        // Two defects fixed here.
        //
        // 1. NO TIME WINDOW. `take: 14` bounded the row COUNT, not the period, so
        //    a user who studied on 14 distinct days six months ago and nothing
        //    since scored consistency = 1.0 (10% of the composite) forever, while
        //    someone doing 14 sessions today scored 1/7 = 0.14.
        // 2. ONLY StudySession COUNTED. Board Sim, Gauntlet and Battle activity
        //    never writes a StudySession row, so a user doing nothing but mock
        //    exams scored zero consistency.
        //
        // ActivityLog is the right ledger: it already has one row per user per
        // Manila day, written by recordAttempts for EVERY answering surface.
        // ActivityLog has no timestamp column — it is keyed by (userId, date)
        // where `date` is a 'YYYY-MM-DD' Manila string. ISO dates sort
        // lexicographically, so a string >= comparison IS a date range, and the
        // existing @@index([userId, date]) serves it.
        const windowStartDay = manilaDateOf(new Date(Date.now() - CONSISTENCY_WINDOW_DAYS * 86400000));
        const activeDays = await prisma.activityLog.count({
            where: { userId: req.user.id, date: { gte: windowStartDay } },
        });



        // Same taxonomy attribution as coverage — one query replaces the two
        // string groupBys, so a topic's accuracy is never split across a legacy
        // label and its canonical name.
        const topicPerf = await prisma.$queryRaw`
            SELECT
                COALESCE(t."name", qa."subtopic") AS "topic",
                COUNT(*)::int AS "attempts",
                (COUNT(*) FILTER (WHERE qa."isCorrect"))::int AS "correct"
            FROM "QuestionAttempt" qa
            JOIN "Question" q ON q."id" = qa."questionId"
            LEFT JOIN "Topic" t ON t."id" = q."topicId"
            WHERE qa."userId" = ${req.user.id}
            GROUP BY 1
        `;

        // This route's job ends here: it has gathered the facts. The scoring rule
        // — the five term weights, the theta normalisation, the blind-spot
        // definition and the clamps — lives in readinessService, where it is a
        // pure function and can be tested without a database. It used to be
        // inline, which is why it was uncovered and why two defects sat in it.
        const payload = computeReadiness({
            coveredTopicCount,
            totalTopicCount,
            correctAttempts,
            totalAttempts,
            theta: user?.thetaRating ?? 0,
            activeDays,
            topicPerf,
        });
        readinessCache.set(req.user.id, payload);
        res.status(200).json(payload);
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
router.post('/snapshot', authMiddleware, validate(readinessSnapshotSchema), async (req, res) => {
    try {
        const { score, topicCoverage, accuracyRate, theta, consistency, blindSpotRatio } = req.body;

        const snapshot = await prisma.readinessSnapshot.create({
            data: { userId: req.user.id, score, topicCoverage, accuracyRate, theta, consistency, blindSpotRatio }
        });

        res.status(201).json({ success: true, id: snapshot.id });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save readiness snapshot.' });
    }
});

module.exports = router;
