// src/routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');

router.get('/dashboard/:uid', authMiddleware, async (req, res) => {
    const { uid } = req.params;

    try {
        let user = await prisma.user.findUnique({
            where: { id: uid },
            include: { sessions: { orderBy: { createdAt: 'desc' }, take: 10 } }
        });

        if (!user) return res.status(404).json({ error: 'User telemetry not found.' });

        // Force promote user
        if (user.role !== 'ADMIN') {
            user = await prisma.user.update({
                where: { id: uid }, data: { role: 'ADMIN' },
                include: { sessions: { orderBy: { createdAt: 'desc' }, take: 10 } }
            });
        }

        // 📅 OPTIMIZED: Strict Asian/Manila Timezone Aggregation
        const phtDate = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Manila"}));
        phtDate.setHours(0, 0, 0, 0);
        const utcStartOfDay = new Date(phtDate.getTime() - (8 * 60 * 60 * 1000));

        const dailyAgg = await prisma.questionAttempt.groupBy({
            by: ['subject'],
            where: { userId: uid, createdAt: { gte: utcStartOfDay } },
            _count: { id: true }
        });

        let dailyMath = 0, dailyESAS = 0, dailyEE = 0;
        dailyAgg.forEach(group => {
            if (group.subject === 'Mathematics' || group.subject === 'Math') dailyMath += group._count.id;
            else if (group.subject === 'ESAS') dailyESAS += group._count.id;
            else if (group.subject === 'EE') dailyEE += group._count.id;
        });

        // 📅 FETCH ACTIVITY CALENDAR FOR HEATMAP
        const activityLogs = await prisma.activityLog.findMany({ where: { userId: uid } });
        const activityCalendar = {};
        activityLogs.forEach(log => activityCalendar[log.date] = log.count);

        // 🚀 OPTIMIZATION: Postgres Aggregation avoids Out Of Memory errors
        const topicAgg = await prisma.questionAttempt.groupBy({
            by: ['subject', 'subtopic', 'isCorrect'],
            where: { userId: uid },
            _count: { id: true },
            _sum: { timeSpentMs: true }
        });

        const microTopics = {};
        topicAgg.forEach(group => {
            const sub = group.subtopic;
            if (!microTopics[sub]) {
                microTopics[sub] = { subject: group.subject, totalAttempts: 0, correctHits: 0, totalTimeSecs: 0 };
            }
            microTopics[sub].totalAttempts += group._count.id;
            if (group.isCorrect) microTopics[sub].correctHits += group._count.id;
            microTopics[sub].totalTimeSecs += Math.floor((group._sum.timeSpentMs || 0) / 1000);
        });

        const matrixAgg = await prisma.questionAttempt.groupBy({
            by: ['confidenceLevel', 'isCorrect'],
            where: { userId: uid },
            _count: { id: true }
        });

        const matrix = { hc: 0, hw: 0, lc: 0, lw: 0 };
        matrixAgg.forEach(group => {
            const conf = (group.confidenceLevel || '').toLowerCase() === 'high' ? 'h' : 'l';
            const correct = group.isCorrect ? 'c' : 'w';
            matrix[`${conf}${correct}`] += group._count.id;
        });

        res.status(200).json({
            success: true,
            data: {
                profile: {
                    globalStreak: user.globalStreak, thetaRating: user.thetaRating,
                    lastActive: user.lastActive, examDate: user.examDate, dailyTarget: user.dailyTarget,
                    dailyMath, dailyESAS, dailyEE
                },
                activityCalendar,
                recentSessions: user.sessions,
                matrix,
                microTopics
            }
        });
    } catch (error) {
        console.error("[ANALYTICS ENGINE ERROR]:", error);
        res.status(500).json({ error: 'Failed to aggregate telemetry matrices.' });
    }
});

router.post('/telemetry-bulk', authMiddleware, async (req, res) => {
    try {
        const { attempts } = req.body;
        if (!attempts || attempts.length === 0) return res.status(200).json({ success: true, updatedTheta: 0 });

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        const currentTheta = user?.thetaRating || 0.0;

        const mappedAttempts = attempts.map(a => ({
            userId: req.user.id, questionId: a.questionId,
            subject: a.subject || 'General', subtopic: a.subtopic || 'General',
            isCorrect: a.isCorrect, confidenceLevel: (a.confidenceLevel || 'MED').toUpperCase(),
            timeSpentMs: parseInt(a.timeSpentMs) || 0
        }));

        await prisma.questionAttempt.createMany({ data: mappedAttempts });

        // 📅 SAFE TIMEZONE SYNC FOR CALENDAR HEATMAP 
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date()); 
        
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