// src/routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();

// Initialize Prisma v7 (Same as your exam route)
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

router.get('/dashboard/:uid', async (req, res) => {
    const { uid } = req.params;

    try {
        // 1. Fetch User Profile and Last 10 Sessions
        const user = await prisma.user.findUnique({
            where: { id: uid },
            include: {
                sessions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User telemetry not found in Assessment Core.' });
        }

        // 2. Fetch all historical attempts to calculate metrics
        // In a production app with millions of rows, we would use Prisma's groupBy,
        // but for high-speed custom formatting, pulling the raw data for one user is blazingly fast.
        const attempts = await prisma.questionAttempt.findMany({
            where: { userId: uid }
        });

        // 3. The Analytics Aggregation Engine
        const matrix = { hc: 0, hw: 0, lc: 0, lw: 0 };
        const microTopics = {};

        attempts.forEach(att => {
            // A. Calculate Confidence Matrix (The 2x2 Grid)
            const conf = att.confidenceLevel === 'high' ? 'h' : 'l';
            const correct = att.isCorrect ? 'c' : 'w';
            matrix[`${conf}${correct}`] += 1;

            // B. Calculate Micro-topic Hit Rates
            if (!microTopics[att.subtopic]) {
                microTopics[att.subtopic] = { 
                    totalAttempts: 0, 
                    correctHits: 0, 
                    subject: att.subject, 
                    totalTimeSecs: 0 
                };
            }
            microTopics[att.subtopic].totalAttempts += 1;
            if (att.isCorrect) microTopics[att.subtopic].correctHits += 1;
            microTopics[att.subtopic].totalTimeSecs += att.timeSpentSecs;
        });

        // 4. Send the perfectly formatted payload to React
        res.status(200).json({
            success: true,
            data: {
                profile: {
                    globalStreak: user.globalStreak,
                    thetaRating: user.thetaRating,
                    lastActive: user.lastActive
                },
                recentSessions: user.sessions,
                matrix: matrix,
                microTopics: microTopics
            }
        });

    } catch (error) {
        console.error("[ANALYTICS ERROR]:", error);
        res.status(500).json({ error: 'Failed to aggregate telemetry.' });
    }
});

module.exports = router;