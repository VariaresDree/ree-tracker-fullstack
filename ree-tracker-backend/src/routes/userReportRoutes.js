// A learner's own reports on questions ("Report a problem"), and what an admin
// did with each (Account › Your reports). Before, a report went nowhere the
// learner could see, and until 2026-11-12 nowhere an admin could either.
//
// Mounted under /api/user, so the service worker never caches it (per-user
// data; see ree-tracker/scripts/check-sw-routes.cjs).
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const dashboardCache = require('../services/dashboardCache');

const LIMIT = 50;
const STEM = 200;

router.get('/reports', authMiddleware, async (req, res) => {
    try {
        const rows = await prisma.questionFlag.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: LIMIT,
            select: {
                questionId: true, reason: true, createdAt: true, resolvedAt: true, resolution: true, resolutionNote: true, seenAt: true,
                // No key or explanation: the question as it was asked.
                question: { select: { subject: true, subtopic: true, text: true } },
            },
        });
        const items = rows.map(({ question, ...r }) => ({
            ...r,
            subject: question?.subject ?? null,
            topic: question?.subtopic ?? null,
            stem: typeof question?.text === 'string' ? question.text.slice(0, STEM) : '',
        }));
        res.status(200).json({ items });
    } catch (error) {
        logger.error('User reports fetch failed', { error: error.message });
        res.status(500).json({ error: 'Failed to load your reports.' });
    }
});

// The learner has seen their answered reports: Today stops mentioning them.
// Only answered ones, so a report closed later still counts as new.
router.post('/reports/seen', authMiddleware, async (req, res) => {
    try {
        const { count } = await prisma.questionFlag.updateMany({
            where: { userId: req.user.id, resolvedAt: { not: null }, seenAt: null },
            data: { seenAt: new Date() },
        });
        if (count) dashboardCache.invalidate(req.user.id);
        res.status(200).json({ success: true, seen: count });
    } catch (error) {
        logger.error('User reports seen failed', { error: error.message });
        res.status(500).json({ error: 'Failed to save that.' });
    }
});

module.exports = router;
