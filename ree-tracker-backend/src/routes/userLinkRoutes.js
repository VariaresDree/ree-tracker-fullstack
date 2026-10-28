// The learner's own links (Library › Links): Drive folders, videos, flashcard
// decks, quizzes, by subject, pinned when they're favourites. The CELE
// tracker's "Useful links". DISPLAY ONLY (tests/displayOnlyTables.test.js).
//
// Mounted under /api/user (per-user data stays out of the service worker's
// cached /api paths; see ree-tracker/scripts/check-sw-routes.cjs).
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const idempotency = require('../middlewares/idempotency');
const { userLinkCreateSchema, userLinkUpdateSchema } = require('../schemas/setsAndLinksSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { USER_LINK_LIMITS } = require('@ree/shared');

const view = ({ userId: _userId, ...row }) => row;

const fieldsOf = (body) => ({
    title: body.title,
    url: body.url,
    subject: body.subject,
    topicId: body.topicId,
    pinned: body.pinned,
    note: body.note,
});

router.get('/links', authMiddleware, async (req, res) => {
    try {
        const rows = await prisma.userLink.findMany({
            where: { userId: req.user.id },
            orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
            take: USER_LINK_LIMITS.perUser,
        });
        res.status(200).json({ items: rows.map(view) });
    } catch (error) {
        logger.error('Links fetch failed', { error: error.message });
        res.status(500).json({ error: 'Failed to load your links.' });
    }
});

router.post('/links', authMiddleware, validate(userLinkCreateSchema), idempotency(), async (req, res) => {
    const userId = req.user.id;
    const { id } = req.body;
    try {
        if (await prisma.userLink.count({ where: { userId } }) >= USER_LINK_LIMITS.perUser) {
            return res.status(400).json({ error: `You can keep up to ${USER_LINK_LIMITS.perUser} links. Delete old ones to add more.` });
        }
        const row = await prisma.userLink.create({ data: { id, userId, ...fieldsOf(req.body) } });
        res.status(201).json({ item: view(row) });
    } catch (error) {
        if (error.code === 'P2002') {
            const mine = await prisma.userLink.findFirst({ where: { id, userId } }).catch(() => null);
            if (mine) return res.status(200).json({ item: view(mine) });
            return res.status(400).json({ error: 'That link id is already in use.' });
        }
        logger.error('Link create failed', { error: error.message });
        res.status(500).json({ error: 'Failed to save the link.' });
    }
});

// Full replace. No idempotency(): replaying the same full state is harmless.
router.put('/links/:id', authMiddleware, validate(userLinkUpdateSchema), async (req, res) => {
    try {
        const row = await prisma.userLink.update({ where: { id: req.params.id, userId: req.user.id }, data: fieldsOf(req.body) });
        res.status(200).json({ item: view(row) });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Link not found.' });
        logger.error('Link update failed', { error: error.message });
        res.status(500).json({ error: 'Failed to update the link.' });
    }
});

// Always 200: a delete replayed from the offline queue must not land in Sync issues.
router.delete('/links/:id', authMiddleware, async (req, res) => {
    try {
        const { count } = await prisma.userLink.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
        res.status(200).json({ success: true, deleted: count });
    } catch (error) {
        logger.error('Link delete failed', { error: error.message });
        res.status(500).json({ error: 'Failed to delete the link.' });
    }
});

module.exports = router;
