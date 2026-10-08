// Outside scores: results the learner records from outside the app (review
// center preboards, book drills), shown in Exams > Past sittings next to the
// in-app mocks. DISPLAY ONLY: nothing here, and nothing that reads θ, the
// forecast, readiness or the rankings, may join these rows into those numbers.
// tests/displayOnlyTables.test.js fails if this model is read anywhere else.
//
// Mounted under /api/user (per-user data must stay out of the service
// worker's cached /api paths; see ree-tracker/scripts/check-sw-routes.cjs).
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const idempotency = require('../middlewares/idempotency');
const { outsideScoreCreateSchema, outsideScoreUpdateSchema } = require('../schemas/outsideScoreSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { OUTSIDE_SCORE_LIMITS } = require('@ree/shared');

// The stored row minus the owner id, which the caller already is.
const view = ({ userId: _userId, ...row }) => row;

const fieldsOf = (body) => ({
    title: body.title,
    source: body.source,
    takenOn: body.takenOn,
    subject: body.subject,
    score: body.score,
    total: body.total,
    note: body.note,
});

/**
 * The retest link as stored: always the user's FIRST try, in the same subject,
 * never the entry itself. Returns { retestOfId } or { error }.
 */
async function resolveRetest(userId, requestedId, ownId, subject) {
    if (!requestedId) return { retestOfId: null };
    if (requestedId === ownId) return { error: 'An entry can’t be a retest of itself.' };
    const target = await prisma.outsideScore.findFirst({
        where: { id: requestedId, userId },
        select: { id: true, subject: true, retestOfId: true },
    });
    if (!target) return { error: 'The first try wasn’t found.' };
    // Retests always point at a first try, so one step back reaches it.
    const first = target.retestOfId
        ? await prisma.outsideScore.findFirst({ where: { id: target.retestOfId, userId }, select: { id: true, subject: true } })
        : target;
    if (!first) return { error: 'The first try wasn’t found.' };
    if (first.id === ownId) return { error: 'An entry can’t be a retest of itself.' };
    if (first.subject !== subject) return { error: 'A retest has to be the same subject as its first try.' };
    return { retestOfId: first.id };
}

router.get('/outside-scores', authMiddleware, async (req, res) => {
    try {
        const rows = await prisma.outsideScore.findMany({
            where: { userId: req.user.id },
            orderBy: [{ takenOn: 'desc' }, { createdAt: 'desc' }],
            take: OUTSIDE_SCORE_LIMITS.perUser,
        });
        res.status(200).json({ items: rows.map(view) });
    } catch (error) {
        logger.error('Outside scores fetch failed', { error: error.message });
        res.status(500).json({ error: 'Failed to load outside scores.' });
    }
});

// Idempotent on the client's key (a hash of the body, which carries the
// device-generated id): a replayed create returns the first response.
router.post('/outside-scores', authMiddleware, validate(outsideScoreCreateSchema), idempotency(), async (req, res) => {
    const userId = req.user.id;
    const { id } = req.body;
    try {
        const count = await prisma.outsideScore.count({ where: { userId } });
        if (count >= OUTSIDE_SCORE_LIMITS.perUser) {
            return res.status(400).json({ error: `You can keep up to ${OUTSIDE_SCORE_LIMITS.perUser} outside scores. Delete old ones to add more.` });
        }
        const link = await resolveRetest(userId, req.body.retestOfId, id, req.body.subject);
        if (link.error) return res.status(400).json({ error: link.error });

        const row = await prisma.outsideScore.create({
            data: { id, userId, ...fieldsOf(req.body), retestOfId: link.retestOfId },
        });
        res.status(201).json({ item: view(row) });
    } catch (error) {
        // The id exists. If it is this user's, this is a replay the idempotency
        // record no longer covers (past its TTL): answer with the row. Not 409,
        // which the client's queue treats as "retry later", forever.
        if (error.code === 'P2002') {
            const mine = await prisma.outsideScore.findFirst({ where: { id, userId } }).catch(() => null);
            if (mine) return res.status(200).json({ item: view(mine) });
            return res.status(400).json({ error: 'That entry id is already in use.' });
        }
        logger.error('Outside score create failed', { error: error.message });
        res.status(500).json({ error: 'Failed to save the outside score.' });
    }
});

// Full replace. No idempotency(): replaying the same full state is harmless,
// and a body-hash key would wrongly replay an older edit when a later edit
// changed the entry back.
router.put('/outside-scores/:id', authMiddleware, validate(outsideScoreUpdateSchema), async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    try {
        const existing = await prisma.outsideScore.findFirst({
            where: { id, userId },
            select: { id: true, subject: true, _count: { select: { retests: true } } },
        });
        if (!existing) return res.status(404).json({ error: 'Outside score not found.' });

        const hasRetests = existing._count.retests > 0;
        if (hasRetests && req.body.retestOfId) {
            return res.status(400).json({ error: 'This entry has retests, so it stays a first try.' });
        }
        if (hasRetests && req.body.subject !== existing.subject) {
            return res.status(400).json({ error: 'This entry has retests in its subject, so its subject can’t change.' });
        }
        const link = await resolveRetest(userId, req.body.retestOfId, id, req.body.subject);
        if (link.error) return res.status(400).json({ error: link.error });

        const row = await prisma.outsideScore.update({
            where: { id, userId: req.user.id },
            data: { ...fieldsOf(req.body), retestOfId: link.retestOfId },
        });
        res.status(200).json({ item: view(row) });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Outside score not found.' });
        logger.error('Outside score update failed', { error: error.message });
        res.status(500).json({ error: 'Failed to update the outside score.' });
    }
});

// Always 200, even when nothing matched: a delete replayed from the offline
// queue after it already happened must not land in Sync issues.
router.delete('/outside-scores/:id', authMiddleware, async (req, res) => {
    try {
        const { count } = await prisma.outsideScore.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
        res.status(200).json({ success: true, deleted: count });
    } catch (error) {
        logger.error('Outside score delete failed', { error: error.message });
        res.status(500).json({ error: 'Failed to delete the outside score.' });
    }
});

module.exports = router;
