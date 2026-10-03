import { describe, it, expect } from 'vitest';
const { planSeed, planQuestionBackfill, mergeRollupRows } = require('../scripts/migrateTaxonomy');
const { normKey, buildResolverIndex } = require('../src/services/topicResolver');
const { PRC_TAXONOMY } = require('../src/config/prcTaxonomy');

describe('migrateTaxonomy.planSeed', () => {
  it('creates the full PRC taxonomy on an empty table (49 topics)', () => {
    const { creates, updates } = planSeed([], PRC_TAXONOMY);
    expect(creates).toHaveLength(10 + 11 + 28);
    expect(updates).toHaveLength(0);
    const dc = creates.find((c) => c.name === 'DC Electric Circuits');
    expect(dc).toMatchObject({ subject: 'EE', normKey: 'dc electric circuits', curated: true, active: true });
    expect(dc.aliases).toContain('Electric Circuits 1');
  });

  it('is idempotent: a seeded table produces only updates that keep row ids and union aliases', () => {
    const first = planSeed([], PRC_TAXONOMY);
    const existing = first.creates.map((c, i) => ({ ...c, id: `row-${i}`, aliases: [...c.aliases, 'Admin Added Alias'] }));
    const second = planSeed(existing, PRC_TAXONOMY);
    expect(second.creates).toHaveLength(0);
    expect(second.updates).toHaveLength(existing.length);
    // alias union: the admin-added alias survives, seed aliases are still there
    const dc = second.updates.find((u) => u.data.name === 'DC Electric Circuits');
    expect(dc.id).toMatch(/^row-/);
    expect(dc.data.aliases).toEqual(expect.arrayContaining(['Electric Circuits 1', 'Admin Added Alias']));
  });
});

describe('migrateTaxonomy.planQuestionBackfill', () => {
  const seeded = planSeed([], PRC_TAXONOMY).creates.map((c, i) => ({ ...c, id: `t-${i}` }));
  const index = buildResolverIndex(seeded);

  it('maps legacy labels through aliases and flags the rename', () => {
    const { mapped, unmatched } = planQuestionBackfill(index, [
      { subject: 'EE', subtopic: 'Electric Circuits 1', count: 40 },
    ]);
    expect(unmatched).toHaveLength(0);
    expect(mapped[0]).toMatchObject({ toName: 'DC Electric Circuits', renamed: true, count: 40 });
    expect(mapped[0].topicId).toMatch(/^t-/);
  });

  it('maps canonical labels to themselves without a rename (idempotent re-run)', () => {
    const { mapped } = planQuestionBackfill(index, [
      { subject: 'EE', subtopic: 'DC Electric Circuits', count: 40 },
    ]);
    expect(mapped[0]).toMatchObject({ toName: 'DC Electric Circuits', renamed: false });
  });

  it('handles raw subject spellings (Math → Mathematics bucket)', () => {
    const { mapped, unmatched } = planQuestionBackfill(index, [
      { subject: 'Math', subtopic: 'Calculus 1', count: 7 },
    ]);
    expect(unmatched).toHaveLength(0);
    expect(mapped[0].toName).toBe('Differential Calculus');
  });

  it('leaves labels with no PRC home unmatched (auto-create path)', () => {
    const { mapped, unmatched } = planQuestionBackfill(index, [
      { subject: 'ESAS', subtopic: 'Environmental Science & Engineering', count: 12 },
    ]);
    expect(mapped).toHaveLength(0);
    expect(unmatched[0]).toMatchObject({ subtopic: 'Environmental Science & Engineering', count: 12 });
  });

  it('resolves an unmatched label after its uncurated topic is added to the index', () => {
    const withAuto = buildResolverIndex([
      ...seeded,
      { id: 'auto-1', subject: 'ESAS', name: 'Environmental Science & Engineering', normKey: normKey('Environmental Science & Engineering'), aliases: [], active: true, curated: false },
    ]);
    const { mapped, unmatched } = planQuestionBackfill(withAuto, [
      { subject: 'ESAS', subtopic: 'Environmental Science & Engineering', count: 12 },
    ]);
    expect(unmatched).toHaveLength(0);
    expect(mapped[0]).toMatchObject({ topicId: 'auto-1', renamed: false });
  });
});

