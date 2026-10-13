const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { isAdminUser, requireAdmin } = require('../middlewares/roleMiddleware');
const logger = require('../utils/logger');
const { validate } = require('../middlewares/validate');
const { aiGenerateSchema } = require('../schemas/aiSchemas');
const { TASKS, MODEL_TIERS, isProviderConfigured } = require('../config/aiModels');
const { runTask, status, AiUnavailableError } = require('../services/ai/aiRouter');
const { callModel, classifyError } = require('../services/ai/providers');
const health = require('../services/ai/aiHealth');
const catalog = require('../services/ai/modelCatalog');

// POST /api/ai/generate { task, contents, system?, json?, config? }
// The task picks the model chain; see config/aiModels.
router.post('/generate', authMiddleware, validate(aiGenerateSchema), async (req, res) => {
    const { task = 'general', contents, system, json, config = {} } = req.body;

    // Admin tasks spend the strongest models; only the Admin area sends them.
    if (TASKS[task]?.audience === 'admin' && !(await isAdminUser(req.user?.id).catch(() => false))) {
        return res.status(403).json({ error: 'Admin clearance required for this AI feature.' });
    }

    try {
        const result = await runTask({
            task,
            contents,
            system,
            json,
            maxTokens: config.maxOutputTokens,
            temperature: config.temperature,
        }, { logger });
        return res.status(200).json(result);
    } catch (error) {
        if (error instanceof AiUnavailableError) {
            if (error.reason === 'unconfigured') {
                logger.warn('AI generate called but no provider is configured', { task });
                return res.status(503).json({ error: 'AI is not set up on the server yet.', code: 'AI_UNCONFIGURED' });
            }
            logger.error('AI generation exhausted its chain', { task, tried: error.tried });
            return res.status(502).json({
                error: 'AI is unavailable right now. Every model for this feature failed or timed out; try again in a minute.',
                code: 'AI_EXHAUSTED',
                triedModels: error.tried,
            });
        }
        logger.error('AI generation failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'AI generation failed on the server.' });
    }
});

// GET /api/ai/status: whether each AI feature is ok, slow, on backup or down.
// Admins also get each model in the chain, its speed and its last error.
router.get('/status', authMiddleware, async (req, res) => {
    const detailed = await isAdminUser(req.user?.id).catch(() => false);
    res.set('Cache-Control', 'private, max-age=15');
    res.json(status({ detailed }));
});

// POST /api/ai/status/probe (admin): one tiny request to every configured
// model, so the panel shows real speeds before anyone waits on a real request.
const PROBE_TIMEOUT_MS = 20_000;
router.post('/status/probe', authMiddleware, requireAdmin, async (req, res) => {
    const ids = new Map();
    for (const task of Object.keys(TASKS)) {
        for (const e of catalog.resolveChain(task)) {
            if (isProviderConfigured(e.provider) && !catalog.isUnavailable(e.provider, e.model) && !ids.has(e.id)) ids.set(e.id, e);
        }
    }
    const results = await Promise.all([...ids.values()].map(async (e) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
        const t0 = Date.now();
        try {
            await callModel({
                provider: e.provider, model: e.model,
                contents: 'Reply with the single word: ready',
                maxTokens: 256, temperature: 0, reasoningEffort: 'low', signal: controller.signal,
            });
            const latencyMs = Date.now() - t0;
            health.record(e.id, { ok: true, latencyMs });
            return { id: e.id, ok: true, latencyMs };
        } catch (error) {
            const latencyMs = Date.now() - t0;
            const kind = classifyError(error);
            health.record(e.id, { ok: false, kind, latencyMs, error: error.message });
            return { id: e.id, ok: false, kind, latencyMs, error: String(error.message).slice(0, 200) };
        } finally {
            clearTimeout(timer);
        }
    }));
    res.json({ results, status: status({ detailed: true }) });
});

module.exports = router;
module.exports.MODEL_TIERS = MODEL_TIERS;
