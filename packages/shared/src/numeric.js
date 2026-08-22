// Numeric coercion helpers shared by the scoring rules.
//
// Exists because of a real bug caught by the cross-package contract test:
// `Number(null)` is 0, and 0 is finite — so the obvious
//     Object.values(scores).map(Number).filter(Number.isFinite)
// silently converts an UNRATED subject (null/undefined, meaning "the exam never
// asked about this") into a score of ZERO, which then fails the subject floor.
// A Math-only practice set came out as CONDITIONAL PASS instead of PASSED.
//
// The distinction between "absent" and "zero" matters everywhere a per-subject
// score is aggregated, so it lives in one place.

'use strict';

/**
 * A finite number, or null if the input is absent or not numeric.
 * Crucially, null / undefined / '' are ABSENT, not zero.
 */
function toScore(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

/** The rated (present, numeric) values of a per-subject score map. */
function ratedScores(subjectScores) {
    return Object.values(subjectScores || {})
        .map(toScore)
        .filter((n) => n !== null);
}

module.exports = { toScore, ratedScores };
