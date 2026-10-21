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

// ---------------------------------------------------------------------------
// The scannable answer sheet (Exams > Paper sets).
//
// One geometry, in page millimetres from the top-left corner, drawn by the
// print preview (HTML/SVG), by the LaTeX sheet (TikZ), and read back by the
// scanner (features/omr). Four solid corner squares frame the page; the
// scanner finds them, maps page millimetres onto the photo through them, and
// samples each bubble where this says it is. Printer scaling ("fit to page"),
// unprintable margins or another paper size are all absorbed by that mapping.
//
// A 20-cell strip on the bottom edge carries what the scanner needs without a
// QR reader: the paper size the sheet was laid out for, the page number, and
// a 10-bit hash of the set and its option counts (a sheet from another set,
// or printed before the options changed, is refused). Cell 0 is always on,
// cell 1 always off (an upside-down photo can't decode), cell 18 is even
// parity over the data bits, and cell 19 is always on.
//
// Pure, with no imports: the scanner's worker loads it.

export const OMR_SPEC = Object.freeze({
  fiducial: Object.freeze({ size: 7, edge: 8 }),
  quiet: 3,
  content: 18,
  bubble: Object.freeze({ r: 2.3, pitch: 6.5, rowPitch: 6.6, numberCol: 8, colGap: 5 }),
  compact: Object.freeze({ r: 2.1, pitch: 5.6, rowPitch: 6.0, numberCol: 7, colGap: 4 }),
  stroke: 0.3, // pt
  letterPt: 5,
  letterGrey: 0.45,
  idStrip: Object.freeze({ cells: 20, size: 3, pitch: 5, x0: 22 }),
  qr: Object.freeze({ size: 22, sizeNext: 18 }),
  firstTop: 70,
  nextTop: 40,
  bottom: 19,
});

const PAPER_CODES = ['a4', 'letter', 'long'];
const QR_PAPER = { a4: 'A4', letter: 'LT', long: 'LG' };

/** The four corner squares' centres in page mm: top-left, top-right, bottom-right, bottom-left. */
export function fiducialCentres(paper) {
  const { w, h } = paperSize(paper);
  const c = OMR_SPEC.fiducial.edge + OMR_SPEC.fiducial.size / 2;
  return [{ x: c, y: c }, { x: w - c, y: c }, { x: w - c, y: h - c }, { x: c, y: h - c }];
}

function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/** 10 bits tying a sheet to its set and its option counts. */
export function layoutHash(printId, optionCounts) {
  return hash32(`${printId || ''}|${(optionCounts || []).join('')}`) & 0x3ff;
}

/** The strip's 20 cells: start, guard, paper (2), page index (4), hash (10), parity, stop. */
export function encodeIdBits({ paper, pageIndex, hash }) {
  const p = Math.max(0, PAPER_CODES.indexOf(paper));
  const data = [];
  for (let i = 1; i >= 0; i--) data.push((p >> i) & 1);
  for (let i = 3; i >= 0; i--) data.push((pageIndex >> i) & 1);
  for (let i = 9; i >= 0; i--) data.push((hash >> i) & 1);
  const parity = data.reduce((a, b) => a ^ b, 0);
  return [1, 0, ...data, parity, 1];
}

/** Back from 20 cells, or null when the frame bits or the parity don't hold. */
export function decodeIdBits(bits) {
  if (!bits || bits.length !== OMR_SPEC.idStrip.cells) return null;
  if (bits[0] !== 1 || bits[1] !== 0 || bits[19] !== 1) return null;
  const data = bits.slice(2, 18);
  if (data.reduce((a, b) => a ^ b, 0) !== bits[18]) return null;
  const num = (from, len) => data.slice(from, from + len).reduce((a, b) => (a << 1) | b, 0);
  const paperIndex = num(0, 2);
  if (paperIndex >= PAPER_CODES.length) return null;
  return { paper: PAPER_CODES[paperIndex], pageIndex: num(2, 4), hash: num(6, 10) };
}

