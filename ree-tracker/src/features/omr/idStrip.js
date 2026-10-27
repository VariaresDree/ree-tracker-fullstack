// src/features/omr/idStrip.js
//
// The 20-cell strip on the bottom edge (see sheetLayout.js) says which paper
// the sheet was laid out for, which page it is and which set (a 10-bit hash).
// Read through a candidate H: a wrong paper or orientation lands the cells on
// blank paper or on the wrong cells, and the frame bits or parity refuse it.

import { answerSheetGeometry } from '../exam-export/sheetLayout';
import { sampleBilinear } from './sample';
import { applyHomography } from './homography';

const cache = new Map();

/** The strip's cells for a paper, straight from the printed geometry: [{ x, y, size }] (top-left, mm). */
export function stripCells(paper) {
  if (!cache.has(paper)) {
    const g = answerSheetGeometry({ optionCounts: [4], paper, printId: '' });
    cache.set(paper, g.pages[0].idCells.map(({ x, y, size }) => ({ x, y, size })));
  }
  return cache.get(paper);
}

export const STRIP = Object.freeze({
  // A cell is on when its centre is darker than this fraction of the paper
  // right next to it (solid black reads ~0.1-0.3, blank paper ~1).
  onBelow: 0.55,
});

/**
 * The strip's bits through H (page mm -> image px). Each cell's mean over a
 * 3 x 3 grid in its middle half is compared with the paper just above and
 * below it and in the gaps either side (the 75th percentile of 8 samples),
 * so a lighting gradient along the strip doesn't matter.
 * @param {{ x, y, size }[]} cells top-left corners in page mm
 * @returns {number[]} 0/1 per cell
 */
export function readIdStrip(gray, w, h, H, cells) {
  const at = (x, y) => {
    const p = applyHomography(H, x, y);
    return sampleBilinear(gray, w, h, p.x, p.y);
  };
  return cells.map(({ x, y, size }) => {
    let sum = 0;
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) sum += at(x + size * (0.25 + 0.25 * i), y + size * (0.25 + 0.25 * j));
    }
    const mean = sum / 9;
    const gap = 1; // mm into the 2 mm gap between cells, or above and below
    const paper = [
      at(x + size * 0.3, y - 1.4), at(x + size * 0.7, y - 1.4),
      at(x + size * 0.3, y + size + 1.4), at(x + size * 0.7, y + size + 1.4),
      at(x - gap, y + size * 0.3), at(x - gap, y + size * 0.7),
      at(x + size + gap, y + size * 0.3), at(x + size + gap, y + size * 0.7),
    ].sort((a, b) => a - b);
    const white = Math.max(1, paper[5]);
    return mean < white * STRIP.onBelow ? 1 : 0;
  });
}
