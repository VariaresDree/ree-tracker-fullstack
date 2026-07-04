const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const idempotency = require('../middlewares/idempotency');
const { validate } = require('../middlewares/validate');
const { examSubmitSchema, gradeSchema, nextItemSchema } = require('../schemas/examSchemas');
const { calculateUpdatedTheta } = require('../utils/irtMath');
const { getSubjectFilter } = require('../utils/subject');
const { recordAttempts } = require('../services/telemetryService');
const { selectNextItem, updateTheta } = require('../engine/irt');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// GET QUESTIONS — answers excluded from response
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { subject, limit = 50 } = req.query;
        const parsedLimit = Math.min(parseInt(limit) || 50, 200);

        let whereClause = { isFlagged: false };
        // 'Blended' means no subject constraint (mix everything); otherwise use
        // the shared filter that matches every stored spelling of the subject.
        const subjFilter = subject !== 'Blended' ? getSubjectFilter(subject) : undefined;
        if (subjFilter) whereClause.subject = subjFilter;

        const questions = await prisma.question.findMany({
            where: whereClause,
            select: {
                id: true,
                subject: true,
                subtopic: true,
                text: true,
                options: true,
                difficulty: true,
                source: true,
                type: true
            },
            take: parsedLimit
        });

        // Shuffle in JS since Prisma doesn't support ORDER BY RANDOM()
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }

        return res.status(200).json({ items: questions });
    } catch (error) {
        logger.error('Exam questions fetch error', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Database fetch failed.' });
    }
});

// GRADE — accepts answers and returns graded results
router.post('/grade', authMiddleware, idempotency(), validate(gradeSchema), async (req, res) => {
    try {
        const { answers } = req.body;
        if (!Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({ error: 'answers array is required.' });
        }

        const questionIds = answers.map(a => a.questionId).filter(Boolean);
        const masterQuestions = await prisma.question.findMany({
            where: { id: { in: questionIds } },
            select: { id: true, answer: true, fixedExplanation: true, difficulty: true }
        });
        const qMap = {};
        masterQuestions.forEach(q => { qMap[q.id] = q; });

        const results = answers.map(a => {
            const masterQ = qMap[a.questionId];
            if (!masterQ) return { questionId: a.questionId, isCorrect: false, correctAnswer: null, explanation: null };
            return {
                questionId: a.questionId,
                isCorrect: masterQ.answer === a.userAnswer,
                correctAnswer: masterQ.answer,
                explanation: masterQ.fixedExplanation || null
            };
        });

        // Persist attempts so Gauntlet/Combat results show up in Dashboard + Profile analytics.
        // Default confidence LOW and zero time when caller doesn't supply them.
        let telemetry = null;
        try {
            telemetry = await recordAttempts({
                userId: req.user.id,
                mode: req.body.mode || 'GAUNTLET',
                attempts: answers.map((a) => ({
                    questionId: a.questionId,
                    userAnswer: a.userAnswer,
                    confidenceLevel: a.confidenceLevel || 'LOW',
                    timeSpentMs: a.timeSpentMs || 0,
                    clientAttemptId: a.clientAttemptId,
                })),
            });
        } catch (telErr) {
            logger.warn('grade telemetry persist failed', { error: telErr.message });
        }

        return res.status(200).json({ results, telemetry });
    } catch (error) {
        logger.error('Exam grading error', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Grading failed.' });
    }
});

// SUBMIT SIMULATION TELEMETRY (GRADING ENGINE)
router.post('/submit', authMiddleware, idempotency(), validate(examSubmitSchema), async (req, res) => {
    try {
        const { attempts, config, timeRemaining, totalExamTime } = req.body;

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        const currentTheta = user?.thetaRating || 0.0;

        const questionIds = attempts.map(a => a.questionId).filter(Boolean);
        const masterQuestions = await prisma.question.findMany({
            where: { id: { in: questionIds } }
        });

        const qMap = {};
        masterQuestions.forEach(q => {
            qMap[q.id] = q;
        });

        let correctCount = 0;
        let parsedAttempts = [];
        let subjectPerformance = {};

        for (let attempt of attempts) {
            if (!attempt.questionId) continue;

            const masterQ = qMap[attempt.questionId];
            const isCorrect = masterQ ? (masterQ.answer === attempt.userAnswer) : false;

            if (isCorrect) correctCount++;

            const sub = masterQ?.subject || attempt.subject || 'General';
            if (!subjectPerformance[sub]) subjectPerformance[sub] = { correct: 0, total: 0 };
            subjectPerformance[sub].total++;
            if (isCorrect) subjectPerformance[sub].correct++;

            parsedAttempts.push({
                userId: req.user.id,
                questionId: attempt.questionId,
                subject: sub,
                subtopic: masterQ?.subtopic || attempt.subtopic || 'General',
                isCorrect: isCorrect,
                confidenceLevel: attempt.confidence || 'LOW',
                timeSpentMs: (attempt.timeSpentSecs || 0) * 1000,
                clientAttemptId: attempt.clientAttemptId,
                questionDifficulty: masterQ?.difficulty || 0.0
            });
        }

        const scorePercentage = parsedAttempts.length > 0 ? Math.round((correctCount / parsedAttempts.length) * 100) : 0;
        let verdict = 'FAILED';
        let verdictColor = 'text-reeRed';
        if (scorePercentage >= 70) {
            verdict = 'PASSED';
            verdictColor = 'text-reeGreen';
        } else if (scorePercentage >= 50) {
            verdict = 'CONDITIONAL PASS';
            verdictColor = 'text-reeAmber';
        }

        const timeTakenSecs = totalExamTime - timeRemaining;

        // Create the ExamSession first, then route per-question attempts
        // through the shared recordAttempts() path so they land in the same
        // tables (with ActivityLog + theta recompute) as Active Review and
        // Battle submissions — no duplicate logic, single source of truth.
        // Create the session shell at ZERO counts — recordAttempts' upsert
        // increments them from the actually-inserted rows. Pre-filling the
        // final totals here made the subsequent increments DOUBLE them.
        const session = await prisma.examSession.create({
            data: {
                userId: req.user.id,
                mode: config?.mode || 'custom',
                targetSubject: config?.subject || 'Blended',
                score: 0,
                totalQuestions: 0,
                timeTakenSecs: timeTakenSecs,
                verdict: verdict,
                config: config || {},
            },
        });

        let newTheta = currentTheta;
        if (parsedAttempts.length > 0) {
            const telemetry = await recordAttempts({
                userId: req.user.id,
                sessionId: session.id,
                mode: 'BOARD_SIM',
                attempts: parsedAttempts.map((a) => ({
                    questionId: a.questionId,
                    isCorrect: a.isCorrect,
                    subject: a.subject,
                    subtopic: a.subtopic,
                    confidenceLevel: a.confidenceLevel,
                    timeSpentMs: a.timeSpentMs,
                    clientAttemptId: a.clientAttemptId,
                })),
            });
            if (telemetry?.updatedTheta != null) newTheta = telemetry.updatedTheta;
        }

        res.status(200).json({
            success: true,
            diagnostics: {
                overallScore: scorePercentage,
                correctCount: correctCount,
                totalCount: parsedAttempts.length,
                verdict: verdict,
                verdictColor: verdictColor,
                timeTaken: timeTakenSecs,
                subjTracker: subjectPerformance,
                timeSinks: parsedAttempts.filter(a => a.timeSpentMs > 180000).map(a => ({ idx: attempts.findIndex(at => at.questionId === a.questionId), time: Math.floor(a.timeSpentMs / 1000) })),
                blindSpots: parsedAttempts.filter(a => a.confidenceLevel === 'HIGH' && !a.isCorrect).map(a => attempts.findIndex(at => at.questionId === a.questionId))
            },
            newStats: {
                irt: { theta: newTheta },
                cloudTimestamp: Date.now()
            }
        });

    } catch (error) {
        logger.error('Exam submit error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Telemetry compilation failed.' });
    }
});

