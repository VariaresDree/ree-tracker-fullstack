// Focus time (the Pomodoro's focus blocks), written by the app when a block
// finishes or stops early after five minutes. The summary is read from
// GET /api/analytics/deep/focus-time (services/focusTime.js).
//
// Mounted under /api/user (per-user writes stay out of the service worker's
// cached /api paths; see ree-tracker/scripts/check-sw-routes.cjs).
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { focusBlockSchema } = require('../schemas/focusSchemas');
const { recordFocusBlock } = require('../services/focusTime');
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

module.exports = router;
