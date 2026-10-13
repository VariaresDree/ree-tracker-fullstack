// Focus time (the Pomodoro's focus blocks), written by the app when a block
// finishes or stops early after five minutes, and fixed or deleted from
// Progress › Habits. The summary is read from
// GET /api/analytics/deep/focus-time (services/focusTime.js).
//
// Mounted under /api/user (per-user writes stay out of the service worker's
// cached /api paths; see ree-tracker/scripts/check-sw-routes.cjs).
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { focusBlockSchema, focusBlockEditSchema } = require('../schemas/focusSchemas');
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
        const block = await updateFocusBlock(req.user.id, req.params.id, req.body);
        res.status(200).json({ success: true, block });
    } catch (error) {
        if (error instanceof FocusBlockError) return res.status(error.status).json({ error: error.message });
        logger.error('Focus block edit failed', { error: error.message });
        res.status(500).json({ error: 'Failed to update the focus block.' });
    }
});

router.delete('/focus-blocks/:id', authMiddleware, async (req, res) => {
    try {
        const { deleted } = await deleteFocusBlock(req.user.id, req.params.id);
        res.status(200).json({ success: true, deleted });
    } catch (error) {
        logger.error('Focus block delete failed', { error: error.message });
        res.status(500).json({ error: 'Failed to delete the focus block.' });
    }
});

module.exports = router;
