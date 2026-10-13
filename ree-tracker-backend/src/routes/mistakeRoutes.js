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
const { buildMistakes, mistakeQuestionIds, MISTAKE_LIST_MAX } = require('../services/mistakeView');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// How many recent wrong attempts are read to find the newest mistakes.
const WRONG_SCAN_MAX = 5000;
const QUESTION_SELECT = {
    id: true, subject: true, subtopic: true, text: true, options: true, answer: true, fixedExplanation: true, type: true,
};

router.get('/mistakes', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        const wrong = await prisma.questionAttempt.findMany({
            where: {
                userId,
                isCorrect: false,
                // Not blanks ('' = left blank); NULL is a real answer recorded
                // before the option picked was stored.
                OR: [{ selectedAnswer: null }, { selectedAnswer: { not: '' } }],
            },
            select: {
                questionId: true, subject: true, subtopic: true, selectedAnswer: true,
                confidenceLevel: true, timeSpentMs: true, answeredAt: true, createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: WRONG_SCAN_MAX,
        });
        const { ids, truncated } = mistakeQuestionIds(wrong, MISTAKE_LIST_MAX);
        if (ids.length === 0) return res.status(200).json({ items: [], truncated: false });

        const [correct, questions, tags] = await Promise.all([
            prisma.questionAttempt.findMany({
                where: { userId, isCorrect: true, questionId: { in: ids } },
                select: { questionId: true, answeredAt: true, createdAt: true },
            }),
            prisma.question.findMany({ where: { id: { in: ids } }, select: QUESTION_SELECT }),
            prisma.mistakeTag.findMany({
                where: { userId, questionId: { in: ids } },
                select: { questionId: true, cause: true, resolvedAt: true },
            }),
        ]);
        res.status(200).json({ items: buildMistakes({ wrong, correct, questions, tags, ids }), truncated });
    } catch (error) {
        logger.error('Mistakes fetch failed', { error: error.message });
        res.status(500).json({ error: 'Failed to load your mistakes.' });
    }
});

// The mistake's full tag state. No idempotency(): replaying a full state is
// harmless. Marking fixed keeps the first time it was marked; unmarking clears
// it. A tag with no cause and not fixed is removed.
router.put('/mistakes/:questionId', authMiddleware, validate(mistakeTagSchema), async (req, res) => {
    const userId = req.user.id;
    const { questionId } = req.params;
    if (!questionId || questionId.length > 64) return res.status(404).json({ error: 'Question not found.' });
    const { cause, resolved } = req.body;
    const where = { userId_questionId: { userId: req.user.id, questionId } };
    try {
        if (!cause && !resolved) {
            await prisma.mistakeTag.deleteMany({ where: { userId: req.user.id, questionId } });
            return res.status(200).json({ item: { questionId, cause: null, resolvedAt: null } });
        }
        const existing = await prisma.mistakeTag.findUnique({ where, select: { resolvedAt: true } });
        const resolvedAt = resolved ? (existing?.resolvedAt ?? new Date()) : null;
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
