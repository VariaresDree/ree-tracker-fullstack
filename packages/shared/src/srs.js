// Spaced repetition: one SM-2 step and the Manila due date. Shared so the
// server (question reviews from telemetry, formula-card reviews) and the app
// (a formula-card rating shown before the server has answered, or queued
// offline, and the interval on each rating button) schedule identically.
// Moved here from ree-tracker-backend/src/engine/srs.js, which re-exports it.

'use strict';

const { manilaDateOf } = require('./manilaDate');

const MIN_EASE = 1.3;
const NEW_CARD = Object.freeze({ easeFactor: 2.5, interval: 0, repetitions: 0 });
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8, no DST

/**
 * One SM-2 step (Wozniak 1990). A quality below 3 is a lapse: the repetition
 * count restarts and the card is due tomorrow. The ease factor moves on every
 * review and is floored at 1.3.
 *
 * @param {{easeFactor:number, interval:number, repetitions:number}} card
 * @param {number} quality 0-5
 */
function scheduleNext(card, quality) {
    const ef = Number.isFinite(card?.easeFactor) ? card.easeFactor : NEW_CARD.easeFactor;
    const reps = Number.isFinite(card?.repetitions) ? card.repetitions : 0;
    const prevInterval = Number.isFinite(card?.interval) ? card.interval : 0;

    let repetitions;
    let interval;
    if (quality < 3) {
        repetitions = 0;
        interval = 1;
    } else {
        repetitions = reps + 1;
        if (repetitions === 1) interval = 1;
        else if (repetitions === 2) interval = 6;
        else interval = Math.max(1, Math.round(prevInterval * ef));
    }

    const q = 5 - quality;
    const easeFactor = Math.max(MIN_EASE, ef + (0.1 - q * (0.08 + q * 0.02)));
    return { easeFactor, interval, repetitions };
}

/**
 * The instant a card falls due: midnight Manila, `intervalDays` Manila days
 * after `at`. Due dates live on the learner's calendar, not the server's — a
 * review answered at 23:30 Manila is due at the next Manila midnight, not 24h
 * later and not at a UTC midnight that lands mid-morning in the Philippines.
 */
function manilaDueInstant(at, intervalDays) {
    const [y, m, d] = manilaDateOf(at).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + intervalDays) - MANILA_OFFSET_MS);
}

// Formula-card reviews are rated by the learner after flipping the card.
const CARD_RATINGS = ['again', 'hard', 'good', 'easy'];
const CARD_RATING_LABELS = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' };
const CARD_RATING_QUALITY = { again: 1, hard: 3, good: 4, easy: 5 };

/**
 * A formula card's schedule after one rating at `at`:
 * { easeFactor, interval, repetitions, nextReviewDate, lastReviewed, lastRating }.
 * `lastRating` is the rating itself, kept so the cards last rated Again or
 * Hard can be listed (Library › Formula cards › Print weak formulas).
 */
function rateCard(card, rating, at = new Date()) {
    const quality = CARD_RATING_QUALITY[rating];
    if (quality == null) throw new Error(`Unknown rating: ${rating}`);
    const when = at instanceof Date ? at : new Date(at);
    const next = scheduleNext(card || NEW_CARD, quality);
    return { ...next, nextReviewDate: manilaDueInstant(when, next.interval), lastReviewed: when, lastRating: rating };
}

module.exports = {
    MIN_EASE,
    NEW_CARD,
    scheduleNext,
    manilaDueInstant,
    CARD_RATINGS,
    CARD_RATING_LABELS,
    CARD_RATING_QUALITY,
    rateCard,
};
