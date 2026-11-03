const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const logger = require('../utils/logger');
const { runRecalibration } = require('../services/calibrationService');
const { sendToUser } = require('../services/pushService');
const { healthSummary, dismissError } = require('../services/appHealthService');
const { saveBoardBlueprint, resetBoardBlueprint } = require('../services/boardBlueprint');
const { validate } = require('../middlewares/validate');
const { boardBlueprintSchema } = require('../schemas/configSchemas');
const prisma = require('../config/db');
const { normalizeSubject } = require('@ree/shared');

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

// GET /api/admin/bank-counts: questions per subject and topic, for Admin ›
// Syllabus. Subject spellings merge. One query.
router.get('/bank-counts', async (req, res) => {
    try {
        const rows = await prisma.question.groupBy({ by: ['subject', 'subtopic'], where: { isFlagged: false }, _count: { _all: true } });
        const merged = new Map();
        for (const r of rows) {
            const subject = normalizeSubject(r.subject);
            const key = `${subject}|${r.subtopic}`;
            const held = merged.get(key) || { subject, topic: r.subtopic, count: 0 };
            held.count += r._count._all;
            merged.set(key, held);
        }
        return res.status(200).json({ items: [...merged.values()] });
    } catch (error) {
        logger.error('bank counts failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Could not count the bank.' });
    }
});

// PUT /api/admin/board-blueprint: the board's items per topic, every subject.
router.put('/board-blueprint', validate(boardBlueprintSchema), async (req, res) => {
    try {
        const { error, blueprint } = await saveBoardBlueprint(req.body);
        if (error) return res.status(400).json({ error });
        return res.status(200).json(blueprint);
    } catch (error) {
        logger.error('board blueprint save failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Could not save the board counts.' });
    }
});

// DELETE /api/admin/board-blueprint: back to PRC's table.
router.delete('/board-blueprint', async (req, res) => {
    try {
        return res.status(200).json(await resetBoardBlueprint());
    } catch (error) {
        logger.error('board blueprint reset failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Could not reset the board counts.' });
    }
});

// GET /api/admin/app-health: versions in use over the last week, and errors.
router.get('/app-health', async (req, res) => {
    try {
        return res.status(200).json(await healthSummary());
    } catch (error) {
        logger.error('app health read failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Could not load app health.' });
    }
});

// DELETE /api/admin/app-health/errors/:id: dismiss. If it happens again it comes back.
router.delete('/app-health/errors/:id', async (req, res) => {
    try {
        await dismissError(req.params.id);
        return res.status(204).end();
    } catch (error) {
        logger.error('app health dismiss failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Could not dismiss that error.' });
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
