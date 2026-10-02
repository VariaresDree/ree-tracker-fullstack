// PRC REE board exam — format and grading, the single definition.
//
// FORMAT. The exam times were written out inline in four places (the Board
// Simulator pool builder, its config copy, examStandards.PRC_TIMES and the
// Gauntlet subject tiers) and had drifted from the current PRC schedule:
// Mathematics ran 4h where the board now allots 5h.
//
// GRADING. The PRC rule is a general WEIGHTED average of at least 70%, with the
// subjects weighted 25/30/45, AND no subject below 50%. Every caller passed the
// RAW percentage correct to deriveVerdict as if it were that average. The two
// only agree when the item counts happen to be in exact 25/30/45 proportion; a
// 90/60/64 sitting is 71.3% raw (a pass) but 69.3% weighted (a fail).

'use strict';

const { normalizeSubject } = require('./subject');
const { ratedScores } = require('./numeric');
const { DEFAULT_SYLLABUS_WEIGHTS, weightedAverage } = require('./syllabusWeights');
const { deriveVerdict } = require('./verdict');

/** Items and minutes per board subject. */
const PRC_EXAM_FORMAT = Object.freeze({
    Mathematics: Object.freeze({ items: 100, minutes: 300 }),
    ESAS: Object.freeze({ items: 100, minutes: 240 }),
    EE: Object.freeze({ items: 100, minutes: 360 }),
});

/** Seconds allotted to one subject's sitting, or null for an unknown subject. */
function prcSectionSeconds(subject) {
    const format = PRC_EXAM_FORMAT[normalizeSubject(subject)];
    return format ? format.minutes * 60 : null;
}

/**
 * Grade a board attempt from its per-subject percentages (0-100).
 *
 * Subjects the attempt never asked about are null/undefined and stay UNRATED:
 * they neither drag the weighted average nor trip the subject floor, and the
 * remaining weights are renormalised (so a single-subject sitting is graded on
 * that subject alone).
 *
 * @returns {{ generalAverage: number, verdict: string }}
 */
function gradeBoardExam(subjectScores, weights = DEFAULT_SYLLABUS_WEIGHTS) {
    const generalAverage = ratedScores(subjectScores).length > 0
        ? weightedAverage(subjectScores, weights)
        : 0;
    return { generalAverage, verdict: deriveVerdict(generalAverage, subjectScores) };
}

module.exports = { PRC_EXAM_FORMAT, prcSectionSeconds, gradeBoardExam };
