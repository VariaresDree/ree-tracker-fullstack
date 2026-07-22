const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireSelf } = require('../middlewares/requireSelf');
const idempotency = require('../middlewares/idempotency');
const { validate } = require('../middlewares/validate');
const { telemetryBulkSchema } = require('../schemas/telemetrySchemas');
const prisma = require('../config/db');
const { TIME_MIN_MS, TIME_MAX_MS } = require('../config/telemetryBounds');
const { recordAttempts, todayManila } = require('../services/telemetryService');
// Shared cache module — recordAttempts invalidates it for EVERY write surface
// (telemetry-bulk, exams/grade, exams/submit, battle-submit), so battles and
// gauntlet runs no longer leave the dashboard stale for up to 30s.
const dashboardCache = require('../services/dashboardCache');
const logger = require('../utils/logger');

const cacheSet = dashboardCache.set;
const invalidateDashboard = dashboardCache.invalidate;

router.get('/dashboard/:uid', authMiddleware, requireSelf('uid'), async (req, res) => {
    const { uid } = req.params;

    const cached = dashboardCache.get(uid);
    if (cached) {
        return res.status(200).json(cached);
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: uid },
            include: { sessions: { orderBy: { createdAt: 'desc' }, take: 10 } }
        });

        if (!user) return res.status(404).json({ error: 'User telemetry not found.' });

        // Start of "today" in Manila (UTC+8), expressed as a UTC instant.
        // Uses the SAME Manila date string that telemetryService keys ActivityLog
        // on, so the dashboard's daily Math/ESAS/EE counts always agree with the
        // activity calendar and never miss attempts due to server-TZ drift.
        const utcStartOfDay = new Date(`${todayManila()}T00:00:00+08:00`);

        const dailyAgg = await prisma.questionAttempt.groupBy({
            by: ['subject'],
            where: { userId: uid, createdAt: { gte: utcStartOfDay } },
            _count: { id: true }
        });

        let dailyMath = 0, dailyESAS = 0, dailyEE = 0;
        dailyAgg.forEach(group => {
            if (group.subject === 'Mathematics' || group.subject === 'Math') dailyMath += group._count.id;
            else if (group.subject === 'ESAS') dailyESAS += group._count.id;
            else if (group.subject === 'EE') dailyEE += group._count.id;
        });

        // EVERY active day (uncapped). The Consistency Matrix now renders a grand
        // total, and the tally invariant totalAnswered == Σ(ActivityLog.count)
        // only holds if we return all days. One small int-per-day row and a
        // review account spans at most a couple exam cycles, so the scan is cheap.
        const activityLogs = await prisma.activityLog.findMany({
            where: { userId: uid },
            orderBy: { date: 'desc' },
        });
        const activityCalendar = {};
        activityLogs.forEach(log => activityCalendar[log.date] = log.count);

        // Per-topic rollup through the taxonomy (Phase 3.3): attempts attribute
        // to their question's CURRENT topic (COALESCE back to the attempt's
        // stored label for unmapped/legacy rows), so re-tagging a question
        // retroactively corrects its history instead of stranding it under a
        // renamed string. Counts/accuracy use EVERY attempt; timing is bounded
        // to plausible values via FILTER — the live DB has corrupted rows
        // (0ms "instant" answers and ~1000x-inflated times) that would poison
        // the Speed Mapping averages. Tagged template = every value is a bound
        // parameter (fully guard-safe, no string interpolation into SQL).
        const topicRows = await prisma.$queryRaw`
            SELECT
                COALESCE(t."name", qa."subtopic")   AS "topic",
                COALESCE(t."subject", qa."subject") AS "subject",
                COUNT(*)::int                                       AS "totalAttempts",
                (COUNT(*) FILTER (WHERE qa."isCorrect"))::int       AS "correctHits",
                COALESCE(SUM(qa."timeSpentMs") FILTER (WHERE qa."timeSpentMs" BETWEEN ${TIME_MIN_MS} AND ${TIME_MAX_MS}), 0)::bigint AS "totalTimeMs",
                (COUNT(*) FILTER (WHERE qa."timeSpentMs" BETWEEN ${TIME_MIN_MS} AND ${TIME_MAX_MS}))::int AS "timedAttempts"
            FROM "QuestionAttempt" qa
            JOIN "Question" q ON q."id" = qa."questionId"
            LEFT JOIN "Topic" t ON t."id" = q."topicId"
            WHERE qa."userId" = ${uid}
            GROUP BY 1, 2
        `;

        const microTopics = {};
        topicRows.forEach((r) => {
            // Merge rather than overwrite: the same label can surface under two
            // subjects (legacy attempt rows) — first-seen subject wins, counts add.
            const agg = microTopics[r.topic] ||= { subject: r.subject, totalAttempts: 0, correctHits: 0, totalTimeSecs: 0, timedAttempts: 0, mastery: null, masteryN: 0 };
            agg.totalAttempts += r.totalAttempts;
            agg.correctHits += r.correctHits;
            agg.totalTimeSecs += Math.floor(Number(r.totalTimeMs) / 1000);
            agg.timedAttempts += r.timedAttempts;
        });

        // BKT mastery (Phase 3.5) lives on UserTopicPerformance, keyed by the
        // canonical topic name — merge P(mastery) onto each microTopic. Matched
        // case/whitespace-insensitively, the same way the heatmap resolves tiles.
        const masteryRows = await prisma.userTopicPerformance.findMany({
            where: { userId: uid },
            select: { topic: true, pMastery: true, masteryN: true },
        });
        const masteryByNorm = new Map(masteryRows.map((m) => [String(m.topic || '').trim().toLowerCase(), m]));
        for (const [topic, agg] of Object.entries(microTopics)) {
            const m = masteryByNorm.get(String(topic).trim().toLowerCase());
            if (m) { agg.mastery = m.pMastery; agg.masteryN = m.masteryN; }
        }

        const matrixAgg = await prisma.questionAttempt.groupBy({
            by: ['confidenceLevel', 'isCorrect'],
            where: { userId: uid },
            _count: { id: true }
        });

        const matrix = { hc: 0, hw: 0, lc: 0, lw: 0 };
        matrixAgg.forEach(group => {
            const conf = (group.confidenceLevel || '').toLowerCase() === 'high' ? 'h' : 'l';
            const correct = group.isCorrect ? 'c' : 'w';
            matrix[`${conf}${correct}`] += group._count.id;
        });

        // Per-mode breakdown: how many attempts came from each surface
        // (Active Review, Board Sim, Gauntlet, Combat, Battle). Powers the
        // dashboard "by mode" view so users can see where their reps land.
        const modeAgg = await prisma.questionAttempt.groupBy({
            by: ['mode', 'isCorrect'],
            where: { userId: uid },
            _count: { id: true },
        });
        const modeBreakdown = {};
        modeAgg.forEach((g) => {
            const k = g.mode || 'LEGACY';
            if (!modeBreakdown[k]) modeBreakdown[k] = { attempts: 0, correct: 0 };
            modeBreakdown[k].attempts += g._count.id;
            if (g.isCorrect) modeBreakdown[k].correct += g._count.id;
        });

        const totalAnswered = Object.values(modeBreakdown).reduce((s, m) => s + m.attempts, 0);

        // θ-history powers the Readiness Velocity chart. We store one row per
        // Manila day (telemetryService daily-upsert), so the last ~120 rows give
        // ~4 months of daily samples — enough for the Day/Week/Month buckets.
        const thetaRows = await prisma.thetaHistory.findMany({
            where: { userId: uid },
            orderBy: { recordedAt: 'asc' },
            take: 120,
            select: { theta: true, recordedAt: true },
        });
        const manilaFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });
        const thetaHistory = thetaRows.map((r) => ({
            date: manilaFmt.format(r.recordedAt),
            theta: r.theta,
        }));

        const payload = {
            success: true,
            data: {
                profile: {
                    uid: user.id,
                    displayName: user.displayName,
                    role: user.role,
                    globalStreak: user.globalStreak, thetaRating: user.thetaRating,
                    lastActive: user.lastActive, examDate: user.examDate, dailyTarget: user.dailyTarget,
                    dailyMath, dailyESAS, dailyEE,
                    totalAnswered,
                },
                activityCalendar,
                recentSessions: user.sessions,
                matrix,
                microTopics,
                modeBreakdown,
                thetaHistory,
            }
        };
        cacheSet(uid, payload);
        res.status(200).json(payload);
    } catch (error) {
        logger.error('Analytics dashboard error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to aggregate telemetry matrices.' });
    }
});

