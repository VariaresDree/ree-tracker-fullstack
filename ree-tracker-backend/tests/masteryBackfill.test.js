import { describe, it, expect } from 'vitest';
const { foldUserMastery, bucketOf, planUserBackfill, describePlan } = require('../scripts/backfillMastery');
const { bktSequence } = require('../src/engine/bkt');
const { paramsForTopic } = require('../src/config/bktParams');
const { TIME_MIN_MS, TIME_MAX_MS } = require('../src/config/telemetryBounds');

// Attempt fixture shape mirrors the backfill's Prisma select.
const mk = (isCorrect, { name, subject, topicId, subtopic } = {}) => ({
  isCorrect,
  subject: subject ?? 'EE',
  subtopic: subtopic ?? name ?? 'DC Electric Circuits',
  question: { topicId: topicId ?? 't-dc', topic: name ? { name, subject } : { name: subtopic ?? 'DC Electric Circuits', subject: subject ?? 'EE' } },
});

describe('backfillMastery.foldUserMastery', () => {
  it('folds per canonical topic and matches a direct bktSequence', () => {
    const attempts = [
      mk(true, { name: 'DC Electric Circuits', subject: 'EE', topicId: 't-dc' }),
      mk(false, { name: 'DC Electric Circuits', subject: 'EE', topicId: 't-dc' }),
      mk(true, { name: 'Algebra', subject: 'Mathematics', topicId: 't-alg' }),
    ];
    const rows = foldUserMastery(attempts);
    const dc = rows.find((r) => r.topic === 'DC Electric Circuits');
    const alg = rows.find((r) => r.topic === 'Algebra');

    expect(dc).toMatchObject({ subject: 'EE', topicId: 't-dc', masteryN: 2 });
    expect(dc.pMastery).toBeCloseTo(bktSequence([true, false], paramsForTopic('DC Electric Circuits')).pMastery, 12);
    expect(alg).toMatchObject({ subject: 'Mathematics', topicId: 't-alg', masteryN: 1 });
  });

  it('is deterministic and idempotent (same history → same pMastery)', () => {
    const attempts = [mk(true), mk(true), mk(false), mk(true)];
    const a = foldUserMastery(attempts);
    const b = foldUserMastery(attempts);
    expect(a).toEqual(b);
  });

  it('keeps topics isolated — one topic\'s streak does not move another', () => {
    const attempts = [
      mk(true, { name: 'Algebra', subject: 'Mathematics', topicId: 't-alg' }),
      mk(true, { name: 'DC Electric Circuits', subject: 'EE', topicId: 't-dc' }),
      mk(true, { name: 'Algebra', subject: 'Mathematics', topicId: 't-alg' }),
    ];
    const rows = foldUserMastery(attempts);
    const alg = rows.find((r) => r.topic === 'Algebra');
    const dc = rows.find((r) => r.topic === 'DC Electric Circuits');
    expect(alg.masteryN).toBe(2);
    expect(dc.masteryN).toBe(1);
    expect(alg.pMastery).toBeGreaterThan(dc.pMastery); // 2 corrects vs 1
  });

  it('COALESCEs to the stored subtopic when the question has no Topic', () => {
    const attempts = [{ isCorrect: true, subject: 'ESAS', subtopic: 'Legacy Label', question: { topicId: null, topic: null } }];
    const rows = foldUserMastery(attempts);
    expect(rows[0]).toMatchObject({ topic: 'Legacy Label', subject: 'ESAS', topicId: null });
  });
});

describe('backfillMastery.bucketOf', () => {
  it('bands P(mastery) into the heatmap tiers', () => {
    expect(bucketOf(0.9)).toBe('mastered');
    expect(bucketOf(0.7)).toBe('proficient');
    expect(bucketOf(0.5)).toBe('developing');
    expect(bucketOf(0.2)).toBe('novice');
  });
});

describe('backfillMastery — last practised', () => {
  it('records the latest answer per topic, preferring answeredAt over createdAt', () => {
    const rows = foldUserMastery([
      { isCorrect: true, subject: 'EE', subtopic: 'Machines', answeredAt: new Date('2026-09-01T00:00:00Z'), createdAt: new Date('2026-09-03T00:00:00Z'), question: null },
      { isCorrect: false, subject: 'EE', subtopic: 'Machines', answeredAt: null, createdAt: new Date('2026-09-02T00:00:00Z'), question: null },
    ]);
    expect(rows[0].lastPracticedAt).toEqual(new Date('2026-09-02T00:00:00Z'));
  });
});

