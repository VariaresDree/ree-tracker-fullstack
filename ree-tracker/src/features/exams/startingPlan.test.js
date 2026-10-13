import { describe, it, expect } from 'vitest';
import { startingPlan } from './startingPlan';

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
});