// CAT — server picks the next item that maximally tightens the user's
// ability estimate. Accepts the in-session attempt log so we can update
// theta inline without a separate /grade roundtrip.
//
// Body: {
//   subject?: string,
//   recentIds?: string[],
//   sessionAttempts?: [{ questionId, isCorrect }],
//   poolSize?: number    // optional candidate-pool size (default 80)
// }
router.post('/next-item', authMiddleware, validate(nextItemSchema), async (req, res) => {
    try {
        const { subject, recentIds, sessionAttempts, poolSize } = req.body;
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { thetaRating: true, standardError: true },
        });

        let prior = { theta: user?.thetaRating ?? 0, se: user?.standardError ?? 1 };

        // Refine prior with this session's attempts so consecutive picks
        // converge faster than waiting for /submit.
        if (Array.isArray(sessionAttempts) && sessionAttempts.length > 0) {
            const ids = sessionAttempts.map((a) => a.questionId).filter(Boolean);
            const items = await prisma.question.findMany({
                where: { id: { in: ids } },
                select: { id: true, irtA: true, irtB: true, irtC: true, difficulty: true },
            });
            const itemMap = Object.fromEntries(items.map((q) => [q.id, q]));
            const sessionPairs = sessionAttempts
                .map((a) => {
                    const q = itemMap[a.questionId];
                    if (!q) return null;
                    return {
                        item: {
                            a: q.irtA ?? 1,
                            b: q.irtB ?? q.difficulty ?? 0,
                            c: q.irtC ?? 0.2,
                        },
                        correct: !!a.isCorrect,
                    };
                })
                .filter(Boolean);
            if (sessionPairs.length > 0) prior = updateTheta(prior, sessionPairs);
        }

        const whereClause = { isFlagged: false };
        if (subject && subject !== 'All' && subject !== 'Blended') whereClause.subject = subject;

        const candidates = await prisma.question.findMany({
            where: whereClause,
            select: {
                id: true,
                subject: true,
                subtopic: true,
                text: true,
                options: true,
                irtA: true,
                irtB: true,
                irtC: true,
                difficulty: true,
                source: true,
                type: true,
            },
            take: poolSize,
        });

        const pool = candidates.map((q) => ({
            id: q.id,
            a: q.irtA ?? null,
            b: q.irtB ?? (q.difficulty != null ? q.difficulty : null),
            c: q.irtC ?? 0.2,
        }));

        const pick = selectNextItem(
            { theta: prior.theta, recentIds: new Set(recentIds) },
            pool,
        );

        const chosen = candidates.find((q) => q.id === pick.id) || null;

        return res.status(200).json({
            item: chosen,
            ability: prior,
            selection: { info: pick.info, fallback: pick.fallback },
        });
    } catch (error) {
        logger.error('CAT next-item failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Next item selection failed.' });
    }
});

// FETCH EXAM LEDGER HISTORY
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const cursor = req.query.cursor;

        const history = await prisma.examSession.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
        });

        const hasMore = history.length > limit;
        if (hasMore) history.pop();

        return res.status(200).json({
            items: history,
            nextCursor: hasMore ? history[history.length - 1].id : null
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch exam history.' });
    }
});

router.delete('/history/:id', authMiddleware, async (req, res) => {
    try {
        await prisma.examSession.delete({ where: { id: req.params.id, userId: req.user.id } });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to purge record.' });
    }
});

module.exports = router;
