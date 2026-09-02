import { describe, it, expect } from 'vitest';
const { buildScoreProgression, aggregateDailyStudy, deriveVerdict } = require('../src/services/deepAnalyticsHelpers');

const MANILA_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });
const manilaDateOf = (d) => MANILA_FMT.format(new Date(d));

describe('buildScoreProgression', () => {
  const base = { targetSubject: 'EE', createdAt: new Date('2026-07-01T10:00:00Z') };

  it('computes pct from the raw correct count (the "7% for 7/10" bug)', () => {
    const [row] = buildScoreProgression([
      { ...base, mode: 'BOARD_SIM', score: 7, totalQuestions: 10, verdict: 'IN_PROGRESS' },
    ]);
    expect(row.pct).toBe(70);
    expect(row.score).toBe(7);
    expect(row.totalQuestions).toBe(10);
  });

  it('derives the verdict from pct for never-finalized (IN_PROGRESS) sessions', () => {
    // A persisted ExamSession carries no per-subject breakdown, so only the
    // general average is available here — 60% no longer reaches the 70% average
    // and is a clean FAIL. Rows finalised by /exams/submit keep their stored
    // verdict, which WAS computed with the subject floor.
    const rows = buildScoreProgression([
      { ...base, mode: 'BOARD_SIM', score: 8, totalQuestions: 10, verdict: 'IN_PROGRESS' },
      { ...base, mode: 'BOARD_SIM', score: 6, totalQuestions: 10, verdict: 'IN_PROGRESS' },
      { ...base, mode: 'BOARD_SIM', score: 3, totalQuestions: 10, verdict: null },
    ]);
    expect(rows.map((r) => r.verdict)).toEqual(['PASSED', 'FAILED', 'FAILED']);
  });

  it('keeps a finalized verdict as stored', () => {
    const [row] = buildScoreProgression([
      { ...base, mode: 'GAUNTLET', score: 6, totalQuestions: 10, verdict: 'PASSED' },
    ]);
    expect(row.verdict).toBe('PASSED'); // stored wins, even if pct alone says otherwise
  });

  it('excludes non-exam surfaces and zero-question rows', () => {
    const rows = buildScoreProgression([
      { ...base, mode: 'ACTIVE_REVIEW', score: 4, totalQuestions: 5, verdict: 'IN_PROGRESS' },
      { ...base, mode: 'BATTLE', score: 9, totalQuestions: 10, verdict: 'IN_PROGRESS' },
      { ...base, mode: 'BOARD_SIM', score: 0, totalQuestions: 0, verdict: 'IN_PROGRESS' },
      { ...base, mode: 'BOARD_SIM', score: 50, totalQuestions: 100, verdict: 'IN_PROGRESS' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].pct).toBe(50);
  });

  it('uses the shared PRC rule, which the two sides no longer state separately', () => {
    // This test previously asserted a 70/60 flat band and its name claimed the
    // thresholds "mirror the exam submit route". They never did — submit banded
    // at >= 50 — so every score in [50, 60) rendered FAILED on the results
    // screen and CONDITIONAL PASS in history, and counted as a pass in the KPI.
    // deriveVerdict now comes from @ree/shared and is the real PRC rule: a 70%
    // general average AND no rated subject below 50.
    expect(deriveVerdict(70)).toBe('PASSED');
    expect(deriveVerdict(69)).toBe('FAILED');
    expect(deriveVerdict(55)).toBe('FAILED');

    // Subject floor: the average alone is not sufficient.
    expect(deriveVerdict(72, { Mathematics: 45, ESAS: 85, EE: 85 })).toBe('CONDITIONAL PASS');
    expect(deriveVerdict(72, { Mathematics: 60, ESAS: 85, EE: 85 })).toBe('PASSED');
  });
});

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
