// src/services/telemetryService.js
// Shared telemetry-writing helper used by /api/analytics/telemetry-bulk,
// /api/exams/grade, and /api/battles/:id/submit so every answered question
// from anywhere in the app lands in QuestionAttempt + ActivityLog and updates
// the user's IRT theta + lastActive.
const { Prisma } = require('@prisma/client');
const { randomUUID } = require('crypto');
const prisma = require('../config/db');
// Single canonical ability estimator: the 3PL Bayesian MLE (engine/irt.updateTheta),
// replacing the old Rasch gradient step (utils/irtMath.calculateUpdatedTheta). This
// puts User.thetaRating + standardError on the same scale the CAT prior and the
// forecast already assume, and populates the (previously never-written) standardError.
const { updateTheta } = require('../engine/irt');
const { partitionNewAttempts, aggregateTopicRollups } = require('./telemetryHelpers');
const dashboardCache = require('./dashboardCache');
const readinessCache = require('./readinessCache');
const logger = require('../utils/logger');

// Canonical subject naming lives in one place now (utils/subject); kept aliased
// as canonicalSubject for this module's internal uses and its export.
const { normalizeSubject: canonicalSubject } = require('../utils/subject');

// Single shared formatter — en-CA yields the YYYY-MM-DD shape ActivityLog keys on.
const MANILA_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });
function todayManila() {
    return MANILA_FMT.format(new Date());
}
// Manila "yesterday". Manila is a fixed UTC+8 with no DST, so subtracting a flat
// 24h is always correct (no spring-forward/fall-back edge cases).
function yesterdayManila() {
    return MANILA_FMT.format(new Date(Date.now() - 86400000));
}
// Manila calendar date of an arbitrary instant — used to dedupe ThetaHistory to
// one point per day.
function manilaDateOf(d) {
    return MANILA_FMT.format(d);
}

/**
 * Record a batch of answered questions for a user.
 *
 * Important: if a non-null `sessionId` is provided but no matching ExamSession
 * row exists (the common case — frontend mints a UUID per session), we upsert
 * the ExamSession FIRST so the QuestionAttempt FK is satisfied. This is the
 * keystone fix for the "Matrix sync transaction rejected" 500: previously the
 * FK violation propagated as a generic 500 and starved every dashboard widget.
 *
 * @param {object} opts
 * @param {string} opts.userId
 * @param {Array<{questionId, userAnswer?, isCorrect?, confidenceLevel?, timeSpentMs?, subject?, subtopic?}>} opts.attempts
 * @param {string} [opts.sessionId] — optional ExamSession id; auto-created if needed
 * @param {string} [opts.mode] — quiz mode tag (ACTIVE_REVIEW | BOARD_SIM | GAUNTLET | COMBAT | BATTLE)
 * @param {string} [opts.targetSubject] — subject the session is targeting (for the auto-created ExamSession)
 * @param {object} [opts.tx] — optional Prisma transaction client
 * @returns {Promise<{ written: number, updatedTheta: number, sessionId: string|null }>}
 */
