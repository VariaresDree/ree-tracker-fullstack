import { describe, it, expect } from 'vitest';
const { normKey, buildResolverIndex, resolveInIndex, diffTaxonomySync } = require('../src/services/topicResolver');
const { PRC_TAXONOMY } = require('../src/config/prcTaxonomy');

const T = (subject, name, extra = {}) => ({
  id: `${subject}:${name}`,
  subject,
  name,
  normKey: normKey(name),
  aliases: [],
  active: true,
  ...extra,
});

describe('buildResolverIndex + resolveInIndex', () => {
  it('resolves a canonical name within its subject (case/whitespace-insensitive)', () => {
    const index = buildResolverIndex([T('EE', 'DC Electric Circuits')]);
    expect(resolveInIndex(index, 'EE', '  dc electric circuits ')?.name).toBe('DC Electric Circuits');
  });

  it('resolves a legacy alias to its canonical topic', () => {
    const index = buildResolverIndex([T('EE', 'DC Electric Circuits', { aliases: ['Electric Circuits 1'] })]);
    expect(resolveInIndex(index, 'EE', 'Electric Circuits 1')?.name).toBe('DC Electric Circuits');
  });

  it('never lets an alias shadow another topic\'s canonical name, regardless of row order', () => {
    const a = T('EE', 'Industrial Electronics');
    const b = T('EE', 'Power Electronics', { aliases: ['Industrial Electronics'] });
    for (const rows of [[a, b], [b, a]]) {
      const index = buildResolverIndex(rows);
      expect(resolveInIndex(index, 'EE', 'Industrial Electronics')?.name).toBe('Industrial Electronics');
    }
  });

  it('normalizes subject spellings and falls back cross-subject for unambiguous labels', () => {
    const index = buildResolverIndex([T('Mathematics', 'Algebra')]);
    // 'Math' normalizes to 'Mathematics'
    expect(resolveInIndex(index, 'Math', 'Algebra')?.name).toBe('Algebra');
    // 'General'/wrong subject still finds the only 'Algebra' anywhere
    expect(resolveInIndex(index, 'General', 'Algebra')?.name).toBe('Algebra');
  });

  it('ignores inactive topics and returns null for unknown or empty labels', () => {
    const index = buildResolverIndex([T('EE', 'Illumination', { active: false })]);
    expect(resolveInIndex(index, 'EE', 'Illumination')).toBeNull();
    expect(resolveInIndex(index, 'EE', 'No Such Topic')).toBeNull();
    expect(resolveInIndex(index, 'EE', '')).toBeNull();
    expect(resolveInIndex(index, 'EE', null)).toBeNull();
  });
});

describe('diffTaxonomySync (PUT /tos payload → Topic table sync)', () => {
  const existing = [
    T('EE', 'DC Electric Circuits', { sortOrder: 0 }),
    T('EE', 'AC Electric Circuits', { sortOrder: 1 }),
    T('EE', 'Old Retired Topic', { sortOrder: 2 }),
  ];

  it('creates new names, reorders existing, deactivates dropped', () => {
    const { creates, updates, deactivateIds } = diffTaxonomySync(existing, {
      EE: ['AC Electric Circuits', 'DC Electric Circuits', 'Illumination'],
    });
    expect(creates).toEqual([
      expect.objectContaining({ subject: 'EE', name: 'Illumination', normKey: 'illumination', sortOrder: 2, curated: true }),
    ]);
    // both existing rows moved position
    expect(updates.map((u) => [u.name, u.sortOrder]).sort()).toEqual([
      ['AC Electric Circuits', 0],
      ['DC Electric Circuits', 1],
    ]);
    expect(deactivateIds).toEqual(['EE:Old Retired Topic']);
  });

  it('reactivates a previously deactivated row instead of duplicating it', () => {
    const rows = [T('EE', 'Illumination', { active: false, sortOrder: 5 })];
    const { creates, updates, deactivateIds } = diffTaxonomySync(rows, { EE: ['Illumination'] });
    expect(creates).toEqual([]);
    expect(updates).toEqual([{ id: 'EE:Illumination', name: 'Illumination', sortOrder: 0, active: true }]);
    expect(deactivateIds).toEqual([]);
  });

  it('is a no-op when the payload matches the table', () => {
    const rows = [T('EE', 'DC Electric Circuits', { sortOrder: 0 })];
    const { creates, updates, deactivateIds } = diffTaxonomySync(rows, { EE: ['DC Electric Circuits'] });
    expect(creates).toEqual([]);
    expect(updates).toEqual([]);
    expect(deactivateIds).toEqual([]);
  });

  it('only touches subjects present in the payload, dedupes names, and skips non-arrays', () => {
    const rows = [T('Mathematics', 'Algebra', { sortOrder: 0 }), T('EE', 'Illumination', { sortOrder: 0 })];
    const { creates, updates, deactivateIds } = diffTaxonomySync(rows, {
      Mathematics: ['Algebra', 'algebra ', 'Trigonometry'],
      EE: 'not-an-array',
    });
    expect(creates).toEqual([
      expect.objectContaining({ subject: 'Mathematics', name: 'Trigonometry', sortOrder: 2 }),
    ]);
    expect(updates).toEqual([]);          // Algebra already at sortOrder 0
    expect(deactivateIds).toEqual([]);    // EE untouched (invalid payload), Illumination survives
  });
});

