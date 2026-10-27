// src/features/paper-sets/print/paginate.js
//
// Pages for the print preview, worked out in JS from measured heights, so the
// preview is exactly what prints and every sheet carries its own "Page X of
// Y" (browsers can't number printed pages from CSS reliably). Pure.

/** CSS px per mm (96 px per inch). */
export const PX_PER_MM = 96 / 25.4;
export const mmToPx = (mm) => mm * PX_PER_MM;

/** A block too tall for a whole column is scaled down, but never below this. */
export const MIN_BLOCK_SCALE = 0.6;

/** The page box: 14 mm top and sides, 18 mm bottom (the footer sits in it). */
export const PAGE_MARGINS = Object.freeze({ top: 14, side: 14, bottom: 18, footer: 8 });
export const COLUMN_GAP_MM = 6;

/** Content width and height of a page, and one column's width, in mm. */
export function pageBox({ w, h }, cols = 2) {
  const contentW = w - 2 * PAGE_MARGINS.side;
  const contentH = h - PAGE_MARGINS.top - PAGE_MARGINS.bottom;
  return { contentW, contentH, colW: (contentW - (cols - 1) * COLUMN_GAP_MM) / cols };
}

/**
 * Pack blocks into pages of columns, greedily and in order.
 *
 * - A block goes in the current column if it fits, else in the next column
 *   (the next page after the last column).
 * - `keepWithNext` (a Part heading) moves on with the block after it, unless
 *   the two can't share even a fresh column.
 * - A block taller than a whole column goes alone in a column, scaled to fit,
 *   but not below MIN_BLOCK_SCALE (`oversize[key]` is its scale).
 *
 * @param {{ key: string, h: number, keepWithNext?: boolean }[]} blocks  heights in any one unit
 * @param {{ firstColH: number, colH: number, cols?: number, gap?: number }} opts
 *   firstColH: a column's height on the first page (below its masthead)
 * @returns {{ pages: { cols: string[][] }[], oversize: Record<string, number> }}
 */
export function packColumns(blocks, { firstColH, colH, cols = 2, gap = 0 }) {
  const pages = [];
  const oversize = {};
  let page;
  let col = 0;
  let used = 0;
  const newPage = () => {
    page = { cols: Array.from({ length: cols }, () => []) };
    pages.push(page);
    col = 0;
    used = 0;
  };
  const nextColumn = () => {
    if (col + 1 < cols) {
      col += 1;
      used = 0;
    } else newPage();
  };
  const capacity = () => (pages.length === 1 ? Math.max(0, firstColH) : colH);
  newPage();

  (blocks || []).forEach((block, i) => {
    const h = Math.max(0, Number(block.h) || 0);
    const next = block.keepWithNext ? blocks[i + 1] : null;
    const need = h + (next ? gap + Math.max(0, Number(next.h) || 0) : 0);
    if (used > 0 && used + gap + Math.min(need, capacity()) > capacity()) nextColumn();
    // Shorter than a full column but taller than the first page's: start it
    // on a later page rather than shrink it.
    if (h > capacity() && h <= colH) {
      while (capacity() < h) nextColumn();
    }
    const cap = capacity();
    let placed = h;
    if (h > cap && h > 0) {
      const scale = Math.max(MIN_BLOCK_SCALE, cap / h);
      oversize[block.key] = scale;
      placed = h * scale;
    }
    page.cols[col].push(block.key);
    used += (used > 0 ? gap : 0) + placed;
    if (oversize[block.key]) nextColumn();
  });

  while (pages.length > 1 && pages[pages.length - 1].cols.every((c) => c.length === 0)) pages.pop();
  return { pages, oversize };
}
