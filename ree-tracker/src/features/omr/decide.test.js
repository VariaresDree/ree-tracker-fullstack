// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { answersFromRows, decideRows, DECISION } from './decide';

// A page of `rows` items with `opts` options each, and fills set per row.
function pageOf(rows, opts = 4) {
  const bubbles = [];
  for (let n = 1; n <= rows; n += 1) for (let k = 0; k < opts; k += 1) bubbles.push({ n, k, letter: 'ABCDEF'[k] });
  return { bubbles };
}
const E = 0.06; // empty bubble: the letter's ink
const M = 0.76; // a typical mark

function fillsFor(page, rowsFills) {
  return page.bubbles.map((b) => (rowsFills[b.n] ? rowsFills[b.n][b.k] : E));
}

describe('decideRows', () => {
  const page = pageOf(10);
  const base = {
    1: [M, E, E, E], 2: [E, E, M, E], 3: [E, M, E, E], 4: [E, E, E, M], 5: [M, E, E, E],
  };

  it('reads one mark as single, nothing as blank, two marks as multiple', () => {
    const rows = decideRows(page, fillsFor(page, { ...base, 6: [E, E, E, E], 7: [M, E, M, E] }));
    expect(rows.map((r) => r.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(rows[0]).toMatchObject({ status: 'single', choice: 'A', marked: ['A'] });
    expect(rows[1]).toMatchObject({ status: 'single', choice: 'C' });
    expect(rows[5]).toMatchObject({ status: 'blank', choice: null, marked: [] });
    expect(rows[6]).toMatchObject({ status: 'multiple', choice: null });
    expect(rows[6].marked.sort()).toEqual(['A', 'C']);
    expect(rows[0].confidence).toBe(1);
    expect(rows[0].fills).toEqual([M, E, E, E]);
    expect(rows[0].levels[0]).toBeCloseTo(1, 6);
    expect(rows.e).toBeCloseTo(E, 9);
    expect(rows.f).toBeCloseTo(M, 9);
  });

  it('a faint mark alone is unsure (read as its letter), a fainter one blank', () => {
    const at = (v) => E + v * (M - E);
    const rows = decideRows(page, fillsFor(page, { ...base, 6: [E, at(0.35), E, E], 7: [E, E, at(0.2), E] }));
    expect(rows[5]).toMatchObject({ status: 'unsure', choice: 'B', marked: [] });
    expect(rows[6]).toMatchObject({ status: 'blank' });
    expect(answersFromRows(rows).slice(5, 7)).toBe('B-');
  });

  it('a mark beside a half-erased one is unsure, choosing the mark', () => {
    const at = (v) => E + v * (M - E);
    const rows = decideRows(page, fillsFor(page, { ...base, 6: [at(0.3), E, M, E] }));
    expect(rows[5]).toMatchObject({ status: 'unsure', choice: 'C', marked: ['C'], confidence: 0 });
  });

  it('confidence of a single is min(1, (v1 - max(v2, .25)) / .5)', () => {
    const at = (v) => E + v * (M - E);
    const rows = decideRows(page, fillsFor(page, { ...base, 6: [at(0.6), at(0.1), E, E], 7: [at(1.6), E, E, E] }));
    expect(rows[5].status).toBe('single');
    expect(rows[5].confidence).toBeCloseTo((0.6 - 0.25) / 0.5, 6);
    expect(rows[6].confidence).toBe(1);
  });

  it('with fewer than 3 marked rows, f falls back to e + 0.45', () => {
    // Only rows 1 and 3 reach e + 0.2.
    const rows = decideRows(page, fillsFor(page, { 1: [E, E, 0.45, E], 2: [E, 0.2, E, E], 3: [0.7, E, E, E], 4: [E, E, E, E], 5: [E, E, E, E] }));
    expect(rows.f).toBeCloseTo(E + DECISION.defaultGap, 9);
    expect(rows[0].status).toBe('single'); // v = 0.39 / 0.45 = 0.87
    expect(rows[1].status).toBe('unsure'); // v = 0.14 / 0.45 = 0.31
    expect(rows[2].status).toBe('single'); // v > 1
  });

  it('a sheet of two-option items, every one answered, still finds its empty level', () => {
    const two = pageOf(12, 2);
    const fills = two.bubbles.map((b) => ((b.n + b.k) % 2 ? M : E));
    const rows = decideRows(two, fills);
    expect(rows.every((r) => r.status === 'single')).toBe(true);
    expect(rows.e).toBeCloseTo(E, 9);
  });

  it('normalises away the pen: a light pencil page reads like a dark one', () => {
    const light = 0.32;
    const rows = decideRows(page, fillsFor(page, {
      1: [light, E, E, E], 2: [E, E, light, E], 3: [E, light, E, E], 4: [E, E, E, light], 5: [E, E, E, E],
    }));
    expect(rows.slice(0, 4).every((r) => r.status === 'single')).toBe(true);
    expect(rows[4].status).toBe('blank');
  });
});

describe('answersFromRows', () => {
  it('letters for single and unsure, - for blank, * for multiple', () => {
    expect(answersFromRows([
      { status: 'single', choice: 'B' }, { status: 'blank', choice: null }, { status: 'multiple', choice: null }, { status: 'unsure', choice: 'F' },
    ])).toBe('B-*F');
  });
});
