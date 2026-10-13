// The mistake notebook (Library › Notebook › Mistakes): every question the
// learner got wrong, newest first, with their last answer beside the key, how
// many times they've missed it, whether it's fixed, and why they missed it.
// The list is derived from QuestionAttempt on each read; only the learner's
// tags (cause, marked fixed) are stored. DISPLAY ONLY: MistakeTag never feeds
// θ, the forecast, readiness or the rankings (tests/displayOnlyTables.test.js).
//
// Mounted under /api/user (per-user data stays out of the service worker's
// cached /api paths; see ree-tracker/scripts/check-sw-routes.cjs).
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { mistakeTagSchema } = require('../schemas/notebookSchemas');
const { loadMistakes } = require('../services/mistakeList');
const { isMarkedFixed } = require('@ree/shared');
const prisma = require('../config/db');
const logger = require('../utils/logger');

router.get('/mistakes', authMiddleware, async (req, res) => {
    try {
        res.status(200).json(await loadMistakes(req.user.id));
    } catch (error) {
        logger.error('Mistakes fetch failed', { error: error.message });
        res.status(500).json({ error: 'Failed to load your mistakes.' });
    }
});

// The mistake's tag state. No idempotency(): replaying a state is harmless.
// Marking fixed keeps the time it was marked while that mark stands (a replay
// changes nothing); after a new miss it sets a new time. Unmarking clears it;
// `resolved` left out keeps the mark as it stands. A tag with no cause and not
// fixed is removed.
router.put('/mistakes/:questionId', authMiddleware, validate(mistakeTagSchema), async (req, res) => {
    const userId = req.user.id;
    const { questionId } = req.params;
    if (!questionId || questionId.length > 64) return res.status(404).json({ error: 'Question not found.' });
    const { cause } = req.body;
    const where = { userId_questionId: { userId: req.user.id, questionId } };
    try {
        const [existing, lastWrong] = await Promise.all([
            prisma.mistakeTag.findUnique({ where, select: { resolvedAt: true } }),
            prisma.questionAttempt.findFirst({
                where: { userId: req.user.id, questionId, isCorrect: false },
                orderBy: { createdAt: 'desc' },
                select: { answeredAt: true, createdAt: true },
            }),
        ]);
        const lastWrongAt = lastWrong ? (lastWrong.answeredAt || lastWrong.createdAt) : null;
        const marked = isMarkedFixed({ lastWrongAt, resolvedAt: existing?.resolvedAt ?? null });
        const resolved = req.body.resolved ?? marked;
        if (!cause && !resolved) {
            await prisma.mistakeTag.deleteMany({ where: { userId: req.user.id, questionId } });
            return res.status(200).json({ item: { questionId, cause: null, resolvedAt: null } });
        }
        const resolvedAt = resolved ? (marked ? existing.resolvedAt : new Date()) : null;
        const write = () => prisma.mistakeTag.upsert({
            where,
            create: { userId, questionId, cause, resolvedAt },
            update: { cause, resolvedAt },
        });
        let row;
        try {
            row = await write();
        } catch (error) {
            // Two first tags for one question raced; the other made the row.
            if (error.code !== 'P2002') throw error;
            row = await write();
        }
        res.status(200).json({
            item: { questionId, cause: row.cause, resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null },
        });
    } catch (error) {
        if (error.code === 'P2003') return res.status(404).json({ error: 'Question not found.' });
        logger.error('Mistake tag failed', { error: error.message });
        res.status(500).json({ error: 'Failed to save that.' });
    }
});

module.exports = router;
