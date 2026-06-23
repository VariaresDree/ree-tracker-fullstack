const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { examSubmitSchema, gradeSchema } = require('../schemas/examSchemas');
const { calculateUpdatedTheta } = require('../utils/irtMath');
const { recordAttempts } = require('../services/telemetryService');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// GET QUESTIONS — answers excluded from response
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { subject, limit = 50 } = req.query;
        const parsedLimit = Math.min(parseInt(limit) || 50, 200);

        let whereClause = { isFlagged: false };
        if (subject && subject !== 'All' && subject !== 'Blended') {
            if (subject === 'Mathematics' || subject === 'Math') {
                whereClause.subject = { in: ['Math', 'Mathematics'] };
            } else if (subject === 'EE') {
                whereClause.subject = { in: ['EE', 'Electrical Engineering', 'Electrical Engineering Professional Subjects'] };
            } else if (subject === 'ESAS') {
                whereClause.subject = { in: ['ESAS', 'Engineering Sciences and Allied Subjects'] };
            } else {
                whereClause.subject = subject;
            }
        }

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
router.post('/grade', authMiddleware, validate(gradeSchema), async (req, res) => {
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
                attempts: answers.map((a) => ({
                    questionId: a.questionId,
                    userAnswer: a.userAnswer,
                    confidenceLevel: a.confidenceLevel || 'LOW',
                    timeSpentMs: a.timeSpentMs || 0,
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
router.post('/submit', authMiddleware, validate(examSubmitSchema), async (req, res) => {
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
        const newTheta = calculateUpdatedTheta(currentTheta, parsedAttempts);

        // Wrap all writes in a transaction
        const session = await prisma.$transaction(async (tx) => {
            const sess = await tx.examSession.create({
                data: {
                    userId: req.user.id,
                    mode: config?.mode || 'custom',
                    targetSubject: config?.subject || 'Blended',
                    score: scorePercentage,
                    totalQuestions: parsedAttempts.length,
                    timeTakenSecs: timeTakenSecs,
                    verdict: verdict,
                    config: config || {}
                }
            });

            if (parsedAttempts.length > 0) {
                await tx.questionAttempt.createMany({
                    data: parsedAttempts.map(({ questionDifficulty, ...rest }) => ({
                        ...rest,
                        sessionId: sess.id
                    }))
                });
            }

            await tx.user.update({
                where: { id: req.user.id },
                data: { thetaRating: newTheta, lastActive: new Date() }
            });

            return sess;
        });

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
