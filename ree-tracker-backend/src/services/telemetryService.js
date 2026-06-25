// src/services/telemetryService.js
// Shared telemetry-writing helper used by /api/analytics/telemetry-bulk,
// /api/exams/grade, and /api/battles/:id/submit so every answered question
// from anywhere in the app lands in QuestionAttempt + ActivityLog and updates
// the user's IRT theta + lastActive.
const prisma = require('../config/db');
const { calculateUpdatedTheta } = require('../utils/irtMath');

const SUBJECT_CANONICAL = {
    'math': 'Mathematics',
    'mathematics': 'Mathematics',
    'esas': 'ESAS',
    'engineering sciences and allied subjects': 'ESAS',
    'ee': 'EE',
    'electrical engineering': 'EE',
    'electrical engineering professional subjects': 'EE',
};

const canonicalSubject = (s) => {
    if (!s) return 'General';
    const norm = String(s).trim().toLowerCase();
    return SUBJECT_CANONICAL[norm] || s;
};

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
        return { written: 0, updatedTheta: null, sessionId: null };
    }

    const client = tx || prisma;

    const questionIds = attempts.map((a) => a.questionId).filter(Boolean);
    const masterQuestions = questionIds.length
        ? await client.question.findMany({
            where: { id: { in: questionIds } },
            select: { id: true, answer: true, difficulty: true, subject: true, subtopic: true },
        })
        : [];
    const qMap = Object.create(null);
    for (const q of masterQuestions) qMap[q.id] = q;

    const mapped = attempts
        .filter((a) => a.questionId && qMap[a.questionId])
        .map((a) => {
            const m = qMap[a.questionId];
            const isCorrect = a.userAnswer != null ? m.answer === a.userAnswer : !!a.isCorrect;
            return {
                userId,
                questionId: a.questionId,
                subject: canonicalSubject(a.subject || m.subject || 'General'),
                subtopic: a.subtopic || m.subtopic || 'General',
                isCorrect,
                confidenceLevel: String(a.confidenceLevel || 'LOW').toUpperCase(),
                timeSpentMs: parseInt(a.timeSpentMs) || 0,
                sessionId,
                mode,
                _difficulty: m.difficulty || 0.0,
            };
        });

    if (mapped.length === 0) return { written: 0, updatedTheta: null, sessionId: null };

    const today = todayManila();

    // Aggregates derived from this batch — used to update the ExamSession's
    // running score/totals when the same session sends multiple batches
    // (the event-driven debounced sync may flush a session in chunks).
    const batchCorrect = mapped.filter((m) => m.isCorrect).length;
    const batchTimeSecs = Math.floor(mapped.reduce((s, m) => s + (m.timeSpentMs || 0), 0) / 1000);
    const batchTarget = canonicalSubject(targetSubject || mapped[0]?.subject || 'General');

    // Auto-upsert the ExamSession before writing attempts so the FK is always
    // satisfied. Verdict stays IN_PROGRESS until an end-of-session call
    // (currently outside recordAttempts; this is forward-compatible).
    let resolvedSessionId = sessionId;
    const ensureSession = async (db) => {
        if (!sessionId) return null;
        try {
            await db.examSession.upsert({
                where: { id: sessionId },
                update: {
                    score: { increment: batchCorrect },
                    totalQuestions: { increment: mapped.length },
                    timeTakenSecs: { increment: batchTimeSecs },
                },
                create: {
                    id: sessionId,
                    userId,
                    mode,
                    targetSubject: batchTarget,
                    score: batchCorrect,
                    totalQuestions: mapped.length,
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

    const runWrites = async (db) => {
        resolvedSessionId = await ensureSession(db);
        const attemptsData = mapped.map(({ _difficulty, sessionId: _s, ...rest }) => ({
            ...rest,
            sessionId: resolvedSessionId,
        }));
        await db.questionAttempt.createMany({ data: attemptsData });

        const existingToday = await db.activityLog.findUnique({
            where: { userId_date: { userId, date: today } },
            select: { userId: true },
        });
        isFirstActivityToday = !existingToday;

        await db.activityLog.upsert({
            where: { userId_date: { userId, date: today } },
            update: { count: { increment: mapped.length } },
            create: { userId, date: today, count: mapped.length },
        });
    };

    if (tx) {
        await runWrites(tx);
    } else {
        await prisma.$transaction(async (db) => { await runWrites(db); });
    }

    // Recompute theta + streak outside the transaction — both are idempotent
    // on the batch input, and keeping them out of the write tx shortens the
    // lock window under load.
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { thetaRating: true, globalStreak: true },
    });
    const currentTheta = user?.thetaRating ?? 0.0;
    const irtInput = mapped.map((m) => ({
        isCorrect: m.isCorrect,
        questionDifficulty: m._difficulty,
    }));
    const updatedTheta = calculateUpdatedTheta(currentTheta, irtInput);

    // Global Active Streak — advances at most once per Manila day. On the first
    // answered question of a new day we increment if yesterday also had
    // activity, otherwise the run is broken and we reset to 1. Later batches the
    // same day leave the streak untouched (but self-heal to >=1 for legacy rows
    // that were stuck at 0 despite activity today).
    let newStreak = user?.globalStreak ?? 0;
    if (isFirstActivityToday) {
        const hadYesterday = await prisma.activityLog.findUnique({
            where: { userId_date: { userId, date: yesterdayManila() } },
            select: { userId: true },
        });
        newStreak = hadYesterday ? (user?.globalStreak ?? 0) + 1 : 1;
    } else {
        newStreak = Math.max(user?.globalStreak ?? 0, 1);
    }

    await prisma.user.update({
        where: { id: userId },
        data: { thetaRating: updatedTheta, lastActive: new Date(), globalStreak: newStreak },
    });

    // θ-history — one point per Manila day, updated in place within the day so
    // the Readiness Velocity chart gets clean daily samples and the table stays
    // bounded (one row/day instead of one/batch).
    const lastTheta = await prisma.thetaHistory.findFirst({
        where: { userId },
        orderBy: { recordedAt: 'desc' },
        select: { id: true, recordedAt: true },
    });
    if (lastTheta && manilaDateOf(lastTheta.recordedAt) === today) {
        await prisma.thetaHistory.update({
            where: { id: lastTheta.id },
            data: { theta: updatedTheta },
        });
    } else {
        await prisma.thetaHistory.create({ data: { userId, theta: updatedTheta } });
    }

    return { written: mapped.length, updatedTheta, sessionId: resolvedSessionId };
}

module.exports = { recordAttempts, canonicalSubject, todayManila };
