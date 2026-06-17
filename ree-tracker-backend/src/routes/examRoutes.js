// src/routes/examRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { calculateUpdatedTheta } = require('../utils/irtMath');

// Initialize Prisma v7 with PostgreSQL Driver Adapter
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

// Enforce SSL for Supabase PostgreSQL connections
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ============================================================================
// 1. GET QUESTIONS FROM POSTGRESQL BANK
// ============================================================================
router.get('/', async (req, res) => {
    try {
        const { subject, limit = 50 } = req.query;
        
        // Use raw SQL to efficiently pull random questions from the database
        const questions = await prisma.$queryRawUnsafe(`
            SELECT id, subject, subtopic, "questionText" as question, options, "cachedExplanation", "difficultyTheta"
            FROM "Question"
            WHERE "isFlagged" = false ${subject && subject !== 'All' && subject !== 'Blended' ? `AND subject = '${subject}'` : ''}
            ORDER BY RANDOM()
            LIMIT ${parseInt(limit)};
        `);
        
        // Note: We DO NOT send the "correctAnswer" property to the frontend to prevent cheating.
        return res.status(200).json({ success: true, items: questions });
    } catch (error) {
        console.error("[EXAM ENGINE] Fetch Questions Error:", error);
        return res.status(500).json({ error: 'Failed to fetch question matrix.' });
    }
});

// ============================================================================
// 2. SUBMIT EXAM & PROCESS TELEMETRY
// ============================================================================
router.post('/submit', async (req, res) => {
    // Check for user ID either from JWT middleware (req.user) or body fallback (req.body.uid)
    const userId = req.user?.id || req.body.uid;
    const { attempts, config, timeRemaining, totalExamTime } = req.body;

    if (!userId || !attempts || attempts.length === 0) {
        return res.status(400).json({ error: 'Missing required telemetry payload or User ID' });
    }

    try {
        const timeTakenSecs = (totalExamTime || 0) - (timeRemaining || 0);

        // Execute as a secure Database Transaction
        const result = await prisma.$transaction(async (tx) => {
            
            // 1. Fetch Master Questions from DB to securely check correct answers
            const questionIds = attempts.map(a => a.questionId).filter(Boolean);
            const masterQuestions = await tx.question.findMany({
                where: { id: { in: questionIds } }
            });

            // Create a lookup map for performance
            const questionMap = {};
            masterQuestions.forEach(q => { questionMap[q.id] = q; });

            let correctCount = 0;
            const gradedAttempts = [];
            const telemetryRows = [];

            // 2. Grade each attempt
            attempts.forEach(attempt => {
                const masterQ = questionMap[attempt.questionId];
                
                // Fallback for custom/AI questions not currently in the SQL bank
                const isCorrect = masterQ ? (masterQ.correctAnswer === attempt.userAnswer) : attempt.isCorrect;
                const difficulty = masterQ ? masterQ.difficultyTheta : 0.0;
                
                if (isCorrect) correctCount++;

                gradedAttempts.push({ isCorrect, questionDifficulty: difficulty });

                telemetryRows.push({
                    userId: userId,
                    questionId: attempt.questionId || 'dynamic-ai-id',
                    subject: attempt.subject || 'Blended',
                    subtopic: attempt.subtopic || 'General',
                    isCorrect: isCorrect,
                    confidenceLevel: attempt.confidence?.toUpperCase() || 'LOW',
                    timeSpentMs: (attempt.timeSpentSecs || 0) * 1000
                });
            });

            // 3. Create the Exam Session Record
            const sessionMode = config?.mode === 'blended' ? 'SIMULATION' : 'ADAPTIVE_QUIZ';
            const verdict = (correctCount / attempts.length) >= 0.70 ? 'PASSED' : 'FAILED';
            
            const examSession = await tx.examSession.create({
                data: {
                    userId: userId,
                    mode: sessionMode,
                    targetSubject: config?.subject || 'Blended',
                    score: correctCount,
                    totalQuestions: attempts.length,
                    timeTakenSecs: timeTakenSecs > 0 ? timeTakenSecs : 0,
                    verdict: verdict
                }
            });

            // 4. Insert all granular question attempts attached to this session
            const finalTelemetry = telemetryRows.map(row => ({ ...row, sessionId: examSession.id }));
            await tx.questionAttempt.createMany({ data: finalTelemetry });

            // 5. Calculate new IRT Theta and Upsert User Profile
            const userProfile = await tx.user.findUnique({ where: { id: userId } }) || { thetaRating: 0.0 };
            const newTheta = calculateUpdatedTheta(userProfile.thetaRating, gradedAttempts);

            const updatedUser = await tx.user.upsert({
                where: { id: userId },
                update: { thetaRating: newTheta, lastActive: new Date() },
                create: { id: userId, thetaRating: newTheta }
            });

            return { score: correctCount, total: attempts.length, newTheta: updatedUser.thetaRating };
        });

        // 6. Return strictly formatted data expected by the frontend React UI
        res.status(200).json({
            success: true,
            diagnostics: { 
                score: result.score, 
                total: result.total 
            },
            newStats: { 
                irt: { theta: result.newTheta },
                cloudTimestamp: Date.now() 
            }
        });

    } catch (error) {
        console.error("[EXAM ENGINE] Submit Error:", error);
        res.status(500).json({ error: 'Telemetry compilation failed.' });
    }
});

// 3. FETCH EXAM LEDGER HISTORY
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