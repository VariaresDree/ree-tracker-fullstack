// The learner's scheduled reminder (Account › Notifications, phone app): the
// Manila hour to send it, or null for off. Sent by POST /api/cron/reminders.
//
// Mounted under /api/user (per-user data stays out of the service worker's
// cached /api paths; see ree-tracker/scripts/check-sw-routes.cjs).
const express = require('express');
const router = express.Router();
const { z } = require('zod');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const prisma = require('../config/db');
const logger = require('../utils/logger');

const reminderSchema = z.object({ hour: z.number().int().min(0).max(23).nullable() }).strip();

router.get('/reminders', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { reminderHour: true } });
        res.status(200).json({ hour: user?.reminderHour ?? null });
    } catch (error) {
        logger.error('Reminder fetch failed', { error: error.message });
        res.status(500).json({ error: 'Failed to load your reminder.' });
    }
});

router.put('/reminders', authMiddleware, validate(reminderSchema), async (req, res) => {
    try {
        await prisma.user.update({ where: { id: req.user.id }, data: { reminderHour: req.body.hour } });
        res.status(200).json({ hour: req.body.hour });
    } catch (error) {
        logger.error('Reminder save failed', { error: error.message });
        res.status(500).json({ error: 'Failed to save your reminder.' });
    }
});

module.exports = router;
module.exports.reminderSchema = reminderSchema;