describe('PRC taxonomy seed data invariants', () => {
  const all = Object.entries(PRC_TAXONOMY).flatMap(([subject, topics]) =>
    topics.map((t, i) => ({ subject, ...t, sortOrder: i })),
  );

  it('has the full PRC TOS: 10 Mathematics, 11 ESAS, 28 EE topics', () => {
    expect(PRC_TAXONOMY.Mathematics).toHaveLength(10);
    expect(PRC_TAXONOMY.ESAS).toHaveLength(11);
    expect(PRC_TAXONOMY.EE).toHaveLength(28);
  });

  it('has no duplicate names or alias collisions within a subject', () => {
    for (const [subject, topics] of Object.entries(PRC_TAXONOMY)) {
      const keys = topics.flatMap((t) => [normKey(t.name), ...t.aliases.map(normKey)]);
      expect(new Set(keys).size, `collision in ${subject}`).toBe(keys.length);
    }
  });

  it('resolves every mapped legacy curriculum label to exactly one topic', () => {
    const index = buildResolverIndex(all.map((t, i) => ({ ...t, id: String(i), normKey: normKey(t.name), active: true })));
    const legacy = {
      Mathematics: ['Algebra & Complex Numbers', 'Calculus 1', 'Calculus 2', 'Probability & Statistics',
        'Engineering Data Analytics', 'Differential Equations', 'Numerical Methods & Analysis',
        'Trigonometry', 'Analytic Geometry'],
      ESAS: ['Chemistry for Engineers', 'Physics for Engineers', 'Computer Programming',
        'Microprocessor Systems and Logic Circuits', 'Material Science', 'Fluid Mechanics',
        'Fundamentals of Deformable Bodies', 'Basic Thermodynamics',
        'EE Laws, Codes, & Professional Ethics', 'Engineering Economics',
        'Technopreneurship & Project Management'],
      EE: ['Electromagnetism', 'Electric Circuits 1', 'Electric Circuits 2',
        'Fundamentals of Electronic Communications', 'Electronics 1 and 2',
        'Electrical Apparatus & Devices', 'Industrial Electronics', 'Electrical Machinery 1',
        'Electrical Machinery 2', 'Instrumentation & Control',
        'Electrical System & Illumination Design', 'Power Plant Engineering',
        'Distribution Systems & Substation Design', 'Power System Analysis'],
    };
    for (const [subject, labels] of Object.entries(legacy)) {
      for (const label of labels) {
        expect(resolveInIndex(index, subject, label), `${subject} / ${label}`).toBeTruthy();
      }
    }
    // Deliberately unmapped labels stay unresolved (auto-created as uncurated
    // topics by the migration instead of getting a dishonest PRC home).
    expect(resolveInIndex(index, 'ESAS', 'Environmental Science & Engineering')).toBeNull();
    expect(resolveInIndex(index, 'EE', 'Feedback Control Systems')).toBeNull();
  });
});
