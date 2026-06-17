// src/controllers/analyticsController.js (or wherever you initialize Prisma)
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
const { calculateUpdatedTheta } = require('../utils/irtMath'); // Secure backend IRT calculations

exports.processBulkTelemetry = async (req, res) => {
    const userId = req.user.id; // Extracted directly from secure verified token headers
    const { sessionId, mode, targetSubject, attempts } = req.body;

    if (!attempts || !Array.populated || attempts.length === 0) {
        return res.status(400).json({ error: "Missing payload data parameters." });
    }

    try {
        const computedScore = attempts.filter(a => a.isCorrect).length;
        const totalQs = attempts.length;
        
        // Calculate total time spent across the array batch
        const combinedTimeSecs = Math.ceil(attempts.reduce((acc, curr) => acc + (curr.timeSpentMs || 0), 0) / 1000);

        // Execute as an isolated database transaction to guarantee data integrity
        const operationResult = await prisma.$transaction(async (tx) => {
            
            // 1. Ensure the referenced user profile placeholder exists in PostgreSQL
            const userProfile = await tx.user.upsert({
                where: { id: userId },
                update: { lastActive: new String(new Date().toISOString()) },
                create: { id: userId, thetaRating: 0.0, globalStreak: 0 }
            });

            // 2. Archive the complete exam simulation metadata
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

            // 3. Format telemetry events for batch insertion
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

            // 4. Secure Backend-Isolated Scoring: Pass historical attempts to update IRT capability
            const absoluteTheta = calculateUpdatedTheta(userProfile.thetaRating, attempts);

            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { thetaRating: absoluteTheta }
            });

            return updatedUser;
        });

        return res.status(200).json({
            message: "Batch telemetry processed successfully.",
            updatedTheta: operationResult.thetaRating
        });

    } catch (error) {
        console.error("[CRITICAL SYSTEM ERROR] Transaction aborted:", error);
        return res.status(500).json({ error: "Transactional database write failure." });
    }
};