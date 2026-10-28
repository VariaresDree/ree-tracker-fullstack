// Key dates and the plan preferences (Progress › Study plan): the learner's
// own calendar — preboards, coaching, deadlines, rest days, personal events —
// and the days of the week they rest. The CELE tracker's "Important events"
// and the REST cells of its refresher calendar. The study plan works around
// them (services/planCalendar.js); nothing else reads them, so they never
// reach θ, readiness, the forecast or the rankings
// (tests/displayOnlyTables.test.js).
//
// Mounted under /api/user (per-user data stays out of the service worker's
// cached /api paths; see ree-tracker/scripts/check-sw-routes.cjs).
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const idempotency = require('../middlewares/idempotency');
const { keyDateCreateSchema, keyDateUpdateSchema, planPrefsSchema } = require('../schemas/keyDateSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { KEY_DATE_LIMITS } = require('@ree/shared');

const view = ({ userId: _userId, ...row }) => row;

const fieldsOf = (body) => ({
    kind: body.kind,
    title: body.title,
    startsOn: body.startsOn,
    endsOn: body.endsOn,
    subject: body.subject,
    topicIds: body.topicIds,
    note: body.note,
});

const prefsOf = (user) => ({ restWeekdays: user?.restWeekdays || [], reviewMode: user?.reviewMode || 'self' });

// The list and the preferences in one read, as the focus summary carries the
// focus goal: the calendar needs both.
router.get('/key-dates', authMiddleware, async (req, res) => {
    try {
        const [rows, user] = await Promise.all([
            prisma.keyDate.findMany({
                where: { userId: req.user.id },
                orderBy: [{ startsOn: 'asc' }, { createdAt: 'asc' }],
                take: KEY_DATE_LIMITS.perUser,
            }),
            prisma.user.findUnique({ where: { id: req.user.id }, select: { restWeekdays: true, reviewMode: true } }),
        ]);
        res.status(200).json({ items: rows.map(view), prefs: prefsOf(user) });
    } catch (error) {
        logger.error('Key dates fetch failed', { error: error.message });
        res.status(500).json({ error: 'Failed to load your key dates.' });
    }
});

// Idempotent on the client's key (a hash of the body, which carries the
// device-generated id): a replayed create returns the first response.
router.post('/key-dates', authMiddleware, validate(keyDateCreateSchema), idempotency(), async (req, res) => {
    const userId = req.user.id;
    const { id } = req.body;
    try {
        const count = await prisma.keyDate.count({ where: { userId } });
        if (count >= KEY_DATE_LIMITS.perUser) {
            return res.status(400).json({ error: `You can keep up to ${KEY_DATE_LIMITS.perUser} key dates. Delete old ones to add more.` });
        }
        const row = await prisma.keyDate.create({ data: { id, userId, ...fieldsOf(req.body) } });
        res.status(201).json({ item: view(row) });
    } catch (error) {
        // A replay the idempotency record no longer covers: answer with the row,
        // never a 409 the queue would retry forever.
        if (error.code === 'P2002') {
            const mine = await prisma.keyDate.findFirst({ where: { id, userId } }).catch(() => null);
            if (mine) return res.status(200).json({ item: view(mine) });
            return res.status(400).json({ error: 'That entry id is already in use.' });
        }
        logger.error('Key date create failed', { error: error.message });
        res.status(500).json({ error: 'Failed to save the key date.' });
    }
});

// Full replace. No idempotency(): replaying the same full state is harmless.
router.put('/key-dates/:id', authMiddleware, validate(keyDateUpdateSchema), async (req, res) => {
    try {
        const row = await prisma.keyDate.update({
            where: { id: req.params.id, userId: req.user.id },
            data: fieldsOf(req.body),
        });
        res.status(200).json({ item: view(row) });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Key date not found.' });
        logger.error('Key date update failed', { error: error.message });
        res.status(500).json({ error: 'Failed to update the key date.' });
    }
});

// Always 200, even when nothing matched: a delete replayed from the offline
// queue after it already happened must not land in Sync issues.
router.delete('/key-dates/:id', authMiddleware, async (req, res) => {
    try {
        const { count } = await prisma.keyDate.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
        res.status(200).json({ success: true, deleted: count });
    } catch (error) {
        logger.error('Key date delete failed', { error: error.message });
        res.status(500).json({ error: 'Failed to delete the key date.' });
    }
});

// The plan preferences: both fields every time, so a queued change replaces
// an older queued one. Their own route rather than fields of PUT
// /api/user/settings, whose queued writes supersede each other: a change
// queued here would have dropped a queued exam plan (as the focus goal found).
router.put('/plan-prefs', authMiddleware, validate(planPrefsSchema), async (req, res) => {
    try {
        const prefs = { restWeekdays: [...req.body.restWeekdays].sort((a, b) => a - b), reviewMode: req.body.reviewMode };
        await prisma.user.update({ where: { id: req.user.id }, data: prefs });
        res.status(200).json({ prefs });
    } catch (error) {
        logger.error('Plan preferences save failed', { error: error.message });
        res.status(500).json({ error: 'Couldn’t save your plan settings. Try again.' });
    }
});

module.exports = router;