describe('backfillMastery — counts from history', () => {
  // The same plausibility band and per-attempt floor as live telemetry
  // (aggregateTopicRollups) and migrate:taxonomy's rebuild query.
  it('tallies attempts, correct and plausible floored seconds per topic', () => {
    const timed = (isCorrect, timeSpentMs) => ({ ...mk(isCorrect), timeSpentMs });
    const rows = foldUserMastery([
      timed(true, 12_999),          // 12 s (floored per attempt, not summed then floored)
      timed(false, 12_999),         // 12 s
      timed(true, TIME_MIN_MS - 1), // implausibly fast: 0 s
      timed(true, TIME_MAX_MS),     // upper bound inclusive: 1800 s
      timed(false, TIME_MAX_MS + 1),// implausibly slow: 0 s
      { ...mk(true) },              // no time recorded: 0 s
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ attempts: 6, correct: 4, totalTime: 12 + 12 + 1800 });
  });

  it('counts relabelled history under the topic it now folds into (prod, 2026-10-03)', () => {
    // 3 answers on "Electric Circuits 2" questions, plus 2 recorded as "AC
    // Impedance" before link:topics relabelled those questions.
    const ec2 = { topicId: 't-ec2', subtopic: 'Electric Circuits 2', topic: { name: 'Electric Circuits 2', subject: 'EE' } };
    const at = (isCorrect, subtopic, timeSpentMs) => ({ isCorrect, subject: 'EE', subtopic, timeSpentMs, question: ec2 });
    const rows = foldUserMastery([
      at(true, 'AC Impedance', 6_000),
      at(false, 'AC Impedance', 5_500),
      at(true, 'Electric Circuits 2', 20_000),
      at(true, 'Electric Circuits 2', 15_000),
      at(false, 'Electric Circuits 2', 10_000),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ topic: 'Electric Circuits 2', attempts: 5, correct: 3, totalTime: 56, masteryN: 5 });
  });
});

