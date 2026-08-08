import { describe, it, expect } from 'vitest';
const { partitionNewAttempts, aggregateTopicRollups, orderedObservationsByTopic, mapAttemptRows, groupPairsBySubject, clampAnsweredAt, MAX_BACKDATE_MS, MAX_CLOCK_SKEW_MS } = require('../src/services/telemetryHelpers');
const { trimBucketsTo } = require('../src/services/telemetryService');

describe('partitionNewAttempts', () => {
  it('treats all rows as new when none are already recorded', () => {
    const mapped = [{ clientAttemptId: 'a' }, { clientAttemptId: 'b' }];
    const { newOnly, duplicates } = partitionNewAttempts(new Set(), mapped);
    expect(newOnly).toHaveLength(2);
    expect(duplicates).toHaveLength(0);
  });

  it('routes already-recorded clientAttemptIds to duplicates (the replay-dedupe path)', () => {
    const mapped = [{ clientAttemptId: 'a' }, { clientAttemptId: 'b' }, { clientAttemptId: 'c' }];
    const { newOnly, duplicates } = partitionNewAttempts(new Set(['a', 'c']), mapped);
    expect(newOnly.map((m) => m.clientAttemptId)).toEqual(['b']);
    expect(duplicates.map((m) => m.clientAttemptId)).toEqual(['a', 'c']);
  });

  it('an all-duplicate batch yields zero new rows (so nothing re-increments)', () => {
    const mapped = [{ clientAttemptId: 'a' }, { clientAttemptId: 'b' }];
    const { newOnly } = partitionNewAttempts(new Set(['a', 'b']), mapped);
    expect(newOnly).toHaveLength(0);
  });

  it('attempts WITHOUT a clientAttemptId are always new (legacy client safety)', () => {
    const mapped = [{ clientAttemptId: null }, {}];
    const { newOnly } = partitionNewAttempts(new Set(['x']), mapped);
    expect(newOnly).toHaveLength(2);
  });
});

describe('aggregateTopicRollups', () => {
  it('sums attempts/correct per subtopic and clamps time to plausibility bounds', () => {
    const rolls = aggregateTopicRollups([
      { subject: 'EE', subtopic: 'AC Circuits', isCorrect: true, timeSpentMs: 10000 },
      { subject: 'EE', subtopic: 'AC Circuits', isCorrect: false, timeSpentMs: 0 },       // excluded from time
      { subject: 'Mathematics', subtopic: 'Algebra', isCorrect: true, timeSpentMs: 5000 },
    ]);
    const byTopic = Object.fromEntries(rolls.map((r) => [r.topic, r]));
    expect(byTopic['AC Circuits']).toMatchObject({ subject: 'EE', attempts: 2, correct: 1, totalTimeSecs: 10 });
    expect(byTopic['Algebra']).toMatchObject({ subject: 'Mathematics', attempts: 1, correct: 1, totalTimeSecs: 5 });
  });

  it('excludes inflated times (>30min) from the seconds total but still counts the attempt', () => {
    const [roll] = aggregateTopicRollups([
      { subject: 'EE', subtopic: 'Power', isCorrect: true, timeSpentMs: 2_000_000 },
    ]);
    expect(roll.attempts).toBe(1);
    expect(roll.totalTimeSecs).toBe(0);
  });

  it('defaults a missing subtopic to General', () => {
    const [roll] = aggregateTopicRollups([{ subject: 'EE', isCorrect: true, timeSpentMs: 3000 }]);
    expect(roll.topic).toBe('General');
  });
});

describe('orderedObservationsByTopic (BKT fold input)', () => {
  it('groups by topic and PRESERVES attempt order within each topic', () => {
    const byTopic = orderedObservationsByTopic([
      { subject: 'EE', subtopic: 'AC Circuits', isCorrect: true },
      { subject: 'Mathematics', subtopic: 'Algebra', isCorrect: false },
      { subject: 'EE', subtopic: 'AC Circuits', isCorrect: false },
      { subject: 'EE', subtopic: 'AC Circuits', isCorrect: true },
    ]);
    expect(byTopic.get('AC Circuits')).toMatchObject({ subject: 'EE', observations: [true, false, true] });
    expect(byTopic.get('Algebra')).toMatchObject({ subject: 'Mathematics', observations: [false] });
  });

  it('defaults a missing subtopic to General and coerces truthiness to boolean', () => {
    const byTopic = orderedObservationsByTopic([{ subject: 'EE', isCorrect: 1 }]);
    expect(byTopic.get('General').observations).toEqual([true]);
  });
});

