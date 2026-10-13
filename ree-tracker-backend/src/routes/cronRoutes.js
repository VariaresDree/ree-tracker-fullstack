// Scheduled jobs, called by GitHub Actions (.github/workflows/reminders.yml)
// rather than a user. Not behind authMiddleware: protected by a shared secret
// in the `x-cron-secret` header, compared in constant time against
// CRON_SECRET. Without CRON_SECRET set the route answers 503 and does nothing.
const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { sendDueReminders } = require('../services/reminderService');
const logger = require('../utils/logger');

const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();

function cronSecret(req, res, next) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return res.status(503).json({ error: 'Scheduled jobs are not configured.' });
    const given = req.get('x-cron-secret') || '';
    // Hashed first, so the comparison is constant-time whatever the lengths.
    if (!crypto.timingSafeEqual(digest(given), digest(secret))) return res.status(401).json({ error: 'Not allowed.' });
    return next();
}

// POST /api/cron/reminders — this hour's scheduled reminders (services/reminderService.js).
router.post('/reminders', cronSecret, async (req, res) => {
    try {
        res.status(200).json(await sendDueReminders());
    } catch (error) {
        logger.error('Reminders run failed', { error: error.message });
        res.status(500).json({ error: 'Reminders run failed.' });
    }
});

module.exports = router;
module.exports.cronSecret = cronSecret;
