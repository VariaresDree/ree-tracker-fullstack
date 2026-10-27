// @vitest-environment node
//
// Faint marks and curled paper.
import { describe, it, expect } from 'vitest';
import { readSheet } from './pipeline';
import {
  addScores, emptyScore, makeSet, photoOfPage, scoreRead,
} from './__fixtures__/scenarios';

const letter = (k) => String.fromCharCode(65 + k);

describe('faint marks (30% pencil)', () => {
  it('alone, read as unsure or blank, never a mark; beside a real mark, the real mark is the choice', () => {
    const tally = { alone: 0, withMark: 0 };
    for (const seed of [300, 301, 302]) {
      const set = makeSet(seed, { count: 100, options: 4, blankRate: 0.3, doubleRate: 0 });
      const faint = {};
      const kind = {};
      let i = 0;
      for (let n = 1; n <= 100; n += 1) {
        const t = set.truth[n];
        if (!t.length && i % 2 === 0) { faint[n] = (n * 7) % 4; kind[n] = 'alone'; }
        else if (t.length === 1 && n % 9 === 0) { faint[n] = (t[0] + 1) % 4; kind[n] = 'withMark'; }
        if (!t.length) i += 1;
      }
      const { img } = photoOfPage(set, 0, { seed, faint });
      const res = readSheet(img, { printId: set.printId, optionCounts: set.optionCounts });
      expect(res.ok).toBe(true);
      res.rows.forEach((row) => {
        if (kind[row.n] === 'alone') {
          tally.alone += 1;
          expect(['unsure', 'blank'], `item ${row.n}`).toContain(row.status);
        } else if (kind[row.n] === 'withMark') {
          tally.withMark += 1;
          expect(['single', 'unsure'], `item ${row.n}`).toContain(row.status);
          expect(row.choice).toBe(letter(set.truth[row.n][0]));
        }
      });
    }
    expect(tally.alone).toBeGreaterThan(30);
    expect(tally.withMark).toBeGreaterThan(15);
  }, 60_000);
});

describe('curl', () => {
  it('with 2 mm of curl, refineOffsets keeps 99%+ of rows exact; without it the read drops', () => {
    let on = emptyScore();
    let off = emptyScore();
    for (const seed of [100, 101, 102, 103, 104, 105]) {
      const set = makeSet(seed, { count: 100, options: seed % 3 === 0 ? 5 : 4 });
      const { img } = photoOfPage(set, 0, { seed, curlMm: 2 });
      const opts = { printId: set.printId, optionCounts: set.optionCounts };
      const refined = readSheet(img, opts);
      const plain = readSheet(img, { ...opts, refine: false });
      expect(refined.ok && plain.ok).toBe(true);
      on = addScores(on, scoreRead(refined, set));
      off = addScores(off, scoreRead(plain, set));
      // The correction is real: the middle of the page moved by up to 2 mm.
      const biggest = Math.max(...refined.rows.map((r) => Math.hypot(r.offset.dx, r.offset.dy)));
      expect(biggest).toBeGreaterThan(1.2);
    }
    expect(on.exact / on.rows).toBeGreaterThanOrEqual(0.99);
    expect(on.blankAsSingle).toBe(0);
    expect(on.doublesCaught).toBe(on.doubles);
    expect(off.exact / off.rows).toBeLessThan(0.99);
    expect(off.exact).toBeLessThan(on.exact);
  }, 60_000);

  it('3 mm of curl: refined still 99%+, unrefined falls apart', () => {
    let on = emptyScore();
    let off = emptyScore();
    for (const seed of [110, 111]) {
      const set = makeSet(seed, { count: 100, options: 4 });
      const { img } = photoOfPage(set, 0, { seed, curlMm: 3 });
      const opts = { printId: set.printId, optionCounts: set.optionCounts };
      on = addScores(on, scoreRead(readSheet(img, opts), set));
      off = addScores(off, scoreRead(readSheet(img, { ...opts, refine: false }), set));
    }
    expect(on.exact / on.rows).toBeGreaterThanOrEqual(0.99);
    expect(off.exact / off.rows).toBeLessThan(0.9);
  }, 60_000);
});
