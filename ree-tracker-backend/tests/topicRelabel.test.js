import { describe, it, expect } from 'vitest';
const { planRollupRenames, planRollupMerge } = require('../src/services/topicRelabel');

// A TOS respelling: same Topic row (same normKey), new Topic.name.
const RENAME = { topicId: 't-ec2', from: 'electric circuits 2', to: 'Electric Circuits 2' };
const row = (id, userId, topic, attempts = 1, correct = 0, totalTime = 0) => ({ id, userId, topic, attempts, correct, totalTime });

describe('planRollupRenames — which stored rows a rename moves, and how', () => {
  it('renames a learner\'s old-spelling row in place when they have no row under the new spelling', () => {
    const plan = planRollupRenames([RENAME], [row('r1', 'u1', 'electric circuits 2')]);
    expect(plan.inPlace).toEqual([{ id: 'r1', userId: 'u1', from: 'electric circuits 2', to: 'Electric Circuits 2' }]);
    expect(plan.merges).toEqual([]);
  });

  it('merges instead when the learner already has a row under the new spelling (the key is unique per user)', () => {
    const plan = planRollupRenames([RENAME], [
      row('r-old', 'u1', 'electric circuits 2'),
      row('r-new', 'u1', 'Electric Circuits 2'),
    ]);
    expect(plan.inPlace).toEqual([]);
    expect(plan.merges).toEqual([{ userId: 'u1', labels: ['electric circuits 2', 'Electric Circuits 2'] }]);
  });

  it('decides per learner', () => {
    const plan = planRollupRenames([RENAME], [
      row('a-old', 'u-a', 'electric circuits 2'),
      row('b-old', 'u-b', 'electric circuits 2'),
      row('b-new', 'u-b', 'Electric Circuits 2'),
      row('c-new', 'u-c', 'Electric Circuits 2'), // already right: nothing to do
    ]);
    expect(plan.inPlace.map((r) => r.id)).toEqual(['a-old']);
    expect(plan.merges.map((m) => m.userId)).toEqual(['u-b']);
  });

  it('keeps each rename separate for one learner — a merge on one topic does not rebuild another', () => {
    const other = { topicId: 't-mach', from: 'dc machines', to: 'DC Machines' };
    const plan = planRollupRenames([RENAME, other], [
      row('r-old', 'u1', 'electric circuits 2'),
      row('r-new', 'u1', 'Electric Circuits 2'),
      row('m-old', 'u1', 'dc machines'),
    ]);
    expect(plan.inPlace).toEqual([{ id: 'm-old', userId: 'u1', from: 'dc machines', to: 'DC Machines' }]);
    expect(plan.merges).toEqual([{ userId: 'u1', labels: ['electric circuits 2', 'Electric Circuits 2'] }]);
  });

  it('ignores rows under labels no rename touches', () => {
    const plan = planRollupRenames([RENAME], [row('x', 'u1', 'Electric Circuits 1')]);
    expect(plan).toEqual({ inPlace: [], merges: [] });
  });
});

// History as the merge reads it, AFTER the Topic row is renamed inside the same
// transaction: the question's topic already carries the new spelling, while
// QuestionAttempt.subtopic keeps the label each answer was recorded under.
const EC2 = { topicId: 't-ec2', topic: { name: 'Electric Circuits 2', subject: 'EE' } };
const MACH = { topicId: 't-mach', topic: { name: 'Machines', subject: 'EE' } };
const answered = (isCorrect, q, recordedAs, timeSpentMs = 10_000) => ({ isCorrect, subject: 'EE', subtopic: recordedAs, timeSpentMs, question: q });
const LABELS = ['electric circuits 2', 'Electric Circuits 2'];

// 3 answers recorded under the new spelling (before an earlier respelling),
// 2 under the old one (telemetry since then).
const history = [
  answered(true, EC2, 'Electric Circuits 2'),
  answered(true, EC2, 'Electric Circuits 2'),
  answered(false, EC2, 'Electric Circuits 2'),
  answered(true, EC2, 'electric circuits 2'),
  answered(false, EC2, 'electric circuits 2'),
];

describe('planRollupMerge — counts come from attempt history', () => {
  it('rebuilds the new-spelling row from history and removes the old row history proves it covers', () => {
    const plan = planRollupMerge(
      [row('r-new', 'u1', 'Electric Circuits 2', 3, 2, 30), row('r-old', 'u1', 'electric circuits 2', 2, 1, 20)],
      history, LABELS,
    );
    expect(plan.writes).toEqual([expect.objectContaining({ id: 'r-new', topic: 'Electric Circuits 2', attempts: 5, correct: 3, totalTime: 50, masteryN: 5 })]);
    expect(plan.orphans).toEqual([{ id: 'r-old', topic: 'electric circuits 2', attempts: 2, correct: 1, totalTime: 20, into: ['Electric Circuits 2'] }]);
    expect(plan.unproven).toEqual([]);
  });

  // The split PR #120's backfill and live telemetry kept re-creating: backfill
  // had already folded ALL five answers into the new spelling, and telemetry
  // re-created the old row with the latest two. Adding the rows would count
  // those two twice.
  it('does not double count when the new-spelling row already holds the old row\'s answers', () => {
    const plan = planRollupMerge(
      [row('r-new', 'u1', 'Electric Circuits 2', 5, 3, 50), row('r-old', 'u1', 'electric circuits 2', 2, 1, 20)],
      history, LABELS,
    );
    expect(plan.writes).toEqual([expect.objectContaining({ id: 'r-new', attempts: 5, correct: 3, totalTime: 50 })]);
    expect(plan.writes[0].countFix).toBeUndefined();
    expect(plan.orphans.map((o) => o.id)).toEqual(['r-old']);
  });

  it('keeps the old row when it counts more than history recorded under its label', () => {
    const plan = planRollupMerge(
      [row('r-new', 'u1', 'Electric Circuits 2', 3, 2, 30), row('r-old', 'u1', 'electric circuits 2', 4, 1, 20)],
      history, LABELS,
    );
    expect(plan.orphans).toEqual([]);
    expect(plan.unproven).toEqual([expect.objectContaining({ id: 'r-old', reason: 'uncovered' })]);
    expect(plan.writes.map((w) => w.topic)).toEqual(['Electric Circuits 2']);
  });

  it('touches only the renamed labels, even when the learner\'s other rows have drifted', () => {
    const plan = planRollupMerge(
      [row('r-new', 'u1', 'Electric Circuits 2', 3, 2, 30), row('r-old', 'u1', 'electric circuits 2', 2, 1, 20), row('r-mach', 'u1', 'Machines', 9, 9, 99)],
      [...history, answered(true, MACH, 'Machines')],
      LABELS,
    );
    expect(plan.writes.map((w) => w.topic)).toEqual(['Electric Circuits 2']);
    expect([...plan.orphans, ...plan.unproven].map((r) => r.id)).toEqual(['r-old']);
  });
});
