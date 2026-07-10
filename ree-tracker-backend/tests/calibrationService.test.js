import { describe, it, expect } from 'vitest';
const { buildResponseMatrix, blendParams, AUTHOR_PRIOR_N } = require('../src/services/calibrationService');
const { groupPairsBySubject, toEstimatorPair } = require('../src/services/telemetryHelpers');

describe('buildResponseMatrix — first attempt per (person, item)', () => {
  it('keeps only the first exposure, preserving chronological order', () => {
    const attempts = [
      { userId: 'u1', questionId: 'q1', isCorrect: false }, // first exposure
      { userId: 'u1', questionId: 'q2', isCorrect: true },
      { userId: 'u1', questionId: 'q1', isCorrect: true },  // repeat — learned, drop
      { userId: 'u2', questionId: 'q1', isCorrect: true },  // different person — keep
    ];
    expect(buildResponseMatrix(attempts)).toEqual([
      { personId: 'u1', itemId: 'q1', correct: false },
      { personId: 'u1', itemId: 'q2', correct: true },
      { personId: 'u2', itemId: 'q1', correct: true },
    ]);
  });

  it('skips malformed rows and handles empty input', () => {
    expect(buildResponseMatrix([])).toEqual([]);
    expect(buildResponseMatrix(null)).toEqual([]);
    expect(buildResponseMatrix([{ userId: null, questionId: 'q1' }, { userId: 'u1' }])).toEqual([]);
  });
});

describe('blendParams — author blend by response count', () => {
  it('serves pure author when there is no empirical fit', () => {
    expect(blendParams({ empiricalA: null, empiricalB: null, n: 0, authorDifficulty: 1.2 }))
      .toEqual({ a: 1.0, b: 1.2, w: 0 });
  });

  it('sits exactly at the midpoint at n = 30 (the spec threshold)', () => {
    const out = blendParams({ empiricalA: 2.0, empiricalB: 2.0, n: AUTHOR_PRIOR_N, authorDifficulty: 0 });
    expect(out.w).toBeCloseTo(0.5, 10);
    expect(out.b).toBeCloseTo(1.0, 10); // halfway between empirical 2 and author 0
    expect(out.a).toBeCloseTo(1.5, 10); // halfway between empirical 2 and default 1
  });

  it('converges to the empirical fit as n grows', () => {
    const out = blendParams({ empiricalA: 1.8, empiricalB: -1.4, n: 3000, authorDifficulty: 2 });
    expect(out.b).toBeCloseTo(-1.4, 1);
    expect(out.a).toBeCloseTo(1.8, 1);
  });

  it('defaults a missing author difficulty to 0 and clamps extreme ones', () => {
    expect(blendParams({ empiricalB: null, n: 0, authorDifficulty: undefined }).b).toBe(0);
    expect(blendParams({ empiricalB: null, n: 0, authorDifficulty: 9 }).b).toBe(3);
    expect(blendParams({ empiricalB: null, n: 0, authorDifficulty: -9 }).b).toBe(-3);
  });
});

describe('groupPairsBySubject — per-subject ability slicing', () => {
  const row = (subject, extra = {}) => ({ subject, isCorrect: true, _a: 1.1, _b: 0.4, _c: 0.2, ...extra });

  it('groups canonical subjects into estimator pairs and drops the rest', () => {
    const grouped = groupPairsBySubject([
      row('Mathematics'),
      row('EE', { isCorrect: false }),
      row('Mathematics'),
      row('General'),          // never gets an ability row
      row('Some Stray Label'), // ditto
    ]);
    expect(Object.keys(grouped).sort()).toEqual(['EE', 'Mathematics']);
    expect(grouped.Mathematics).toHaveLength(2);
    expect(grouped.EE[0]).toEqual({ item: { a: 1.1, b: 0.4, c: 0.2 }, correct: false });
  });

  it('toEstimatorPair applies the same fallbacks as the global theta path', () => {
    expect(toEstimatorPair({ isCorrect: true, _a: null, _b: null, _difficulty: 1.5, _c: null }))
      .toEqual({ item: { a: 1, b: 1.5, c: 0.2 }, correct: true });
    expect(toEstimatorPair({ isCorrect: false, _difficulty: null }))
      .toEqual({ item: { a: 1, b: 0, c: 0.2 }, correct: false });
  });
});
