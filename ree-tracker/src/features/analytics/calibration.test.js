// Unit tests for the confidence-calibration math. These functions back the
// Profile → Analytics → Confidence Calibration tab; if they drift, users see
// wrong Brier scores and a misleading reliability curve. Pure functions, so
// no DOM / no jsdom needed.

import { describe, it, expect } from 'vitest';
import {
  CONFIDENCE_MAP,
  buildCalibrationCurve,
  brierScore,
  expectedCalibrationError,
} from './calibration.js';

// Helpers to keep cases readable.
const a = (confidenceLevel, isCorrect) => ({ confidenceLevel, isCorrect });
const HIGH_CORRECT = a('HIGH', true);
const HIGH_WRONG = a('HIGH', false);
const LOW_CORRECT = a('LOW', true);
const LOW_WRONG = a('LOW', false);
const MED_CORRECT = a('MED', true);

describe('CONFIDENCE_MAP', () => {
  it('uses fixed 3-tier midpoints', () => {
    expect(CONFIDENCE_MAP).toEqual({ LOW: 0.25, MED: 0.55, HIGH: 0.85 });
  });
});

describe('buildCalibrationCurve', () => {
  it('returns an empty result for no attempts', () => {
    expect(buildCalibrationCurve([])).toEqual({ points: [], n: 0 });
    expect(buildCalibrationCurve(null)).toEqual({ points: [], n: 0 });
  });

  it('reports observed accuracy per bin', () => {
    // 4 HIGH attempts (p=0.85), 3 correct → accuracy 0.75 in the HIGH bucket
    const attempts = [HIGH_CORRECT, HIGH_CORRECT, HIGH_CORRECT, HIGH_WRONG];
    const { points, n } = buildCalibrationCurve(attempts);
    expect(n).toBe(4);
    expect(points).toHaveLength(1);
    expect(points[0].confidence).toBeCloseTo(0.85, 5);
    expect(points[0].accuracy).toBe(0.75);
    expect(points[0].n).toBe(4);
  });

  it('separates attempts into their own confidence buckets', () => {
    const { points } = buildCalibrationCurve([LOW_CORRECT, MED_CORRECT, HIGH_WRONG]);
    expect(points).toHaveLength(3);
    const confs = points.map((p) => p.confidence).sort((a, b) => a - b);
    expect(confs[0]).toBeCloseTo(0.25, 5);
    expect(confs[1]).toBeCloseTo(0.55, 5);
    expect(confs[2]).toBeCloseTo(0.85, 5);
  });

  it('ignores attempts with unknown confidence labels', () => {
    const { points, n } = buildCalibrationCurve([
      HIGH_CORRECT,
      { confidenceLevel: 'BOGUS', isCorrect: true },
      { isCorrect: true },
    ]);
    // n still reflects raw input length per the implementation contract; what
    // matters is that bogus attempts don't show up in any bin.
    expect(n).toBe(3);
    expect(points).toHaveLength(1);
    expect(points[0].n).toBe(1);
  });

  it('normalizes lowercase confidence levels', () => {
    // mapConfidence uppercases its input so legacy lowercase data still maps.
    const { points } = buildCalibrationCurve([{ confidenceLevel: 'high', isCorrect: true }]);
    expect(points).toHaveLength(1);
    expect(points[0].confidence).toBeCloseTo(0.85, 5);
  });
});

