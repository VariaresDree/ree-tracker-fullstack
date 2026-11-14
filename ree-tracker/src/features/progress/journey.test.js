import { describe, it, expect } from 'vitest';
import { mondayOf } from '@ree/shared';
import { passPoints, readinessPoints, subjectTrends, trendOf, weekLine, weekRows } from './journey';

const wk = (week, subject, answered, correct) => ({ week, subject, answered, correct });

describe('trendOf', () => {
  it('reads oldest to newest whatever order it is given, and says how far it moved', () => {
    expect(trendOf([{ day: '2026-11-03', value: 61.6 }, { day: '2026-11-01', value: 55.2 }, { day: '2026-11-02', value: 58 }]))
      .toEqual({ values: [55, 58, 62], latest: 62, change: 7, since: '2026-11-01' });
  });

  it('one point has no change yet; none is no trend', () => {
    expect(trendOf([{ day: '2026-11-01', value: 40 }])).toEqual({ values: [40], latest: 40, change: null, since: '2026-11-01' });
    expect(trendOf([])).toBeNull();
    expect(trendOf([{ day: '2026-11-01', value: NaN }, { value: 3 }])).toBeNull();
    expect(trendOf(null)).toBeNull();
  });
});

describe('points', () => {
  it('readiness is keyed by its Manila day; pass chance becomes a percent', () => {
    // 17:00 UTC is already the next day in Manila.
    expect(readinessPoints([{ createdAt: '2026-11-01T17:00:00Z', score: 62 }])).toEqual([{ day: '2026-11-02', value: 62 }]);
    expect(passPoints([{ day: '2026-11-02', passProbability: 0.354 }])[0].value).toBeCloseTo(35.4);
    expect(readinessPoints(null)).toEqual([]);
    expect(passPoints(undefined)).toEqual([]);
  });
});

describe('subjectTrends', () => {
  it('a point per week with 10 or more answers, per board subject, spellings folded', () => {
    const [math, esas, ee] = subjectTrends([
      wk('2026-11-02', 'Math', 20, 10),
      wk('2026-11-09', 'Mathematics', 20, 15),
      wk('2026-11-09', 'ESAS', 9, 9),
      wk('2026-11-09', 'EE', 10, 7),
    ]);
    expect(math).toEqual({ subject: 'Mathematics', trend: { values: [50, 75], latest: 75, change: 25, since: '2026-11-02' } });
    expect(esas).toEqual({ subject: 'ESAS', trend: null });
    expect(ee.trend).toMatchObject({ latest: 70, change: null });
  });
});

describe('weekLine', () => {
  // 2026-11-14 is a Saturday; its week began Monday the 9th.
  const today = '2026-11-14';

  it('the week is Monday first, as the server keys it', () => {
    expect(mondayOf('2026-11-14')).toBe('2026-11-09');
    expect(mondayOf('2026-11-09')).toBe('2026-11-09');
    expect(mondayOf('2026-11-15')).toBe('2026-11-09');
    expect(mondayOf('2026-11-16')).toBe('2026-11-16');
  });

  it('says how much and how well, and names the subject furthest under its share of the board', () => {
    const items = [wk('2026-11-09', 'Mathematics', 55, 37), wk('2026-11-09', 'ESAS', 21, 16), wk('2026-11-09', 'EE', 24, 18), wk('2026-11-02', 'EE', 200, 1)];
    expect(weekLine(items, today)).toBe('This week: 100 answers, 71% right. EE is 45% of the board and 24% of your answers.');
  });

  it('a balanced week, or a short one, is only the count', () => {
    expect(weekLine([wk('2026-11-09', 'Mathematics', 25, 20), wk('2026-11-09', 'ESAS', 30, 20), wk('2026-11-09', 'EE', 45, 30)], today))
      .toBe('This week: 100 answers, 70% right.');
    expect(weekLine([wk('2026-11-09', 'Mathematics', 1, 1)], today)).toBe('This week: 1 answer, 100% right.');
  });

  it('nothing answered this week, no line', () => {
    expect(weekLine([wk('2026-11-02', 'EE', 30, 20)], today)).toBeNull();
    expect(weekLine(null, today)).toBeNull();
  });
});

describe('weekRows', () => {
  it('newest week first, a subject with no answers left empty', () => {
    expect(weekRows([wk('2026-11-02', 'Math', 4, 1), wk('2026-11-09', 'EE', 10, 7)])).toEqual([
      { week: '2026-11-09', Mathematics: null, ESAS: null, EE: { pct: 70, answered: 10 } },
      { week: '2026-11-02', Mathematics: { pct: 25, answered: 4 }, ESAS: null, EE: null },
    ]);
  });
});
