// The syllabus checklist (Progress > Syllabus): Read / Watched / Drilled per
// TOS topic, with dates and a note. DISPLAY ONLY: nothing that reads θ, the
// forecast, readiness or the rankings may use these rows
// (tests/displayOnlyTables.test.js fails if this model is read elsewhere).
// The automatic Drilled tick is computed here from UserTopicPerformance on
// read, never stored, so it follows the learner's answers with no write path.
//
// Mounted under /api/user (per-user data stays out of the service worker's
// cached /api paths; see ree-tracker/scripts/check-sw-routes.cjs).
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { syllabusProgressSchema } = require('../schemas/syllabusSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { buildResolverIndex } = require('../services/topicResolver');
const { buildSyllabusRows } = require('../services/syllabusView');
const { getSyllabusWeights } = require('../services/questionPool');

router.get('/syllabus', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const [topics, progress, performance, weights] = await Promise.all([
            prisma.topic.findMany({
                where: { active: true },
                select: { id: true, subject: true, name: true, normKey: true, aliases: true, sortOrder: true, active: true },
            }),
            prisma.syllabusProgress.findMany({ where: { userId } }),
            prisma.userTopicPerformance.findMany({
                where: { userId },
                select: { topic: true, topicId: true, subject: true, attempts: true, pMastery: true },
            }),
            getSyllabusWeights(),
        ]);
        const rows = buildSyllabusRows({ topics, progress, performance, index: buildResolverIndex(topics) });
        res.status(200).json({ weights, topics: rows });
    } catch (error) {
        logger.error('Syllabus fetch failed', { error: error.message });
        res.status(500).json({ error: 'Failed to load the syllabus checklist.' });
    }
});

// Upsert on (userId, topicId). No idempotency(): the body is the topic's full
// state, so replaying it is harmless, and a body-hash key would wrongly replay
// an older state when a later change set the topic back to it. An inactive
// topic is accepted, so a tick queued before an admin retired the topic
// never lands in Sync issues.
router.put('/syllabus/:topicId', authMiddleware, validate(syllabusProgressSchema), async (req, res) => {
    const userId = req.user.id;
    const { topicId } = req.params;
    if (!topicId || topicId.length > 64) return res.status(404).json({ error: 'Topic not found.' });
    const state = {
        read: req.body.read,
        watched: req.body.watched,
        drilled: req.body.drilled,
        startedOn: req.body.startedOn,
        finishedOn: req.body.finishedOn,
        note: req.body.note,
    };
    try {
        const row = await prisma.syllabusProgress.upsert({
            where: { userId_topicId: { userId: req.user.id, topicId } },
            create: { userId, topicId, ...state },
            update: state,
        });
        const { userId: _owner, id: _id, ...view } = row;
        res.status(200).json({ item: view });
    } catch (error) {
        // P2003: no such topic (the foreign key). P2002: two first ticks for
        // the same topic raced; the other one created the row, so update it.
        if (error.code === 'P2003') return res.status(404).json({ error: 'Topic not found.' });
        if (error.code === 'P2002') {
            try {
                const row = await prisma.syllabusProgress.update({
                    where: { userId_topicId: { userId: req.user.id, topicId } },
                    data: state,
                });
                const { userId: _owner, id: _id, ...view } = row;
                return res.status(200).json({ item: view });
            } catch (retryError) {
                logger.error('Syllabus update retry failed', { error: retryError.message });
            }
        }
        logger.error('Syllabus update failed', { error: error.message });
        res.status(500).json({ error: 'Failed to save the checklist.' });
    }
});

module.exports = router;
