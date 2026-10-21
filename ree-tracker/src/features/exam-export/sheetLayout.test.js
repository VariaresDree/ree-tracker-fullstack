// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  OMR_SPEC, PAPER_SIZES, answerSheetGeometry, answerSheetLayout, decodeIdBits, encodeIdBits, fiducialCentres, layoutHash, pageCells,
  paginateColumnMajor, parseQrPayload, qrPayload,
} from './sheetLayout';

// Every item 1..count appears exactly once, in order, across the pages.
const covers = (pages, count) => {
  const seen = pages.flatMap((p) => Array.from({ length: p.to - p.from + 1 }, (_, k) => p.from + k));
  return seen.length === count && seen.every((n, i) => n === i + 1);
};

describe('answerSheetLayout', () => {
  it('100 items x 4 options on A4: 4 columns of 25 rows on one page', () => {
    const layout = answerSheetLayout({ count: 100, maxOptions: 4, paper: 'a4' });
    expect(layout.cols).toBe(4);
    expect(layout.pages).toEqual([{ from: 1, to: 100, rows: 25 }]);
  });

  it('100 items x 6 options: 3 columns, continued on a second page, nothing dropped', () => {
    const layout = answerSheetLayout({ count: 100, maxOptions: 6, paper: 'a4' });
    expect(layout.cols).toBe(3);
    expect(layout.pages.length).toBeGreaterThan(1);
    expect(covers(layout.pages, 100)).toBe(true);
    layout.pages.forEach((p) => expect(p.rows).toBeLessThanOrEqual(p === layout.pages[0] ? layout.firstRows : layout.nextRows));
  });

  it('300 items run over several pages, each within its rows', () => {
    const layout = answerSheetLayout({ count: 300, maxOptions: 4, paper: 'a4' });
    expect(layout.pages.length).toBeGreaterThanOrEqual(3);
    expect(covers(layout.pages, 300)).toBe(true);
    layout.pages.slice(1).forEach((p) => expect(p.to - p.from + 1).toBeLessThanOrEqual(layout.nextRows * layout.cols));
  });

  it('long bond holds more rows than Letter, and Letter is shorter than A4', () => {
    const rows = (paper) => answerSheetLayout({ count: 1, maxOptions: 4, paper }).firstRows;
    expect(rows('long')).toBeGreaterThan(rows('letter'));
    expect(rows('a4')).toBeGreaterThan(rows('letter'));
    expect(PAPER_SIZES.long.geometry).toBe('paperwidth=8.5in,paperheight=13in');
  });

  it('keeps 1 to 5 columns and spreads them edge to edge', () => {
    const narrow = answerSheetLayout({ count: 10, maxOptions: 26, paper: 'a4' });
    expect(narrow.cols).toBe(1);
    const wide = answerSheetLayout({ count: 10, maxOptions: 2, paper: 'a4' });
    expect(wide.cols).toBe(5);
    expect(wide.colStrideMm * (wide.cols - 1) + wide.colW).toBeCloseTo(wide.textW, 5);
  });
});

describe('paginateColumnMajor', () => {
  it('balances each page\'s rows across its columns', () => {
    expect(paginateColumnMajor(50, 5, 40)).toEqual([{ from: 1, to: 50, rows: 10 }]);
    expect(paginateColumnMajor(0, 5, 40)).toEqual([]);
    expect(paginateColumnMajor(11, 2, 3, 4)).toEqual([{ from: 1, to: 6, rows: 3 }, { from: 7, to: 11, rows: 3 }]);
  });
});

describe('pageCells', () => {
  it('fills each column top to bottom (column-major)', () => {
    const layout = answerSheetLayout({ count: 100, maxOptions: 4, paper: 'a4' });
    const cells = pageCells(layout, layout.pages[0]);
    expect(cells).toHaveLength(100);
    expect(cells[0]).toMatchObject({ n: 1, col: 0, row: 0, x: 0, y: 0 });
    expect(cells[24]).toMatchObject({ n: 25, col: 0, row: 24 });
    expect(cells[25]).toMatchObject({ n: 26, col: 1, row: 0, y: 0 });
    expect(cells[25].x).toBeCloseTo(layout.colStrideMm, 5);
  });
});

