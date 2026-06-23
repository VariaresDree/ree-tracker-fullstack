const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { GoogleGenAI } = require('@google/genai');
const logger = require('../utils/logger');

// User-specified tier list — kept verbatim per project requirement.
// Note: gemini-3.5-flash and gemini-3.1-flash-lite are not currently shipped
// model IDs; the fallback loop will skip them and land on gemini-2.5-flash.
const MODEL_TIERS = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];

const PER_MODEL_TIMEOUT_MS = 10_000;

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

router.post('/generate', authMiddleware, async (req, res) => {
    const ai = getAI();
    if (!ai) {
        logger.warn('AI generate called but GEMINI_API_KEY is missing');
        return res.status(503).json({ error: 'AI temporarily unavailable.' });
    }

    try {
        const { model, contents, config } = req.body;
        const modelsToTry = model ? [model] : MODEL_TIERS;
        let lastError = null;

        for (const modelId of modelsToTry) {
            try {
                const response = await withTimeout(
                    ai.models.generateContent({ model: modelId, contents, config }),
                    PER_MODEL_TIMEOUT_MS,
                );
                return res.status(200).json({ text: response.text, model: modelId });
            } catch (error) {
                lastError = error;
                logger.warn('AI model fallback', { model: modelId, error: error.message });
            }
        }

        logger.error('AI generation exhausted all tiers', { error: lastError?.message });
        return res.status(502).json({ error: 'AI generation failed across all model tiers.' });
    } catch (error) {
        logger.error('AI generation failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'AI generation failed on the server.' });
    }
});

module.exports = router;
