const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { GoogleGenAI } = require('@google/genai');
const logger = require('../utils/logger');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL_TIERS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

router.post('/generate', authMiddleware, async (req, res) => {
    try {
        const { model, contents, config } = req.body;

        const modelsToTry = model ? [model] : MODEL_TIERS;
        let lastError = null;

        for (const modelId of modelsToTry) {
            try {
                const response = await ai.models.generateContent({
                    model: modelId,
                    contents: contents,
                    config: config
                });
                return res.status(200).json({ text: response.text });
            } catch (error) {
                lastError = error;
                logger.warn('AI model fallback', { model: modelId, error: error.message });
            }
        }

        throw lastError || new Error('All AI models exhausted.');
    } catch (error) {
        logger.error('AI generation failed', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'AI generation failed on the server.' });
    }
});

module.exports = router;