describe('the scannable answer sheet', () => {
  const geo = (n, opts = 4, paper = 'a4') => answerSheetGeometry({
    optionCounts: Array.isArray(n) ? n : Array(n).fill(opts), paper, printId: 'K7P29QXAM3TD', keyVersion: 'abc12', meta: { setLabel: 'SET B', setCode: 'K7P2-9QXA-M3TD' },
  });
  const inFrame = (g) => g.pages.every((p) => p.bubbles.every((b) => (
    b.cx - b.r >= OMR_SPEC.content - 0.01 && b.cx + b.r <= g.w - OMR_SPEC.content + 0.01 && b.cy + b.r <= g.h - OMR_SPEC.bottom + 0.01
  )));

  it('100 items with 4 options fit one A4 or Letter page, inside the corner squares', () => {
    for (const paper of ['a4', 'letter', 'long']) {
      const g = geo(100, 4, paper);
      expect(g.pages, paper).toHaveLength(1);
      expect(g.pages[0].bubbles, paper).toHaveLength(400);
      expect(inFrame(g), paper).toBe(true);
    }
  });

  it('every item has one bubble per option, numbered in order, column by column', () => {
    const counts = [4, 5, 6, 2, ...Array(46).fill(4)];
    const g = geo(counts);
    const per = new Map();
    g.pages.flatMap((p) => p.bubbles).forEach((b) => per.set(b.n, (per.get(b.n) || 0) + 1));
    expect([...per.keys()]).toEqual(counts.map((_, i) => i + 1));
    counts.forEach((c, i) => expect(per.get(i + 1)).toBe(c));
    const p = g.pages[0];
    // Column-major: item 2 sits under item 1.
    const first = (n) => p.bubbles.find((b) => b.n === n && b.k === 0);
    expect(first(2).cx).toBe(first(1).cx);
    expect(first(2).cy).toBeGreaterThan(first(1).cy);
  });

  it('a six-option paper uses the compact grid only when it saves a page', () => {
    expect(geo(40, 6).compact).toBe(false);
    const g = geo(100, 6);
    expect(g.compact).toBe(true);
    expect(g.pages).toHaveLength(1);
    expect(inFrame(g)).toBe(true);
  });

  it('a long paper runs over pages, each with its squares, strip and QR naming the page', () => {
    const g = geo(300, 6);
    expect(g.pages.length).toBeGreaterThan(1);
    g.pages.forEach((p, i) => {
      expect(p.fiducials).toEqual(fiducialCentres('a4'));
      expect(decodeIdBits(p.idCells.map((c) => (c.filled ? 1 : 0)))).toEqual({ paper: 'a4', pageIndex: i, hash: g.hash });
      expect(parseQrPayload(p.qr.payload)).toMatchObject({ printId: 'K7P29QXAM3TD', pageIndex: i, pageCount: g.pages.length, paper: 'a4', keyVersion: 'abc12' });
    });
    expect(g.pages.flatMap((p) => p.bubbles).filter((b) => b.k === 0).map((b) => b.n)).toEqual(Array.from({ length: 300 }, (_, i) => i + 1));
  });

  it('the ID strip round-trips, and a flipped bit, a missing guard or an unknown paper is refused', () => {
    const bits = encodeIdBits({ paper: 'long', pageIndex: 5, hash: 1023 });
    expect(bits).toHaveLength(20);
    expect(decodeIdBits(bits)).toEqual({ paper: 'long', pageIndex: 5, hash: 1023 });
    for (let i = 0; i < 20; i += 1) {
      const flipped = bits.slice();
      flipped[i] ^= 1;
      expect(decodeIdBits(flipped), `cell ${i}`).toBeNull();
    }
    expect(decodeIdBits(bits.slice().reverse())).toBeNull();
  });

  it('the layout hash changes with the set and with the option counts', () => {
    const a = layoutHash('K7P29QXAM3TD', [4, 4, 4]);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1024);
    expect(layoutHash('K7P29QXAM3TD', [4, 4, 5])).not.toBe(a);
    expect(layoutHash('A7P29QXAM3TD', [4, 4, 4])).not.toBe(a);
  });

  it('the QR names the set, page, paper and key version, never the answers', () => {
    const payload = qrPayload({ printId: 'K7P29QXAM3TD', keyVersion: 'abc12', pageIndex: 0, pageCount: 2, paper: 'letter' });
    expect(payload).toBe('REE2:K7P29QXAM3TD:P1/2:LT:KABC12');
    expect(payload).toMatch(/^[0-9A-Z $%*+\-./:]+$/);
    expect(parseQrPayload('REE|abc|v1')).toBeNull();
  });
});
