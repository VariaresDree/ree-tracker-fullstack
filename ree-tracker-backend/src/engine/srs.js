// Spaced repetition — SM-2 scheduling, server-authoritative.
//
// SRS used to be dead end to end: the client computed SM-2 in hooks/useSRS.js,
// nothing imported that hook, POST /api/srs/review trusted whatever interval the
// client sent, and so no SRSCard row was ever written and the "due" queue was
// always empty. Scheduling now happens here, inside the telemetry write, from
// evidence the app already records on every surface — correctness and
// confidence — so review sessions, flashcards, mocks and battles all feed one
// schedule, and the client cannot set its own intervals.
//
// Pure and stateless (same discipline as irt.js / bkt.js).

'use strict';

const { manilaDateOf } = require('@ree/shared');

const MIN_EASE = 1.3;
const NEW_CARD = Object.freeze({ easeFactor: 2.5, interval: 0, repetitions: 0 });
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8, no DST

/**
 * SM-2 quality (0-5) from what the learner did. Confidence separates a solid
 * recall (5) from a lucky one (3); a confident MISS is a blind spot and scores
 * the lowest of all, so it comes back soonest with the largest ease penalty.
 */
function qualityFor({ isCorrect, confidenceLevel }) {
    if (isCorrect) {
        if (confidenceLevel === 'HIGH') return 5;
        if (confidenceLevel === 'MED') return 4;
        return 3;
    }
    return confidenceLevel === 'HIGH' ? 0 : 1;
}

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

/**
 * Does this answer warrant scheduling? A card is STARTED by a miss or a
 * low-confidence answer — the items worth coming back to — and an existing card
 * is updated by any answer to its question. Not carding every confident hit
 * keeps the table proportional to what actually needs review.
 */
function shouldTrack({ isCorrect, confidenceLevel }, hasCard) {
    return hasCard || !isCorrect || confidenceLevel === 'LOW';
}

/**
 * Fold a batch of answers (in answer order) into the card state to write.
 *
 * @param {Array<{questionId, isCorrect, confidenceLevel, answeredAt}>} attempts
 * @param {Map<string, {easeFactor, interval, repetitions}>} existing stored cards by questionId
 * @returns {Map<string, {easeFactor, interval, repetitions, nextReviewDate, lastReviewed}>}
 */
function foldCardUpdates(attempts, existing) {
    const out = new Map();
    for (const a of attempts || []) {
        if (!a?.questionId) continue;
        const current = out.get(a.questionId) || existing.get(a.questionId) || null;
        if (!shouldTrack(a, !!current)) continue;
        const at = a.answeredAt instanceof Date ? a.answeredAt : new Date(a.answeredAt || Date.now());
        const next = scheduleNext(current || NEW_CARD, qualityFor(a));
        out.set(a.questionId, {
            ...next,
            nextReviewDate: manilaDueInstant(at, next.interval),
            lastReviewed: at,
        });
    }
    return out;
}

module.exports = {
    MIN_EASE,
    NEW_CARD,
    qualityFor,
    scheduleNext,
    manilaDueInstant,
    shouldTrack,
    foldCardUpdates,
};