/**
 * What the sheet's QR says: the set, the page, the paper and the key version
 * (never the answers). Upper case, so the code stays in alphanumeric mode.
 */
export function qrPayload({ printId, keyVersion, pageIndex, pageCount, paper }) {
  return `REE2:${printId}:P${pageIndex + 1}/${pageCount}:${QR_PAPER[paper] || 'A4'}:K${String(keyVersion || '').toUpperCase()}`;
}

/** The QR payload back, or null when it isn't one of ours. */
export function parseQrPayload(text) {
  const m = /^REE2:([0-9A-HJKMNP-TV-Z]{12}):P(\d+)\/(\d+):(A4|LT|LG):K([0-9A-Z]+)$/.exec(String(text || '').trim());
  if (!m) return null;
  const paper = Object.keys(QR_PAPER).find((k) => QR_PAPER[k] === m[4]);
  return { printId: m[1], pageIndex: Number(m[2]) - 1, pageCount: Number(m[3]), paper, keyVersion: m[5].toLowerCase() };
}

function sheetGrid(count, maxOptions, w, h, spec) {
  const textW = w - 2 * OMR_SPEC.content;
  const colW = spec.numberCol + maxOptions * spec.pitch;
  const cols = clamp(Math.floor((textW + spec.colGap) / (colW + spec.colGap)), 1, 5);
  const colStride = cols > 1 ? (textW - colW) / (cols - 1) : 0;
  const firstRows = Math.max(1, Math.floor((h - OMR_SPEC.bottom - OMR_SPEC.firstTop) / spec.rowPitch));
  const nextRows = Math.max(1, Math.floor((h - OMR_SPEC.bottom - OMR_SPEC.nextTop) / spec.rowPitch));
  return { cols, colW, colStride, firstRows, nextRows, pages: paginateColumnMajor(count, cols, firstRows, nextRows) };
}

/**
 * The scannable answer sheet, page by page, in page mm.
 *
 * @param {{
 *   optionCounts: number[],   // options per item, in item order (2-6)
 *   paper?: 'a4'|'letter'|'long',
 *   printId: string,           // the printed set's id (PRINT_ID_RE)
 *   keyVersion?: string,
 *   meta?: { title?: string, setLabel?: string, code?: string, examLine?: string, practiceLine?: string, setCode?: string },
 * }} input
 * @returns {{ paper, w, h, compact, hash, pages: object[] }} each page:
 *   { index, count, from, to, rows, fiducials: [{x,y}] (centres), fiducialSize,
 *     qr: { x, y, size, payload }, nameBox: { x, y, w, h, label }, dateBox,
 *     text: [{ x, y, size, weight, italic, anchor, str }], labels: [{ n, x, y }],
 *     bubbles: [{ n, k, letter, cx, cy, r }], idCells: [{ x, y, size, filled }] }
 */
