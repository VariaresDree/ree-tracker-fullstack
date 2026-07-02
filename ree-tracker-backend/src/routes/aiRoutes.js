const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { GoogleGenAI } = require('@google/genai');
const logger = require('../utils/logger');

// Real, currently-shipping Gemini IDs ordered from most capable to lightest.
// Override at runtime via MODEL_TIERS env (comma-separated) — useful when
// Google ships new IDs and we don't want to redeploy just to add them.
const DEFAULT_MODEL_TIERS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
];

const MODEL_TIERS = (process.env.MODEL_TIERS
    ? process.env.MODEL_TIERS.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_MODEL_TIERS);

const PER_MODEL_TIMEOUT_MS = 10_000;

// Tiers that returned 404 are skipped for DEAD_TIER_TTL_MS, then retried.
// Previously this Set held forever — so a single transient 404 (rolling Google
// availability) permanently blacklisted a model in-memory, and over time every
// tier was marked dead, returning 502 for every AI request until backend
// restart. TTL eviction lets the route recover without operator intervention.
const DEAD_TIER_TTL_MS = 5 * 60 * 1000; // 5 minutes
const deadTiers = new Map(); // modelId -> deadAt timestamp

const isDead = (modelId) => {
    const ts = deadTiers.get(modelId);
    if (!ts) return false;
    if (Date.now() - ts > DEAD_TIER_TTL_MS) {
        deadTiers.delete(modelId);
        return false;
    }
    return true;
};

// Expose a Set-shaped view for the existing model-fallback test that asserts
// `aiRoutes.deadTiers instanceof Set`. The Map is the internal storage; the
// shimmed Set wraps `keys()` so consumers can still iterate.
const deadTiersView = new Set();
const refreshDeadTiersView = () => {
    deadTiersView.clear();
    for (const k of deadTiers.keys()) deadTiersView.add(k);
    return deadTiersView;
};

let _ai = null;
function getAI() {
    if (!process.env.GEMINI_API_KEY) return null;
    if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return _ai;
}

function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`model timeout after ${ms}ms`)), ms);
        promise.then(
            (v) => { clearTimeout(t); resolve(v); },
            (e) => { clearTimeout(t); reject(e); },
        );
    });
}

function classifyError(err) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('not found') || msg.includes('404')) return 'not_found';
    if (msg.includes('429')) return 'rate_limited';
    if (msg.includes('503') || msg.includes('unavailable')) return 'unavailable';
    if (msg.includes('timeout')) return 'timeout';
    return 'other';
}

router.post('/generate', authMiddleware, async (req, res) => {
    const ai = getAI();
    if (!ai) {
        logger.warn('AI generate called but GEMINI_API_KEY is missing');
        return res.status(503).json({ error: 'AI temporarily unavailable.' });
    }

    try {
        const { model, contents, config } = req.body;
        const requested = model ? [model] : MODEL_TIERS;
        const modelsToTry = requested.filter((m) => !isDead(m));
        const tried = [];
        let lastError = null;

        for (const modelId of modelsToTry) {
            const startedAt = Date.now();
            try {
                const response = await withTimeout(
                    ai.models.generateContent({ model: modelId, contents, config }),
                    PER_MODEL_TIMEOUT_MS,
                );
                const latencyMs = Date.now() - startedAt;
                logger.info('AI model success', { model: modelId, latencyMs });
                tried.push({ model: modelId, status: 'ok', latencyMs });
                return res.status(200).json({ text: response.text, model: modelId, tried });
            } catch (error) {
                const latencyMs = Date.now() - startedAt;
                const kind = classifyError(error);
                lastError = error;
                tried.push({ model: modelId, status: kind, latencyMs, error: error.message });
                logger.warn('AI model fallback', { model: modelId, kind, latencyMs, error: error.message });

                if (kind === 'not_found') {
                    // Mark dead with a TTL — auto-recovers after 5 minutes so a
                    // transient 404 doesn't permanently blacklist the model.
                    deadTiers.set(modelId, Date.now());
                }
                // For all other classes, continue to the next tier immediately.
            }
        }

        logger.error('AI generation exhausted all tiers', {
            tried,
            deadTiers: Array.from(deadTiers.keys()),
            lastError: lastError?.message,
        });
        return res.status(502).json({
            error: 'AI service is temporarily unavailable — try again in a minute.',
            triedModels: tried,
        });
    } catch (error) {
        logger.error('AI generation failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'AI generation failed on the server.' });
    }
});

module.exports = router;
module.exports.MODEL_TIERS = MODEL_TIERS;
// Set-shaped view preserved for the existing modelFallback test which checks
// `deadTiers instanceof Set`. Mutate via the internal Map; the view is a
// snapshot refreshed on demand.
module.exports.deadTiers = refreshDeadTiersView();
Object.defineProperty(module.exports, 'deadTiers', {
    get: refreshDeadTiersView,
});
