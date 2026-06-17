// src/controllers/examController.js
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { calculateUpdatedTheta } = require('../utils/irtMath');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 1. SERVE QUESTIONS TO THE FRONTEND
exports.getQuestions = async (req, res) => {
    try {
        const { subject, limit = 50 } = req.query;
        
        // Build the query
        const whereClause = (subject && subject !== 'All' && subject !== 'Blended') 
            ? { subject: subject, isFlagged: false } 
            : { isFlagged: false };

        // Note: For large databases, raw SQL with ORDER BY RANDOM() is more efficient, 
        // but Prisma handles random sampling via raw queries.
        const questions = await prisma.$queryRawUnsafe(`
            SELECT id, subject, subtopic, "questionText" as question, options, "cachedExplanation", "difficultyTheta"
            FROM "Question"
            WHERE "isFlagged" = false ${subject && subject !== 'All' && subject !== 'Blended' ? `AND subject = '${subject}'` : ''}
            ORDER BY RANDOM()
            LIMIT ${parseInt(limit)};
        `);

        // We DO NOT send the "correctAnswer" to the frontend.
        // It stays hidden in the backend to prevent cheating via browser dev tools.
        
        return res.status(200).json({ success: true, items: questions });
    } catch (error) {
        console.error("[EXAM ENGINE] Fetch Questions Error:", error);
        return res.status(500).json({ error: 'Failed to fetch question matrix.' });
    }
};

// 2. GRADE EXAM AND PROCESS TELEMETRY
exports.submitExam = async (req, res) => {
    const userId = req.user.id;
    const { attempts, config, timeTakenSecs } = req.body;

    if (!attempts || attempts.length === 0) {
        return res.status(400).json({ error: 'No telemetry payload received.' });
    }

    try {
        // Run grading and telemetry inside a Prisma Transaction to ensure absolute data integrity
        const result = await prisma.$transaction(async (tx) => {
            
            // A. Fetch the actual questions to grade them securely on the server
            const questionIds = attempts.map(a => a.questionId);
            const masterQuestions = await tx.question.findMany({
                where: { id: { in: questionIds } }
            });

            // Map for quick lookup
            const questionMap = {};
            masterQuestions.forEach(q => { questionMap[q.id] = q; });

            let correctCount = 0;
            const gradedAttempts = [];
            const telemetryRows = [];

            // B. Grade each attempt
            attempts.forEach(attempt => {
                const masterQ = questionMap[attempt.questionId];
                if (!masterQ) return; // Skip if question no longer exists

                const isCorrect = masterQ.correctAnswer === attempt.userAnswer;
                if (isCorrect) correctCount++;

                gradedAttempts.push({
                    isCorrect,
                    questionDifficulty: masterQ.difficultyTheta
                });

                telemetryRows.push({
                    userId: userId,
                    questionId: masterQ.id,
                    subject: masterQ.subject,
                    subtopic: masterQ.subtopic,
                    isCorrect: isCorrect,
                    confidenceLevel: attempt.confidence?.toUpperCase() || 'LOW',
                    timeSpentMs: attempt.timeSpentSecs * 1000
                });
            });

            // C. Create the Exam Session Record
            const sessionMode = config?.mode === 'blended' ? 'SIMULATION' : 'ADAPTIVE_QUIZ';
            const verdict = (correctCount / attempts.length) >= 0.70 ? 'PASSED' : 'FAILED';
            
            const examSession = await tx.examSession.create({
                data: {
                    userId: userId,
                    mode: sessionMode,
                    targetSubject: config?.subject || 'Blended',
                    score: correctCount,
                    totalQuestions: attempts.length,
                    timeTakenSecs: timeTakenSecs || 0,
                    verdict: verdict
                }
            });

            // D. Attach sessionId and insert all telemetry rows
            const finalTelemetry = telemetryRows.map(row => ({ ...row, sessionId: examSession.id }));
            await tx.questionAttempt.createMany({ data: finalTelemetry });

            // E. Calculate new IRT Theta and update User
            const userProfile = await tx.user.findUnique({ where: { id: userId } }) || { thetaRating: 0.0 };
            const newTheta = calculateUpdatedTheta(userProfile.thetaRating, gradedAttempts);

            const updatedUser = await tx.user.upsert({
                where: { id: userId },
                update: { thetaRating: newTheta, lastActive: new Date() },
                create: { id: userId, thetaRating: newTheta }
            });

            return { score: correctCount, total: attempts.length, newTheta: updatedUser.thetaRating };
        });

        // Send results back to frontend
        return res.status(200).json({
            success: true,
            diagnostics: { score: result.score, total: result.total },
            newStats: { 
                irt: { theta: result.newTheta }, 
                cloudTimestamp: Date.now() 
            }
        });

    } catch (error) {
        console.error("[EXAM ENGINE] Submit Error:", error);
        return res.status(500).json({ error: 'Server failed to process simulation telemetry.' });
    }
};