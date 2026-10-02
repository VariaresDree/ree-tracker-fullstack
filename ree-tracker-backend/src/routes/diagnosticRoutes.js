const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { diagnosticStartSchema, diagnosticAnswerSchema, diagnosticFinishSchema } = require('../schemas/diagnosticSchemas');
const diagnostic = require('../services/diagnosticService');
const logger = require('../utils/logger');

// Placement test (services/diagnosticService.js). Every handler is owner-scoped
// through req.user.id; no route takes a resource id in its path.

const fail = (res, error, what) => {
    if (error instanceof diagnostic.DiagnosticError) {
        return res.status(error.status).json({ error: error.message, ...error.extra });
    }
    logger.error(`placement ${what} failed`, { error: error.message, stack: error.stack });
    // Retryable: the answers so far are stored on the session, and finishing
    // is idempotent.
    return res.status(503).json({ error: 'The placement test is temporarily unavailable. Your answers are saved — try again.' });
};

// GET /api/diagnostic/status — none | in_progress | completed (+ result).
router.get('/status', authMiddleware, async (req, res) => {
    try {
        res.status(200).json(await diagnostic.status(req.user.id));
    } catch (error) {
        fail(res, error, 'status');
    }
});

// POST /api/diagnostic/start — begin, or resume an unfinished sitting.
router.post('/start', authMiddleware, validate(diagnosticStartSchema), async (req, res) => {
    try {
        res.status(200).json(await diagnostic.start(req.user.id, { restart: req.body.restart }));
    } catch (error) {
        fail(res, error, 'start');
    }
});

// POST /api/diagnostic/answer — grade the current item, return the next (or the result).
router.post('/answer', authMiddleware, validate(diagnosticAnswerSchema), async (req, res) => {
    try {
        res.status(200).json(await diagnostic.answer(req.user.id, req.body));
    } catch (error) {
        fail(res, error, 'answer');
    }
});

// POST /api/diagnostic/finish — idempotent finalise (retry path if the last
// answer's finalise failed).
router.post('/finish', authMiddleware, validate(diagnosticFinishSchema), async (req, res) => {
    try {
        res.status(200).json(await diagnostic.finish(req.user.id, req.body.sessionId));
    } catch (error) {
        fail(res, error, 'finish');
    }
});

module.exports = router;
