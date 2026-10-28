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
const { CANONICAL_SUBJECTS } = require('./subject');
const { PRC_EXAM_FORMAT, boardPaceSeconds } = require('./exam');
const { rateBoard } = require('./boardRating');

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
    // The CELE tracker's assessment log (2026-10): time used (the whole board
    // is 15 hours), and at most this many topics to improve.
    maxMinutes: 900,
    maxTopics: 10,
    topicId: 64,
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

    // The log's extra fields are optional: absent or null is "not recorded".
    const parts = partsErrors(e);
    if (parts) errors.parts = parts;
    if (e.minutesUsed != null && !isWhole(e.minutesUsed, 1, OUTSIDE_SCORE_LIMITS.maxMinutes)) {
        errors.minutesUsed = `Enter the time in minutes, 1 to ${OUTSIDE_SCORE_LIMITS.maxMinutes}.`;
    }
    for (const field of ['guessed', 'skipped']) {
        if (e[field] != null && !isWhole(e[field], 0, OUTSIDE_SCORE_LIMITS.maxTotal)) errors[field] = 'Enter a whole number, 0 or more.';
    }
    if (!errors.guessed && !errors.skipped && totalOk && (Number(e.guessed) || 0) + (Number(e.skipped) || 0) > total) {
        errors.skipped = 'Guessed and skipped can’t add up to more than the number of items.';
    }
    if (e.improveTopicIds != null) {
        const ids = e.improveTopicIds;
        if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string' || !id || id.length > OUTSIDE_SCORE_LIMITS.topicId)) {
            errors.improveTopicIds = 'Pick topics from the list.';
        } else if (new Set(ids).size > OUTSIDE_SCORE_LIMITS.maxTopics) {
            errors.improveTopicIds = `Pick up to ${OUTSIDE_SCORE_LIMITS.maxTopics} topics.`;
        }
    }
    return errors;
}

const isWhole = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

/**
 * A whole-board entry's per-subject scores: [{ subject, score, total }], one
 * per board subject, 1 to 3 of them. Only an ALL entry has parts; its own
 * score and total are their sums (outsidePartsTotals).
 */
function partsErrors(e) {
    if (e.parts == null) return null;
    if (!Array.isArray(e.parts) || e.parts.length === 0 || e.parts.length > CANONICAL_SUBJECTS.length) return 'Enter each subject’s score.';
    if (e.subject !== 'ALL') return 'Per-subject scores are for an all-three entry.';
    const seen = new Set();
    for (const part of e.parts) {
        const total = Number(part?.total);
        const score = Number(part?.score);
        if (!CANONICAL_SUBJECTS.includes(part?.subject) || seen.has(part.subject)) return 'Each subject once: Mathematics, ESAS or EE.';
        seen.add(part.subject);
        if (!Number.isInteger(total) || total < 1 || total > OUTSIDE_SCORE_LIMITS.maxTotal) return `Each subject’s items: 1 to ${OUTSIDE_SCORE_LIMITS.maxTotal}.`;
        if (part.score === '' || part.score == null || !Number.isFinite(score) || score < 0 || score > total) return `Check the ${part.subject} score: 0 to its number of items.`;
    }
    return null;
}

/** An all-three entry's score and total, summed from its parts; null without parts. */
function outsidePartsTotals(parts) {
    if (!Array.isArray(parts) || parts.length === 0) return null;
    return {
        score: Math.round(parts.reduce((a, p) => a + Number(p.score), 0) * 2) / 2,
        total: parts.reduce((a, p) => a + Number(p.total), 0),
    };
}

/**
 * What a score means on the board, as the CELE log's "Remarks":
 *   { kind: 'verdict', verdict, generalAverage }  an all-three entry with every subject's score;
 *   { kind: 'mark' | 'under' | 'floor' }           one subject: 70 or more, under 70, under the 50% floor.
 * A single subject never passes or fails the board on its own, so it gets a
 * mark, not a verdict. Null for an all-three entry without per-subject scores.
 */
function outsideScoreRemark(entry) {
    if (entry?.subject === 'ALL') {
        const rating = rateBoard(entry.parts || []);
        return rating.complete ? { kind: 'verdict', verdict: rating.verdict, generalAverage: rating.generalAverage } : null;
    }
    const pct = outsideScorePercent(entry);
    if (pct == null) return null;
    return { kind: pct >= 70 ? 'mark' : pct >= 50 ? 'under' : 'floor' };
}

/**
 * Minutes per item against the board's pace: { perItem, boardPerItem }, both
 * to one decimal. An all-three entry is held to the whole board (900 minutes
 * for 300 items). Null without a time.
 */
function outsidePace(entry) {
    const minutes = Number(entry?.minutesUsed);
    const total = Number(entry?.total);
    if (!Number.isFinite(minutes) || minutes <= 0 || !(total > 0)) return null;
    let board = null;
    if (entry.subject === 'ALL') {
        const f = Object.values(PRC_EXAM_FORMAT);
        board = f.reduce((a, x) => a + x.minutes, 0) / f.reduce((a, x) => a + x.items, 0);
    } else {
        const secs = boardPaceSeconds(entry.subject);
        board = secs == null ? null : secs / 60;
    }
    return { perItem: round1(minutes / total), boardPerItem: board == null ? null : round1(board) };
}

/**
 * The topics flagged "to improve" most often, newest flag first on a tie:
 * [{ topicId, count, lastTakenOn }]. `since` (YYYY-MM-DD) leaves out older entries.
 */
function flaggedTopics(entries, since = null) {
    const byId = new Map();
    for (const e of entries || []) {
        if (since && e.takenOn < since) continue;
        for (const id of new Set(e.improveTopicIds || [])) {
            const t = byId.get(id) || { topicId: id, count: 0, lastTakenOn: '' };
            t.count += 1;
            if (e.takenOn > t.lastTakenOn) t.lastTakenOn = e.takenOn;
            byId.set(id, t);
        }
    }
    return [...byId.values()].sort((a, b) => b.count - a.count || (a.lastTakenOn < b.lastTakenOn ? 1 : -1));
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
    outsidePartsTotals,
    outsideScoreRemark,
    outsidePace,
    flaggedTopics,
};
