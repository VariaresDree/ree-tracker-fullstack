// @vitest-environment node
//
// What readSheet and detectFiducials return: the shape of a good read, and
// each reason a photo or frame is refused.
import { describe, it, expect } from 'vitest';
import { answerSheetGeometry } from '../exam-export/sheetLayout';
import {
  detectFiducials, OMR_LIMITS, OMR_REASONS, readSheet, REASON_HINTS,
} from './pipeline';
import { applyHomography, composeHomography, solveHomography } from './homography';
import {
  mmToSheetPx, mulberry32, paintRect, photograph, renderSheet, sheetToRGBA,
} from './__fixtures__/synthSheet';
import { makeSet, photoOfPage, scoreRead } from './__fixtures__/scenarios';

const ANSWER_RE = /^[A-F*-]+$/;
const set = makeSet(500, { count: 100, options: 4, paper: 'a4' });
const opts = { printId: set.printId, optionCounts: set.optionCounts };
const page = set.geometry.pages[0];
const marksOf = (pg) => Object.fromEntries(Object.entries(set.truth).filter(([n, t]) => t.length && n >= pg.from && n <= pg.to));
const sheet = renderSheet(page, { ppm: 5, marks: marksOf(page), rng: mulberry32(500) });

// Photograph a (possibly painted-over) sheet with a plain, upright camera.
function shoot(s, { outW = 1200, outH = 1600, fill = 0.88, blurPx = 0.8, H } = {}) {
  const rng = mulberry32(77);
  const scale = (fill * outH) / s.height;
  const camera = H || [scale, 0, (outW - s.width * scale) / 2, 0, scale, (outH - s.height * scale) / 2, 0, 0, 1];
  return { img: photograph(s, { H: camera, outW, outH, blurPx, noiseSigma: 3, rng }), H: camera };
}

const rejected = (res, reason) => {
  expect(res.ok).toBe(false);
  expect(res.reason).toBe(reason);
  expect(res.hint).toBe(REASON_HINTS[reason]);
  expect(res.ms).toBeGreaterThanOrEqual(0);
};

describe('a good read', () => {
  const { img, H } = photoOfPage(set, 0, { seed: 500, flip: true });
  const res = readSheet(img, { ...opts, reviewPpm: 2 });
  const Hmm = composeHomography(H, mmToSheetPx(5)); // the true page mm -> photo px

  it('says which page and which way up, with every row and the answers string', () => {
    expect(res.ok).toBe(true);
    expect(res.page).toEqual({ index: 0, count: 1, paper: 'a4', from: 1, to: 100 });
    expect([180, 270, 90]).toContain(res.rotation);
    expect(res.rows).toHaveLength(100);
    expect(res.answers).toHaveLength(100);
    expect(res.answers).toMatch(ANSWER_RE);
    const score = scoreRead(res, set);
    expect(score.exact).toBe(100);
    const row = res.rows[0];
    expect(Object.keys(row)).toEqual(expect.arrayContaining(['n', 'status', 'choice', 'marked', 'fills', 'levels', 'confidence', 'offset', 'bubbles']));
    expect(row.bubbles).toHaveLength(4);
    expect(row.bubbles[0]).toEqual(expect.objectContaining({ k: 0, letter: 'A', r: page.bubbles[0].r }));
  });

  it('gives the corner centres, H and the name box in the photo, matching the camera to a pixel', () => {
    page.fiducials.forEach((f, i) => {
      const truth = applyHomography(Hmm, f.x, f.y);
      expect(Math.hypot(res.corners[i].x - truth.x, res.corners[i].y - truth.y)).toBeLessThan(1);
      const viaH = applyHomography(res.H, f.x, f.y);
      expect(Math.hypot(viaH.x - res.corners[i].x, viaH.y - res.corners[i].y)).toBeLessThan(1e-6);
    });
    const nb = page.nameBox;
    const truthTL = applyHomography(Hmm, nb.x, nb.y);
    expect(res.nameBox).toHaveLength(4);
    expect(Math.hypot(res.nameBox[0].x - truthTL.x, res.nameBox[0].y - truthTL.y)).toBeLessThan(1.5);
  });

  it('reports quality and, when asked, the straightened sheet', () => {
    expect(res.quality.coverage).toBeGreaterThan(0.4);
    expect(res.quality.skew).toBeLessThan(OMR_LIMITS.maxSkew);
    expect(res.quality.blurMm).toBeLessThan(OMR_LIMITS.maxBlurMm);
    expect(res.quality.sharpness).toBeCloseTo(1 / res.quality.blurMm, 9);
    expect(res.quality.marked).toBeGreaterThan(res.quality.empty + 0.3);
    expect(res.review).toMatchObject({ width: 420, height: 594, ppm: 2 });
    expect(res.review.data).toHaveLength(420 * 594 * 4);
    // The straightened sheet is upright: its top-left square is dark.
    const tl = (Math.round(11.5 * 2) * 420 + Math.round(11.5 * 2)) * 4;
    expect(res.review.data[tl]).toBeLessThan(100);
  });

  it('reads a flat scan, and a 3500 px image (worked on at half size, answered in its own pixels)', () => {
    const flat = readSheet(sheetToRGBA(sheet), opts);
    expect(flat.ok).toBe(true);
    expect(scoreRead(flat, set).exact).toBe(100);
    const big = renderSheet(page, { ppm: 12, marks: marksOf(page), rng: mulberry32(1) });
    const bigRead = readSheet(sheetToRGBA(big), opts);
    expect(bigRead.ok).toBe(true);
    expect(scoreRead(bigRead, set).exact).toBe(100);
    const truth = applyHomography(mmToSheetPx(12), page.fiducials[2].x, page.fiducials[2].y);
    expect(Math.hypot(bigRead.corners[2].x - truth.x, bigRead.corners[2].y - truth.y)).toBeLessThan(1.5);
  });
});

