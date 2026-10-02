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

  it('applies the PRC rule to never-finalized sessions when their subject scores are known', () => {
    // 70% overall, but Mathematics at 40%: the subject floor makes this a
    // CONDITIONAL PASS. Deriving from pct alone used to call it PASSED, so
    // Score History disagreed with the results screen.
    const rows = buildScoreProgression(
      [{ ...base, id: 's1', mode: 'BOARD_SIM', score: 70, totalQuestions: 100, verdict: 'IN_PROGRESS' }],
      { s1: { Mathematics: 40, ESAS: 80, EE: 80 } },
    );
    expect(rows[0].verdict).toBe('CONDITIONAL PASS');
    expect(rows[0].generalAverage).toBe(70);
  });

  it('weights the subjects when it re-derives a verdict', () => {
    // 71% raw would pass; the 25/30/45 weighted average is 69.3.
    const rows = buildScoreProgression(
      [{ ...base, id: 's2', mode: 'BOARD_SIM', score: 214, totalQuestions: 300, verdict: 'IN_PROGRESS' }],
      { s2: { Mathematics: 90, ESAS: 60, EE: 64 } },
    );
    expect(rows[0].pct).toBe(71);
    expect(rows[0].verdict).toBe('FAILED');
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

describe('subjectScoresBySession', () => {
  const { subjectScoresBySession, needsDerivedVerdict } = require('../src/services/deepAnalyticsHelpers');

  it('folds grouped attempt rows into per-session subject percentages, merging spellings', () => {
    const out = subjectScoresBySession([
      { sessionId: 's1', subject: 'Math', total: 2, correct: 1 },
      { sessionId: 's1', subject: 'Mathematics', total: 2, correct: 2 },
      { sessionId: 's1', subject: 'EE', total: 4, correct: 1 },
      { sessionId: 's2', subject: 'ESAS', total: 0, correct: 0 },
    ]);
    expect(out).toEqual({ s1: { Mathematics: 75, EE: 25 }, s2: {} });
  });

  it('only never-finalised exam sessions need a derived verdict', () => {
    expect(needsDerivedVerdict({ mode: 'BOARD_SIM', totalQuestions: 10, verdict: 'IN_PROGRESS' })).toBe(true);
    expect(needsDerivedVerdict({ mode: 'BOARD_SIM', totalQuestions: 10, verdict: 'PASSED' })).toBe(false);
    expect(needsDerivedVerdict({ mode: 'ACTIVE_REVIEW', totalQuestions: 10, verdict: 'IN_PROGRESS' })).toBe(false);
  });
});
