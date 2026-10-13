// Personal notes on questions and formula cards: one note per target, the
// learner's own words, shown under the solution and listed in Library ›
// Notebook › My notes. DISPLAY ONLY (tests/displayOnlyTables.test.js).
//
// The whole list is returned (newest first, up to NOTES_LIST_MAX), so the app
// can show a question's note anywhere from one cached copy, offline included.
//
// Mounted under /api/user (per-user data stays out of the service worker's
// cached /api paths; see ree-tracker/scripts/check-sw-routes.cjs).
const express = require('express');
const router = express.Router();
const { NOTE_TARGETS, normalizeNoteBody, normalizeSubject } = require('@ree/shared');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { noteSchema } = require('../schemas/notebookSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');

const NOTES_LIST_MAX = 1000;
const SNIPPET_MAX = 160;

const snippet = (text) => {
    const s = String(text || '').replace(/\s+/g, ' ').trim();
    return s.length > SNIPPET_MAX ? `${s.slice(0, SNIPPET_MAX - 1)}…` : s;
};

router.get('/notes', authMiddleware, async (req, res) => {
    try {
        const notes = await prisma.userNote.findMany({
            where: { userId: req.user.id },
            select: { targetType: true, targetId: true, body: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: NOTES_LIST_MAX,
        });
        const idsOf = (type) => notes.filter((n) => n.targetType === type).map((n) => n.targetId);
        const [questions, cards] = await Promise.all([
            idsOf('question').length
                ? prisma.question.findMany({ where: { id: { in: idsOf('question') } }, select: { id: true, subject: true, subtopic: true, text: true } })
                : [],
            idsOf('card').length
                ? prisma.referenceCard.findMany({ where: { id: { in: idsOf('card') } }, select: { id: true, subject: true, name: true, symbol: true } })
                : [],
        ]);
        const q = new Map(questions.map((x) => [x.id, x]));
        const c = new Map(cards.map((x) => [x.id, x]));
        const items = notes.map((n) => {
            const target = n.targetType === 'question' ? q.get(n.targetId) : c.get(n.targetId);
            return {
                targetType: n.targetType,
                targetId: n.targetId,
                body: n.body,
                updatedAt: n.updatedAt,
                // What the note is on, for the list; null when it's gone.
                target: !target ? null : n.targetType === 'question'
                    ? { subject: normalizeSubject(target.subject || ''), topic: target.subtopic || null, title: snippet(target.text) }
                    : { subject: normalizeSubject(target.subject || ''), topic: null, title: target.symbol ? `${target.name} (${target.symbol})` : target.name, name: target.name },
            };
        });
        res.status(200).json({ items, truncated: notes.length === NOTES_LIST_MAX });
    } catch (error) {
        logger.error('Notes fetch failed', { error: error.message });
        res.status(500).json({ error: 'Failed to load your notes.' });
    }
});

// The note's whole text; an empty one deletes it. No idempotency(): replaying
// a full state is harmless.
router.put('/notes/:type/:targetId', authMiddleware, validate(noteSchema), async (req, res) => {
    const userId = req.user.id;
    const { type, targetId } = req.params;
    if (!NOTE_TARGETS.includes(type) || !targetId || targetId.length > 64) {
        return res.status(404).json({ error: 'Nothing to note there.' });
    }
    const body = normalizeNoteBody(req.body.body);
    const where = { userId_targetType_targetId: { userId: req.user.id, targetType: type, targetId } };
    try {
        if (!body) {
            await prisma.userNote.deleteMany({ where: { userId: req.user.id, targetType: type, targetId } });
            return res.status(200).json({ item: null });
        }
        const exists = type === 'question'
            ? await prisma.question.findUnique({ where: { id: targetId }, select: { id: true } })
            : await prisma.referenceCard.findUnique({ where: { id: targetId }, select: { id: true } });
        if (!exists) return res.status(404).json({ error: type === 'question' ? 'Question not found.' : 'Card not found.' });

        const write = () => prisma.userNote.upsert({
            where,
            create: { userId, targetType: type, targetId, body },
            update: { body },
        });
        let row;
        try {
            row = await write();
        } catch (error) {
            if (error.code !== 'P2002') throw error;
            row = await write();
        }
        res.status(200).json({ item: { targetType: row.targetType, targetId: row.targetId, body: row.body, updatedAt: row.updatedAt } });
    } catch (error) {
        logger.error('Note save failed', { error: error.message });
        res.status(500).json({ error: 'Failed to save your note.' });
    }
});

module.exports = router;
