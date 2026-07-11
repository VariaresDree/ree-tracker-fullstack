const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const logger = require('../utils/logger');
const { runRecalibration } = require('../services/calibrationService');
const { sendToUser } = require('../services/pushService');

router.use(authMiddleware, adminMiddleware);

// POST /api/admin/calibrate — on-demand run of the same recalibration
// pipeline the nightly scripts/calibrate.js cron executes (Phase 3.4:
// per-subject Bayesian-anchored JMLE + author blend + UserAbility upserts —
// the old duplicated per-item grid scan lived here before).
// Body: { dryRun?: boolean, minN?: number }
router.post('/calibrate', async (req, res) => {
    try {
        const dryRun = !!req.body?.dryRun;
        const minN = Number(req.body?.minN) || 10;

        const report = await runRecalibration({ dryRun, minN });
        return res.status(200).json(report);
    } catch (error) {
        logger.error('admin calibrate failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Calibration run failed.' });
    }
});

// POST /api/admin/push-test — end-to-end FCM verification once a native build
// is registered (Phase 4.2). Sends to the caller by default, or to a target
// userId. Requires the `push-notifications` flag ON (sendToUser fails closed).
// Body: { userId?, title?, body? }
router.post('/push-test', async (req, res) => {
    try {
        const targetUserId = String(req.body?.userId || req.user.id);
        const title = String(req.body?.title || 'REE Tracker test push').slice(0, 120);
        const body = String(req.body?.body || 'FCM pipeline is live — good luck, future REE!').slice(0, 400);

        const result = await sendToUser(targetUserId, { title, body, data: { route: '/' } });
        if (!result) {
            return res.status(200).json({
                sent: false,
                reason: 'Flag disabled, no registered device tokens, or messaging unavailable.',
            });
        }
        return res.status(200).json({ sent: true, ...result });
    } catch (error) {
        logger.error('admin push-test failed', { error: error.message });
        return res.status(500).json({ error: 'Push test failed.' });
    }
});

module.exports = router;
