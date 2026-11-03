// How a learner picks a mock's questions, and their own counts. Mock setup reads
// and writes it; nothing else does, so it can't reach θ, readiness or the rankings
// (tests/displayOnlyTables.test.js). Its own route rather than a field of PUT
// /api/user/settings, whose queued writes supersede each other.
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { drawPrefsSchema } = require('../schemas/userSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');

router.get('/draw-prefs', authMiddleware, async (req, res) => {
    try {
        const row = await prisma.user.findUnique({ where: { id: req.user.id }, select: { drawPrefs: true } });
        res.status(200).json({ prefs: row?.drawPrefs ?? null });
    } catch (error) {
        logger.error('Draw preferences fetch failed', { error: error.message });
        res.status(500).json({ error: 'Couldn’t load how your mocks are picked.' });
    }
});

router.put('/draw-prefs', authMiddleware, validate(drawPrefsSchema), async (req, res) => {
    try {
        await prisma.user.update({ where: { id: req.user.id }, data: { drawPrefs: req.body } });
        res.status(200).json({ prefs: req.body });
    } catch (error) {
        logger.error('Draw preferences save failed', { error: error.message });
        res.status(500).json({ error: 'Couldn’t save how your mocks are picked. Try again.' });
    }
});

module.exports = router;
