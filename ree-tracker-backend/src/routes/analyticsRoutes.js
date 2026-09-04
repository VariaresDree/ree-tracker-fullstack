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
const { normalizeSubject } = require('@ree/shared');
const { Prisma } = require('@prisma/client');
const { manilaDaySql } = require('../utils/manilaDate');
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
        // Start of "today" in Manila (UTC+8), expressed as a UTC instant.
        // Uses the SAME Manila date string that telemetryService keys ActivityLog
        // on, so the dashboard's daily Math/ESAS/EE counts always agree with the
        // activity calendar and never miss attempts due to server-TZ drift.
        const utcStartOfDay = new Date(`${todayManila()}T00:00:00+08:00`);

        // Every query below is independent, so all eight are issued before any
        // is awaited. They used to run as eight sequential awaits. This service
        // runs in Render's default region (Oregon) while the database is in
        // ap-southeast-1 (Singapore), so each await was a ~180ms trans-Pacific
        // round-trip: ~1.4s of pure network latency before any aggregation
        // happened. Measured 2.9s end-to-end for a user with 20 attempts, while
        // the heaviest of these queries executes in 1.9ms (EXPLAIN ANALYZE,
        // index scans throughout, no sequential scan). The cost was never the
        // aggregation - it was doing eight round-trips in a row.
        //
        // Concurrency is safe HERE specifically because none of these run inside
        // a transaction: each connection is held only for its own query, and if
        // the pool (PG_POOL_MAX, default 15) saturates these queue rather than
        // deadlock. That is NOT true of the telemetry write path, which does
        // hold an interactive transaction - see config/db.js on why pool sizing
        // is a correctness concern there, not just a perf knob.
        //
        // Merging these into fewer statements would buy almost nothing now that
        // they overlap: total latency is one round-trip either way. They stay
        // separate so each keeps the reasoning attached to it.

        const [
            user,
            attemptRollup,
            topicRows,
            masteryRows,
            thetaRows,
        ] = await Promise.all([
            prisma.user.findUnique({
                where: { id: uid },
                include: { sessions: { orderBy: { createdAt: 'desc' }, take: 10 } }
            }),

            // ONE statement replacing four that each scanned this user's attempts:
            // the daily per-subject counter, the all-time per-day rollup, the
            // confidence matrix and the per-mode breakdown. They shared a WHERE
            // clause, so the CTE is materialised and index-scanned ONCE and the
            // four aggregates read it back (verified: `CTE base` + four `CTE Scan`
            // nodes, 0.6ms total).
            //
            // Merging was deliberately REJECTED when these queries were first made
            // concurrent, on the grounds that overlapping requests cost one
            // round-trip regardless of statement count. That reasoning holds when
            // latency is the constraint. It does not hold here: this runs on
            // Render's free tier (0.1 CPU), where each Prisma round-trip costs real
            // engine time — query building, result deserialisation, BigInt handling.
            // Ten concurrent /healthz pings (a trivial DB ping) measured 1860ms
            // against ~200ms for one, which is a starved event loop, not a slow
            // database. Fewer statements is therefore a CPU win even though it is
            // no longer a latency win.
            //
            // COALESCE(answeredAt, createdAt) is exactly the OR-pair the daily
            // counter used to express, and the same expression the per-day rollup
            // already used — see the answeredAt notes on the model for why the day
            // a question was ANSWERED is not the day its batch reached the server.
            prisma.$queryRaw`
                WITH base AS (
                    SELECT "subject", "confidenceLevel", "isCorrect", "mode",
                           COALESCE("answeredAt", "createdAt") AS at
                    FROM "QuestionAttempt"
                    WHERE "userId" = ${uid}
                )
                SELECT 'day'::text AS kind,
                       ${manilaDaySql(Prisma.sql`at`)} AS k1,
                       NULL::boolean AS k2,
                       COUNT(*)::int AS n
                FROM base GROUP BY 2
                UNION ALL
                SELECT 'daily', "subject", NULL::boolean, COUNT(*)::int
                FROM base WHERE at >= ${utcStartOfDay} GROUP BY 2
                UNION ALL
                SELECT 'matrix', "confidenceLevel", "isCorrect", COUNT(*)::int
                FROM base GROUP BY 2, 3
                UNION ALL
                SELECT 'mode', "mode", "isCorrect", COUNT(*)::int
                FROM base GROUP BY 2, 3
            `,

            // Per-topic rollup through the taxonomy (Phase 3.3): attempts attribute
            // to their question's CURRENT topic (COALESCE back to the attempt's
            // stored label for unmapped/legacy rows), so re-tagging a question
            // retroactively corrects its history instead of stranding it under a
            // renamed string. Counts/accuracy use EVERY attempt; timing is bounded
            // to plausible values via FILTER — the live DB has corrupted rows
            // (0ms "instant" answers and ~1000x-inflated times) that would poison
            // the Speed Mapping averages. Tagged template = every value is a bound
            // parameter (fully guard-safe, no string interpolation into SQL).
            prisma.$queryRaw`
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
            `,

            // BKT mastery (Phase 3.5) lives on UserTopicPerformance, keyed by the
            // canonical topic name — merge P(mastery) onto each microTopic. Matched
            // case/whitespace-insensitively, the same way the heatmap resolves tiles.
            prisma.userTopicPerformance.findMany({
                where: { userId: uid },
                select: { topic: true, pMastery: true, masteryN: true },
            }),

            // θ-history powers the Readiness Velocity chart. We store one row per
            // Manila day (telemetryService daily-upsert), so the last ~120 rows give
            // ~4 months of daily samples — enough for the Day/Week/Month buckets.
            prisma.thetaHistory.findMany({
                where: { userId: uid },
                orderBy: { recordedAt: 'asc' },
                take: 120,
                select: { theta: true, recordedAt: true },
            }),
        ]);

        if (!user) return res.status(404).json({ error: 'User telemetry not found.' });

        // One pass over the merged rollup. `kind` discriminates the four
        // aggregates that used to be four separate queries; the per-bucket logic
        // below is unchanged from when each had its own.
        let dailyMath = 0, dailyESAS = 0, dailyEE = 0;
        const activityCalendar = {};
        let totalAnswered = 0;
        const matrix = { hc: 0, hw: 0, lc: 0, lw: 0 };
        const modeBreakdown = {};

        attemptRollup.forEach((r) => {
            switch (r.kind) {
                case 'daily': {
                    // Canonicalised through the shared table rather than compared
                    // inline. The old inline form matched only
                    // 'Mathematics'/'Math'/'ESAS'/'EE' exactly, so attempts stored
                    // under the long spellings ('Engineering Sciences and Allied
                    // Subjects', 'Electrical Engineering', 'Electrical Engineering
                    // Professional Subjects') were counted in NO bucket and
                    // silently vanished from the daily target ring.
                    const canonical = normalizeSubject(r.k1);
                    if (canonical === 'Mathematics') dailyMath += r.n;
                    else if (canonical === 'ESAS') dailyESAS += r.n;
                    else if (canonical === 'EE') dailyEE += r.n;
                    break;
                }
                case 'day':
                    activityCalendar[r.k1] = r.n;
                    totalAnswered += r.n;
                    break;
                case 'matrix': {
                    const conf = (r.k1 || '').toLowerCase() === 'high' ? 'h' : 'l';
                    matrix[`${conf}${r.k2 ? 'c' : 'w'}`] += r.n;
                    break;
                }
                case 'mode': {
                    const k = r.k1 || 'LEGACY';
                    if (!modeBreakdown[k]) modeBreakdown[k] = { attempts: 0, correct: 0 };
                    modeBreakdown[k].attempts += r.n;
                    if (r.k2) modeBreakdown[k].correct += r.n;
                    break;
                }
            }
        });

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

        const masteryByNorm = new Map(masteryRows.map((m) => [String(m.topic || '').trim().toLowerCase(), m]));
        for (const [topic, agg] of Object.entries(microTopics)) {
            const m = masteryByNorm.get(String(topic).trim().toLowerCase());
            if (m) { agg.mastery = m.pMastery; agg.masteryN = m.masteryN; }
        }

        // totalAnswered is NOT re-derived here — it's the same value computed
        // above from the activityCalendar rollup (Σ of every day), so the
        // Dashboard KPI and the Consistency Matrix's own total are structurally
        // guaranteed to agree. (modeBreakdown's own attempt sum happens to equal
        // it too, since both scan QuestionAttempt unfiltered by date — but
        // computing it twice from two different queries is exactly the
        // maintenance hazard that caused the original drift.)

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
