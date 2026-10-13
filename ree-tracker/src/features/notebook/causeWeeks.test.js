import { describe, it, expect } from 'vitest';
import { causeTrend, manilaWeekStart } from './causeWeeks';

// Wednesday 2026-10-14, 10:00 Manila
const NOW = Date.parse('2026-10-14T02:00:00Z');
const weeksAgo = (n, cause) => ({ cause, lastWrongAt: new Date(NOW - n * 7 * 86400000).toISOString() });
const many = (n, w, cause) => Array.from({ length: n }, () => weeksAgo(w, cause));

describe('causeTrend', () => {
  it('weeks start on a Manila Monday', () => {
    expect(manilaWeekStart(NOW)).toBe('2026-10-12');
    // Sunday 23:30 Manila is still the week before
    expect(manilaWeekStart(Date.parse('2026-10-11T15:30:00Z'))).toBe('2026-10-05');
    // Monday 00:30 Manila (Sunday 16:30 UTC) starts the new week
    expect(manilaWeekStart(Date.parse('2026-10-11T16:30:00Z'))).toBe('2026-10-12');
  });

  it('counts tagged causes per week, oldest first, and leaves out untagged and older misses', () => {
    const { weeks } = causeTrend([weeksAgo(0, 'misread'), weeksAgo(0, 'time'), weeksAgo(2, 'concept'), weeksAgo(0, null), weeksAgo(12, 'concept')], { now: NOW });
    expect(weeks).toHaveLength(8);
    expect(weeks[7]).toMatchObject({ start: '2026-10-12', total: 2, byCause: { misread: 1, time: 1, concept: 0, computation: 0 } });
    expect(weeks[5].byCause.concept).toBe(1);
    expect(weeks.reduce((n, w) => n + w.total, 0)).toBe(3);
  });

  it("names the biggest shift between the last four weeks and the four before", () => {
    const items = [
      ...many(4, 6, 'misread'), ...many(3, 5, 'concept'), ...many(3, 4, 'computation'), // before: 40 / 30 / 30
      ...many(1, 1, 'misread'), ...many(4, 2, 'concept'), ...many(5, 0, 'computation'), // last four: 10 / 40 / 50
    ];
    expect(causeTrend(items, { now: NOW }).headline)
      .toBe('Misreading the question is down: 40% of your tagged misses in the four weeks before, 10% in the last four.');
    const worse = [...many(5, 6, 'concept'), ...many(5, 5, 'computation'), ...many(2, 1, 'concept'), ...many(8, 0, 'time')];
    expect(causeTrend(worse, { now: NOW }).headline)
      .toBe('Running out of time is up: 0% of your tagged misses in the four weeks before, 80% in the last four.');
  });

  it('says nothing on too little to go on, or on a small change', () => {
    expect(causeTrend([...many(3, 6, 'misread'), ...many(6, 1, 'concept')], { now: NOW }).headline).toBeNull();
    const steady = [...many(3, 6, 'misread'), ...many(7, 5, 'concept'), ...many(3, 1, 'misread'), ...many(8, 2, 'concept')];
    expect(causeTrend(steady, { now: NOW }).headline).toBeNull();
  });
});
