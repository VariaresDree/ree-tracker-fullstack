import { describe, it, expect } from 'vitest';
import { planSummary } from './plannerTasks';

const T = '2026-11-12';
const t = (dueDate, over = {}) => ({ kind: 'drill', topic: 'Machines', dueDate, completed: false, createdAt: `${T}T01:00:00Z`, ...over });

describe('planSummary', () => {
  it('no planned task, no plan (own tasks don\'t count)', () => {
    expect(planSummary([], T)).toBeNull();
    expect(planSummary([{ text: 'Mine', dueDate: T, kind: null }], T)).toBeNull();
  });

  it('counts what is left from today: not past, not done', () => {
    const s = planSummary([
      t('2026-11-10'), // past
      t(T, { completed: true }), // done
      t(T, { topic: 'Calculus', progress: { done: true } }), // done by answering
      t('2026-11-13'), t('2026-11-14', { topic: 'Calculus' }), t('2026-11-15', { kind: 'mock', topic: null }),
    ], T, '2027-04-10');
    expect(s).toMatchObject({ left: 3, drills: 2, topics: 2, sittings: 1, endsOn: '2026-11-15', madeOn: T, ageDays: 0, over: false, stale: false });
  });

  it('stale at a week; runs out within a week and before the exam', () => {
    const old = '2026-11-01T01:00:00Z';
    expect(planSummary([t('2026-12-30', { createdAt: old })], T, '2027-04-10').stale).toBe(true);
    expect(planSummary([t('2026-11-18')], T, '2027-04-10').runsOut).toBe(true);
    expect(planSummary([t('2026-11-25')], T, '2027-04-10').runsOut).toBe(false);
    // Ending with the exam is the plan doing its job.
    expect(planSummary([t('2026-11-18')], T, '2026-11-19').runsOut).toBe(false);
  });

  it('nothing left: over', () => {
    expect(planSummary([t('2026-11-01')], T).over).toBe(true);
  });
});