export function answerSheetGeometry({ optionCounts = [], paper = 'a4', printId = '', keyVersion = '', meta = {} } = {}) {
  const size = paperSize(paper);
  const kind = PAPER_CODES.includes(paper) ? paper : 'a4';
  const { w, h } = size;
  const count = optionCounts.length;
  const maxOptions = clamp(Math.max(2, ...optionCounts.map((n) => Math.floor(n) || 4)), 2, 6);
  // The compact grid only when it saves a page.
  let spec = OMR_SPEC.bubble;
  let grid = sheetGrid(count, maxOptions, w, h, spec);
  let compact = false;
  const tight = sheetGrid(count, maxOptions, w, h, OMR_SPEC.compact);
  if (tight.pages.length < grid.pages.length) {
    spec = OMR_SPEC.compact;
    grid = tight;
    compact = true;
  }
  const hash = layoutHash(printId, optionCounts);
  const C = OMR_SPEC.content;
  const fs = OMR_SPEC.fiducial.size;
  const pageCount = Math.max(1, grid.pages.length);
  const pagesIn = grid.pages.length ? grid.pages : [{ from: 1, to: 0, rows: 0 }];
  const setLabel = meta.setLabel || '';
  const setCode = meta.setCode || '';

  const pages = pagesIn.map((pg, index) => {
    const first = index === 0;
    const top = first ? OMR_SPEC.firstTop : OMR_SPEC.nextTop;
    const qrSize = first ? OMR_SPEC.qr.size : OMR_SPEC.qr.sizeNext;
    const qr = {
      x: w - C - qrSize, y: C, size: qrSize,
      payload: qrPayload({ printId, keyVersion, pageIndex: index, pageCount, paper: kind }),
    };
    const text = [];
    let nameBox;
    let dateBox;
    if (first) {
      text.push({ x: C, y: 23, size: 14, weight: 'bold', anchor: 'start', str: 'ANSWER SHEET' });
      text.push({ x: C, y: 28.5, size: 8, weight: 'normal', anchor: 'start', str: meta.examLine || 'Registered Electrical Engineer Pre-board Examination' });
      if (meta.title) text.push({ x: C, y: 33, size: 8.5, weight: 'bold', anchor: 'start', str: meta.title });
      if (meta.practiceLine) text.push({ x: C, y: 37, size: 6.5, weight: 'normal', italic: true, anchor: 'start', str: meta.practiceLine });
      text.push({ x: C + 13, y: 46.6, size: 12, weight: 'bold', anchor: 'middle', str: setLabel, box: { x: C, y: 40, w: 26, h: 9 } });
      if (setCode) text.push({ x: C + 30, y: 46, size: 7, weight: 'normal', anchor: 'start', str: `Set code ${setCode}` });
      dateBox = { x: w - C - 42, y: 52, w: 42, h: 10, label: 'Date' };
      nameBox = { x: C, y: 52, w: w - 2 * C - 46, h: 10, label: 'Name (print)' };
      text.push({ x: C, y: 66.5, size: 7, weight: 'normal', anchor: 'start',
        str: 'Shade one circle per item completely with a No. 2 pencil or a dark pen. Erase cleanly. Keep the four black squares clean.' });
    } else {
      text.push({ x: C, y: 23, size: 9, weight: 'bold', anchor: 'start', str: `ANSWER SHEET (continued) · ${setLabel} · items ${pg.from}–${pg.to}` });
      nameBox = { x: C, y: 27, w: w - 2 * C - qrSize - 4, h: 8, label: 'Name (print)' };
      dateBox = null;
    }
    const footer = [setCode, setLabel, `Page ${index + 1} of ${pageCount}`].filter(Boolean).join(' · ');
    text.push({ x: w - C, y: h - 10.6, size: 7, weight: 'normal', anchor: 'end', str: footer });

    const labels = [];
    const bubbles = [];
    for (let n = pg.from; n <= pg.to; n += 1) {
      const k0 = n - pg.from;
      const col = Math.floor(k0 / pg.rows);
      const row = k0 % pg.rows;
      const x0 = C + col * grid.colStride;
      const cy = top + row * spec.rowPitch + spec.rowPitch / 2;
      labels.push({ n, x: x0 + spec.numberCol - 1.2, y: cy });
      const options = clamp(Math.floor(optionCounts[n - 1]) || 4, 2, 6);
      for (let k = 0; k < options; k += 1) {
        bubbles.push({ n, k, letter: String.fromCharCode(65 + k), cx: x0 + spec.numberCol + spec.pitch * k + spec.pitch / 2, cy, r: spec.r });
      }
    }

    const bits = encodeIdBits({ paper: kind, pageIndex: index, hash });
    const { size: cell, pitch, x0 } = OMR_SPEC.idStrip;
    const stripY = h - OMR_SPEC.fiducial.edge - fs / 2 - cell / 2;
    const idCells = bits.map((b, i) => ({ x: x0 + i * pitch, y: stripY, size: cell, filled: b === 1 }));

    return {
      index, count: pageCount, from: pg.from, to: pg.to, rows: pg.rows,
      fiducials: fiducialCentres(kind), fiducialSize: fs,
      qr, nameBox, dateBox, text, labels, bubbles, idCells,
    };
  });

  return { paper: kind, w, h, compact, hash, pages };
}
