// src/routes/questionRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

const { validate } = require('../middlewares/validate');
const { questionCreateSchema, questionUpdateSchema } = require('../schemas/questionSchemas');
const { requireAdmin } = require('../middlewares/roleMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');

const getSubjectFilter = (subjectStr) => {
    if (!subjectStr || subjectStr === 'All') return undefined;
    if (subjectStr === 'Mathematics' || subjectStr === 'Math') return { in: ['Math', 'Mathematics'] };
    if (subjectStr === 'EE' || subjectStr === 'Electrical Engineering') return { in: ['EE', 'Electrical Engineering', 'Electrical Engineering Professional Subjects'] };
    if (subjectStr === 'ESAS') return { in: ['ESAS', 'Engineering Sciences and Allied Subjects'] };
    return subjectStr;
};

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
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { subject, subtopic, limit = 50 } = req.query;

        let whereClause = { isFlagged: false };

        const subjFilter = getSubjectFilter(subject);
        if (subjFilter) whereClause.subject = subjFilter;

        if (subtopic && subtopic !== 'All') {
            whereClause.subtopic = subtopic.trim();
        }

        // Pull a random sample. A flat `ORDER BY random()` is still biased toward
        // whichever subtopic dominates the bank — for Math that's "Algebra &
        // Complex Numbers", for ESAS "Chemistry for Engineers" — so a subject-wide
        // ("All") session looked un-randomized. When no subtopic is pinned we
        // stratify: ROW_NUMBER() partitions by subtopic, then ordering by
        // (rn, random()) round-robins one item per subtopic before any subtopic
        // contributes a second, guaranteeing breadth across the subject.
        const cap = Math.min(parseInt(limit) || 50, 2000);
        const subjectValues = subjFilter ? (subjFilter.in || [subjFilter]) : null;
        const specificSubtopic = subtopic && subtopic !== 'All' ? subtopic.trim() : null;

        let ids;
        if (specificSubtopic) {
            ids = await prisma.$queryRawUnsafe(
                `SELECT id FROM "Question"
                 WHERE "isFlagged" = false
                 ${subjectValues ? `AND "subject" = ANY($1::text[])` : ''}
                 AND "subtopic" = $${subjectValues ? 2 : 1}
                 ORDER BY random()
                 LIMIT ${cap}`,
                ...[subjectValues, specificSubtopic].filter((v) => v !== null),
            );
        } else {
            ids = await prisma.$queryRawUnsafe(
                `SELECT id FROM (
                    SELECT id,
                           ROW_NUMBER() OVER (PARTITION BY "subtopic" ORDER BY random()) AS rn
                    FROM "Question"
                    WHERE "isFlagged" = false
                    ${subjectValues ? `AND "subject" = ANY($1::text[])` : ''}
                 ) t
                 ORDER BY t.rn, random()
                 LIMIT ${cap}`,
                ...[subjectValues].filter((v) => v !== null),
            );
        }

        const idList = ids.map((r) => r.id);
        if (idList.length === 0) {
            return res.status(200).json({ success: true, items: [] });
        }

        const questions = await prisma.question.findMany({
            where: { id: { in: idList } },
        });

        // Preserve the random order from the SQL query
        const orderMap = new Map(idList.map((id, i) => [id, i]));
        questions.sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id));

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
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const data = req.body;
        await prisma.question.update({
            where: { id: req.params.id },
            data: {
                subject: data.subject,
                subtopic: data.subtopic,
                text: data.text,
                options: data.options,
                answer: data.answer,
                difficulty: parseFloat(data.difficulty),
                fixedExplanation: data.fixedExplanation,
                isFlagged: data.isFlagged !== undefined ? data.isFlagged : undefined
            }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
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
        const cap = Math.min(parseInt(limit) || 20, 2000);

        const subjFilter = getSubjectFilter(subject);
        const subjectValues = subjFilter ? (subjFilter.in || [subjFilter]) : null;

        const ids = await prisma.$queryRawUnsafe(
            `SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (PARTITION BY "subtopic" ORDER BY random()) AS rn
                FROM "Question"
                WHERE "isFlagged" = false
                ${subjectValues ? `AND "subject" = ANY($1::text[])` : ''}
             ) t
             ORDER BY t.rn, random()
             LIMIT ${cap}`,
            ...[subjectValues].filter((v) => v !== null),
        );

        const idList = ids.map((r) => r.id);
        if (idList.length === 0) return res.status(200).json({ success: true, items: [] });

        const questions = await prisma.question.findMany({ where: { id: { in: idList } } });
        const orderMap = new Map(idList.map((id, i) => [id, i]));
        questions.sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id));

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