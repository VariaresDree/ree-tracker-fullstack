// src/features/omr/decide.js
//
// From bubble fills to answers. Fills are normalised per page between the
// empty level (e) and the marked level (f), so pencil or pen, bright or dim
// light, all read on one scale: v = 0 is an empty bubble, v = 1 a typical
// mark on this sheet.

export const DECISION = Object.freeze({
  marked: 0.5, // v at or above: a mark
  faint: 0.25, // v at or above (and under `marked`): unsure
  markedGap: 0.2, // a row maximum this far above e counts towards f
  defaultGap: 0.45, // f - e when fewer than 3 rows look marked
  minMarkedRows: 3,
});

const median = (arr) => {
  if (!arr.length) return 0;
  const s = Float64Array.from(arr).sort();
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const letterOf = (k) => String.fromCharCode(65 + k);

/**
 * One decision per item on the page.
 *
 * e is the median fill of the bubbles, leaving out each row's fullest one: a
 * sheet of two-option items, all answered, is half marks, and the plain
 * median would land between empty and marked. With 3+ options this is the
 * same as the median of all bubbles.
 * f is the median of the row maxima above e + 0.2, or e + 0.45 when fewer
 * than 3 rows reach that.
 *
 * Per row, with v = (fill - e) / (f - e):
 * - no v >= 0.5: `blank`, or `unsure` if some v >= 0.25 (a faint mark);
 * - one v >= 0.5, the rest < 0.25: `single`, confidence min(1, (v1 - max(v2, .25)) / .5);
 * - one v >= 0.5 and another >= 0.25: `unsure` (an erasure?), the top as the choice;
 * - two or more v >= 0.5: `multiple`.
 *
 * @param {{ bubbles: { n, k, letter }[] }} page a geometry page
 * @param {number[]} fills one per page.bubbles entry, same order
 * @returns {{ n, status, choice: string|null, marked: string[], fills: number[], levels: number[], confidence: number }[]}
 *   sorted by n; `choice` is the letter an `unsure` row reads as (its top), or
 *   the single mark; `marked` lists every letter with v >= 0.5. The array
 *   also carries `e` and `f`.
 */
export function decideRows(page, fills) {
  const D = DECISION;
  const byRow = new Map();
  page.bubbles.forEach((b, i) => {
    if (!byRow.has(b.n)) byRow.set(b.n, []);
    byRow.get(b.n).push({ k: b.k, letter: b.letter || letterOf(b.k), fill: fills[i] });
  });
  const rows = [...byRow.entries()].sort((a, b) => a[0] - b[0]).map(([n, cells]) => ({ n, cells: cells.sort((a, b) => a.k - b.k) }));
  const rest = [];
  const maxima = [];
  rows.forEach(({ cells }) => {
    let top = 0;
    cells.forEach((c, i) => { if (c.fill > cells[top].fill) top = i; });
    cells.forEach((c, i) => { if (i !== top) rest.push(c.fill); });
    maxima.push(cells[top].fill);
  });
  const e = median(rest.length ? rest : maxima);
  const markedMaxima = maxima.filter((m) => m > e + D.markedGap);
  const f = markedMaxima.length >= D.minMarkedRows ? median(markedMaxima) : e + D.defaultGap;
  const span = Math.max(1e-6, f - e);

  const out = rows.map(({ n, cells }) => {
    const levels = cells.map((c) => (c.fill - e) / span);
    const order = levels.map((v, i) => i).sort((a, b) => levels[b] - levels[a]);
    const v1 = levels[order[0]];
    const v2 = order.length > 1 ? levels[order[1]] : -Infinity;
    const marked = order.filter((i) => levels[i] >= D.marked).map((i) => cells[i].letter);
    const top = cells[order[0]].letter;
    let status;
    let choice = null;
    let confidence;
    if (marked.length >= 2) {
      status = 'multiple';
      confidence = Math.max(0, Math.min(1, (v2 - D.faint) / (D.marked - D.faint)));
    } else if (marked.length === 1) {
      choice = top;
      if (v2 >= D.faint) {
        status = 'unsure';
        confidence = 0;
      } else {
        status = 'single';
        confidence = Math.min(1, (v1 - Math.max(v2, D.faint)) / 0.5);
      }
    } else if (v1 >= D.faint) {
      status = 'unsure';
      choice = top;
      confidence = 0;
    } else {
      status = 'blank';
      confidence = Math.max(0, Math.min(1, (D.marked - v1) / D.marked));
    }
    return { n, status, choice, marked, fills: cells.map((c) => c.fill), levels, confidence };
  });
  // The page's empty and marked levels, for diagnostics.
  out.e = e;
  out.f = f;
  return out;
}

/**
 * The answers string for rows in item order: the letter for `single`, `-`
 * for `blank`, `*` for `multiple`, and the top choice's letter for `unsure`
 * (flagged for review by the caller).
 */
export function answersFromRows(rows) {
  return rows.map((r) => {
    if (r.status === 'blank') return '-';
    if (r.status === 'multiple') return '*';
    return r.choice || '-';
  }).join('');
}
