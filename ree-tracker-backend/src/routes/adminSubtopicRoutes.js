// Admin › Subtopics: the suggested table of contents learners start from. Every
// edit reaches everyone following the list. A retired subtopic is kept, not
// deleted, because a learner's tick points at it.
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const { validate } = require('../middlewares/validate');
const { adminAddSchema, adminUpdateSchema, adminReorderSchema } = require('../schemas/subtopicSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { normSubtopicKey } = require('@ree/shared');

router.use(authMiddleware, adminMiddleware);

const view = ({ normKey: _key, ...row }) => row;
const inOrder = (topicId) => prisma.syllabusSubtopic.findMany({ where: { topicId }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });

router.get('/', async (req, res) => {
    try {
        const [topics, items] = await Promise.all([
            prisma.topic.findMany({ where: { active: true }, select: { id: true, subject: true, name: true, sortOrder: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
            prisma.syllabusSubtopic.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
        ]);
        res.status(200).json({ topics, items: items.map(view) });
    } catch (error) {
        logger.error('Admin subtopics fetch failed', { error: error.message });
        res.status(500).json({ error: 'Failed to load the subtopics.' });
    }
});

// Adds to the end of the list. A name already there is skipped, and a retired
// one comes back rather than starting over, so learners' ticks on it return.
router.post('/', validate(adminAddSchema), async (req, res) => {
    const { topicId, names } = req.body;
    try {
        const existing = await inOrder(topicId);
        const byKey = new Map(existing.map((s) => [s.normKey, s]));
        const fresh = new Map();
        const revive = [];
        for (const name of names) {
            const normKey = normSubtopicKey(name);
            const found = byKey.get(normKey);
            if (found) { if (!found.active) revive.push(found.id); } else if (!fresh.has(normKey)) fresh.set(normKey, name);
        }
        const next = existing.reduce((max, s) => Math.max(max, s.sortOrder + 1), 0);
        if (fresh.size > 0) {
            await prisma.syllabusSubtopic.createMany({
                data: [...fresh].map(([normKey, name], i) => ({ topicId, name, normKey, sortOrder: next + i })),
                skipDuplicates: true,
            });
        }
        if (revive.length > 0) await prisma.syllabusSubtopic.updateMany({ where: { id: { in: revive } }, data: { active: true } });
        res.status(200).json({ items: (await inOrder(topicId)).map(view), added: fresh.size + revive.length });
    } catch (error) {
        if (error.code === 'P2003') return res.status(404).json({ error: 'Topic not found.' });
        logger.error('Admin subtopics add failed', { error: error.message });
        res.status(500).json({ error: 'Failed to add the subtopics.' });
    }
});

// The whole topic's order, in one statement: a row at a time is a round-trip each.
router.post('/reorder', validate(adminReorderSchema), async (req, res) => {
    const { topicId, ids } = req.body;
    const json = JSON.stringify(ids.map((id, i) => ({ id, ord: i })));
    try {
        await prisma.$executeRaw`
            UPDATE "SyllabusSubtopic" AS s SET "sortOrder" = x."ord", "updatedAt" = CURRENT_TIMESTAMP
            FROM jsonb_to_recordset(${json}::jsonb) AS x("id" text, "ord" int)
            WHERE s."id" = x."id" AND s."topicId" = ${topicId}::text`;
        res.status(200).json({ items: (await inOrder(topicId)).map(view) });
    } catch (error) {
        logger.error('Admin subtopics reorder failed', { error: error.message });
        res.status(500).json({ error: 'Failed to reorder the subtopics.' });
    }
});

// Rename, retire or restore.
router.put('/:id', validate(adminUpdateSchema), async (req, res) => {
    const { name, active } = req.body;
    try {
        const row = await prisma.syllabusSubtopic.update({
            where: { id: req.params.id },
            data: {
                ...(name !== undefined ? { name, normKey: normSubtopicKey(name) } : {}),
                ...(active !== undefined ? { active } : {}),
            },
        });
        res.status(200).json({ item: view(row) });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Subtopic not found.' });
        if (error.code === 'P2002') return res.status(409).json({ error: 'This topic already has a subtopic with that name.' });
        logger.error('Admin subtopic update failed', { error: error.message });
        res.status(500).json({ error: 'Failed to save the subtopic.' });
    }
});

module.exports = router;