router.post('/telemetry-bulk', authMiddleware, validate(telemetryBulkSchema), idempotency(), async (req, res) => {
    try {
        const { attempts, sessionId, mode, targetSubject } = req.body;
        if (!attempts || attempts.length === 0) return res.status(200).json({ success: true, updatedTheta: 0 });

        const result = await recordAttempts({
            userId: req.user.id,
            attempts,
            sessionId: sessionId || null,
            mode: mode || 'LEGACY',
            targetSubject: targetSubject || null,
        });
        invalidateDashboard(req.user.id);
        res.status(200).json({
            success: true,
            updatedTheta: result.updatedTheta,
            written: result.written,
            sessionId: result.sessionId,
        });
    } catch (error) {
        logger.error('Telemetry bulk sync error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Matrix sync transaction rejected.' });
    }
});

router.delete('/purge', authMiddleware, async (req, res) => {
    invalidateDashboard(req.user.id);
    try {
        await prisma.$transaction(async (tx) => {
            await tx.questionAttempt.deleteMany({ where: { userId: req.user.id } });
            await tx.examSession.deleteMany({ where: { userId: req.user.id } });
            await tx.activityLog.deleteMany({ where: { userId: req.user.id } });
            await tx.userTopicPerformance.deleteMany({ where: { userId: req.user.id } });
            await tx.forecastSnapshot.deleteMany({ where: { userId: req.user.id } });
            await tx.userAbility.deleteMany({ where: { userId: req.user.id } });
            // Also wipe the surfaces these tables back: StudySession → Profile
            // "Study Time" tab, ThetaHistory → Readiness Velocity, and weekly
            // ReadinessSnapshot. Without these a purge left stale study-time and
            // an old velocity curve behind.
            await tx.studySession.deleteMany({ where: { userId: req.user.id } });
            await tx.thetaHistory.deleteMany({ where: { userId: req.user.id } });
            await tx.readinessSnapshot.deleteMany({ where: { userId: req.user.id } });
            await tx.user.update({
                where: { id: req.user.id },
                data: { thetaRating: 0.0, globalStreak: 0 }
            });
        });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to execute global purge sequence.' });
    }
});

module.exports = router;
