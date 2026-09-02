// Board-exam verdict — the single definition, shared by client and server.
//
// This rule previously existed in FIVE places with TWO different thresholds:
//   examRoutes.js:165            >= 50 -> CONDITIONAL PASS   (what got STORED)
//   deepAnalyticsHelpers.js:8    >= 60 -> CONDITIONAL PASS
//   useSimulatorEngine.js:480    >= 60 -> CONDITIONAL PASS   (what got SHOWN)
//   useSimulatorEngine.js:590    >= 60
//   battleGrades.js:42           >= 60
//
// The consequence was directly visible: a 55% board sim showed FAILED on the
// results screen and CONDITIONAL PASS in exam history, and counted as a pass in
// the pass-rate KPI. Every score in [50, 60) was affected. Nothing in CI could
// catch it, because the two implementations lived in different packages with no
// shared module and no contract test.
//
// The flat bands are also not the real rule. The PRC board exam requires a 70%
// general weighted average AND no individual subject rating below 50%. A
// candidate can therefore hit the average and still not pass outright because a
// single subject dragged — which is exactly what CONDITIONAL PASS should mean,
// and what neither flat band expressed.

'use strict';

const { toScore, ratedScores } = require('./numeric');

/** General weighted average required to pass. */
const GENERAL_AVERAGE = 70;

/** No individual subject rating may fall below this. */
const SUBJECT_FLOOR = 50;

const VERDICT = {
    PASSED: 'PASSED',
    CONDITIONAL: 'CONDITIONAL PASS',
    FAILED: 'FAILED',
    IN_PROGRESS: 'IN_PROGRESS',
};

/**
 * Derive a board verdict.
 *
 * @param {number} generalAverage  overall percentage, 0-100
 * @param {Record<string, number|null|undefined>} [subjectScores]
 *        per-subject percentages. Subjects with no items are expected to be
 *        null/undefined and are NOT rated — an exam that never asked a
 *        Mathematics question cannot fail you on Mathematics.
 * @returns {string} one of VERDICT.PASSED | CONDITIONAL | FAILED
 */
function deriveVerdict(generalAverage, subjectScores = {}) {
    const avg = toScore(generalAverage);
    if (avg === null) return VERDICT.FAILED;

    // Absent subjects are UNRATED, not zero. Coercing with Number() first would
    // turn null into 0, which then fails the subject floor — a Math-only
    // practice set came out CONDITIONAL PASS instead of PASSED.
    const rated = ratedScores(subjectScores);

    const metAverage = avg >= GENERAL_AVERAGE;
    const allSubjectsAboveFloor = rated.every((n) => n >= SUBJECT_FLOOR);

    if (metAverage && allSubjectsAboveFloor) return VERDICT.PASSED;
    // Met the average but a subject fell through the floor, OR came close enough
    // on the average that the result is a conditional rather than a clear fail.
    if (metAverage) return VERDICT.CONDITIONAL;
    return VERDICT.FAILED;
}

/**
 * Does this verdict count as a pass for KPI purposes?
 * Used by the pass-rate tiles so "what counts" is defined once.
 */
function isPassingVerdict(verdict) {
    return verdict === VERDICT.PASSED || verdict === VERDICT.CONDITIONAL;
}

module.exports = {
    GENERAL_AVERAGE,
    SUBJECT_FLOOR,
    VERDICT,
    deriveVerdict,
    isPassingVerdict,
};
