import { describe, it, expect } from 'vitest';
import { forecastPlan, startingPlan } from './startingPlan';

const result = (gwa, subjects) => ({ projectedGWA: gwa, subjects: Object.fromEntries(Object.entries(subjects).map(([s, e]) => [s, { expected: e }])) });

describe('startingPlan', () => {
  it('goes by the average when every subject clears the floor', () => {
    expect(startingPlan(result(55, { Mathematics: 55, ESAS: 52, EE: 58 }))).toMatchObject({ mode: 'practice', subject: null, reason: 'average', note: null });
    expect(startingPlan(result(65, { Mathematics: 60, ESAS: 66, EE: 68 }))).toMatchObject({ mode: 'mock', reason: 'average' });
    expect(startingPlan(result(74, { Mathematics: 70, ESAS: 75, EE: 77 }))).toMatchObject({ mode: 'gauntlet', reason: 'average' });
  });

  it('sends a subject under the 50% floor to Practice first, the weakest one, whatever the average', () => {
    const plan = startingPlan(result(72, { Mathematics: 85, ESAS: 44, EE: 48 }));
    expect(plan).toMatchObject({ mode: 'practice', subject: 'ESAS', reason: 'floor' });
    expect(plan.note).toBe('ESAS is under the 50% subject floor, which fails the board on its own. Start with Practice on ESAS.');
  });

  it('a subject that was not measured is not under the floor', () => {
    expect(startingPlan({ projectedGWA: 71, subjects: { EE: { expected: 71 } } })).toMatchObject({ mode: 'gauntlet' });
  });

  it('no result, no plan', () => {
    expect(startingPlan(null)).toBeNull();
  });

  it("carries the floor subject's projected score", () => {
    expect(startingPlan(result(68, { Mathematics: 71, ESAS: 44, EE: 80 }))).toMatchObject({ subject: 'ESAS', expected: 44 });
  });
});

describe('forecastPlan', () => {
  const forecast = (mean, subjects) => ({
    projectedGWA: { mean, low: mean - 5, high: mean + 5 },
    subjects: Object.fromEntries(Object.entries(subjects).map(([s, e]) => [s, { expected: e, p50: 0.5 }])),
  });

  it("reads the forecast's projections with the same rule, its average from the mean", () => {
    expect(forecastPlan(forecast(66, { Mathematics: 62, ESAS: 47, EE: 75 }))).toMatchObject({ mode: 'practice', subject: 'ESAS', reason: 'floor', expected: 47 });
    // The mean, not the { mean, low, high } object, which would read as no average at all.
    expect(forecastPlan(forecast(74, { Mathematics: 70, ESAS: 72, EE: 78 }))).toMatchObject({ mode: 'gauntlet', reason: 'average' });
  });

  it('no forecast, or one with no subjects, no plan', () => {
    expect(forecastPlan(null)).toBeNull();
    expect(forecastPlan({ projectedGWA: { mean: 70 }, subjects: {} })).toBeNull();
  });
});
