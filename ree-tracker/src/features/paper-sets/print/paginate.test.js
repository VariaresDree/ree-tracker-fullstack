// @vitest-environment node
// Pagination from measured heights: greedy columns, Part headings kept with
// their first item, and a block too tall for a column scaled to fit.
import { describe, it, expect } from 'vitest';
import { MIN_BLOCK_SCALE, mmToPx, packColumns, pageBox } from './paginate';

const blocks = (...hs) => hs.map((h, i) => (typeof h === 'object' ? { key: `b${i}`, ...h } : { key: `b${i}`, h }));

describe('packColumns', () => {
  it('fills a column, then the next, then a new page; the first page is shorter', () => {
    const { pages, oversize } = packColumns(blocks(40, 40, 40, 40, 40, 40, 40), { firstColH: 80, colH: 100, cols: 2 });
    expect(pages.map((p) => p.cols)).toEqual([
      [['b0', 'b1'], ['b2', 'b3']],
      [['b4', 'b5'], ['b6']],
    ]);
    expect(oversize).toEqual({});
  });

  it('counts the gap between blocks, not before the first', () => {
    const { pages } = packColumns(blocks(45, 45, 45), { firstColH: 100, colH: 100, cols: 2, gap: 11 });
    expect(pages[0].cols).toEqual([['b0'], ['b1']]);
    const tight = packColumns(blocks(45, 45), { firstColH: 100, colH: 100, cols: 1, gap: 10 });
    expect(tight.pages.map((p) => p.cols[0])).toEqual([['b0', 'b1']]);
  });

  it('keeps a Part heading with the item after it', () => {
    const { pages } = packColumns(blocks(70, { h: 10, keepWithNext: true }, 30), { firstColH: 100, colH: 100, cols: 2 });
    expect(pages[0].cols).toEqual([['b0'], ['b1', 'b2']]);
  });

  it('a block taller than a column goes alone, scaled, never below the floor', () => {
    const { pages, oversize } = packColumns(blocks(20, 150, 20, 1000), { firstColH: 100, colH: 100, cols: 2 });
    expect(pages.map((p) => p.cols)).toEqual([[['b0'], ['b1']], [['b2'], ['b3']]]);
    expect(oversize.b1).toBeCloseTo(100 / 150);
    expect(oversize.b3).toBe(MIN_BLOCK_SCALE);
  });

  it('starts a block on the next page when only the first page is too short for it', () => {
    const { pages, oversize } = packColumns(blocks(90), { firstColH: 50, colH: 100, cols: 2 });
    expect(pages.map((p) => p.cols)).toEqual([[[], []], [['b0'], []]]);
    expect(oversize).toEqual({});
  });

  it('unmeasured blocks (height 0) all fit, and nothing gives one empty page', () => {
    expect(packColumns(blocks(0, 0, 0), { firstColH: 100, colH: 100 }).pages).toEqual([{ cols: [['b0', 'b1', 'b2'], []] }]);
    expect(packColumns([], { firstColH: 100, colH: 100 }).pages).toEqual([{ cols: [[], []] }]);
  });
});

describe('page box', () => {
  it('A4 with 14 mm sides and top, 18 mm bottom, two columns 6 mm apart', () => {
    expect(pageBox({ w: 210, h: 297 })).toEqual({ contentW: 182, contentH: 265, colW: 88 });
    expect(mmToPx(25.4)).toBeCloseTo(96);
  });
});
