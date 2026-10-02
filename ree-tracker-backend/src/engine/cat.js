// Computerised adaptive testing — item choice and the placement test's rules.
//
// Shared by POST /api/exams/next-item and the placement diagnostic. The CAT
// route used to read `take: 80` rows with no ordering — the same 80 every call —
// and always serve THE single most informative of them, so the first item for
// every learner at a given θ was identical. Choice now:
//   • information at θ (3PL Fisher information, via engine/irt);
//   • content balance — an item from a topic the session has already asked
//     about is discounted, so a placement samples the syllabus, not one topic;
//   • exposure control ("randomesque") — a random pick among the k best.
//
// Pure and stateless.

'use strict';

const { fisherInfo, itemParams, updateTheta, PRIOR_SE } = require('./irt');
const { DEFAULT_SYLLABUS_WEIGHTS } = require('@ree/shared');

// Placement test length per subject, roughly in syllabus proportion (25/30/45),
// 19 items at most — a ~20-minute sitting.
const DIAGNOSTIC_CAPS = Object.freeze({ Mathematics: 5, ESAS: 6, EE: 8 });
// A subject may stop early once its estimate is this precise…
const SE_TARGET = 0.45;
// …but never before this many items.
const MIN_PER_SUBJECT = 3;
// How strongly an already-covered topic is discounted.
const COVERAGE_PENALTY = 0.5;

const topicKey = (q) => q.topicId || q.subtopic || null;

/**
 * Choose the next item. Score = information at θ ÷ (1 + penalty × times the
 * item's topic was already asked); then a random pick among the top k.
 *
 * @returns {string|null} question id
 */
function pickCatItem({ theta, pool, coveredTopics = {}, k = 3, rng = Math.random }) {
    if (!Array.isArray(pool) || pool.length === 0) return null;
    const t = Number.isFinite(theta) ? theta : 0;
    const scored = pool
        .filter((q) => q?.id)
        .map((q) => {
            const covered = coveredTopics[topicKey(q)] || 0;
            return { id: q.id, score: fisherInfo(t, itemParams(q)) / (1 + COVERAGE_PENALTY * covered) };
        })
        .sort((a, b) => b.score - a.score);
    if (scored.length === 0) return null;
    const top = scored.slice(0, Math.max(1, k));
    return top[Math.floor(rng() * top.length)].id;
}

/**
 * Per-subject placement estimates from the session's graded responses, each
 * folded from the population prior N(0, 1) — a placement is an independent
 * measurement, not an update of whatever θ the account already had.
 *
 * @param {Array<{subject, isCorrect, params:{a,b,c}}>} responses
 */
function estimateSubjects(responses) {
    const out = {};
    for (const s of Object.keys(DIAGNOSTIC_CAPS)) {
        const mine = (responses || []).filter((r) => r.subject === s);
        const est = mine.length > 0
            ? updateTheta({ theta: 0, se: PRIOR_SE }, mine.map((r) => ({ item: r.params, correct: !!r.isCorrect })))
            : { theta: 0, se: PRIOR_SE };
        out[s] = { theta: est.theta, se: est.se, n: mine.length, correct: mine.filter((r) => r.isCorrect).length };
    }
    return out;
}

/** Has this subject seen enough items? */
function subjectDone(subject, { n, se }) {
    if (n >= DIAGNOSTIC_CAPS[subject]) return true;
    return n >= MIN_PER_SUBJECT && se <= SE_TARGET;
}

/**
 * The subject to ask next: the unfinished one furthest behind its share of the
 * test (n / cap), heavier syllabus weight first on a tie. Null when done.
 */
function nextDiagnosticSubject(estimates) {
    let best = null;
    for (const s of Object.keys(DIAGNOSTIC_CAPS)) {
        const est = estimates[s] || { n: 0, se: PRIOR_SE };
        if (subjectDone(s, est)) continue;
        const progress = est.n / DIAGNOSTIC_CAPS[s];
        const weight = DEFAULT_SYLLABUS_WEIGHTS[s] || 0;
        if (!best || progress < best.progress - 1e-9 || (Math.abs(progress - best.progress) <= 1e-9 && weight > best.weight)) {
            best = { s, progress, weight };
        }
    }
    return best ? best.s : null;
}

/** Items in a full placement (every subject to its cap). */
function plannedLength() {
    return Object.values(DIAGNOSTIC_CAPS).reduce((a, b) => a + b, 0);
}

module.exports = {
    DIAGNOSTIC_CAPS,
    SE_TARGET,
    MIN_PER_SUBJECT,
    pickCatItem,
    estimateSubjects,
    subjectDone,
    nextDiagnosticSubject,
    plannedLength,
    topicKey,
};
