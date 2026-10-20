// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { PAPER_SIZES, answerSheetLayout, pageCells, paginateColumnMajor } from './sheetLayout';

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
