import { describe, it, expect } from 'vitest';

// The readiness score is one of the app's headline numbers, and until this
// extraction it lived entirely inside a route handler — so it could not be
// tested without a live database, and it was completely uncovered. Two real
// defects sat in it as a result: a coverage ratio that could exceed 1 and
// inflate the composite by up to 30 points, and a "consistency" term with no
// time window that scored full marks forever for someone who had studied 14
// days six months ago and nothing since.
//
// These tests exercise the scoring RULE. The route's job is now only to gather
// the facts it feeds in.
const {
    READINESS_WEIGHTS,
    CONSISTENCY_TARGET_DAYS,
    normalizeTheta,
    computeConsistency,
    countBlindSpots,
    computeCoverage,
    computeAccuracy,
    computeReadiness,
} = require('../src/services/readinessService');
const { THETA_MIN, THETA_MAX } = require('../src/engine/irt');

describe('term weights', () => {
    it('sum to exactly 1', () => {
        const sum = Object.values(READINESS_WEIGHTS).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1, 10);
        // If a weight is ever retuned, the others have to move with it —
        // otherwise the composite silently stops being a percentage.
    });
});

describe('normalizeTheta', () => {
    it('maps the estimator bounds onto 0..1', () => {
        expect(normalizeTheta(THETA_MIN)).toBe(0);
        expect(normalizeTheta(0)).toBe(0.5);
        expect(normalizeTheta(THETA_MAX)).toBe(1);
    });

    it('is derived from the estimator, not a fourth hardcoded copy of ±4', () => {
        // The route used to compute (theta + 4) / 8 inline. Widening the ability
        // scale would have left that behind silently.
        expect(THETA_MAX - THETA_MIN).toBe(8);
        expect(normalizeTheta(THETA_MAX / 2)).toBeCloseTo(0.75, 10);
    });

    it('clamps beyond the bounds rather than exceeding 0..1', () => {
        expect(normalizeTheta(99)).toBe(1);
        expect(normalizeTheta(-99)).toBe(0);
    });

    it('treats no evidence as mid-scale, not as the floor', () => {
        // A brand-new user has no ability estimate. Scoring them 0 on the theta
        // term would read as "maximally unprepared" rather than "unknown".
        expect(normalizeTheta(null)).toBe(0.5);
        expect(normalizeTheta(undefined)).toBe(0.5);
        expect(normalizeTheta(NaN)).toBe(0.5);
    });
});

describe('computeCoverage', () => {
    it('is a plain ratio in the normal case', () => {
        expect(computeCoverage(25, 100)).toBe(0.25);
    });

    it('CANNOT exceed 1 even when the two counts disagree', () => {
        // The numerator and denominator come from two separate queries. When they
        // disagreed about excluding flagged questions, coverage went above 1 and
        // added up to 30 points to the composite before the final clamp hid it.
        expect(computeCoverage(120, 100)).toBe(1);
    });

    it('is 0 when there are no topics at all, not NaN', () => {
        expect(computeCoverage(0, 0)).toBe(0);
    });
});

describe('computeAccuracy', () => {
    it('guards the zero-attempt case', () => {
        expect(computeAccuracy(0, 0)).toBe(0);
    });

    it('is a plain ratio otherwise', () => {
        expect(computeAccuracy(7, 10)).toBe(0.7);
    });
});

describe('computeConsistency', () => {
    it('reaches full marks at the target and saturates there', () => {
        expect(computeConsistency(CONSISTENCY_TARGET_DAYS)).toBe(1);
        expect(computeConsistency(CONSISTENCY_TARGET_DAYS * 2)).toBe(1);
    });

    it('scales below the target', () => {
        expect(computeConsistency(0)).toBe(0);
        expect(computeConsistency(CONSISTENCY_TARGET_DAYS / 2)).toBeCloseTo(0.5, 10);
    });
});

describe('countBlindSpots', () => {
    it('needs enough attempts before calling a topic a blind spot', () => {
        // One wrong answer on a brand-new topic is noise, not a blind spot.
        expect(countBlindSpots([{ attempts: 1, correct: 0 }])).toBe(0);
        expect(countBlindSpots([{ attempts: 2, correct: 0 }])).toBe(0);
        expect(countBlindSpots([{ attempts: 3, correct: 0 }])).toBe(1);
    });

    it('only counts topics below the accuracy threshold', () => {
        expect(countBlindSpots([
            { attempts: 10, correct: 1 },  // 10% — blind spot
            { attempts: 10, correct: 5 },  // 50% — weak, not blind
            { attempts: 10, correct: 9 },  // 90% — fine
        ])).toBe(1);
    });

    it('handles an empty or malformed list without throwing', () => {
        expect(countBlindSpots([])).toBe(0);
        expect(countBlindSpots(undefined)).toBe(0);
        expect(countBlindSpots([{}])).toBe(0);
    });
});

describe('computeReadiness', () => {
    const perfect = {
        coveredTopicCount: 100,
        totalTopicCount: 100,
        correctAttempts: 100,
        totalAttempts: 100,
        theta: THETA_MAX,
        activeDays: CONSISTENCY_TARGET_DAYS,
        topicPerf: [{ attempts: 10, correct: 10 }],
    };

    it('scores a maxed-out learner at 100', () => {
        expect(computeReadiness(perfect).score).toBe(100);
    });

    it('scores an empty profile at the theta-only floor, not below zero', () => {
        const r = computeReadiness({});
        // No coverage, no accuracy, no consistency; theta unknown => mid-scale;
        // no topics => no blind spots, so that term is full.
        const expected = Math.round((0.5 * READINESS_WEIGHTS.theta + 1 * READINESS_WEIGHTS.blindSpot) * 100);
        expect(r.score).toBe(expected);
        expect(r.score).toBeGreaterThanOrEqual(0);
    });

    it('never returns a score outside 0..100', () => {
        const inflated = computeReadiness({ ...perfect, coveredTopicCount: 500 });
        expect(inflated.score).toBeLessThanOrEqual(100);
        expect(inflated.score).toBeGreaterThanOrEqual(0);
    });

    it('reports the breakdown as whole percentages', () => {
        const { breakdown } = computeReadiness(perfect);
        expect(breakdown.topicCoverage).toBe(100);
        expect(breakdown.accuracyRate).toBe(100);
        expect(breakdown.thetaNormalized).toBe(100);
        expect(breakdown.consistency).toBe(100);
        expect(breakdown.blindSpotRatio).toBe(0);
        expect(breakdown.blindSpotCount).toBe(0);
        expect(breakdown.coveredSubtopics).toBe(100);
        expect(breakdown.totalSubtopics).toBe(100);
    });

    it('penalises blind spots proportionally', () => {
        const half = computeReadiness({
            ...perfect,
            topicPerf: [
                { attempts: 10, correct: 10 },
                { attempts: 10, correct: 1 }, // blind spot
            ],
        });
        // Half the topics are blind spots => that term contributes half its weight.
        expect(half.breakdown.blindSpotRatio).toBe(50);
        expect(half.score).toBe(100 - Math.round(0.5 * READINESS_WEIGHTS.blindSpot * 100));
    });
});