describe('migrateTaxonomy.mergeRollupRows', () => {
  it('merges duplicate (userId, topic) keys, preferring the topic-mapped row', () => {
    const rows = [
      { userId: 'u1', topic: 'Trigonometry', topicId: null, subject: 'Math', attempts: 3, correct: 1, totalTimeSecs: 30 },
      { userId: 'u1', topic: 'Trigonometry', topicId: 't-9', subject: 'Mathematics', attempts: 5, correct: 4, totalTimeSecs: 50 },
      { userId: 'u2', topic: 'Trigonometry', topicId: 't-9', subject: 'Mathematics', attempts: 1, correct: 1, totalTimeSecs: 10 },
    ];
    const merged = mergeRollupRows(rows);
    expect(merged).toHaveLength(2);
    const u1 = merged.find((r) => r.userId === 'u1');
    expect(u1).toMatchObject({ topicId: 't-9', subject: 'Mathematics', attempts: 8, correct: 5, totalTime: 80 });
  });

  it('handles bigint-ish totalTimeSecs values from the raw query', () => {
    const merged = mergeRollupRows([
      { userId: 'u1', topic: 'Algebra', topicId: 't-1', subject: 'Mathematics', attempts: 2, correct: 2, totalTimeSecs: 120n },
    ]);
    expect(merged[0].totalTime).toBe(120);
  });
});

describe('migrateTaxonomy.checkSeedGuard — refuses to seed over a TOS-editor taxonomy', () => {
  const { checkSeedGuard } = require('../scripts/migrateTaxonomy');
  const row = (subject, name, extra = {}) => ({ id: `${subject}:${name}`, subject, name, normKey: normKey(name), aliases: [], active: true, curated: true, ...extra });

  it('allows seeding an empty table', () => {
    expect(checkSeedGuard([], { taxonomy: PRC_TAXONOMY })).toEqual({ refuse: false, foreign: [] });
  });

  it('allows an idempotent re-run over its own seed (PRC names + its uncurated auto-creates)', () => {
    const seeded = planSeed([], PRC_TAXONOMY).creates.map((c, i) => ({ ...c, id: `t-${i}` }));
    const existing = [...seeded, row('ESAS', 'Environmental Science & Engineering', { curated: false })];
    expect(checkSeedGuard(existing, { taxonomy: PRC_TAXONOMY }).refuse).toBe(false);
  });

  it('refuses when the table holds curated topics prcTaxonomy does not define (production, 2026-10-03)', () => {
    const existing = [
      row('EE', 'Electrical Transient Analysis'),
      row('EE', 'Power System Protection', { active: false }),
      row('Mathematics', 'Algebra'), // a PRC name — not foreign
    ];
    const { refuse, foreign } = checkSeedGuard(existing, { taxonomy: PRC_TAXONOMY });
    expect(refuse).toBe(true);
    expect(foreign.map((t) => t.name)).toEqual(['Electrical Transient Analysis', 'Power System Protection']);
  });

  it('treats a curated topic named like a PRC alias as foreign — seeding would create a parallel topic', () => {
    // 'Electric Circuits 1' is only an alias of 'DC Electric Circuits' in
    // prcTaxonomy; seeding would add 'DC Electric Circuits' beside it.
    const { refuse, foreign } = checkSeedGuard([row('EE', 'Electric Circuits 1')], { taxonomy: PRC_TAXONOMY });
    expect(refuse).toBe(true);
    expect(foreign).toHaveLength(1);
  });

  it('matches PRC names through stored subject spellings', () => {
    expect(checkSeedGuard([row('Math', 'Algebra')], { taxonomy: PRC_TAXONOMY }).refuse).toBe(false);
  });

  it('--force overrides the refusal but still reports what is foreign', () => {
    const { refuse, foreign } = checkSeedGuard([row('EE', 'Electric Circuits 1')], { taxonomy: PRC_TAXONOMY, force: true });
    expect(refuse).toBe(false);
    expect(foreign).toHaveLength(1);
  });
});

describe('migrateTaxonomy.parseArgs', () => {
  const { parseArgs } = require('../scripts/migrateTaxonomy');

  it('reads --dry-run and --force', () => {
    expect(parseArgs(['node', 's'])).toEqual({ dryRun: false, force: false });
    expect(parseArgs(['node', 's', '--dry-run', '--force'])).toEqual({ dryRun: true, force: true });
  });
});