describe('backfillMastery.planUserBackfill', () => {
  // `recordedAs` is QuestionAttempt.subtopic: the label telemetry keyed the
  // answer's UserTopicPerformance row by when it was answered.
  const question = (name, topicId) => ({ topicId, subtopic: name, topic: { name, subject: 'EE' } });
  const EC2 = question('Electric Circuits 2', 't-ec2');
  const MACH = question('Machines', 't-mach');
  const att = (isCorrect, q, recordedAs, timeSpentMs = 0) => ({ isCorrect, subject: 'EE', subtopic: recordedAs, timeSpentMs, question: q });
  const utp = (id, topic, attempts, correct, totalTime, topicId = null) => ({ id, topic, subject: 'EE', topicId, attempts, correct, totalTime });

  // The 2026-10-03 production state for user znXRdW…: link:topics relabelled
  // the "AC Impedance" questions to "Electric Circuits 2".
  const prodHistory = [
    att(true, EC2, 'AC Impedance', 6_000),
    att(false, EC2, 'AC Impedance', 5_500),
    att(true, EC2, 'Electric Circuits 2', 20_000),
    att(true, EC2, 'Electric Circuits 2', 15_000),
    att(false, EC2, 'Electric Circuits 2', 10_000),
  ];

  it('creates a missing row with the counts history implies, never correct: 0', () => {
    const plan = planUserBackfill([], prodHistory);
    expect(plan.creates).toHaveLength(1);
    expect(plan.creates[0]).toMatchObject({ topic: 'Electric Circuits 2', topicId: 't-ec2', attempts: 5, correct: 3, totalTime: 56, masteryN: 5 });
    expect(plan.updates).toEqual([]);
  });

  it('leaves telemetry-owned counts alone when they already match history', () => {
    const plan = planUserBackfill([utp('u1', 'Electric Circuits 2', 5, 3, 56, 't-ec2')], prodHistory);
    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0].correction).toBeNull();
    expect(Object.keys(plan.updates[0].data).sort()).toEqual(['lastPracticedAt', 'masteryN', 'pMastery', 'topicId']);
  });

  it('corrects counts the fold proves differ from history, and records from → to', () => {
    const plan = planUserBackfill([utp('u1', 'Electric Circuits 2', 3, 2, 45, 't-ec2')], prodHistory);
    expect(plan.updates[0].correction).toEqual({
      from: { attempts: 3, correct: 2, totalTime: 45 },
      to: { attempts: 5, correct: 3, totalTime: 56 },
    });
    expect(plan.updates[0].data).toMatchObject({ attempts: 5, correct: 3, totalTime: 56, masteryN: 5 });
  });

  it('merges a superseded label into the topic its history now folds under (prod repro)', () => {
    const plan = planUserBackfill([
      utp('35055193', 'Electric Circuits 2', 3, 2, 45, 't-ec2'),
      utp('b26d033a', 'AC Impedance', 2, 1, 11),
    ], prodHistory);
    expect(plan.superseded).toEqual([{
      id: 'b26d033a', topic: 'AC Impedance',
      counts: { attempts: 2, correct: 1, totalTime: 11 },
      into: ['Electric Circuits 2'],
    }]);
    expect(plan.updates[0].correction.to).toEqual({ attempts: 5, correct: 3, totalTime: 56 });
    expect(plan.unproven).toEqual([]);
  });

  it('names every topic a split label now folds into', () => {
    const plan = planUserBackfill([utp('old', 'Legacy Mix', 2, 2, 0)], [
      att(true, EC2, 'Legacy Mix'),
      att(true, MACH, 'Legacy Mix'),
    ]);
    expect(plan.superseded[0].into).toEqual(['Electric Circuits 2', 'Machines']);
  });

  it('leaves an orphan alone when no answer was ever recorded under its label', () => {
    // e.g. the questions behind it were deleted (attempts cascade) — nothing
    // proves where its tally went.
    const plan = planUserBackfill([utp('gone', 'Deleted Topic', 4, 2, 30)], prodHistory);
    expect(plan.superseded).toEqual([]);
    expect(plan.unproven).toEqual([{ id: 'gone', topic: 'Deleted Topic', counts: { attempts: 4, correct: 2, totalTime: 30 }, reason: 'no-history' }]);
  });

  it('leaves an orphan alone when it counts more than history recorded under its label', () => {
    const plan = planUserBackfill([utp('b26d033a', 'AC Impedance', 3, 1, 11)], prodHistory);
    expect(plan.superseded).toEqual([]);
    expect(plan.unproven[0]).toMatchObject({ id: 'b26d033a', reason: 'uncovered' });
  });

  it('never treats a key the fold still produces as superseded', () => {
    const plan = planUserBackfill([utp('u1', 'Electric Circuits 2', 5, 3, 56, 't-ec2')], prodHistory);
    expect(plan.superseded).toEqual([]);
    expect(plan.unproven).toEqual([]);
  });

  it('logs one line per correction, superseded row and unproven row', () => {
    const plan = planUserBackfill([
      utp('35055193', 'Electric Circuits 2', 3, 2, 45, 't-ec2'),
      utp('b26d033a', 'AC Impedance', 2, 1, 11),
      utp('gone', 'Deleted Topic', 4, 2, 30),
      utp('m1', 'Machines', 1, 1, 0, 't-mach'), // matches history: no line
    ], [...prodHistory, att(true, MACH, 'Machines')]);
    const lines = describePlan('znXRdW', plan);
    expect(lines).toEqual([
      'user znXRdW "Electric Circuits 2": counts 3/2/45s -> 5/3/56s (history)',
      'user znXRdW "AC Impedance" (2/1/11s): superseded by "Electric Circuits 2" -> delete',
      'user znXRdW "Deleted Topic" (4/2/30s): not in the fold, left as is (no-history: no answer was recorded under this label)',
    ]);
  });

  it('says what history holds when an orphan is uncovered', () => {
    const plan = planUserBackfill([utp('b26d033a', 'AC Impedance', 3, 1, 11)], prodHistory);
    expect(describePlan('u', plan)).toContain(
      'user u "AC Impedance" (3/1/11s): not in the fold, left as is (uncovered: history recorded only 2/1/11s under this label)',
    );
  });
});
