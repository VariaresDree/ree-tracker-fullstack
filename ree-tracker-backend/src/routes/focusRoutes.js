// Focus time (the Pomodoro's focus blocks), written by the app when a block
// finishes or stops early after five minutes, and fixed or deleted from
// Progress › Habits; and the weekly focus goal set there. The summary is read from
// GET /api/analytics/deep/focus-time (services/focusTime.js).
//
// Mounted under /api/user (per-user writes stay out of the service worker's
// cached /api paths; see ree-tracker/scripts/check-sw-routes.cjs).
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { focusBlockSchema, focusBlockEditSchema, focusGoalSchema } = require('../schemas/focusSchemas');
const prisma = require('../config/db');
const { recordFocusBlock, updateFocusBlock, deleteFocusBlock, FocusBlockError } = require('../services/focusTime');
const logger = require('../utils/logger');

router.post('/focus-blocks', authMiddleware, validate(focusBlockSchema), async (req, res) => {
    try {
        const { created } = await recordFocusBlock(req.user.id, req.body);
        res.status(created ? 201 : 200).json({ success: true });
    } catch (error) {
        logger.error('Focus block save failed', { error: error.message });
        res.status(500).json({ error: 'Failed to record the focus block.' });
    }
});

// No idempotency(): setting the same values again is harmless.
router.patch('/focus-blocks/:id', authMiddleware, validate(focusBlockEditSchema), async (req, res) => {
    try {
        const block = await updateFocusBlock({ userId: req.user.id, id: req.params.id }, req.body);
        res.status(200).json({ success: true, block });
    } catch (error) {
        if (error instanceof FocusBlockError) return res.status(error.status).json({ error: error.message });
        logger.error('Focus block edit failed', { error: error.message });
        res.status(500).json({ error: 'Failed to update the focus block.' });
    }
});

router.delete('/focus-blocks/:id', authMiddleware, async (req, res) => {
    try {
        const { deleted } = await deleteFocusBlock({ userId: req.user.id, id: req.params.id });
        res.status(200).json({ success: true, deleted });
    } catch (error) {
        logger.error('Focus block delete failed', { error: error.message });
        res.status(500).json({ error: 'Failed to delete the focus block.' });
    }
});

// The weekly focus goal: the whole value each time, so a queued offline
// change replaces an older queued one. Its own route rather than a field of
// PUT /api/user/settings: that route's queued writes supersede each other, so
// a goal queued offline would have dropped a queued exam plan.
router.put('/focus-goal', authMiddleware, validate(focusGoalSchema), async (req, res) => {
    try {
        await prisma.user.update({ where: { id: req.user.id }, data: { weeklyFocusMinutes: req.body.weeklyMinutes } });
        res.status(200).json({ success: true, weeklyMinutes: req.body.weeklyMinutes });
    } catch (error) {
        logger.error('Focus goal save failed', { error: error.message });
        res.status(500).json({ error: 'Couldn’t save your focus goal. Try again.' });
    }
});

module.exports = router;
