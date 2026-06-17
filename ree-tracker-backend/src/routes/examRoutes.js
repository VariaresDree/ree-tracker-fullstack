// src/routes/examRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { calculateUpdatedTheta } = require('../utils/irtMath');
const prisma = require('../config/db'); // Centralized DB Connection

// ============================================================================
// 1. GET QUESTIONS FROM POSTGRESQL BANK
// ============================================================================
router.get('/', async (req, res) => {
    try {
        const { subject, limit = 50 } = req.query;
        
        // FIXED: Added 'answer' to the SELECT statement
        const questions = await prisma.$queryRawUnsafe(`
            SELECT id, subject, subtopic, text, options, answer, "fixedExplanation", difficulty, source, type
            FROM "Question"
            WHERE "isFlagged" = false ${subject && subject !== 'All' && subject !== 'Blended' ? `AND subject = '${subject}'` : ''}
            ORDER BY RANDOM()
            LIMIT ${parseInt(limit)};
        `);

        return res.status(200).json({ items: questions });
    } catch (error) {
        console.error("Fetch Error:", error);
        return res.status(500).json({ error: 'Database fetch failed.' });
    }
});

// ============================================================================
// 2. SUBMIT SIMULATION TELEMETRY (GRADING ENGINE)
// ============================================================================
router.post('/submit', authMiddleware, async (req, res) => {
    try {
        const { attempts, config, timeRemaining, totalExamTime } = req.body;
        
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        const currentTheta = user?.thetaRating || 0.0;
        
        const questionIds = attempts.map(a => a.questionId).filter(id => id !== undefined);
        const masterQuestions = await prisma.question.findMany({
            where: { id: { in: questionIds } }
        });

        // Map questions and inject a backwards-compatible alias for irtMath.js
        const qMap = {};
        masterQuestions.forEach(q => {
            qMap[q.id] = { ...q, difficultyTheta: q.difficulty };
        });

        let correctCount = 0;
        let parsedAttempts = [];
        let subjectPerformance = {}; 

        for (let attempt of attempts) {
            if (!attempt.questionId) continue;

            const masterQ = qMap[attempt.questionId];
            
            const isCorrect = masterQ ? (masterQ.answer === attempt.userAnswer) : attempt.isCorrect;

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
                timeSpentMs: (attempt.timeSpentSecs || 0) * 1000
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
        const newTheta = calculateUpdatedTheta(currentTheta, parsedAttempts, qMap);

        const session = await prisma.examSession.create({
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
            await prisma.questionAttempt.createMany({
                data: parsedAttempts.map(a => ({ ...a, sessionId: session.id }))
            });
        }

        await prisma.user.update({
            where: { id: req.user.id },
            data: { thetaRating: newTheta, lastActive: new Date() }
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
        console.error("[EXAM ENGINE] Submit Error:", error);
        res.status(500).json({ error: 'Telemetry compilation failed.' });
    }
});

// ============================================================================
// 3. FETCH EXAM LEDGER HISTORY
// ============================================================================
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const history = await prisma.examSession.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
        
        return res.status(200).json(history);
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