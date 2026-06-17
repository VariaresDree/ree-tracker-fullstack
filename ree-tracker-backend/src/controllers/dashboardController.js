// src/controllers/dashboardController.js
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

// Initialize Prisma with the PostgreSQL adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

exports.getDashboardData = async (req, res) => {
    // The authMiddleware guarantees req.user exists and is verified via Firebase JWT
    const userId = req.user.id; 

    try {
        // 1. Fetch the user's root profile (Global Streak, IRT Theta)
        const userProfile = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!userProfile) {
            // New user case: Return an empty shell
            return res.status(200).json({
                success: true,
                data: {
                    profile: { thetaRating: 0.0, globalStreak: 0 },
                    matrix: { hc: 0, hw: 0, lc: 0, lw: 0 },
                    microTopics: {}
                }
            });
        }

        // 2. Aggregate the Quadrant Matrix (High Confidence vs Correctness)
        // Grouping by confidence level and correctness simultaneously
        const matrixRaw = await prisma.questionAttempt.groupBy({
            by: ['confidenceLevel', 'isCorrect'],
            where: { userId: userId },
            _count: { id: true }
        });

        // Initialize empty matrix
        const matrix = { hc: 0, hw: 0, lc: 0, lw: 0 };
        
        matrixRaw.forEach(group => {
            if (group.confidenceLevel === 'HIGH' && group.isCorrect) matrix.hc = group._count.id;
            if (group.confidenceLevel === 'HIGH' && !group.isCorrect) matrix.hw = group._count.id;
            if (group.confidenceLevel === 'LOW' && group.isCorrect) matrix.lc = group._count.id;
            if (group.confidenceLevel === 'LOW' && !group.isCorrect) matrix.lw = group._count.id;
        });

        // 3. Aggregate MicroTopic Hit Rates (for Heatmap and Diagnostics)
        const topicRaw = await prisma.questionAttempt.groupBy({
            by: ['subject', 'subtopic', 'isCorrect'],
            where: { userId: userId },
            _count: { id: true },
            _sum: { timeSpentMs: true }
        });

        // Shape the Prisma data into the format the Dashboard.jsx React components expect
        const microTopics = {};
        
        topicRaw.forEach(row => {
            const key = `${row.subject}_${row.subtopic}`;
            if (!microTopics[key]) {
                microTopics[key] = {
                    subject: row.subject,
                    totalAttempts: 0,
                    correctHits: 0,
                    totalTimeSecs: 0
                };
            }
            
            microTopics[key].totalAttempts += row._count.id;
            microTopics[key].totalTimeSecs += Math.ceil((row._sum.timeSpentMs || 0) / 1000);
            if (row.isCorrect) {
                microTopics[key].correctHits += row._count.id;
            }
        });

        // 4. Send the payload to the frontend
        return res.status(200).json({
            success: true,
            data: {
                profile: userProfile,
                matrix: matrix,
                microTopics: microTopics
            }
        });

    } catch (error) {
        console.error("[DASHBOARD SYNC ERROR]:", error);
        return res.status(500).json({ success: false, error: 'Failed to aggregate dashboard analytics.' });
    }
};