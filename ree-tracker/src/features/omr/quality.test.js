// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { answerSheetGeometry } from '../exam-export/sheetLayout';
import { edgeBlurMm, laplacianVariance, verifySquares } from './quality';
import { toGray } from './gray';
import {
  mmToSheetPx, mulberry32, photograph, renderSheet,
} from './__fixtures__/synthSheet';

const PPM = 6;
const geometry = answerSheetGeometry({ optionCounts: Array(40).fill(4), paper: 'a4', printId: 'K7P29QXAM3TD' });
const page = geometry.pages[0];
const sheet = renderSheet(page, { ppm: PPM, marks: { 1: [0], 2: [1] }, rng: mulberry32(9) });
const H = mmToSheetPx(PPM);

// The flat sheet, blurred by sigmaMm, no noise or lighting (identity camera).
const blurred = (sigmaMm, noiseSigma = 0) => toGray(photograph(sheet, {
  H: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  outW: sheet.width,
  outH: sheet.height,
  blurPx: sigmaMm * PPM,
  noiseSigma,
  light: { gradient: 0, vignette: 0 },
  rng: mulberry32(1),
}));

describe('verifySquares', () => {
  it('passes the four corner squares and fails a shaded bubble or blank paper put in their place', () => {
    const gray = blurred(0.1);
    expect(verifySquares(gray, sheet.width, sheet.height, H, page.fiducials)).toEqual([true, true, true, true]);
    const bubble = page.bubbles.find((b) => b.n === 1 && b.k === 0);
    expect(verifySquares(gray, sheet.width, sheet.height, H, [{ x: bubble.cx, y: bubble.cy }, { x: 105, y: 20 }])).toEqual([false, false]);
  });

  it('still passes blurred squares', () => {
    expect(verifySquares(blurred(0.8), sheet.width, sheet.height, H, page.fiducials)).toEqual([true, true, true, true]);
  });
});

describe('edgeBlurMm', () => {
  it('measures the blur in page mm, with or without noise', () => {
    for (const sigma of [0.2, 0.4, 0.8]) {
      const got = edgeBlurMm(blurred(sigma, 4), sheet.width, sheet.height, H, page.fiducials);
      // The render's own pixels (1/6 mm) add a little.
      expect(got).toBeGreaterThan(sigma * 0.9);
      expect(got).toBeLessThan(sigma * 1.1 + 0.08);
    }
  });

  it('is NaN with no squares to measure', () => {
    const blank = new Uint8Array(sheet.width * sheet.height).fill(230);
    expect(edgeBlurMm(blank, sheet.width, sheet.height, H, page.fiducials)).toBeNaN();
  });
});

describe('laplacianVariance', () => {
  it('is high for a sharp image, low for a blurred one, zero for a flat one', () => {
    const box = { x0: 0, y0: 0, x1: sheet.width, y1: 400 };
    const sharp = laplacianVariance(blurred(0.05), sheet.width, sheet.height, box);
    const soft = laplacianVariance(blurred(0.6), sheet.width, sheet.height, box);
    expect(sharp).toBeGreaterThan(soft * 10);
    expect(laplacianVariance(new Uint8Array(100).fill(9), 10, 10)).toBe(0);
  });
});
