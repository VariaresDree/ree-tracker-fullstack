// src/features/exam-export/sheetLayout.js
//
// Where the answer sheet's bubble rows go, worked out once and shared by the
// PDF (board-simulator/examPaper.js) and the LaTeX sheet (buildExamTex.js), so
// the two agree and no row is ever dropped off the bottom of a page.
//
// Rows are column-major within each page (fill a column top to bottom, then
// move right), the PH answer-sheet convention the key also follows. A page
// that can't hold every remaining item starts the next one; each page balances
// its rows across its columns.

/** Paper sizes in millimetres, with the geometry option LaTeX needs. */
export const PAPER_SIZES = Object.freeze({
  a4: Object.freeze({ w: 210, h: 297, geometry: 'a4paper', label: 'A4' }),
  letter: Object.freeze({ w: 215.9, h: 279.4, geometry: 'letterpaper', label: 'Letter' }),
  // PH "long bond", 8.5 x 13 in.
  long: Object.freeze({ w: 215.9, h: 330.2, geometry: 'paperwidth=8.5in,paperheight=13in', label: 'Long 8.5 x 13 in' }),
});

export const paperSize = (paper) => PAPER_SIZES[paper] || PAPER_SIZES.a4;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * Split `count` items into pages of `cols` columns, column-major.
 * `firstRows` rows fit on the first page and `nextRows` on each later one.
 * Each page balances its rows: 100 items in 4 columns are 25 rows, not 32+.
 * @returns {{ from: number, to: number, rows: number }[]} 1-based, inclusive
 */
export function paginateColumnMajor(count, cols, firstRows, nextRows = firstRows) {
  const n = Math.max(0, Math.floor(count || 0));
  const c = Math.max(1, Math.floor(cols || 1));
  const first = Math.max(1, Math.floor(firstRows || 1));
  const next = Math.max(1, Math.floor(nextRows || 1));
  const pages = [];
  let done = 0;
  while (done < n) {
    const capacity = (pages.length === 0 ? first : next) * c;
    const take = Math.min(capacity, n - done);
    pages.push({ from: done + 1, to: done + take, rows: Math.ceil(take / c) });
    done += take;
  }
  return pages;
}

/**
 * The bubble grid for an answer sheet.
 *
 * Each row is a number column then one bubble per option, so a column is
 * `numberColMm + maxOptions * bubblePitchMm` wide; as many columns as fit
 * (1-5) share the text width, spread edge to edge.
 *
 * @returns {{
 *   cols: number, colW: number, colStrideMm: number, rowPitchMm: number, bubblePitchMm: number,
 *   textW: number, firstRows: number, nextRows: number,
 *   pages: { from: number, to: number, rows: number }[]
 * }}
 */
export function answerSheetLayout({
  count,
  maxOptions = 4,
  paper = 'a4',
  marginMm = 12.7,
  topMm,
  bottomMm,
  firstHeaderMm = 62,
  nextHeaderMm = 16,
  rowPitchMm = 6.4,
  bubblePitchMm = 6,
  numberColMm = 9,
  colGapMm = 5,
} = {}) {
  const size = paperSize(paper);
  const top = topMm ?? marginMm;
  const bottom = bottomMm ?? marginMm;
  const textW = size.w - 2 * marginMm;
  const textH = size.h - top - bottom;
  const options = clamp(Math.floor(maxOptions || 4), 2, 26);
  const colW = numberColMm + options * bubblePitchMm;
  const cols = clamp(Math.floor((textW + colGapMm) / (colW + colGapMm)), 1, 5);
  const colStrideMm = cols > 1 ? (textW - colW) / (cols - 1) : 0;
  const firstRows = Math.max(1, Math.floor((textH - firstHeaderMm) / rowPitchMm));
  const nextRows = Math.max(1, Math.floor((textH - nextHeaderMm) / rowPitchMm));
  return {
    cols,
    colW,
    colStrideMm,
    rowPitchMm,
    bubblePitchMm,
    textW,
    firstRows,
    nextRows,
    pages: paginateColumnMajor(count, cols, firstRows, nextRows),
  };
}

/**
 * Every cell on one page of a layout: item number, column and row, and the
 * cell's top-left corner in mm from the bubble area's top-left.
 */
export function pageCells(layout, page) {
  const cells = [];
  for (let n = page.from; n <= page.to; n += 1) {
    const k = n - page.from;
    const col = Math.floor(k / page.rows);
    const row = k % page.rows;
    cells.push({ n, col, row, x: col * layout.colStrideMm, y: row * layout.rowPitchMm });
  }
  return cells;
}