describe('readSheet refuses', () => {
  it('no-sheet: an empty table, or a sheet with a corner square covered', () => {
    const table = { data: new Uint8ClampedArray(900 * 1200 * 4).map((_, i) => (i % 4 === 3 ? 255 : 90 + ((i * 7919) % 13))), width: 900, height: 1200 };
    rejected(readSheet(table, opts), 'no-sheet');
    const f = page.fiducials[1];
    rejected(readSheet(shoot(paintRect(sheet, f.x - 5, f.y - 5, f.x + 5, f.y + 5, 0)).img, opts), 'no-sheet');
  });

  it('too-small: the squares cover under 20% of the frame', () => {
    const res = readSheet(shoot(sheet, { fill: 0.46 }).img, opts);
    rejected(res, 'too-small');
    expect(res.quality.coverage).toBeLessThan(OMR_LIMITS.minCoverage);
    expect(res.corners).toHaveLength(4);
  });

  it('too-skewed: a phone tilted well off flat', () => {
    const src = [[-0.5, -0.5], [sheet.width - 0.5, -0.5], [sheet.width - 0.5, sheet.height - 0.5], [-0.5, sheet.height - 0.5]];
    const H = solveHomography(src, [[290, 150], [910, 150], [1050, 1450], [150, 1450]]);
    const res = readSheet(shoot(sheet, { H }).img, opts);
    rejected(res, 'too-skewed');
    expect(res.quality.skew).toBeGreaterThan(OMR_LIMITS.maxSkew);
  });

  it('blurry: about 1 mm of blur', () => {
    const res = readSheet(shoot(sheet, { blurPx: 4.5 }).img, opts);
    rejected(res, 'blurry');
    expect(res.quality.blurMm).toBeGreaterThan(OMR_LIMITS.maxBlurMm);
  });

  it('unreadable-code: a pencil stroke over the ID strip, or the strip covered', () => {
    const empty = page.idCells.find((c, i) => i >= 2 && i < 18 && !c.filled);
    const scribbled = paintRect(sheet, empty.x, empty.y, empty.x + empty.size, empty.y + empty.size, 0.8);
    rejected(readSheet(shoot(scribbled).img, opts), 'unreadable-code');
    const covered = paintRect(sheet, 20, 280, 125, 288, 0);
    rejected(readSheet(shoot(covered).img, opts), 'unreadable-code');
  });

  it('wrong-set: a sheet from another set; layout-changed when the QR names this set', () => {
    const { img } = shoot(sheet);
    rejected(readSheet({ ...img, data: img.data.slice() }, { ...opts, printId: 'A7P29QXAM3TD' }), 'wrong-set');
    const changed = set.optionCounts.slice();
    changed[4] = 5;
    rejected(readSheet({ ...img, data: img.data.slice() }, { ...opts, optionCounts: changed }), 'wrong-set');
    rejected(readSheet(img, { ...opts, optionCounts: changed, qrPrintId: set.printId }), 'layout-changed');
  });

  it('wrong-page: page 2 when page 1 was expected, saying which page it is', () => {
    const two = makeSet(501, { count: 150, options: 6, paper: 'letter' });
    expect(two.geometry.pages).toHaveLength(2);
    const { img } = photoOfPage(two, 1, { seed: 501 });
    const res = readSheet(img, { printId: two.printId, optionCounts: two.optionCounts, expectPage: 0 });
    rejected(res, 'wrong-page');
    expect(res.page).toMatchObject({ index: 1, count: 2, paper: 'letter' });
    const ok = readSheet(img, { printId: two.printId, optionCounts: two.optionCounts, expectPage: 1 });
    expect(ok.ok).toBe(true);
    expect(ok.page.from).toBe(two.geometry.pages[1].from);
    expect(ok.answers).toHaveLength(two.geometry.pages[1].to - two.geometry.pages[1].from + 1);
  });

  it('has a hint for every reason', () => {
    OMR_REASONS.forEach((r) => expect(typeof REASON_HINTS[r]).toBe('string'));
    expect(REASON_HINTS['no-sheet']).toBe('Fit all four black squares inside the frame.');
    expect(REASON_HINTS['too-small']).toBe('Move closer.');
    expect(REASON_HINTS['too-skewed']).toBe('Hold the phone flat above the sheet.');
    expect(REASON_HINTS.blurry).toBe('Hold steady.');
  });
});

