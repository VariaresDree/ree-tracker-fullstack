const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const logger = require('../utils/logger');
const { runRecalibration } = require('../services/calibrationService');

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

module.exports = router;
