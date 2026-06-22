// src/controllers/analyticsController.js
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

// 1. Setup the standard pg connection pool
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

// 2. Wrap it in the Prisma Adapter
const adapter = new PrismaPg(pool);

// 3. Instantiate the client with the adapter
const prisma = new PrismaClient({ adapter });
const { calculateUpdatedTheta } = require('../utils/irtMath');
const logger = require('../utils/logger');

exports.processBulkTelemetry = async (req, res) => {
    // Extracted directly from secure verified token headers
    const userId = req.user.uid || req.user.id; 
    const { sessionId, mode, targetSubject, attempts } = req.body;

    if (!attempts || !Array.isArray(attempts) || attempts.length === 0) {
        return res.status(400).json({ error: "Missing payload data parameters." });
    }

    const todayStr = new Date().toLocaleDateString('en-CA'); // Deterministic YYYY-MM-DD grouping

    try {
        const computedScore = attempts.filter(a => a.isCorrect).length;
        const totalQs = attempts.length;
        
        // Calculate total time spent across the array batch
        const combinedTimeSecs = Math.ceil(attempts.reduce((acc, curr) => acc + (curr.timeSpentMs || 0), 0) / 1000);

        // 🚀 ISOLATED ATOMIC TRANSACTION: Guarantees concurrency safety
        const operationResult = await prisma.$transaction(async (tx) => {
            
            // 1. Ensure the referenced user profile placeholder exists
            const userProfile = await tx.user.upsert({
                where: { id: userId },
                update: { lastActive: new Date() },
                create: { id: userId, thetaRating: 0.0, globalStreak: 0 }
            });

            // 2. Thread-safe increment of daily activity mapping
            await tx.activityLog.upsert({
                where: { userId_date: { userId: userId, date: todayStr } },
                update: { count: { increment: attempts.length } },
                create: { userId: userId, date: todayStr, count: attempts.length },
            });

            // 3. Thread-safe MicroTopic vectorization
            for (const attempt of attempts) {
                if (!attempt.subtopic) continue; 
                await tx.userTopicPerformance.upsert({
                    where: { userId_topic: { userId: userId, topic: attempt.subtopic } },
                    update: {
                        attempts: { increment: 1 },
                        correct: { increment: attempt.isCorrect ? 1 : 0 },
                        totalTime: { increment: attempt.timeSpentMs || 0 }
                    },
                    create: {
                        userId: userId,
                        subject: attempt.subject || targetSubject || 'General',
                        topic: attempt.subtopic,
                        attempts: 1,
                        correct: attempt.isCorrect ? 1 : 0,
                        totalTime: attempt.timeSpentMs || 0
                    }
                });
            }

            // 4. Archive the complete exam simulation metadata (Legacy Preservation)
            const operationalSession = await tx.examSession.create({
                data: {
                    id: sessionId,
                    userId: userId,
                    mode: mode,
                    targetSubject: targetSubject,
                    score: computedScore,
                    totalQuestions: totalQs,
                    timeTakenSecs: combinedTimeSecs,
                    verdict: (computedScore / totalQs) >= 0.70 ? 'PASSED' : 'FAILED'
                }
            });

            const formattedAttempts = attempts.map(attempt => ({
                sessionId: operationalSession.id,
                userId: userId,
                questionId: attempt.questionId,
                subject: attempt.subject,
                subtopic: attempt.subtopic,
                isCorrect: attempt.isCorrect,
                confidenceLevel: attempt.confidenceLevel,
                timeSpentMs: attempt.timeSpentMs
            }));

            await tx.questionAttempt.createMany({ data: formattedAttempts });

            // 5. Secure Backend-Isolated Scoring & History Tracking
            const absoluteTheta = calculateUpdatedTheta(userProfile.thetaRating, attempts);

            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { thetaRating: absoluteTheta }
            });

            await tx.thetaHistory.create({
                data: { userId: userId, theta: absoluteTheta }
            });

            return updatedUser;
        });

        return res.status(200).json({
            message: "Batch telemetry processed successfully.",
            updatedTheta: operationResult.thetaRating
        });

    } catch (error) {
        logger.error('Transaction aborted', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: "Transactional database write failure." });
    }
};