describe('detectFiducials on live frames', () => {
  const frame = (s, { fill = 0.85, blurPx = 0.6, H } = {}) => {
    const scale = (fill * 640) / s.height;
    const camera = H || [scale, 0, (480 - s.width * scale) / 2, 0, scale, (640 - s.height * scale) / 2, 0, 0, 1];
    return { img: photograph(s, { H: camera, outW: 480, outH: 640, blurPx, noiseSigma: 3, rng: mulberry32(3) }), camera };
  };

  it('finds the four squares in a 480 x 640 frame, where they are, ready to capture', () => {
    const { img, camera } = frame(sheet);
    const got = detectFiducials(img);
    expect(got).toMatchObject({ found: true, reason: null, hint: null });
    const Hmm = composeHomography(camera, mmToSheetPx(5));
    got.quad.forEach((q, i) => {
      const t = applyHomography(Hmm, page.fiducials[i].x, page.fiducials[i].y);
      expect(Math.hypot(q.x - t.x, q.y - t.y)).toBeLessThan(2);
    });
    expect(got.coverage).toBeGreaterThan(0.4);
    expect(got.skew).toBeLessThan(0.05);
    expect(got.blurMm).toBeLessThan(OMR_LIMITS.maxBlurMm);
    expect(got.squares.length).toBeGreaterThanOrEqual(4);
    // The strip is read live too: paper, page and the set's layout hash.
    expect(got.page).toEqual({ paper: 'a4', index: 0, hash: set.geometry.hash });
  });

  it('works on a bigger frame by scaling it down first, answering in its pixels', () => {
    const scale = (0.85 * 1280) / sheet.height;
    const camera = [scale, 0, (960 - sheet.width * scale) / 2, 0, scale, (1280 - sheet.height * scale) / 2, 0, 0, 1];
    const img = photograph(sheet, { H: camera, outW: 960, outH: 1280, blurPx: 1, noiseSigma: 3, rng: mulberry32(4) });
    const got = detectFiducials(img);
    expect(got.found).toBe(true);
    const t = applyHomography(composeHomography(camera, mmToSheetPx(5)), page.fiducials[2].x, page.fiducials[2].y);
    expect(Math.hypot(got.quad[2].x - t.x, got.quad[2].y - t.y)).toBeLessThan(3);
  });

  it('says why it is not ready: no sheet, too small, tilted, blurred, strip unreadable', () => {
    const f = page.fiducials[3];
    expect(detectFiducials(frame(paintRect(sheet, f.x - 5, f.y - 5, f.x + 5, f.y + 5, 0)).img)).toMatchObject({ found: false, reason: 'no-sheet', quad: null });
    expect(detectFiducials(frame(sheet, { fill: 0.46 }).img)).toMatchObject({ found: false, reason: 'too-small', hint: 'Move closer.' });
    const src = [[-0.5, -0.5], [sheet.width - 0.5, -0.5], [sheet.width - 0.5, sheet.height - 0.5], [-0.5, sheet.height - 0.5]];
    const tilted = solveHomography(src, [[118, 60], [362, 60], [420, 580], [60, 580]]);
    expect(detectFiducials(frame(sheet, { H: tilted }).img)).toMatchObject({ found: false, reason: 'too-skewed' });
    expect(detectFiducials(frame(sheet, { blurPx: 2.4 }).img)).toMatchObject({ found: false, reason: 'blurry', hint: 'Hold steady.' });
    const covered = paintRect(sheet, 20, 280, 125, 288, 0);
    expect(detectFiducials(frame(covered).img)).toMatchObject({ found: false, reason: 'unreadable-code', page: null });
  });

  it('never takes shaded bubbles for the corners when a real square is covered', () => {
    for (const i of [0, 1, 2, 3]) {
      const f = page.fiducials[i];
      const res = detectFiducials(frame(paintRect(sheet, f.x - 5, f.y - 5, f.x + 5, f.y + 5, 0)).img);
      expect(res.found, `corner ${i}`).toBe(false);
      expect(['no-sheet', 'unreadable-code'], `corner ${i}`).toContain(res.reason);
    }
  });
});

describe('the geometry it reads', () => {
  it('matches answerSheetGeometry for the set (the printed layout)', () => {
    const g = answerSheetGeometry({ optionCounts: set.optionCounts, paper: 'a4', printId: set.printId });
    expect(g.pages[0].bubbles).toEqual(page.bubbles);
  });
});
