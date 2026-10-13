// The Notebook (Library › Notebook): the mistake notebook and personal notes.
//
// A MISTAKE is a question the learner got wrong, derived from the attempts
// the app already records (never copied into a list they have to keep up).
// It reads FIXED once the question has been answered correctly since the last
// miss, or the learner marks it fixed; a new miss reopens it. Blanks are not
// mistakes here (a battle cut short would bury the real ones).
//
// Each mistake can carry the learner's CAUSE: was it the concept, the
// computation, a misread, or the clock? A cause is suggested from the attempt
// itself when the data says something: far slower than the board's pace for
// the subject → time; sure but wrong → concept. Otherwise none; the learner
// picks.
//
// NOTES are the learner's own words on a question or a formula card.

'use strict';

const { boardPaceSeconds } = require('./exam');

const MISTAKE_CAUSES = ['concept', 'computation', 'misread', 'time'];
const MISTAKE_CAUSE_LABELS = {
    concept: 'Concept',
    computation: 'Computation',
    misread: 'Misread',
    time: 'Ran out of time',
};
/** How far past the board's pace (per item) a miss counts as a time problem. */
const SLOW_MISS_FACTOR = 1.5;

const NOTE_MAX = 1000;
const NOTE_TARGETS = ['question', 'card'];

/**
 * The cause the data suggests for one wrong attempt, or null.
 * @param {{ timeSpentMs?: number, confidenceLevel?: string }} attempt
 * @param {string} subject
 */
function suggestMistakeCause(attempt, subject) {
    const pace = boardPaceSeconds(subject);
    const ms = Number(attempt?.timeSpentMs) || 0;
    if (pace && ms > pace * 1000 * SLOW_MISS_FACTOR) return 'time';
    if (String(attempt?.confidenceLevel || '').toUpperCase() === 'HIGH') return 'concept';
    return null;
}

const toTime = (t) => (t == null ? null : new Date(t).getTime());

/**
 * Whether a mistake is fixed: answered correctly after the last miss, or
 * marked fixed after it. Times are Dates, ISO strings or epoch ms.
 */
function isMistakeFixed({ lastWrongAt, lastCorrectAt = null, resolvedAt = null }) {
    const wrong = toTime(lastWrongAt);
    if (wrong == null) return false;
    const correct = toTime(lastCorrectAt);
    const resolved = toTime(resolvedAt);
    return (correct != null && correct > wrong) || (resolved != null && resolved >= wrong);
}

/** A note body as stored: trimmed, and null when empty (an empty note is deleted). */
function normalizeNoteBody(body) {
    if (typeof body !== 'string') return null;
    const trimmed = body.trim();
    return trimmed ? trimmed : null;
}

module.exports = {
    MISTAKE_CAUSES,
    MISTAKE_CAUSE_LABELS,
    SLOW_MISS_FACTOR,
    NOTE_MAX,
    NOTE_TARGETS,
    suggestMistakeCause,
    isMistakeFixed,
    normalizeNoteBody,
};