// SEC-2 (leaderboard integrity): the ranked theta estimator must derive
// exclusively from server-verifiable evidence. mapAttemptRows stamps
// `_serverGraded`, and telemetryService feeds only those rows to the estimator.
describe('mapAttemptRows — grading provenance (SEC-2 trust boundary)', () => {
  const qMap = {
    q1: { id: 'q1', subject: 'EE', subtopic: 'Circuits', answer: 'B', difficulty: 1, irtA: 1, irtB: 0, irtC: 0.2 },
    q2: { id: 'q2', subject: 'EE', subtopic: 'Machines', answer: 'C', difficulty: 1, irtA: 1, irtB: 0, irtC: 0.2 },
  };
  const ctx = { userId: 'u1', sessionId: null, mode: 'BOARD_SIM' };

  it('server-grades an answered item against the master key and marks it _serverGraded', () => {
    const { mapped } = mapAttemptRows([{ questionId: 'q1', userAnswer: 'B' }], qMap, ctx);
    expect(mapped[0].isCorrect).toBe(true);
    expect(mapped[0]._serverGraded).toBe(true);
  });

  it('never trusts a client isCorrect over the master key', () => {
    const { mapped } = mapAttemptRows([{ questionId: 'q1', userAnswer: 'A', isCorrect: true }], qMap, ctx);
    expect(mapped[0].isCorrect).toBe(false);
    expect(mapped[0]._serverGraded).toBe(true);
  });

  it('marks a self-graded attempt (no userAnswer) as NOT server-graded', () => {
    const { mapped } = mapAttemptRows([{ questionId: 'q1', isCorrect: true }], qMap, ctx);
    // Still recorded for the user's own mastery/matrix surfaces…
    expect(mapped[0].isCorrect).toBe(true);
    // …but flagged so the theta estimator excludes it.
    expect(mapped[0]._serverGraded).toBe(false);
  });

  it('excludes forged self-graded rows from the estimator input once gated', () => {
    const { mapped } = mapAttemptRows([
      { questionId: 'q1', userAnswer: 'B' },   // real correct   → counts toward theta
      { questionId: 'q2', isCorrect: true },   // forged correct → excluded from theta
    ], qMap, ctx);

    const gradedForTheta = mapped.filter((m) => m._serverGraded);
    const bySubject = groupPairsBySubject(gradedForTheta);

    expect(bySubject.EE).toHaveLength(1);
    expect(bySubject.EE[0].correct).toBe(true);
  });

  it('carries the clamped answeredAt onto every mapped row (offline-dating fix)', () => {
    const now = new Date('2026-08-08T12:00:00Z');
    const answeredYesterday = new Date('2026-08-07T20:00:00Z').toISOString();
    const { mapped } = mapAttemptRows(
      [{ questionId: 'q1', isCorrect: true, createdAt: answeredYesterday }],
      qMap,
      { ...ctx, now },
    );
    expect(mapped[0].answeredAt.toISOString()).toBe(new Date(answeredYesterday).toISOString());
  });
});

describe('clampAnsweredAt — offline attempt dating stays trustworthy', () => {
  const now = new Date('2026-08-08T12:00:00Z');

  it('accepts a plausible recent-past timestamp unchanged', () => {
    const raw = new Date('2026-08-08T09:00:00Z').toISOString();
    expect(clampAnsweredAt(raw, now).toISOString()).toBe(new Date(raw).toISOString());
  });

  it('falls back to now for a missing timestamp', () => {
    expect(clampAnsweredAt(null, now)).toBe(now);
    expect(clampAnsweredAt(undefined, now)).toBe(now);
  });

  it('falls back to now for an unparseable value', () => {
    expect(clampAnsweredAt('not-a-date', now).getTime()).toBe(now.getTime());
  });

  it('falls back to now for a timestamp beyond the backdate window (untrusted clock)', () => {
    const tooOld = new Date(now.getTime() - MAX_BACKDATE_MS - 1000).toISOString();
    expect(clampAnsweredAt(tooOld, now).getTime()).toBe(now.getTime());
  });

  it('accepts a timestamp right at the backdate boundary', () => {
    const atBoundary = new Date(now.getTime() - MAX_BACKDATE_MS + 1000).toISOString();
    expect(clampAnsweredAt(atBoundary, now).getTime()).toBe(new Date(atBoundary).getTime());
  });

  it('falls back to now for a timestamp too far in the future', () => {
    const future = new Date(now.getTime() + MAX_CLOCK_SKEW_MS + 1000).toISOString();
    expect(clampAnsweredAt(future, now).getTime()).toBe(now.getTime());
  });

  it('tolerates small forward clock skew', () => {
    const slightlyAhead = new Date(now.getTime() + MAX_CLOCK_SKEW_MS - 1000).toISOString();
    expect(clampAnsweredAt(slightlyAhead, now).getTime()).toBe(new Date(slightlyAhead).getTime());
  });
});

describe('trimBucketsTo — keeps ActivityLog honest when createMany inserts fewer rows than intended', () => {
  it('is a no-op when the buckets already sum to the target', () => {
    const buckets = new Map([['2026-08-07', 2], ['2026-08-08', 3]]);
    trimBucketsTo(buckets, 5);
    expect([...buckets.values()].reduce((a, b) => a + b, 0)).toBe(5);
  });

  it('trims the most recent day(s) first when fewer rows landed than intended', () => {
    const buckets = new Map([['2026-08-06', 2], ['2026-08-07', 2], ['2026-08-08', 2]]);
    trimBucketsTo(buckets, 4); // 2 fewer landed than the intended 6
    expect(buckets.get('2026-08-08')).toBe(0);
    expect(buckets.get('2026-08-07')).toBe(2);
    expect(buckets.get('2026-08-06')).toBe(2);
    expect([...buckets.values()].reduce((a, b) => a + b, 0)).toBe(4);
  });

  it('spills trimming into an earlier day once the most recent day is exhausted', () => {
    const buckets = new Map([['2026-08-07', 1], ['2026-08-08', 1]]);
    trimBucketsTo(buckets, 0); // both rows lost the createMany race
    expect(buckets.get('2026-08-08')).toBe(0);
    expect(buckets.get('2026-08-07')).toBe(0);
  });
});
