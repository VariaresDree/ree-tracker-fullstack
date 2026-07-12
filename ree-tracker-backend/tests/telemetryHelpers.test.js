import { describe, it, expect } from 'vitest';
const { partitionNewAttempts, aggregateTopicRollups, orderedObservationsByTopic, mapAttemptRows, groupPairsBySubject } = require('../src/services/telemetryHelpers');

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
});
