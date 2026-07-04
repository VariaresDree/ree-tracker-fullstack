import { describe, it, expect } from 'vitest';
const { partitionNewAttempts, aggregateTopicRollups } = require('../src/services/telemetryHelpers');

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
