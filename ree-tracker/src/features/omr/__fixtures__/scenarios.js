// src/features/omr/__fixtures__/scenarios.js
//
// Seeded test cases for the scanner: a set (option counts, paper), a random
// answer per item (10% blank, 5% two marks), every page rendered, optionally
// curled, and photographed by a random but plausible phone. Plus the scoring
// of a read against the truth.

import { answerSheetGeometry } from '../../exam-export/sheetLayout';
import {
  cameraH, curl, mulberry32, photograph, renderSheet,
} from './synthSheet';

export const PRINT_ID = 'K7P29QXAM3TD';

const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const between = (rng, lo, hi) => lo + (hi - lo) * rng();

/**
 * The set and its answers.
 * @returns {{ optionCounts: number[], paper: string, truth: { [n]: number[] }, geometry }}
 *   truth[n]: [] blank, [k] one mark, [a, b] two marks
 */
export function makeSet(seed, { options, count, paper, blankRate = 0.1, doubleRate = 0.05, printId = PRINT_ID } = {}) {
  const rng = mulberry32(seed * 7919 + 13);
  const opt = options ?? pick(rng, [4, 5, 6, 'mixed']);
  const n = count ?? pick(rng, [40, 60, 100, 100, 150]);
  const optionCounts = Array.from({ length: n }, () => (opt === 'mixed' ? pick(rng, [2, 3, 4, 4, 5, 6]) : opt));
  const sheetPaper = paper ?? pick(rng, ['a4', 'letter', 'long']);
  const truth = {};
  optionCounts.forEach((k, i) => {
    const r = rng();
    if (r < blankRate) truth[i + 1] = [];
    else if (r < blankRate + doubleRate && k >= 2) {
      const a = Math.floor(rng() * k);
      const b = (a + 1 + Math.floor(rng() * (k - 1))) % k;
      truth[i + 1] = [a, b].sort((x, y) => x - y);
    } else truth[i + 1] = [Math.floor(rng() * k)];
  });
  const geometry = answerSheetGeometry({
    optionCounts, paper: sheetPaper, printId, keyVersion: 'k1', meta: { setLabel: 'SET B', setCode: 'K7P2-9QXA-M3TD', title: 'EE Pre-board, Mathematics' },
  });
  return { optionCounts, paper: sheetPaper, truth, geometry, printId };
}

/**
 * One photographed page.
 * @param {object} set from makeSet
 * @param {number} pageIndex
 * @param {{ seed: number, ppm?, outLong?, flip?, curlMm?, faint?, camera?: object, photo?: object, pencil?: object }} opts
 * @returns {{ img, page, H, sheet, portrait }} H: rendered-sheet px -> photo px;
 *   portrait: false for a landscape frame with the sheet turned a quarter
 */
export function photoOfPage(set, pageIndex, opts) {
  const { seed, ppm = 5, outLong = 1600, flip, curlMm = 0, faint = {}, camera = {}, photo = {}, pencil = {} } = opts;
  const rng = mulberry32(seed * 104729 + pageIndex * 31 + 7);
  const page = set.geometry.pages[pageIndex];
  const marks = {};
  for (let n = page.from; n <= page.to; n += 1) if (set.truth[n].length) marks[n] = set.truth[n];
  let sheet = renderSheet(page, { ppm, marks, faint, rng, pencil });
  if (curlMm) sheet = curl(sheet, curlMm, { angleDeg: between(rng, 30, 150) });
  const portrait = rng() < 0.85;
  const outW = portrait ? Math.round(outLong * 0.75) : outLong;
  const outH = portrait ? outLong : Math.round(outLong * 0.75);
  const H = cameraH({
    srcW: sheet.width,
    srcH: sheet.height,
    outW,
    outH,
    rng,
    fill: between(rng, 0.78, 0.94),
    angleDeg: portrait ? between(rng, -7, 7) : 90 + between(rng, -7, 7),
    flip: flip ?? rng() < 0.5,
    tilt: 0.035,
    ...camera,
  });
  const img = photograph(sheet, {
    H,
    outW,
    outH,
    rng,
    blurPx: between(rng, 0.5, 1.1),
    noiseSigma: between(rng, 1.5, 4.5),
    light: { gradient: between(rng, 0, 0.35), vignette: between(rng, 0, 0.25) },
    background: between(rng, 30, 140),
    ...photo,
  });
  return { img, page, H, sheet, portrait };
}

const letter = (k) => String.fromCharCode(65 + k);

/**
 * How a read did against the truth, per row.
 * exact: single with the right letter, blank as blank, two marks as `multiple`
 * with both letters.
 */
export function scoreRead(result, set) {
  const out = {
    rows: 0, exact: 0, answersRight: 0, blankAsSingle: 0, doubles: 0, doublesCaught: 0, unsure: 0, wrong: [],
  };
  if (!result.ok) return out;
  result.rows.forEach((row, i) => {
    const t = set.truth[row.n];
    out.rows += 1;
    if (row.status === 'unsure') out.unsure += 1;
    let exact;
    let expected;
    if (t.length === 0) {
      exact = row.status === 'blank';
      expected = '-';
      if (row.status === 'single') out.blankAsSingle += 1;
    } else if (t.length === 1) {
      exact = row.status === 'single' && row.choice === letter(t[0]);
      expected = letter(t[0]);
    } else {
      out.doubles += 1;
      const caught = row.status === 'multiple';
      if (caught) out.doublesCaught += 1;
      exact = caught && row.marked.slice().sort().join('') === t.map(letter).join('');
      expected = '*';
    }
    if (exact) out.exact += 1;
    else out.wrong.push({ n: row.n, status: row.status, read: result.answers[i], expected, levels: row.levels.map((v) => +v.toFixed(2)) });
    if (result.answers[i] === expected) out.answersRight += 1;
  });
  return out;
}

/** Sum scoreRead outputs. */
export function addScores(a, b) {
  return {
    rows: a.rows + b.rows,
    exact: a.exact + b.exact,
    answersRight: a.answersRight + b.answersRight,
    blankAsSingle: a.blankAsSingle + b.blankAsSingle,
    doubles: a.doubles + b.doubles,
    doublesCaught: a.doublesCaught + b.doublesCaught,
    unsure: a.unsure + b.unsure,
    wrong: a.wrong.concat(b.wrong),
  };
}

export const emptyScore = () => ({
  rows: 0, exact: 0, answersRight: 0, blankAsSingle: 0, doubles: 0, doublesCaught: 0, unsure: 0, wrong: [],
});
