// src/services/readinessService.js
//
// The composite readiness score, extracted from readinessRoutes.
//
// It lived entirely inside a route handler: the five term weights, the theta
// normalisation, the blind-spot rule and the final clamp were all inline. That
// made it untestable without a live database, which is why it was also
// completely uncovered — and why two real defects sat in it unnoticed (a
// coverage ratio that could exceed 1, and a "consistency" term with no time
// window that scored 1.0 forever for someone who had studied 14 days six months
// ago and nothing since).
//
// The split here is deliberate: the ROUTE gathers facts from the database, this
// module turns facts into a score. Everything below is pure, so the scoring rule
// can be exercised directly.

'use strict';

const { THETA_MIN, THETA_MAX } = require('../engine/irt');
const { BLIND_SPOT_ACCURACY, BLIND_SPOT_MIN_ATTEMPTS } = require('@ree/shared');

/**
 * Term weights for the composite. Named rather than inline so the split is
 * visible and reviewable — this is a product decision, not an implementation
 * detail. Must sum to 1.
 */
const READINESS_WEIGHTS = Object.freeze({
    topicCoverage: 0.30,
    accuracy: 0.30,
    theta: 0.20,
    consistency: 0.10,
    blindSpot: 0.10,
});

/** Studying this many days inside the window scores full marks for consistency. */
const CONSISTENCY_TARGET_DAYS = 7;

/** The window consistency is measured over. */
const CONSISTENCY_WINDOW_DAYS = 14;

/**
 * Map theta onto 0..1 using the estimator's own bounds.
 *
 * The ±4 range was previously hardcoded here — a FOURTH independent statement of
 * a number that the estimator already owns. Importing it means widening the
 * ability scale can never silently leave this normalisation behind.
 */
function normalizeTheta(theta) {
    const t = Number(theta);
    if (!Number.isFinite(t)) return 0.5; // no evidence yet — mid-scale, not zero
    const span = THETA_MAX - THETA_MIN;
    return Math.min(1, Math.max(0, (t - THETA_MIN) / span));
}

/**
 * Consistency: distinct active days inside the window, against the target.
 * Bounded to 0..1.
 */
function computeConsistency(activeDays) {
    const n = Number(activeDays) || 0;
    return Math.min(1, Math.max(0, n / CONSISTENCY_TARGET_DAYS));
}

/**
 * A blind spot is a topic the learner is confidently getting wrong: accuracy
 * below the threshold with enough attempts to be more than noise. The minimum
 * matters — without it, one wrong answer on a brand-new topic reads as a blind
 * spot.
 *
 * @param {Array<{attempts:number, correct:number}>} topicPerf
 */
function countBlindSpots(topicPerf = []) {
    let count = 0;
    for (const t of topicPerf) {
        const attempts = Number(t?.attempts) || 0;
        if (attempts < BLIND_SPOT_MIN_ATTEMPTS) continue;
        const accuracy = (Number(t?.correct) || 0) / attempts;
        if (accuracy < BLIND_SPOT_ACCURACY) count += 1;
    }
    return count;
}

/**
 * Coverage as a ratio, never above 1.
 *
 * The clamp is not cosmetic: the numerator and denominator are counted by two
 * separate queries, and when they disagreed on whether to exclude flagged
 * questions this ratio exceeded 1 and inflated the composite by up to 30 points.
 * Both queries now filter identically; this makes any future asymmetry a
 * bounded bug rather than a scoring one.
 */
function computeCoverage(coveredTopicCount, totalTopicCount) {
    const total = Number(totalTopicCount) || 0;
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, (Number(coveredTopicCount) || 0) / total));
}

/** Attempts → accuracy, guarding the zero-attempt case. */
function computeAccuracy(correctAttempts, totalAttempts) {
    const total = Number(totalAttempts) || 0;
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, (Number(correctAttempts) || 0) / total));
}

/**
 * Turn gathered facts into the readiness payload.
 *
 * Pure — every input is a plain number or array, so the whole scoring rule is
 * exercisable without a database.
 *
 * @param {object} facts
 * @param {number} facts.coveredTopicCount
 * @param {number} facts.totalTopicCount
 * @param {number} facts.correctAttempts
 * @param {number} facts.totalAttempts
 * @param {number} facts.theta
 * @param {number} facts.activeDays          distinct active days in the window
 * @param {Array<{attempts:number, correct:number}>} facts.topicPerf
 */
function computeReadiness(facts) {
    const {
        coveredTopicCount = 0,
        totalTopicCount = 0,
        correctAttempts = 0,
        totalAttempts = 0,
        theta = 0,
        activeDays = 0,
        topicPerf = [],
    } = facts || {};

    const topicCoverage = computeCoverage(coveredTopicCount, totalTopicCount);
    const accuracyRate = computeAccuracy(correctAttempts, totalAttempts);
    const normalizedTheta = normalizeTheta(theta);
    const consistency = computeConsistency(activeDays);

    const blindSpotCount = countBlindSpots(topicPerf);
    const blindSpotRatio = topicPerf.length > 0 ? blindSpotCount / topicPerf.length : 0;

    const raw = (
        topicCoverage * READINESS_WEIGHTS.topicCoverage
        + accuracyRate * READINESS_WEIGHTS.accuracy
        + normalizedTheta * READINESS_WEIGHTS.theta
        + consistency * READINESS_WEIGHTS.consistency
        + (1 - blindSpotRatio) * READINESS_WEIGHTS.blindSpot
    ) * 100;

    return {
        score: Math.min(100, Math.max(0, Math.round(raw))),
        breakdown: {
            topicCoverage: Math.round(topicCoverage * 100),
            accuracyRate: Math.round(accuracyRate * 100),
            thetaNormalized: Math.round(normalizedTheta * 100),
            consistency: Math.round(consistency * 100),
            blindSpotRatio: Math.round(blindSpotRatio * 100),
            blindSpotCount,
            totalSubtopics: totalTopicCount,
            coveredSubtopics: coveredTopicCount,
        },
    };
}

module.exports = {
    READINESS_WEIGHTS,
    CONSISTENCY_TARGET_DAYS,
    CONSISTENCY_WINDOW_DAYS,
    normalizeTheta,
    computeConsistency,
    countBlindSpots,
    computeCoverage,
    computeAccuracy,
    computeReadiness,
};