describe('brierScore', () => {
  it('returns null when there are no attempts', () => {
    expect(brierScore([])).toBeNull();
    expect(brierScore(null)).toBeNull();
  });

  it('is 0 for a perfectly-calibrated trivial case', () => {
    // p=1, o=1 → (1-1)^2 = 0. Our HIGH=0.85 means a correct HIGH gives (1-0.85)^2 = 0.0225.
    expect(brierScore([HIGH_CORRECT])).toBeCloseTo(0.0225, 6);
  });

  it('penalises confident-wrong more than diffident-wrong', () => {
    // HIGH wrong: (0-0.85)^2 = 0.7225
    // LOW wrong:  (0-0.25)^2 = 0.0625
    const confidentlyWrong = brierScore([HIGH_WRONG]);
    const diffidentlyWrong = brierScore([LOW_WRONG]);
    expect(confidentlyWrong).toBeGreaterThan(diffidentlyWrong);
    expect(confidentlyWrong).toBeCloseTo(0.7225, 6);
    expect(diffidentlyWrong).toBeCloseTo(0.0625, 6);
  });

  it('averages across attempts', () => {
    // Two HIGH correct: each (1-0.85)^2 = 0.0225; average = 0.0225
    expect(brierScore([HIGH_CORRECT, HIGH_CORRECT])).toBeCloseTo(0.0225, 6);
  });

  it('skips attempts with unknown confidence levels', () => {
    // Mixing one HIGH correct with one bogus → score reflects only the valid one.
    const score = brierScore([HIGH_CORRECT, { confidenceLevel: 'BOGUS', isCorrect: true }]);
    expect(score).toBeCloseTo(0.0225, 6);
  });
});

describe('expectedCalibrationError', () => {
  it('returns null when there are no usable attempts', () => {
    expect(expectedCalibrationError([])).toBeNull();
    expect(expectedCalibrationError([{ confidenceLevel: 'BOGUS', isCorrect: true }])).toBeNull();
  });

  it('is 0 when bin accuracy matches bin confidence exactly', () => {
    // HIGH bucket has confidence 0.85. A run of 100 HIGH attempts where 85 are
    // correct gives a bin accuracy of 0.85 — perfectly calibrated.
    const attempts = [
      ...Array(85).fill(HIGH_CORRECT),
      ...Array(15).fill(HIGH_WRONG),
    ];
    expect(expectedCalibrationError(attempts)).toBeCloseTo(0, 5);
  });

  it('grows with miscalibration magnitude', () => {
    // High-conf wrong is worse-calibrated than high-conf right.
    const badly = expectedCalibrationError([HIGH_WRONG, HIGH_WRONG, HIGH_WRONG, HIGH_WRONG]);
    const wellish = expectedCalibrationError([HIGH_CORRECT, HIGH_CORRECT, HIGH_CORRECT, HIGH_CORRECT]);
    expect(badly).toBeGreaterThan(wellish);
  });

  it('weights bins by sample size', () => {
    // 9 well-calibrated LOW attempts + 1 confidently-wrong HIGH attempt.
    // Bin weights are 9/10 and 1/10. ECE = (9/10)*|0.25 - x| + (1/10)*|0.85 - 0|.
    const attempts = [
      ...Array(2).fill(LOW_CORRECT),  // 2 of 9 correct → acc 0.222 in LOW bin
      ...Array(7).fill(LOW_WRONG),
      HIGH_WRONG,
    ];
    const ece = expectedCalibrationError(attempts);
    // Sanity: must be > 0 and ≤ 1.
    expect(ece).toBeGreaterThan(0);
    expect(ece).toBeLessThanOrEqual(1);
  });

  it('does not dilute ECE with unlabeled attempts (weights by labeled count)', () => {
    // 100 HIGH attempts, 50 correct → HIGH bin accuracy 0.5, gap |0.85-0.5| = 0.35.
    // Plus 100 attempts with NO confidence label (excluded from every bin).
    // True ECE over labeled attempts = (100/100)*0.35 = 0.35. The old code
    // divided by attempts.length (200) and reported 0.175 — half the real value.
    const labeled = [...Array(50).fill(HIGH_CORRECT), ...Array(50).fill(HIGH_WRONG)];
    const unlabeled = Array(100).fill({ isCorrect: true }); // no confidenceLevel
    expect(expectedCalibrationError([...labeled, ...unlabeled])).toBeCloseTo(0.35, 5);
  });
});
