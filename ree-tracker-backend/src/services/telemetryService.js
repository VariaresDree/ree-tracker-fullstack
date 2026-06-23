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

function todayManila() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
}

/**
 * Record a batch of answered questions for a user.
 * @param {object} opts
 * @param {string} opts.userId
 * @param {Array<{questionId, userAnswer?, isCorrect?, confidenceLevel?, timeSpentMs?, subject?, subtopic?}>} opts.attempts
 * @param {string} [opts.sessionId] — optional ExamSession id to attach
 * @param {string} [opts.mode] — quiz mode tag (ACTIVE_REVIEW | BOARD_SIM | GAUNTLET | COMBAT | BATTLE)
 * @param {object} [opts.tx] — optional Prisma transaction client
 * @returns {Promise<{ written: number, updatedTheta: number }>}
 */
async function recordAttempts({ userId, attempts, sessionId = null, mode = 'LEGACY', tx = null }) {
    if (!Array.isArray(attempts) || attempts.length === 0) {
        return { written: 0, updatedTheta: null };
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

    if (mapped.length === 0) return { written: 0, updatedTheta: null };

    const today = todayManila();

    const runWrites = async (db) => {
        await db.questionAttempt.createMany({
            data: mapped.map(({ _difficulty, ...rest }) => rest),
        });
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

    // Recompute theta outside the transaction is fine — it's idempotent on input
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { thetaRating: true } });
    const currentTheta = user?.thetaRating ?? 0.0;
    const irtInput = mapped.map((m) => ({
        isCorrect: m.isCorrect,
        questionDifficulty: m._difficulty,
    }));
    const updatedTheta = calculateUpdatedTheta(currentTheta, irtInput);

    await prisma.user.update({
        where: { id: userId },
        data: { thetaRating: updatedTheta, lastActive: new Date() },
    });

    return { written: mapped.length, updatedTheta };
}

module.exports = { recordAttempts, canonicalSubject, todayManila };
