// src/routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');

// Initialize the AI securely on the server
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

router.post('/generate', async (req, res) => {
    try {
        // The frontend will send the prompt instructions here
        const { model, contents, config } = req.body;

        // The server makes the secure call to Google
        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: contents,
            config: config
        });

        // Send the AI's response back to the React frontend
        res.status(200).json({ text: response.text });

    } catch (error) {
        console.error("[AI CORE ERROR]:", error);
        res.status(500).json({ error: 'AI generation failed on the server.' });
    }
});

module.exports = router;