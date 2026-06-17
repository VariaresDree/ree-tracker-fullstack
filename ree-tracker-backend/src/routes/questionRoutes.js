// src/routes/questionRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db'); // Centralized DB Connection

// 0. FETCH GLOBAL QUESTION STATS
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const total = await prisma.question.count({ where: { isFlagged: false } });
        const math = await prisma.question.count({ where: { subject: 'Math', isFlagged: false } });
        const esas = await prisma.question.count({ where: { subject: 'ESAS', isFlagged: false } });
        const ee = await prisma.question.count({ where: { subject: 'EE', isFlagged: false } });
        
        return res.status(200).json({ 
            totalQuestions: total, 
            breakdown: { Math: math, ESAS: esas, EE: ee } 
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

// 1. FETCH QUESTIONS (Populates the Library)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { subject, limit = 50 } = req.query;
        
        // FIXED: Added 'answer' to the SELECT statement
        const questions = await prisma.$queryRawUnsafe(`
            SELECT id, subject, subtopic, text, options, answer, "fixedExplanation", difficulty, source, type
            FROM "Question"
            WHERE "isFlagged" = false ${subject && subject !== 'All' ? `AND subject = '${subject}'` : ''}
            ORDER BY RANDOM()
            LIMIT ${parseInt(limit)};
        `);

        return res.status(200).json({ success: true, items: questions });
    } catch (error) {
        console.error("Library Fetch Error:", error);
        return res.status(500).json({ error: 'Failed to fetch question bank.' });
    }
});

// 2. ADD A NEW QUESTION
router.post('/', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin clearance required.' });

        const data = req.body;
        const newQuestion = await prisma.question.create({
            data: {
                subject: data.subject || 'Unknown',
                subtopic: data.subtopic || 'General',
                text: data.text || data.question || data.questionText || '',
                options: data.options || [],
                answer: data.answer || data.correctAnswer || '',
                difficulty: parseFloat(data.difficulty || data.difficultyTheta) || 0.0,
                fixedExplanation: data.fixedExplanation || data.cachedExplanation || null,
                source: data.source || 'manual',
                type: data.type || 'conceptual'
            }
        });

        return res.status(201).json({ success: true, id: newQuestion.id });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to insert question.' });
    }
});

// 3. UPDATE AN EXISTING QUESTION
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin clearance required.' });

        const data = req.body;
        await prisma.question.update({
            where: { id: req.params.id },
            data: {
                subject: data.subject,
                subtopic: data.subtopic,
                text: data.text || data.question || data.questionText,
                options: data.options,
                answer: data.answer || data.correctAnswer,
                difficulty: parseFloat(data.difficulty || data.difficultyTheta),
                fixedExplanation: data.fixedExplanation || data.cachedExplanation
            }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update question.' });
    }
});

// 4. UPDATE CACHED EXPLANATION (AI Generated)
router.put('/:id/cache', authMiddleware, async (req, res) => {
    try {
        const { cachedExplanation, fixedExplanation } = req.body;
        await prisma.question.update({
            where: { id: req.params.id },
            data: { fixedExplanation: fixedExplanation || cachedExplanation }
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update explanation.' });
    }
});

// 5. FETCH ACTIVE RECALL REVIEW QUESTIONS
router.post('/review', authMiddleware, async (req, res) => {
    try {
        const { subject, limit = 20 } = req.body;
        
        // FIXED: Added 'answer' to the SELECT statement
        const questions = await prisma.$queryRawUnsafe(`
            SELECT id, subject, subtopic, text, options, answer, "fixedExplanation", difficulty, source, type
            FROM "Question"
            WHERE "isFlagged" = false ${subject && subject !== 'All' ? `AND subject = '${subject}'` : ''}
            ORDER BY RANDOM()
            LIMIT ${parseInt(limit)};
        `);

        return res.status(200).json({ success: true, items: questions });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to initialize active recall.' });
    }
});

// 6. FLAG A QUESTION ANOMALY
router.patch('/:id/flag', authMiddleware, async (req, res) => {
    try {
        await prisma.question.update({ where: { id: req.params.id }, data: { isFlagged: true } });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to flag question.' });
    }
});

module.exports = router;