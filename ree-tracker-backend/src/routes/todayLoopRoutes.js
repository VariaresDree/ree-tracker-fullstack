// Today's loop: due reviews and open mistakes as one Practice session, ordered
// by board weight, with the formula cards due (services/todayLoop.js).
//
// Mounted under /api/user (per-user data stays out of the service worker's
// cached /api paths; see ree-tracker/scripts/check-sw-routes.cjs).
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { loadTodayLoop } = require('../services/todayLoop');
const logger = require('../utils/logger');

router.get('/today-loop', authMiddleware, async (req, res) => {
    try {
        res.status(200).json(await loadTodayLoop(req.user.id));
    } catch (error) {
        logger.error('Today loop failed', { error: error.message });
        res.status(500).json({ error: "Failed to load today's loop." });
    }
});

module.exports = router;
