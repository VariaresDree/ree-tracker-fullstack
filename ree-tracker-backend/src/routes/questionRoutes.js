// src/routes/questionRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

const { validate } = require('../middlewares/validate');
const { questionCreateSchema, questionUpdateSchema } = require('../schemas/questionSchemas');
const { requireAdmin } = require('../middlewares/roleMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { getSubjectFilter, samplePool } = require('../services/questionPool');

// 0. FETCH GLOBAL QUESTION STATS 
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const [total, math, esas, ee] = await Promise.all([
            prisma.question.count(),
            prisma.question.count({ where: { subject: { in: ['Math', 'Mathematics'] } } }),
            prisma.question.count({ where: { subject: { in: ['ESAS', 'Engineering Sciences and Allied Subjects'] } } }),
            prisma.question.count({ where: { subject: { in: ['EE', 'Electrical Engineering', 'Electrical Engineering Professional Subjects'] } } })
        ]);
        
        return res.status(200).json({ total, math, esas, ee });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

// 1. FETCH QUESTIONS
// Stratified random sampling lives in services/questionPool (shared with
// battle creation) — see that module for the randomization rationale.
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { subject, subtopic, limit = 50, sort = 'random', offset = 0 } = req.query;

        // Deterministic ingestion ordering for the admin/library review grid:
        // newest- or oldest-created first, with real offset pagination so
        // "Load More" advances instead of re-rolling. The default 'random' path
        // (samplePool, shared with battle creation) is left untouched — active
        // review & vault sampling depend on it.
        if (sort === 'recent' || sort === 'oldest') {
            const whereClause = { isFlagged: false };
            const subjFilter = getSubjectFilter(subject);
            if (subjFilter) whereClause.subject = subjFilter;
            if (subtopic && subtopic !== 'All') whereClause.subtopic = subtopic.trim();

            const cap = Math.min(parseInt(limit) || 50, 2000);
            const skip = Math.max(0, parseInt(offset) || 0);
            const questions = await prisma.question.findMany({
                where: whereClause,
                orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' },
                skip,
                take: cap,
            });
            return res.status(200).json({
                success: true,
                items: questions,
                nextOffset: skip + questions.length,
            });
        }

        const questions = await samplePool({ subject, subtopic, limit });
        return res.status(200).json({ success: true, items: questions });
    } catch (error) {
        logger.error('Question fetch error', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Failed to fetch question bank.' });
    }
});

// 1.5. GET QUARANTINE QUEUE
router.get('/quarantine', authMiddleware, async (req, res) => {
    try {
        const flagged = await prisma.question.findMany({
            where: { isFlagged: true },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(flagged);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch quarantine queue." });
    }
});

// 1.6. APPROVE QUARANTINED ITEM
router.put('/quarantine/:id/approve', authMiddleware, requireAdmin, async (req, res) => {
    try {
        await prisma.question.update({
            where: { id: req.params.id },
            data: { isFlagged: false, subject: req.body.subject, subtopic: req.body.subtopic }
        });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Approval validation failed." });
    }
});

// 1.7. GET FLAGGED QUESTIONS 
router.get('/flagged', authMiddleware, async (req, res) => {
    try {
        const { subject, subtopic } = req.query;
        let whereClause = { isFlagged: true };
        
        const subjFilter = getSubjectFilter(subject);
        if (subjFilter) whereClause.subject = subjFilter;
        
        if (subtopic && subtopic !== 'All') {
            whereClause.subtopic = subtopic.trim();
        }

        const flaggedQuestions = await prisma.question.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json(flaggedQuestions);
    } catch (error) {
        logger.error('Flagged questions fetch error', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Failed to fetch flagged items.' });
    }
});

// 2. ADD A NEW QUESTION
router.post('/', authMiddleware, validate(questionCreateSchema), async (req, res) => {
    try {
        const data = req.body;
        const newQuestion = await prisma.question.create({
            data: {
                subject: data.subject || 'Unknown',
                subtopic: data.subtopic || 'General',
                text: data.text || '',
                options: Array.isArray(data.options) ? data.options : [],
                answer: data.answer || '',
                difficulty: parseFloat(data.difficulty) || 2.0,
                fixedExplanation: data.fixedExplanation || null,
                source: data.source || 'manual',
                type: data.type || 'calculation',
                isFlagged: data.isFlagged || false,
                bloomLevel: data.bloomLevel || 'REMEMBER',
                difficultyTier: data.difficultyTier || 1,
                competencyArea: data.competencyArea || null
            }
        });

        return res.status(201).json({ success: true, id: newQuestion.id });
    } catch (error) {
        logger.error('Question create error', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Failed to insert question.' });
    }
});

// 3. UPDATE AN EXISTING QUESTION
router.put('/:id', authMiddleware, validate(questionUpdateSchema), async (req, res) => {
    try {
        const data = req.body;
        // Choice-label sanitisation ("A."/"b)" prefixes) is applied by the Zod
        // transform in questionUpdateSchema via the validate() middleware above.
        // questionUpdateSchema is a .partial() — absent fields stay undefined,
        // which Prisma skips (the old parseFloat(undefined) wrote NaN).
        await prisma.question.update({
            where: { id: req.params.id },
            data: {
                subject: data.subject,
                subtopic: data.subtopic,
                text: data.text,
                options: data.options,
                answer: data.answer,
                difficulty: data.difficulty,
                fixedExplanation: data.fixedExplanation,
                isFlagged: data.isFlagged
            }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Question not found.' });
        return res.status(500).json({ error: 'Failed to update question.' });
    }
});

// 4. UPDATE CACHED EXPLANATION
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
// Kept consistent with GET / : stratified random across subtopics instead of the
// old `orderBy createdAt desc` (which returned only the latest subtopic).
router.post('/review', authMiddleware, async (req, res) => {
    try {
        const { subject, limit = 20 } = req.body;
        const questions = await samplePool({ subject, limit });
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

// 7. EXPLANATION REVIEW QUEUE (Admin only)
router.get('/explanations/pending', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const questions = await prisma.question.findMany({
            where: {
                fixedExplanation: { not: null },
                explanationStatus: 'PENDING'
            },
            select: {
                id: true, subject: true, subtopic: true, text: true,
                fixedExplanation: true, explanationStatus: true
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.status(200).json({ items: questions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pending explanations.' });
    }
});

// 7.1 APPROVE/REJECT EXPLANATION
router.put('/:id/explanation-status', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
            return res.status(400).json({ error: 'Status must be APPROVED, REJECTED, or PENDING.' });
        }

        await prisma.question.update({
            where: { id: req.params.id },
            data: { explanationStatus: status }
        });
        res.status(200).json({ success: true });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Question not found.' });
        res.status(500).json({ error: 'Failed to update explanation status.' });
    }
});

// 8. DELETE QUESTION
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        await prisma.question.delete({ where: { id: req.params.id } });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Deletion failed." });
    }
});

module.exports = router;