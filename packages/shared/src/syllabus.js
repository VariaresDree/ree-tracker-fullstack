// The syllabus checklist: per TOS topic, has the learner READ it (notes,
// book chapter), WATCHED it (a lecture), and DRILLED it (answered questions)?
// The psychometrician tracker kept this as Read / YT / Drills ticks per topic;
// this is that sheet for the REE board, on the app's own topic list.
//
// "Drilled" ticks itself from the answers the app already records, so the
// learner never has to tick what the app can see. It is judged on the STORED
// mastery estimate, not the decayed one: a tick must not disappear because a
// topic went unpractised for a few weeks.
//
// A topic is COVERED once it is read AND drilled. Watching is tracked but not
// required (plenty of reviewers never watch a lecture on a topic they can
// already solve); change isTopicCovered if that rule ever changes.

'use strict';

const { MASTERY_BANDS } = require('./mastery');
const { normalizeWeights, DEFAULT_SYLLABUS_WEIGHTS } = require('./syllabusWeights');
const { isIsoDay } = require('./manilaDate');

/** Answers in a topic that count as drilled on their own. */
const AUTO_DRILL_ANSWERS = 20;
/** ...or this many, at Developing mastery or better. */
const AUTO_DRILL_MIN_ANSWERS = 10;
const DEVELOPING = MASTERY_BANDS.find((b) => b.key === 'developing').min;

const SYLLABUS_SUBJECTS = ['Mathematics', 'ESAS', 'EE'];
const SYLLABUS_NOTE_MAX = 500;

/** Drilled from the app's own record: { attempts, pMastery } for the topic. */
function isAutoDrilled(row) {
    const n = Number(row?.attempts) || 0;
    const p = row?.pMastery == null ? null : Number(row.pMastery);
    return n >= AUTO_DRILL_ANSWERS || (n >= AUTO_DRILL_MIN_ANSWERS && p != null && p >= DEVELOPING);
}

function isTopicDrilled(row) {
    return !!row?.drilled || isAutoDrilled(row);
}

function isTopicCovered(row) {
    return !!row?.read && isTopicDrilled(row);
}

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

/**
 * Coverage per subject and overall. Each subject is covered ÷ topics; overall
 * weights the subjects by the board's syllabus weights (a covered EE topic
 * moves the total more than a Math one, as on the exam), over the subjects
 * that have topics.
 *
 * @param {Array<{ subject, read?, watched?, drilled?, attempts?, pMastery? }>} rows
 * @param {object} [weights] SyllabusWeight map; defaults to the PRC 25/30/45
 */
function syllabusCoverage(rows, weights = DEFAULT_SYLLABUS_WEIGHTS) {
    const w = normalizeWeights(weights);
    const subjects = SYLLABUS_SUBJECTS.map((subject) => {
        const list = (rows || []).filter((r) => r.subject === subject);
        const covered = list.filter(isTopicCovered).length;
        return {
            subject,
            weight: w[subject] ?? 0,
            total: list.length,
            covered,
            read: list.filter((r) => r.read).length,
            drilled: list.filter(isTopicDrilled).length,
            percent: pct(covered, list.length),
        };
    });
    const counted = subjects.filter((s) => s.total > 0 && s.weight > 0);
    const weightSum = counted.reduce((s, x) => s + x.weight, 0);
    const total = subjects.reduce((s, x) => s + x.total, 0);
    const covered = subjects.reduce((s, x) => s + x.covered, 0);
    return {
        subjects,
        overall: {
            total,
            covered,
            percent: weightSum > 0
                ? Math.round((counted.reduce((s, x) => s + x.weight * (x.covered / x.total), 0) / weightSum) * 1000) / 10
                : 0,
        },
    };
}

/**
 * Field errors for one topic's checklist state, as { field: message }. The
 * client sends the topic's FULL state on every change (so a queued write can
 * replace an older one), and the server checks it with this same rule.
 */
function syllabusProgressErrors(state) {
    const s = state || {};
    const errors = {};
    for (const flag of ['read', 'watched', 'drilled']) {
        if (typeof s[flag] !== 'boolean') errors[flag] = 'Must be ticked or not.';
    }
    for (const day of ['startedOn', 'finishedOn']) {
        if (s[day] != null && !isIsoDay(s[day])) errors[day] = 'Pick a date.';
    }
    if (!errors.startedOn && !errors.finishedOn && s.startedOn && s.finishedOn && s.finishedOn < s.startedOn) {
        errors.finishedOn = 'Finished can’t be before started.';
    }
    if (s.note != null && (typeof s.note !== 'string' || s.note.length > SYLLABUS_NOTE_MAX)) {
        errors.note = `Keep notes under ${SYLLABUS_NOTE_MAX} characters.`;
    }
    return errors;
}

module.exports = {
    AUTO_DRILL_ANSWERS,
    AUTO_DRILL_MIN_ANSWERS,
    SYLLABUS_SUBJECTS,
    SYLLABUS_NOTE_MAX,
    isAutoDrilled,
    isTopicDrilled,
    isTopicCovered,
    syllabusCoverage,
    syllabusProgressErrors,
};
