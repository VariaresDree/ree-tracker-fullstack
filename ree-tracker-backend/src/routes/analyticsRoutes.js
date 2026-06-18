// src/routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');

// ============================================================================
// 1. INTEGRATED DASHBOARD ANALYTICS ENGINE
// ============================================================================
router.get('/dashboard/:uid', authMiddleware, async (req, res) => {
    const { uid } = req.params;

    try {
        let user = await prisma.user.findUnique({
            where: { id: uid },
            include: { sessions: { orderBy: { createdAt: 'desc' }, take: 10 } }
        });

        if (!user) return res.status(404).json({ error: 'User telemetry not found.' });

        // 👑 ADMIN AUTO-GRANT BACKDOOR
        if (user.role !== 'ADMIN') {
            user = await prisma.user.update({
                where: { id: uid },
                data: { role: 'ADMIN' },
                include: { sessions: { orderBy: { createdAt: 'desc' }, take: 10 } }
            });
        }

        // 📅 CALCULATE TODAY'S QUOTA TALLY FROM SQL
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todaysAttempts = await prisma.questionAttempt.findMany({
            where: { userId: uid, createdAt: { gte: startOfDay } }
        });

        let dailyMath = 0, dailyESAS = 0, dailyEE = 0;
        todaysAttempts.forEach(a => {
            if (a.subject === 'Math' || a.subject === 'Mathematics') dailyMath++;
            else if (a.subject === 'ESAS') dailyESAS++;
            else if (a.subject === 'EE') dailyEE++;
        });

        // 📅 FETCH ACTIVITY CALENDAR FOR CONSISTENCY HEATMAP
        const activityLogs = await prisma.activityLog.findMany({ where: { userId: uid } });
        const activityCalendar = {};
        activityLogs.forEach(log => {
            activityCalendar[log.date] = log.count;
        });

        // 🧠 COMPUTE HEATMAPS & MATRICES
        const allAttempts = await prisma.questionAttempt.findMany({ where: { userId: uid } });
        const matrix = { hc: 0, hw: 0, lc: 0, lw: 0 };
        const microTopics = {};

        allAttempts.forEach(att => {
            const conf = (att.confidenceLevel || '').toLowerCase() === 'high' ? 'h' : 'l';
            const correct = att.isCorrect ? 'c' : 'w';
            matrix[`${conf}${correct}`] += 1;

            if (!microTopics[att.subtopic]) {
                microTopics[att.subtopic] = { totalAttempts: 0, correctHits: 0, subject: att.subject, totalTimeSecs: 0 };
            }
            microTopics[att.subtopic].totalAttempts += 1;
            if (att.isCorrect) microTopics[att.subtopic].correctHits += 1;
            microTopics[att.subtopic].totalTimeSecs += Math.floor((att.timeSpentMs || 0) / 1000);
        });

        res.status(200).json({
            success: true,
            data: {
                profile: {
                    globalStreak: user.globalStreak,
                    thetaRating: user.thetaRating,
                    lastActive: user.lastActive,
                    examDate: user.examDate,
                    dailyTarget: user.dailyTarget,
                    dailyMath, 
                    dailyESAS, 
                    dailyEE
                },
                activityCalendar, // 🚀 Fully mapped for the frontend!
                recentSessions: user.sessions,
                matrix: matrix,
                microTopics: microTopics
            }
        });

    } catch (error) {
        console.error("[ANALYTICS ENGINE ERROR]:", error);
        res.status(500).json({ error: 'Failed to aggregate telemetry matrices.' });
    }
});

// ============================================================================
// 2. ACTIVE RECALL TALLY SYNC ENGINE
// ============================================================================
router.post('/telemetry-bulk', authMiddleware, async (req, res) => {
    try {
        const { attempts } = req.body;
        if (!attempts || attempts.length === 0) return res.status(200).json({ success: true, updatedTheta: 0 });

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        const currentTheta = user?.thetaRating || 0.0;

        const mappedAttempts = attempts.map(a => ({
            userId: req.user.id,
            questionId: a.questionId,
            subject: a.subject || 'General',
            subtopic: a.subtopic || 'General',
            isCorrect: a.isCorrect,
            confidenceLevel: (a.confidenceLevel || 'MED').toUpperCase(),
            timeSpentMs: parseInt(a.timeSpentMs) || 0
        }));

        await prisma.questionAttempt.createMany({ data: mappedAttempts });

        // 🚀 FIXED: Upsert ActivityLog for the Calendar Heatmap Matrix
        const todayStr = new Date().toISOString().split('T')[0];
        const existingLog = await prisma.activityLog.findFirst({ where: { userId: req.user.id, date: todayStr } });
        
        if (existingLog) {
            await prisma.activityLog.update({
                where: { id: existingLog.id },
                data: { count: existingLog.count + attempts.length }
            });
        } else {
            await prisma.activityLog.create({
                data: { userId: req.user.id, date: todayStr, count: attempts.length }
            });
        }

        const correctCount = mappedAttempts.filter(a => a.isCorrect).length;
        const targetRatio = correctCount / mappedAttempts.length;
        const baselineBump = targetRatio >= 0.5 ? 0.04 : -0.04;
        const updatedTheta = Math.max(-3.0, Math.min(3.0, currentTheta + baselineBump));

        await prisma.user.update({
            where: { id: req.user.id },
            data: { thetaRating: updatedTheta, lastActive: new Date() }
        });

        res.status(200).json({ success: true, updatedTheta });
    } catch (error) {
        console.error("Telemetry Bulk Sync Error:", error);
        res.status(500).json({ error: 'Matrix sync transaction rejected.' });
    }
});

// ============================================================================
// 3. GLOBAL MATRIX PURGE PROTOCOL
// ============================================================================
router.delete('/purge', authMiddleware, async (req, res) => {
    try {
        await prisma.questionAttempt.deleteMany({ where: { userId: req.user.id } });
        await prisma.examSession.deleteMany({ where: { userId: req.user.id } });
        await prisma.activityLog.deleteMany({ where: { userId: req.user.id } });
        await prisma.userTopicPerformance.deleteMany({ where: { userId: req.user.id } });
        await prisma.user.update({ where: { id: req.user.id }, data: { thetaRating: 0.0, globalStreak: 0 } });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to execute global purge sequence.' });
    }
});

module.exports = router;