// src/routes/reviewRoutes.js
// AI content review loop (roadmap 3.6): admin approve/edit/reject over the
// QuestionPendingReview queue, with every lifecycle step recorded in
// QuestionVersion. AI submissions never touch the live Question table until an
// admin approves them here (promotion runs through the SAME create path as
// manual creation — services/reviewService.createLiveQuestion).
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');
const { validate } = require('../middlewares/validate');
const { reviewEditSchema, reviewApproveSchema, reviewRejectSchema } = require('../schemas/reviewSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { buildVersionSnapshot, toLiveQuestionData, createLiveQuestion } = require('../services/reviewService');

// Whole surface is admin-only.
router.use(authMiddleware, requireAdmin);

// GET /api/review/queue — pending AI submissions + (transition) legacy
// isFlagged live questions, so ONE UI drains both queues. Legacy items keep
// using the old /questions/quarantine endpoints for their actions.
router.get('/queue', async (req, res) => {
    try {
        const [pending, legacy] = await Promise.all([
            prisma.questionPendingReview.findMany({
                where: { status: 'PENDING' },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.question.findMany({
                where: { isFlagged: true },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        return res.status(200).json({
            items: [
                ...pending.map((p) => ({ ...p, legacy: false })),
                ...legacy.map((q) => ({ ...q, legacy: true })),
            ],
            pendingCount: pending.length,
            legacyCount: legacy.length,
        });
    } catch (error) {
        logger.error('review queue fetch failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Failed to fetch review queue.' });
    }
});

// PUT /api/review/:id — edit a pending item in place (auditable).
router.put('/:id', validate(reviewEditSchema), async (req, res) => {
    try {
        const row = await prisma.questionPendingReview.findUnique({ where: { id: req.params.id } });
        if (!row) return res.status(404).json({ error: 'Review item not found.' });
        if (row.status !== 'PENDING') return res.status(409).json({ error: `Item is already ${row.status}.` });

        const edits = toLiveQuestionData(row, req.body); // merged content
        const updated = await prisma.$transaction(async (tx) => {
            const u = await tx.questionPendingReview.update({
                where: { id: row.id },
                data: edits,
            });
            await tx.questionVersion.create({
                data: { reviewId: row.id, action: 'EDITED', editor: req.user.id, snapshot: buildVersionSnapshot(u) },
            });
            return u;
        });
        return res.status(200).json({ success: true, item: updated });
    } catch (error) {
        logger.error('review edit failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Failed to update review item.' });
    }
});

// PUT /api/review/:id/approve — promote to a live Question (optional inline
// edits ride along). Atomic: create live + mark APPROVED + version, or nothing.
router.put('/:id/approve', validate(reviewApproveSchema), async (req, res) => {
    try {
        const row = await prisma.questionPendingReview.findUnique({ where: { id: req.params.id } });
        if (!row) return res.status(404).json({ error: 'Review item not found.' });
        if (row.status !== 'PENDING') return res.status(409).json({ error: `Item is already ${row.status}.` });

        const finalData = toLiveQuestionData(row, req.body);
        const question = await createLiveQuestion(finalData);
        try {
            await prisma.$transaction([
                prisma.questionPendingReview.update({
                    where: { id: row.id },
                    data: { ...finalData, status: 'APPROVED', reviewedBy: req.user.id, reviewedAt: new Date(), promotedQuestionId: question.id },
                }),
                prisma.questionVersion.create({
                    data: { reviewId: row.id, questionId: question.id, action: 'APPROVED', editor: req.user.id, snapshot: finalData },
                }),
            ]);
        } catch (bookkeepErr) {
            // The live question exists but the bookkeeping failed — surface it
            // loudly rather than leave a silent half-state.
            logger.error('review approve bookkeeping failed (question created)', {
                reviewId: row.id, questionId: question.id, error: bookkeepErr.message,
            });
            return res.status(500).json({ error: 'Question created but review bookkeeping failed — refresh the queue.', questionId: question.id });
        }
        return res.status(200).json({ success: true, questionId: question.id });
    } catch (error) {
        if (error.code === 'INVALID_TAXONOMY') return res.status(400).json({ error: error.message });
        logger.error('review approve failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Failed to approve review item.' });
    }
});

// PUT /api/review/:id/reject — SOFT reject (auditable, never a delete).
router.put('/:id/reject', validate(reviewRejectSchema), async (req, res) => {
    try {
        const row = await prisma.questionPendingReview.findUnique({ where: { id: req.params.id } });
        if (!row) return res.status(404).json({ error: 'Review item not found.' });
        if (row.status !== 'PENDING') return res.status(409).json({ error: `Item is already ${row.status}.` });

        await prisma.$transaction([
            prisma.questionPendingReview.update({
                where: { id: row.id },
                data: { status: 'REJECTED', reviewNote: req.body?.reviewNote || null, reviewedBy: req.user.id, reviewedAt: new Date() },
            }),
            prisma.questionVersion.create({
                data: { reviewId: row.id, action: 'REJECTED', editor: req.user.id, snapshot: buildVersionSnapshot(row) },
            }),
        ]);
        return res.status(200).json({ success: true });
    } catch (error) {
        logger.error('review reject failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Failed to reject review item.' });
    }
});

module.exports = router;
