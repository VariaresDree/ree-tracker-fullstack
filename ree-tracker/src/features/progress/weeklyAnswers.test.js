import { describe, it, expect } from 'vitest';
import { weeklyAnswers } from './weeklyAnswers';

describe('weeklyAnswers', () => {
  it('counts the last seven Manila days, today included, against the seven before', () => {
    const cal = {
      '2026-10-28': 10, // today
      '2026-10-22': 5, // 6 days ago: this week
      '2026-10-21': 7, // 7 days ago: last week
      '2026-10-15': 3, // 13 days ago: last week
      '2026-10-14': 99, // 14 days ago: neither
    };
    expect(weeklyAnswers(cal, '2026-10-28')).toEqual({ thisWeek: 15, lastWeek: 10 });
  });

  it('crosses a month boundary and reads nothing from a missing calendar', () => {
    expect(weeklyAnswers({ '2026-10-01': 4, '2026-09-30': 6, '2026-09-24': 2 }, '2026-10-01')).toEqual({ thisWeek: 10, lastWeek: 2 });
    expect(weeklyAnswers(undefined, '2026-10-28')).toEqual({ thisWeek: 0, lastWeek: 0 });
  });
});
