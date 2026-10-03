import { describe, it, expect } from 'vitest';
const { foldUserMastery, bucketOf } = require('../scripts/backfillMastery');
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

  it('keeps both band edges inclusive, as the live rule and migrate:taxonomy do', () => {
    const [row] = foldUserMastery([at(true, TIME_MAX_MS), at(true, TIME_MAX_MS + 1), at(true, TIME_MIN_MS + 999)]);
    expect(row.totalTime).toBe(TIME_MAX_MS / 1000 + 1);
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

  // Orphans: only history can prove where a row's tally went. `recordedAs` is
  // QuestionAttempt.subtopic — the label telemetry keyed the answer's row by.
  const question = (name, topicId) => ({ topicId, topic: { name, subject: 'EE' } });
  const EC2 = question('Electric Circuits 2', 't-ec2');
  const MACH = question('Machines', 't-mach');
  const answered = (isCorrect, q, recordedAs, timeSpentMs = 0) => ({ isCorrect, subject: 'EE', subtopic: recordedAs, timeSpentMs, question: q });
  // The 2026-10-03 relabel: 2 answers recorded as "AC Impedance", whose
  // questions link:topics moved to "Electric Circuits 2", plus 3 recorded there.
  const relabelled = [
    answered(true, EC2, 'AC Impedance', 6_000),
    answered(false, EC2, 'AC Impedance', 5_500),
    answered(true, EC2, 'Electric Circuits 2', 20_000),
    answered(true, EC2, 'Electric Circuits 2', 15_000),
    answered(false, EC2, 'Electric Circuits 2', 10_000),
  ];
  const plan = (rows, attempts) => planUserRollups(rows, foldUserMastery(attempts), attempts);

  it('removes a row whose label was relabelled away, naming where its answers count now', () => {
    const p = plan([existing('r-old', 'AC Impedance', 2, 1, 11), existing('r1', 'Electric Circuits 2', 3, 2, 45)], relabelled);
    expect(p.orphans).toEqual([{ id: 'r-old', topic: 'AC Impedance', attempts: 2, correct: 1, totalTime: 11, into: ['Electric Circuits 2'] }]);
    expect(p.unproven).toEqual([]);
    expect(p.writes).toEqual([expect.objectContaining({ id: 'r1', attempts: 5, correct: 3, totalTime: 56 })]);
  });

  it('names every topic a split label now counts under', () => {
    const p = plan([existing('r-old', 'Legacy Mix', 2, 2, 0)], [answered(true, EC2, 'Legacy Mix'), answered(true, MACH, 'Legacy Mix')]);
    expect(p.orphans[0].into).toEqual(['Electric Circuits 2', 'Machines']);
  });

  it('keeps a row no answer in history was recorded under (e.g. its questions were deleted)', () => {
    const p = plan([existing('r-gone', 'Deleted Topic', 4, 2, 30)], relabelled);
    expect(p.orphans).toEqual([]);
    expect(p.unproven).toEqual([{ id: 'r-gone', topic: 'Deleted Topic', attempts: 4, correct: 2, totalTime: 30, reason: 'no-history' }]);
  });

  it('keeps a row that counts more than history recorded under its label', () => {
    const p = plan([existing('r-old', 'AC Impedance', 3, 1, 11)], relabelled);
    expect(p.orphans).toEqual([]);
    expect(p.unproven).toEqual([{
      id: 'r-old', topic: 'AC Impedance', attempts: 3, correct: 1, totalTime: 11,
      reason: 'uncovered', history: { attempts: 2, correct: 1, totalTime: 11 },
    }]);
  });

  it('removes nothing when no history is supplied', () => {
    const p = planUserRollups([existing('r-old', 'AC Impedance', 2, 1, 11)], []);
    expect(p.orphans).toEqual([]);
    expect(p.unproven.map((u) => u.reason)).toEqual(['no-history']);
  });
});
