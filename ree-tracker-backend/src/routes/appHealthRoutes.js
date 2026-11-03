// The app reporting on itself: which version this person is running, and any
// errors it hit. Read back through GET /api/admin/app-health.
//
// Mounted under /api/user (per-user data stays out of the service worker's
// cached /api paths; see ree-tracker/scripts/check-sw-routes.cjs).
const express = require('express');
const router = express.Router();
const { z } = require('zod');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { createUserLimiter } = require('../middlewares/userRateLimit');
const logger = require('../utils/logger');
const { recordErrors, recordVersion, MAX_MESSAGE, MAX_STACK } = require('../services/appHealthService');

const version = z.string().regex(/^[\w.-]{1,40}$/);

const versionSchema = z.object({ version }).strip();

const errorsSchema = z.object({
    errors: z.array(z.object({
        message: z.string().min(1).max(MAX_MESSAGE),
        stack: z.string().max(MAX_STACK).optional(),
        route: z.string().max(200).optional(),
        version: version.optional(),
    }).strip()).min(1).max(10),
}).strip();

// A signed-in account could otherwise fill the table with made-up errors.
const errorLimiter = createUserLimiter({ max: 30 });

router.post('/app-version', authMiddleware, validate(versionSchema), async (req, res) => {
    try {
        await recordVersion(req.user.id, req.body.version);
        res.status(204).end();
    } catch (error) {
        logger.warn('App version write failed', { error: error.message });
        res.status(500).json({ error: 'Could not save the app version.' });
    }
});

router.post('/client-errors', authMiddleware, errorLimiter, validate(errorsSchema), async (req, res) => {
    await recordErrors(req.body.errors, 'client');
    res.status(204).end();
});

module.exports = router;
