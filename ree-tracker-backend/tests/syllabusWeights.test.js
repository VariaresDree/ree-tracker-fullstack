import { describe, it, expect } from 'vitest';
const { normalizeSyllabusWeights, DEFAULT_SYLLABUS_WEIGHTS } = require('../src/services/questionPool');

describe('normalizeSyllabusWeights', () => {
  it('falls back to the default blend when there are no rows', () => {
    expect(normalizeSyllabusWeights([])).toEqual(DEFAULT_SYLLABUS_WEIGHTS);
    expect(normalizeSyllabusWeights(null)).toEqual(DEFAULT_SYLLABUS_WEIGHTS);
  });

  it('passes through a full set of rows', () => {
    const rows = [
      { subject: 'Mathematics', weight: 0.2 },
      { subject: 'ESAS', weight: 0.3 },
      { subject: 'EE', weight: 0.5 },
    ];
    expect(normalizeSyllabusWeights(rows)).toEqual({ Mathematics: 0.2, ESAS: 0.3, EE: 0.5 });
  });

  it('backfills any missing canonical subject from the default', () => {
    const out = normalizeSyllabusWeights([{ subject: 'Mathematics', weight: 0.2 }]);
    expect(out).toEqual({ Mathematics: 0.2, ESAS: 0.30, EE: 0.45 });
  });

  it('treats a non-finite weight as missing (uses the default)', () => {
    const out = normalizeSyllabusWeights([{ subject: 'EE', weight: NaN }]);
    expect(out.EE).toBe(DEFAULT_SYLLABUS_WEIGHTS.EE);
  });
});