async function recordAttempts({ userId, attempts, sessionId = null, mode = 'LEGACY', targetSubject = null, tx = null }) {
    if (!Array.isArray(attempts) || attempts.length === 0) {
        return { written: 0, updatedTheta: null, sessionId: null, graded: [] };
    }

    const client = tx || prisma;

    const questionIds = attempts.map((a) => a.questionId).filter(Boolean);
    const masterQuestions = questionIds.length
        ? await client.question.findMany({
            where: { id: { in: questionIds } },
            select: { id: true, answer: true, difficulty: true, subject: true, subtopic: true, irtA: true, irtB: true, irtC: true },
        })
        : [];
    const qMap = Object.create(null);
    for (const q of masterQuestions) qMap[q.id] = q;

    const gradeDiscrepancies = [];
    const mapped = attempts
        .filter((a) => a.questionId && qMap[a.questionId])
        .map((a) => {
            const m = qMap[a.questionId];
            const serverGraded = a.userAnswer != null;
            const isCorrect = serverGraded ? m.answer === a.userAnswer : !!a.isCorrect;
            // Discrepancy signal: the client sent both a userAnswer (which we
            // re-grade) AND its own isCorrect, and they disagree → the client's
            // (offline) answer key has drifted from the master. The SERVER score
            // is canonical; we just log the drift so it's visible, not silent.
            if (serverGraded && typeof a.isCorrect === 'boolean' && a.isCorrect !== isCorrect) {
                gradeDiscrepancies.push({ questionId: a.questionId, client: a.isCorrect, server: isCorrect, offline: !!a.offline });
            }
            return {
                userId,
                questionId: a.questionId,
                subject: canonicalSubject(a.subject || m.subject || 'General'),
                subtopic: a.subtopic || m.subtopic || 'General',
                isCorrect,
                confidenceLevel: String(a.confidenceLevel || 'LOW').toUpperCase(),
                timeSpentMs: parseInt(a.timeSpentMs) || 0,
                clientAttemptId: a.clientAttemptId || null,
                offline: !!a.offline,
                sessionId,
                mode,
                _difficulty: m.difficulty || 0.0,
                // 3PL item params for the theta estimator (stripped before the
                // QuestionAttempt write). irtB falls back to legacy difficulty;
                // a/c to sane 3PL defaults for uncalibrated items.
                _a: m.irtA,
                _b: m.irtB,
                _c: m.irtC,
            };
        });

    if (gradeDiscrepancies.length > 0) {
        logger.warn('telemetry grading discrepancy (server score is canonical)', {
            userId, mode, count: gradeDiscrepancies.length, samples: gradeDiscrepancies.slice(0, 10),
        });
    }

    // `skipped` makes silent drops observable: attempts whose questionId
    // isn't in the Question table (e.g. unsaved AI-generated items) used to
    // vanish without a trace, undercounting sessions.
    const skipped = attempts.length - mapped.length;

    if (mapped.length === 0) {
        return { written: 0, received: attempts.length, skipped, deduped: 0, updatedTheta: null, sessionId: null, graded: [] };
    }

    const today = todayManila();

    // Auto-upsert the ExamSession before writing attempts so the FK is always
    // satisfied. Verdict stays IN_PROGRESS until an end-of-session call
    // (currently outside recordAttempts; this is forward-compatible).
    // Increments are computed from the NEW rows only — a replayed batch used
    // to re-increment these counters, which is how a 10-item session showed
    // 20/30+ answered.
    let resolvedSessionId = sessionId;
    const ensureSession = async (db, newOnly) => {
        if (!sessionId) return null;
        const batchCorrect = newOnly.filter((m) => m.isCorrect).length;
        const batchTimeSecs = Math.floor(newOnly.reduce((s, m) => s + (m.timeSpentMs || 0), 0) / 1000);
        const batchTarget = canonicalSubject(targetSubject || newOnly[0]?.subject || 'General');
        try {
            await db.examSession.upsert({
                where: { id: sessionId },
                update: {
                    score: { increment: batchCorrect },
                    totalQuestions: { increment: newOnly.length },
                    timeTakenSecs: { increment: batchTimeSecs },
                },
                create: {
                    id: sessionId,
                    userId,
                    mode,
                    targetSubject: batchTarget,
                    score: batchCorrect,
                    totalQuestions: newOnly.length,
                    timeTakenSecs: batchTimeSecs,
                    verdict: 'IN_PROGRESS',
                },
            });
            return sessionId;
        } catch (_) {
            // Defence in depth: if the session upsert ever fails, drop the FK
            // rather than 500 the whole batch — recording with sessionId=null
            // is still strictly better than losing the user's attempts.
            return null;
        }
    };

    // Whether this batch is the FIRST answered question for the user today
    // (Manila). Drives the once-per-day streak advance below.
    let isFirstActivityToday = false;
    let newOnly = mapped;
    let dedupedCount = 0;

    const runWrites = async (db) => {
        // Hard dedupe: rows whose clientAttemptId this user already recorded
        // are replays (retry after a timeout the server actually completed,
        // app-reopen re-flush, etc.) — grade them, but write NOTHING.
        const claimedIds = mapped.map((m) => m.clientAttemptId).filter(Boolean);
        const existing = claimedIds.length
            ? await db.questionAttempt.findMany({
                where: { userId, clientAttemptId: { in: claimedIds } },
                select: { clientAttemptId: true },
            })
            : [];
        const partition = partitionNewAttempts(new Set(existing.map((e) => e.clientAttemptId)), mapped);
        newOnly = partition.newOnly;
        dedupedCount = partition.duplicates.length;

        if (newOnly.length === 0) return; // pure replay — nothing to write

        resolvedSessionId = await ensureSession(db, newOnly);
        const attemptsData = newOnly.map(({ _difficulty, _a, _b, _c, sessionId: _s, ...rest }) => ({
            ...rest,
            sessionId: resolvedSessionId,
        }));
        // skipDuplicates backstops the race where two identical batches pass
        // the pre-select simultaneously — the (userId, clientAttemptId) unique
        // index turns the loser's insert into a no-op.
        await db.questionAttempt.createMany({ data: attemptsData, skipDuplicates: true });

        const existingToday = await db.activityLog.findUnique({
            where: { userId_date: { userId, date: today } },
            select: { userId: true },
        });
        isFirstActivityToday = !existingToday;

        await db.activityLog.upsert({
            where: { userId_date: { userId, date: today } },
            update: { count: { increment: newOnly.length } },
            create: { userId, date: today, count: newOnly.length },
        });

        // Per-topic rollups feed the forecast/prescription engine — nothing
        // populated UserTopicPerformance before, so "Today's prescription"
        // and weak-topic ranking always came back empty.
        //
        // Batched into ONE upsert statement instead of a serial await-loop of N
        // upserts: a blended battle spanning many subtopics used to hold the
        // write transaction (and its locks) open for N sequential round-trips.
        // Still inside the transaction, so a SQL error fails safe (whole batch
        // rolls back — never a partial/corrupt rollup).
        const rollups = aggregateTopicRollups(newOnly);
        if (rollups.length > 0) {
            const now = new Date();
            const rows = rollups.map((r) => Prisma.sql`(${randomUUID()}, ${userId}, ${r.subject}, ${r.topic}, ${r.attempts}, ${r.correct}, ${r.totalTimeSecs}, ${now})`);
            await db.$executeRaw`
                INSERT INTO "UserTopicPerformance" ("id", "userId", "subject", "topic", "attempts", "correct", "totalTime", "updatedAt")
                VALUES ${Prisma.join(rows)}
                ON CONFLICT ("userId", "topic") DO UPDATE SET
                    "attempts"  = "UserTopicPerformance"."attempts"  + EXCLUDED."attempts",
                    "correct"   = "UserTopicPerformance"."correct"   + EXCLUDED."correct",
                    "totalTime" = "UserTopicPerformance"."totalTime" + EXCLUDED."totalTime",
                    "updatedAt" = EXCLUDED."updatedAt"
            `;
        }
    };

    if (tx) {
        await runWrites(tx);
    } else {
        await prisma.$transaction(async (db) => { await runWrites(db); });
    }

    // Pure replay: grade from the master answers but leave every aggregate
    // untouched, and report the user's CURRENT theta so clients don't
    // clobber their local value with null.
    if (newOnly.length === 0) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { thetaRating: true } });
        dashboardCache.invalidate(userId);
        readinessCache.invalidate(userId);
        return {
            written: 0,
            received: attempts.length,
            skipped,
            deduped: dedupedCount,
            updatedTheta: user?.thetaRating ?? null,
            sessionId: resolvedSessionId,
            graded: mapped.map((m) => ({ questionId: m.questionId, isCorrect: m.isCorrect })),
        };
    }

    // Recompute theta + streak in a second, short transaction with a row lock
    // on the user. Concurrent batches for the same user (e.g. a telemetry-bulk
    // flush landing at the same time as a battle-submit) previously did
    // read-modify-write against `prisma` directly, so the last writer silently
    // clobbered the other's theta/streak. FOR UPDATE serializes them. Kept
    // separate from runWrites so the attempt-write lock window stays short.
    // 3PL estimator input: each new attempt's item params (with fallbacks for
    // uncalibrated items) + correctness. updateTheta folds these onto the prior
    // posterior (theta, se) — a proper Bayesian update, not a fixed gradient step.
    const pairs = newOnly.map((m) => ({
        item: { a: m._a ?? 1, b: m._b ?? m._difficulty ?? 0, c: m._c ?? 0.2 },
        correct: m.isCorrect,
    }));
    let updatedTheta = 0.0;
    let updatedSe = 0.5;
    await prisma.$transaction(async (db) => {
        const [user] = await db.$queryRaw`SELECT "thetaRating", "standardError", "globalStreak" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
        const prior = { theta: user?.thetaRating ?? 0.0, se: user?.standardError ?? 0.5 };
        const est = updateTheta(prior, pairs);
        updatedTheta = est.theta;
        updatedSe = est.se;

        // Global Active Streak — advances at most once per Manila day. On the first
        // answered question of a new day we increment if yesterday also had
        // activity, otherwise the run is broken and we reset to 1. Later batches the
        // same day leave the streak untouched (but self-heal to >=1 for legacy rows
        // that were stuck at 0 despite activity today).
        let newStreak = user?.globalStreak ?? 0;
        if (isFirstActivityToday) {
            const hadYesterday = await db.activityLog.findUnique({
                where: { userId_date: { userId, date: yesterdayManila() } },
                select: { userId: true },
            });
            newStreak = hadYesterday ? (user?.globalStreak ?? 0) + 1 : 1;
        } else {
            newStreak = Math.max(user?.globalStreak ?? 0, 1);
        }

        await db.user.update({
            where: { id: userId },
            data: { thetaRating: updatedTheta, standardError: updatedSe, lastActive: new Date(), globalStreak: newStreak },
        });

        // θ-history — one point per Manila day, updated in place within the day so
        // the Readiness Velocity chart gets clean daily samples and the table stays
        // bounded (one row/day instead of one/batch).
        const lastTheta = await db.thetaHistory.findFirst({
            where: { userId },
            orderBy: { recordedAt: 'desc' },
            select: { id: true, recordedAt: true },
        });
        if (lastTheta && manilaDateOf(lastTheta.recordedAt) === today) {
            await db.thetaHistory.update({
                where: { id: lastTheta.id },
                data: { theta: updatedTheta },
            });
        } else {
            await db.thetaHistory.create({ data: { userId, theta: updatedTheta } });
        }
    });

    // One choke point for cache freshness: every write surface funnels
    // through recordAttempts (telemetry-bulk, exams/grade, exams/submit,
    // battle-submit), so neither the dashboard NOR the readiness score serves a
    // stale payload after ANY kind of session. readinessCache was never busted
    // here, so /api/readiness lagged the dashboard by up to 60s post-session.
    dashboardCache.invalidate(userId);
    readinessCache.invalidate(userId);

    return {
        written: newOnly.length,
        received: attempts.length,
        skipped,
        deduped: dedupedCount,
        updatedTheta,
        sessionId: resolvedSessionId,
        // Server-side grading verdicts (from Question.answer) for the FULL
        // batch — replayed battle submits still need their score.
        graded: mapped.map((m) => ({ questionId: m.questionId, isCorrect: m.isCorrect })),
    };
}

module.exports = { recordAttempts, canonicalSubject, todayManila };
