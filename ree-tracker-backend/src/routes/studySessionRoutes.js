const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { studySessionSchema } = require('../schemas/studySessionSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// Record a completed study session
router.post('/', authMiddleware, validate(studySessionSchema), async (req, res) => {
    try {
        // Fields are schema-validated + coerced to numbers/bounded strings.
        const { mode, subject, subtopic, totalQuestions, correctAnswers, durationSecs } = req.body;

        const session = await prisma.studySession.create({
            data: {
                userId: req.user.id,
                mode,
                subject,
                subtopic: subtopic || null,
                totalQuestions,
                correctAnswers,
                durationSecs
            }
        });

        res.status(201).json({ success: true, id: session.id });
    } catch (error) {
        logger.error('Study session create error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to record study session.' });
    }
});

module.exports = router;
