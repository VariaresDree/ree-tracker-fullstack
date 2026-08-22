// PRC Table-of-Specification weights — the single definition.
//
// These existed in four places with two incompatible key casings:
//   questionPool.js:69       { Mathematics, ESAS, EE }   server sampler fallback
//   dbQueries.js:151         { Mathematics, ESAS, EE }   client fetch fallback
//   tosWeights.js:8          { MATHEMATICS, ESAS, EE }   UPPERCASE — incompatible
//   MissionControl.jsx:32    Math.floor(totalGoal * 0.25) — bare magic number
//
// The SyllabusWeight table is the intended source of truth, but
// tosWeights.calculateWeightedRating and getWeightedContribution never consulted
// it — so an admin who reseeded the table changed the server's blended sampler
// and nothing else. Any weighted rating computed on the client silently kept the
// hardcoded values.
//
// These constants are the FALLBACK used when the table has not been seeded.
// Callers that can reach the database should still prefer the stored weights;
// normalizeWeights accepts either casing, so a stored payload and this fallback
// are interchangeable.

'use strict';

const { normalizeSubject } = require('./subject');
const { toScore } = require('./numeric');

/** Fallback weights. Must sum to 1. */
const DEFAULT_SYLLABUS_WEIGHTS = Object.freeze({
    Mathematics: 0.25,
    ESAS: 0.30,
    EE: 0.45,
});

/**
 * Coerce any weights payload — uppercase keys, short keys ('Math'), long
 * spellings — onto canonical subject keys. Unknown subjects are dropped rather
 * than silently contributing weight under a key nothing reads.
 */
function normalizeWeights(weights) {
    if (!weights || typeof weights !== 'object') return { ...DEFAULT_SYLLABUS_WEIGHTS };
    const out = {};
    for (const [key, value] of Object.entries(weights)) {
        const canonical = normalizeSubject(key);
        const n = Number(value);
        if (canonical === 'General' || !Number.isFinite(n)) continue;
        out[canonical] = n;
    }
    return Object.keys(out).length ? out : { ...DEFAULT_SYLLABUS_WEIGHTS };
}

/**
 * PRC weighted general average from per-subject percentages (0-100).
 *
 * Subjects with no score are excluded and the remaining weights renormalised, so
 * a Math-only practice set is not scored as though the candidate answered
 * nothing in ESAS and EE.
 */
function weightedAverage(subjectScores, weights = DEFAULT_SYLLABUS_WEIGHTS) {
    const w = normalizeWeights(weights);
    let weightSum = 0;
    let acc = 0;
    for (const [subject, score] of Object.entries(subjectScores || {})) {
        const canonical = normalizeSubject(subject);
        // toScore, not Number: Number(null) is 0, which would drag the weighted
        // average down with a subject the exam never asked about.
        const n = toScore(score);
        const weight = w[canonical];
        if (n === null || !Number.isFinite(weight)) continue;
        acc += n * weight;
        weightSum += weight;
    }
    if (weightSum === 0) return 0;
    return Math.round((acc / weightSum) * 100) / 100;
}

module.exports = { DEFAULT_SYLLABUS_WEIGHTS, normalizeWeights, weightedAverage };
