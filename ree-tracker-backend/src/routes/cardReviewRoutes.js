// Spaced repetition for formula cards (Library › Formula cards, study mode):
// rate a card after flipping it — Again, Hard, Good or Easy — and SM-2 brings
// it back at a Manila midnight (@ree/shared srs, the same step the question
// reviews use). The app shows "Review N due cards", and Today counts them.
//
// Owner-scoped; under /api/user so the service worker's shared cache never
// holds them (ree-tracker/scripts/check-sw-routes.cjs).
const express = require('express');
const router = express.Router();
const { NEW_CARD, rateCard } = require('@ree/shared');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { cardRatingSchema } = require('../schemas/cardReviewSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { manilaDateOf, manilaMidnight } = require('../utils/manilaDate');

// A rating queued offline is scheduled from when it was made, but never from
// the future or from more than a week back (a wrong device clock).
const MAX_BACKDATE_MS = 7 * 24 * 60 * 60 * 1000;
const REVIEW_SELECT = {
    cardId: true, easeFactor: true, interval: true, repetitions: true, nextReviewDate: true, lastReviewed: true, lastRating: true,
};
// Only cards still in the library count.
const { LEARNER_CARD_WHERE } = require('../services/referenceCardView');

const LIVE = { card: LEARNER_CARD_WHERE };

function summarize(rows, now) {
    let due = 0;
    let nextDueAt = null;
    for (const r of rows) {
        const at = new Date(r.nextReviewDate);
        if (at <= now) due += 1;
        else if (!nextDueAt || at < nextDueAt) nextDueAt = at;
    }
    return { due, total: rows.length, nextDueAt: nextDueAt ? nextDueAt.toISOString() : null };
}

/** The reviewed-at time to schedule from: the device's, clamped. */
function reviewTime(reviewedAt, now = new Date()) {
    if (!reviewedAt) return now;
    const t = new Date(reviewedAt).getTime();
    if (!Number.isFinite(t)) return now;
    return new Date(Math.min(now.getTime(), Math.max(now.getTime() - MAX_BACKDATE_MS, t)));
}

router.get('/card-reviews', authMiddleware, async (req, res) => {
    try {
        const now = new Date();
        const items = await prisma.cardReview.findMany({
            where: { userId: req.user.id, ...LIVE },
            select: REVIEW_SELECT,
            orderBy: { nextReviewDate: 'asc' },
        });
        res.status(200).json({ items, summary: summarize(items, now), serverNow: now.getTime() });
    } catch (error) {
        logger.error('Card reviews fetch failed', { error: error.message });
        res.status(500).json({ error: 'Failed to load your card reviews.' });
    }
});

// Today's count, without the rows.
router.get('/card-reviews/summary', authMiddleware, async (req, res) => {
    try {
        const now = new Date();
        const rows = await prisma.cardReview.findMany({
            where: { userId: req.user.id, ...LIVE },
            select: { nextReviewDate: true },
        });
        res.status(200).json(summarize(rows, now));
    } catch (error) {
        logger.error('Card review summary failed', { error: error.message });
        res.status(500).json({ error: 'Failed to load your card reviews.' });
    }
});

/**
 * Tick off the study plan's "Formula cards" task for the day of a rating once
 * that day's ratings reach its target. Its progress is counted from each
 * card's latest rating (one row per card), so a card rated again on a later
 * day would leave that day short after the fact; ticked here, the task keeps
 * its credit. Best effort: the rating stands whatever happens here.
 */
async function creditCardsTask(userId, at) {
    try {
        const day = manilaDateOf(at);
        const task = await prisma.plannerTask.findFirst({
            where: { userId, kind: 'cards', dueDate: day, completed: false },
            select: { id: true, targetCount: true },
        });
        if (!task) return;
        const rated = await prisma.cardReview.count({
            where: { userId, lastReviewed: { gte: manilaMidnight(day, 0), lt: manilaMidnight(day, 1) } },
        });
        if (rated >= (task.targetCount || 1)) {
            await prisma.plannerTask.updateMany({ where: { id: task.id, userId, completed: false }, data: { completed: true } });
        }
    } catch (error) {
        logger.warn('Cards task credit failed', { error: error.message });
    }
}

router.post('/card-reviews/:cardId', authMiddleware, validate(cardRatingSchema), async (req, res) => {
    const userId = req.user.id;
    const { cardId } = req.params;
    if (!cardId || cardId.length > 64) return res.status(404).json({ error: 'Card not found.' });
    const { rating, reviewId, reviewedAt } = req.body;
    const where = { userId_cardId: { userId: req.user.id, cardId } };
    try {
        const apply = async () => {
            const existing = await prisma.cardReview.findUnique({ where, select: { ...REVIEW_SELECT, lastReviewId: true } });
            // The same rating again (a retry, the offline queue): no change.
            if (existing?.lastReviewId === reviewId) return existing;
            const next = rateCard(existing || NEW_CARD, rating, reviewTime(reviewedAt));
            const data = { ...next, lastReviewId: reviewId };
            return existing
                ? prisma.cardReview.update({ where, data, select: REVIEW_SELECT })
                : prisma.cardReview.create({ data: { userId, cardId, ...data }, select: REVIEW_SELECT });
        };
        let row;
        try {
            row = await apply();
        } catch (error) {
            // The first two ratings of a card raced; the other made the row.
            if (error.code !== 'P2002') throw error;
            row = await apply();
        }
        const { lastReviewId: _id, ...item } = row;
        if (row.lastReviewed) await creditCardsTask(userId, row.lastReviewed);
        res.status(200).json({ item });
    } catch (error) {
        if (error.code === 'P2003') return res.status(404).json({ error: 'Card not found.' });
        logger.error('Card rating failed', { error: error.message });
        res.status(500).json({ error: 'Failed to save that rating.' });
    }
});

module.exports = router;
module.exports.reviewTime = reviewTime;
module.exports.creditCardsTask = creditCardsTask;
