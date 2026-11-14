import { describe, it, expect } from 'vitest';
const { aggregateDailyStudy } = require('../src/services/deepAnalyticsHelpers');

const MANILA_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });
const manilaDateOf = (d) => MANILA_FMT.format(new Date(d));

describe('aggregateDailyStudy', () => {
  it('keys days by MANILA date — a UTC evening lands on the NEXT Manila day', () => {
    // 2026-07-01 20:00 UTC = 2026-07-02 04:00 Manila.
    const daily = aggregateDailyStudy(
      [{ createdAt: new Date('2026-07-01T20:00:00Z'), durationSecs: 600 }],
      [],
      manilaDateOf,
    );
    expect(daily).toEqual([{ date: '2026-07-02', totalSecs: 600, sessions: 1 }]);
  });

  it('merges exam-session time with study sessions on the same day', () => {
    const daily = aggregateDailyStudy(
      [{ createdAt: new Date('2026-07-01T02:00:00Z'), durationSecs: 900 }],
      [{ createdAt: new Date('2026-07-01T05:00:00Z'), timeTakenSecs: 3600, totalQuestions: 100 }],
      manilaDateOf,
    );
    expect(daily).toEqual([{ date: '2026-07-01', totalSecs: 4500, sessions: 2 }]);
  });

  it('ignores zero-duration and zero-question rows, sorts ascending', () => {
    const daily = aggregateDailyStudy(
      [
        { createdAt: new Date('2026-07-03T02:00:00Z'), durationSecs: 0 },
        { createdAt: new Date('2026-07-03T03:00:00Z'), durationSecs: 300 },
      ],
      [
        { createdAt: new Date('2026-07-01T02:00:00Z'), timeTakenSecs: 1200, totalQuestions: 0 }, // stray upsert
        { createdAt: new Date('2026-07-02T02:00:00Z'), timeTakenSecs: 1800, totalQuestions: 50 },
      ],
      manilaDateOf,
    );
    expect(daily).toEqual([
      { date: '2026-07-02', totalSecs: 1800, sessions: 1 },
      { date: '2026-07-03', totalSecs: 300, sessions: 1 },
    ]);
  });
});

describe('subjectScoresBySession', () => {
  const { subjectScoresBySession } = require('../src/services/deepAnalyticsHelpers');

  it('folds grouped attempt rows into per-session subject percentages, merging spellings', () => {
    const out = subjectScoresBySession([
      { sessionId: 's1', subject: 'Math', total: 2, correct: 1 },
      { sessionId: 's1', subject: 'Mathematics', total: 2, correct: 2 },
      { sessionId: 's1', subject: 'EE', total: 4, correct: 1 },
      { sessionId: 's2', subject: 'ESAS', total: 0, correct: 0 },
    ]);
    expect(out).toEqual({ s1: { Mathematics: 75, EE: 25 }, s2: {} });
  });

});

describe('foldWeeklyAccuracy', () => {
  const { foldWeeklyAccuracy } = require('../src/services/deepAnalyticsHelpers');
  const { normalizeSubject } = require('@ree/shared');

  it('merges subject spellings within a week, oldest week first', () => {
    expect(foldWeeklyAccuracy([
      { week: '2026-11-09', subject: 'EE', answered: 10, correct: 7 },
      { week: '2026-11-02', subject: 'Math', answered: 4, correct: 1 },
      { week: '2026-11-02', subject: 'Mathematics', answered: 6, correct: 5 },
      { week: null, subject: 'EE', answered: 3, correct: 3 },
    ], normalizeSubject)).toEqual([
      { week: '2026-11-02', subject: 'Mathematics', answered: 10, correct: 6 },
      { week: '2026-11-09', subject: 'EE', answered: 10, correct: 7 },
    ]);
    expect(foldWeeklyAccuracy(null, normalizeSubject)).toEqual([]);
  });
});
