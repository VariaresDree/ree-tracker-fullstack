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
