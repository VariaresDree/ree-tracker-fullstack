// One learner's changes to the syllabus table of contents: ticks, renames,
// subtopics switched off, moved, or added. The suggested list itself is
// GET /api/config/subtopics, and the two are merged on the device (@ree/shared
// mergeSubtopics), so a learner who changes nothing has no rows here.
// DISPLAY ONLY: nothing that reads θ, the forecast, readiness or the rankings
// may use these rows (tests/displayOnlyTables.test.js).
//
// A row's id is the suggested subtopic's id, or one made on the device for the
// learner's own. Writes send the row's full state, so replaying one is harmless,
// and a body-hash idempotency key would wrongly replay an older state when a
// later change set the row back to it.
//
// Mounted under /api/user (per-user data stays out of the service worker's
// cached /api paths; see ree-tracker/scripts/check-sw-routes.cjs).
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { userSubtopicSchema, userSubtopicBulkSchema } = require('../schemas/subtopicSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { SUBTOPIC_LIMITS } = require('@ree/shared');

const BASE = '/syllabus-subtopics';
const view = ({ userId: _userId, ...row }) => row;
const full = () => ({ error: `You can keep up to ${SUBTOPIC_LIMITS.ownPerUser} of your own subtopics. Delete some to add more.` });
const ownCount = (userId) => prisma.userSubtopic.count({ where: { userId, subtopicId: null } });
// A foreign key failed: no such topic or suggested subtopic.
const noSuchTopic = (error) => error.code === 'P2003' || /foreign key|23503/i.test(String(error.message));

router.get(BASE, authMiddleware, async (req, res) => {
    try {
        const rows = await prisma.userSubtopic.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'asc' } });
        res.status(200).json({ items: rows.map(view) });
    } catch (error) {
        logger.error('User subtopics fetch failed', { error: error.message });
        res.status(500).json({ error: 'Failed to load your subtopics.' });
    }
});

// A whole topic at once: Mark all, moving rows, the suggested list back on. One
// statement, because a transaction of upserts costs a round-trip per row.
router.post(`${BASE}/bulk`, authMiddleware, validate(userSubtopicBulkSchema), async (req, res) => {
    const userId = req.user.id;
    const { items } = req.body;
    try {
        if (items.some((b) => b.subtopicId && b.subtopicId !== b.id)) return res.status(400).json({ error: 'That subtopic id doesn’t match.' });
        const own = items.filter((b) => !b.subtopicId);
        if (own.length > 0) {
            const existing = await prisma.userSubtopic.count({ where: { userId, id: { in: own.map((b) => b.id) } } });
            if (await ownCount(userId) + own.length - existing > SUBTOPIC_LIMITS.ownPerUser) return res.status(400).json(full());
        }
        const json = JSON.stringify(items);
        await prisma.$executeRaw`
            INSERT INTO "UserSubtopic" ("userId", "id", "topicId", "subtopicId", "name", "hidden", "done", "doneOn", "sortOrder", "updatedAt")
            SELECT ${userId}::text, x."id", x."topicId", x."subtopicId", x."name", x."hidden", x."done", x."doneOn", x."sortOrder", CURRENT_TIMESTAMP
            FROM jsonb_to_recordset(${json}::jsonb)
                AS x("id" text, "topicId" text, "subtopicId" text, "name" text, "hidden" boolean, "done" boolean, "doneOn" text, "sortOrder" int)
            ON CONFLICT ("userId", "id") DO UPDATE SET
                "topicId" = EXCLUDED."topicId",
                "subtopicId" = EXCLUDED."subtopicId",
                "name" = EXCLUDED."name",
                "hidden" = EXCLUDED."hidden",
                "done" = EXCLUDED."done",
                "doneOn" = EXCLUDED."doneOn",
                "sortOrder" = EXCLUDED."sortOrder",
                "updatedAt" = CURRENT_TIMESTAMP`;
        const rows = await prisma.userSubtopic.findMany({ where: { userId, id: { in: items.map((b) => b.id) } } });
        res.status(200).json({ items: rows.map(view) });
    } catch (error) {
        if (noSuchTopic(error)) return res.status(404).json({ error: 'That topic isn’t in the syllabus.' });
        logger.error('User subtopics bulk save failed', { error: error.message });
        res.status(500).json({ error: 'Failed to save your subtopics.' });
    }
});

router.put(`${BASE}/:id`, authMiddleware, validate(userSubtopicSchema), async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    if (!id || id.length > 64) return res.status(404).json({ error: 'Subtopic not found.' });
    const { subtopicId } = req.body;
    if (subtopicId && subtopicId !== id) return res.status(400).json({ error: 'That subtopic id doesn’t match.' });
    const where = { userId_id: { userId: req.user.id, id } };
    try {
        if (!subtopicId && await ownCount(userId) >= SUBTOPIC_LIMITS.ownPerUser
            && !await prisma.userSubtopic.findUnique({ where })) {
            return res.status(400).json(full());
        }
        const row = await prisma.userSubtopic.upsert({ where, create: { userId, id, ...req.body }, update: req.body });
        res.status(200).json({ item: view(row) });
    } catch (error) {
        if (noSuchTopic(error)) return res.status(404).json({ error: 'That topic isn’t in the syllabus.' });
        // Two first saves raced: the other one created the row.
        if (error.code === 'P2002') {
            const row = await prisma.userSubtopic.update({ where, data: req.body }).catch(() => null);
            if (row) return res.status(200).json({ item: view(row) });
        }
        logger.error('User subtopic save failed', { error: error.message });
        res.status(500).json({ error: 'Failed to save the subtopic.' });
    }
});

// Always 200: a delete replayed from the offline queue must not land in Sync issues.
router.delete(`${BASE}/:id`, authMiddleware, async (req, res) => {
    try {
        const { count } = await prisma.userSubtopic.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
        res.status(200).json({ success: true, deleted: count });
    } catch (error) {
        logger.error('User subtopic delete failed', { error: error.message });
        res.status(500).json({ error: 'Failed to delete the subtopic.' });
    }
});

module.exports = router;
