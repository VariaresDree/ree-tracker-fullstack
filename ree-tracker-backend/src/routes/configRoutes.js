const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { getSyllabusWeights } = require('../services/questionPool');
const { diffTaxonomySync, invalidateTopicCache } = require('../services/topicResolver');

// TOS = { subject: [topicName, ...] }. Since Phase 3.3 the source of truth is
// the Topic taxonomy table; the legacy SystemConfig.tos JSON is only served
// while the table is still unseeded (pre-migrateTaxonomy deploys), so the
// endpoint's shape never changes under the client.
router.get('/tos', async (req, res) => {
    try {
        const topics = await prisma.topic.findMany({
            where: { active: true },
            orderBy: [{ subject: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
            select: { subject: true, name: true },
        });
        if (topics.length > 0) {
            const grouped = {};
            for (const t of topics) (grouped[t.subject] ||= []).push(t.name);
            return res.status(200).json(grouped);
        }

        const config = await prisma.systemConfig.findUnique({
            where: { id: 'global_config' }
        });

        return res.status(200).json(config ? config.tos : null);
    } catch (error) {
        logger.error('TOS fetch error', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Failed to fetch TOS.' });
    }
});

// TOS Manager save. Same request contract as before ({ subject: [names] }),
// but instead of overwriting a JSON blob it SYNCS the Topic table: new names
// are created, existing rows are renamed/reordered/reactivated, and rows
// dropped from the list are deactivated — never deleted, so questions keep
// their topicId and historical attempts stay attributable.
router.put('/tos', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const newTOS = req.body;
        if (!newTOS || typeof newTOS !== 'object' || Array.isArray(newTOS)) {
            return res.status(400).json({ error: 'Expected { subject: [topicNames] }.' });
        }

        const existing = await prisma.topic.findMany();
        const { creates, updates, deactivateIds } = diffTaxonomySync(existing, newTOS);

        await prisma.$transaction(async (tx) => {
            if (creates.length) await tx.topic.createMany({ data: creates });
            for (const u of updates) {
                await tx.topic.update({ where: { id: u.id }, data: { name: u.name, sortOrder: u.sortOrder, active: u.active } });
            }
            if (deactivateIds.length) {
                await tx.topic.updateMany({ where: { id: { in: deactivateIds } }, data: { active: false } });
            }
        });
        invalidateTopicCache();

        return res.status(200).json({
            success: true,
            created: creates.length,
            updated: updates.length,
            deactivated: deactivateIds.length,
        });
    } catch (error) {
        logger.error('TOS update error', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Failed to update TOS.' });
    }
});

// Syllabus weights (PRC board TOS) so the client exam builder blends by the same
// config the server sampler uses. Never fails — getSyllabusWeights falls back to
// the default blend if the table is empty.
router.get('/syllabus-weights', authMiddleware, async (req, res) => {
    try {
        return res.status(200).json({ weights: await getSyllabusWeights() });
    } catch (error) {
        logger.error('syllabus-weights fetch error', { error: error.message });
        return res.status(500).json({ error: 'Failed to fetch syllabus weights.' });
    }
});

module.exports = router;
