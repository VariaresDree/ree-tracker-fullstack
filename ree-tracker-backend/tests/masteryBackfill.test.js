import { describe, it, expect } from 'vitest';
const { foldUserMastery, bucketOf } = require('../scripts/backfillMastery');
const { bktSequence } = require('../src/engine/bkt');
const { paramsForTopic } = require('../src/config/bktParams');

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

describe('backfillMastery — counts come from history', () => {
  const at = (isCorrect, timeSpentMs, topic = 'Calculus 1') => ({
    isCorrect, timeSpentMs, subject: 'Math', subtopic: topic,
    question: { topicId: 't-calc1', topic: { name: topic, subject: 'Mathematics' } },
  });

  it('counts attempts and correct, and sums time the way live telemetry does', () => {
    // floor(ms/1000) per attempt, and only inside the 0.5s–30min plausibility band.
    const [row] = foldUserMastery([at(true, 12_900), at(false, 400), at(true, 31 * 60_000), at(false, 2_500)]);
    expect(row).toMatchObject({ attempts: 4, correct: 2, totalTime: 12 + 2, masteryN: 4 });
  });
});

describe('backfillMastery.planUserRollups', () => {
  const { planUserRollups } = require('../scripts/backfillMastery');
  const folded = (topic, attempts, correct, totalTime, extra = {}) => ({
    topic, subject: 'EE', topicId: `t-${topic}`, pMastery: 0.5, masteryN: attempts, lastPracticedAt: null,
    attempts, correct, totalTime, ...extra,
  });
  const existing = (id, topic, attempts, correct, totalTime) => ({ id, topic, attempts, correct, totalTime });

  it('updates a row that already matches history without reporting a correction', () => {
    const plan = planUserRollups([existing('r1', 'Electric Circuits 2', 5, 3, 56)], [folded('Electric Circuits 2', 5, 3, 56)]);
    expect(plan.writes).toEqual([expect.objectContaining({ id: 'r1', topic: 'Electric Circuits 2', attempts: 5, correct: 3, totalTime: 56 })]);
    expect(plan.writes[0].countFix).toBeUndefined();
    expect(plan.orphans).toEqual([]);
  });

  it('corrects counts that drifted from history (the pre-#102 in-batch double count) and reports it', () => {
    const plan = planUserRollups([existing('r1', 'Calculus 1', 37, 18, 856)], [folded('Calculus 1', 36, 17, 815)]);
    expect(plan.writes[0]).toMatchObject({
      id: 'r1', attempts: 36, correct: 17, totalTime: 815,
      countFix: { from: { attempts: 37, correct: 18, totalTime: 856 }, to: { attempts: 36, correct: 17, totalTime: 815 } },
    });
  });

  it('creates a missing key with its REAL counts — never correct: 0', () => {
    const plan = planUserRollups([], [folded('Electric Circuits 2', 5, 3, 56)]);
    expect(plan.writes).toEqual([expect.objectContaining({ id: null, attempts: 5, correct: 3, totalTime: 56 })]);
  });

  it('lists a row whose label has no attempts any more (relabelled away) as an orphan to remove', () => {
    const plan = planUserRollups(
      [existing('r-old', 'AC Impedance', 2, 1, 11), existing('r1', 'Electric Circuits 2', 3, 2, 45)],
      [folded('Electric Circuits 2', 5, 3, 56)],
    );
    expect(plan.orphans).toEqual([{ id: 'r-old', topic: 'AC Impedance', attempts: 2, correct: 1, totalTime: 11 }]);
    expect(plan.writes.map((w) => w.topic)).toEqual(['Electric Circuits 2']);
  });
});
