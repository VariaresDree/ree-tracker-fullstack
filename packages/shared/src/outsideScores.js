// Outside scores: results the learner records from OUTSIDE the app — a review
// center's preboard, a book's chapter drill, a mock from another site. The
// psychometrician tracker kept these in a "Score Tracker" sheet, retests
// included; this is that sheet for the REE board.
//
// Display only. They are self-reported, on other people's questions, scored
// on other people's keys, so they never feed θ, the forecast, readiness or the
// rankings (the backend pins that with tests/displayOnlyTables.test.js). The
// app shows them next to its own mock boards, never mixed into them.
//
// The validation rule lives here, not in the route, because the client checks
// it before an entry goes into the offline queue: a rule only the server knew
// could reject an entry hours later, after the learner had moved on.

'use strict';

const { isIsoDay } = require('./manilaDate');

/** 'ALL' is a whole-board mock (all three subjects in one score). */
const OUTSIDE_SCORE_SUBJECTS = ['Mathematics', 'ESAS', 'EE', 'ALL'];

const OUTSIDE_SCORE_LIMITS = Object.freeze({
    title: 80,
    source: 80,
    note: 500,
    maxTotal: 1000,
    // Per account. A review season is a few dozen entries; the cap only stops
    // a runaway client.
    perUser: 500,
});

const SUBJECT_ALIASES = {
    mathematics: 'Mathematics',
    math: 'Mathematics',
    esas: 'ESAS',
    'engineering sciences and allied subjects': 'ESAS',
    ee: 'EE',
    'electrical engineering': 'EE',
    'electrical engineering professional subjects': 'EE',
    all: 'ALL',
    'all three': 'ALL',
    'all subjects': 'ALL',
    'whole board': 'ALL',
    blended: 'ALL',
};

/** A stored subject from any common spelling, or null. */
function normalizeOutsideSubject(s) {
    if (typeof s !== 'string') return null;
    return SUBJECT_ALIASES[s.trim().toLowerCase()] || null;
}

const text = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * Field errors for an entry, as { field: message }. Empty when the entry is
 * valid. `today` is the latest allowed date (YYYY-MM-DD): a score can't be
 * dated in the future.
 */
function outsideScoreErrors(entry, today) {
    const e = entry || {};
    const errors = {};
    const title = text(e.title);
    if (!title) errors.title = 'Give it a name, like "RC Preboard 2".';
    else if (title.length > OUTSIDE_SCORE_LIMITS.title) errors.title = `Keep it under ${OUTSIDE_SCORE_LIMITS.title} characters.`;

    if (text(e.source).length > OUTSIDE_SCORE_LIMITS.source) errors.source = `Keep it under ${OUTSIDE_SCORE_LIMITS.source} characters.`;

    if (!isIsoDay(e.takenOn)) errors.takenOn = 'Pick the date you took it.';
    else if (isIsoDay(today) && e.takenOn > today) errors.takenOn = 'The date can’t be in the future.';

    if (!OUTSIDE_SCORE_SUBJECTS.includes(e.subject)) errors.subject = 'Pick a subject.';

    const total = Number(e.total);
    const score = Number(e.score);
    const totalOk = e.total !== '' && e.total != null && Number.isInteger(total) && total >= 1 && total <= OUTSIDE_SCORE_LIMITS.maxTotal;
    if (!totalOk) errors.total = `Enter the number of items, 1 to ${OUTSIDE_SCORE_LIMITS.maxTotal}.`;
    if (e.score === '' || e.score == null || !Number.isFinite(score) || score < 0) errors.score = 'Enter your score.';
    else if (totalOk && score > total) errors.score = 'Your score can’t be more than the number of items.';

    if (text(e.note).length > OUTSIDE_SCORE_LIMITS.note) errors.note = `Keep notes under ${OUTSIDE_SCORE_LIMITS.note} characters.`;
    return errors;
}

/** Score as a percentage, to one decimal place; null when it can't be computed. */
function outsideScorePercent(entry) {
    const score = Number(entry?.score);
    const total = Number(entry?.total);
    if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return null;
    return Math.round((score / total) * 1000) / 10;
}

const round1 = (n) => Math.round(n * 10) / 10;
// Oldest first: by date taken, then by when it was entered.
const chronological = (a, b) => (a.takenOn === b.takenOn
    ? String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
    : (a.takenOn < b.takenOn ? -1 : 1));

/**
 * Per-subject summary, oldest to newest:
 *   { subject, count, average, first, latest, change, points }
 * `change` is latest − first in percentage points (null with one entry);
 * `points` are the percentages in order, for a sparkline. Plus `overall`:
 * the count and average across every entry.
 */
function outsideScoreSummary(entries) {
    const valid = (entries || []).filter((e) => outsideScorePercent(e) != null && OUTSIDE_SCORE_SUBJECTS.includes(e.subject));
    const bySubject = OUTSIDE_SCORE_SUBJECTS.map((subject) => {
        const list = valid.filter((e) => e.subject === subject).sort(chronological);
        const points = list.map(outsideScorePercent);
        const count = points.length;
        const average = count ? round1(points.reduce((s, p) => s + p, 0) / count) : null;
        return {
            subject,
            count,
            average,
            first: count ? points[0] : null,
            latest: count ? points[count - 1] : null,
            change: count > 1 ? round1(points[count - 1] - points[0]) : null,
            points,
        };
    });
    const all = valid.map(outsideScorePercent);
    return {
        subjects: bySubject,
        overall: { count: all.length, average: all.length ? round1(all.reduce((s, p) => s + p, 0) / all.length) : null },
    };
}

/** How a retest compares with its first try, in percentage points; null if either is missing. */
function retestDelta(entry, firstTry) {
    const now = outsideScorePercent(entry);
    const then = outsideScorePercent(firstTry);
    return now == null || then == null ? null : round1(now - then);
}

module.exports = {
    OUTSIDE_SCORE_SUBJECTS,
    OUTSIDE_SCORE_LIMITS,
    normalizeOutsideSubject,
    outsideScoreErrors,
    outsideScorePercent,
    outsideScoreSummary,
    retestDelta,
};
