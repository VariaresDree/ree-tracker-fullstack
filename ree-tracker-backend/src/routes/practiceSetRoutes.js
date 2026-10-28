// Sets to finish (Progress › Syllabus › Sets): papers the learner means to get
// through — past boards, a review center's numbered sets — ticked off, and
// optionally pointing at the outside score they were logged as. The CELE
// tracker's "Progress check". DISPLAY ONLY: nothing that reads θ, the
// forecast, readiness, the rankings or the plan reads these rows
// (tests/displayOnlyTables.test.js). The outside score is a plain id and is
// never looked up here.
//
// Mounted under /api/user (per-user data stays out of the service worker's
// cached /api paths; see ree-tracker/scripts/check-sw-routes.cjs).
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const idempotency = require('../middlewares/idempotency');
const { practiceSetCreateSchema, practiceSetUpdateSchema, practiceSetBulkSchema } = require('../schemas/setsAndLinksSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { PRACTICE_SET_LIMITS } = require('@ree/shared');

const view = ({ userId: _userId, ...row }) => row;

const fieldsOf = (body) => ({
    collection: body.collection,
    title: body.title,
    subject: body.subject,
    status: body.status,
    doneOn: body.doneOn,
    outsideScoreId: body.outsideScoreId,
    sortOrder: body.sortOrder,
});

const full = () => ({ error: `You can keep up to ${PRACTICE_SET_LIMITS.perUser} sets. Delete old ones to add more.` });

router.get('/practice-sets', authMiddleware, async (req, res) => {
    try {
        const rows = await prisma.practiceSet.findMany({
            where: { userId: req.user.id },
            orderBy: [{ createdAt: 'asc' }],
            take: PRACTICE_SET_LIMITS.perUser,
        });
        res.status(200).json({ items: rows.map(view) });
    } catch (error) {
        logger.error('Practice sets fetch failed', { error: error.message });
        res.status(500).json({ error: 'Failed to load your sets.' });
    }
});

router.post('/practice-sets', authMiddleware, validate(practiceSetCreateSchema), idempotency(), async (req, res) => {
    const userId = req.user.id;
    const { id } = req.body;
    try {
        if (await prisma.practiceSet.count({ where: { userId } }) >= PRACTICE_SET_LIMITS.perUser) return res.status(400).json(full());
        const row = await prisma.practiceSet.create({ data: { id, userId, ...fieldsOf(req.body) } });
        res.status(201).json({ item: view(row) });
    } catch (error) {
        // A replay the idempotency record no longer covers: answer with the row.
        if (error.code === 'P2002') {
            const mine = await prisma.practiceSet.findFirst({ where: { id, userId } }).catch(() => null);
            if (mine) return res.status(200).json({ item: view(mine) });
            return res.status(400).json({ error: 'That set id is already in use.' });
        }
        logger.error('Practice set create failed', { error: error.message });
        res.status(500).json({ error: 'Failed to save the set.' });
    }
});

// A template's sets, all or none. Ids made on the device, so a replayed bulk
// skips the ones it already made instead of failing.
router.post('/practice-sets/bulk', authMiddleware, validate(practiceSetBulkSchema), idempotency(), async (req, res) => {
    const userId = req.user.id;
    const { items } = req.body;
    try {
        const count = await prisma.practiceSet.count({ where: { userId } });
        if (count + items.length > PRACTICE_SET_LIMITS.perUser) return res.status(400).json(full());
        await prisma.practiceSet.createMany({
            data: items.map((b) => ({ id: b.id, userId, ...fieldsOf(b) })),
            skipDuplicates: true,
        });
        const rows = await prisma.practiceSet.findMany({ where: { userId, id: { in: items.map((b) => b.id) } } });
        res.status(201).json({ items: rows.map(view) });
    } catch (error) {
        logger.error('Practice set bulk create failed', { error: error.message });
        res.status(500).json({ error: 'Failed to add the sets.' });
    }
});

// Full replace. No idempotency(): replaying the same full state is harmless.
router.put('/practice-sets/:id', authMiddleware, validate(practiceSetUpdateSchema), async (req, res) => {
    try {
        const row = await prisma.practiceSet.update({ where: { id: req.params.id, userId: req.user.id }, data: fieldsOf(req.body) });
        res.status(200).json({ item: view(row) });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Set not found.' });
        logger.error('Practice set update failed', { error: error.message });
        res.status(500).json({ error: 'Failed to update the set.' });
    }
});

// Always 200: a delete replayed from the offline queue must not land in Sync issues.
router.delete('/practice-sets/:id', authMiddleware, async (req, res) => {
    try {
        const { count } = await prisma.practiceSet.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
        res.status(200).json({ success: true, deleted: count });
    } catch (error) {
        logger.error('Practice set delete failed', { error: error.message });
        res.status(500).json({ error: 'Failed to delete the set.' });
    }
});

module.exports = router;
