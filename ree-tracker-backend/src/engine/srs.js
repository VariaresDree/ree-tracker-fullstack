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

// The SM-2 step and the Manila due date live in @ree/shared, so the app
// schedules formula-card ratings the same way; re-exported here unchanged.
const { MIN_EASE, NEW_CARD, scheduleNext, manilaDueInstant } = require('@ree/shared');

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
