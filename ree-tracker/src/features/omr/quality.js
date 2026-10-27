// src/features/omr/quality.js
//
// Checks made once a quadrilateral is in hand, in page millimetres through
// its homography, so they mean the same at 640 px and at 2400 px:
//
// - verifySquares: is there really a solid 7 mm square with clean paper
//   round it at each corner? (A shaded bubble is a 4.6 mm disc.)
// - edgeBlurMm: how blurred the photo is, from the edges of those squares.
//
// The brief's blur test was the variance of the Laplacian over the
// quadrilateral's bounding box. On synthetic photos it did not separate sharp
// from blurred: the same 0.25 mm blur scored 0.004-0.008 at 1200 px and
// 0.005-0.012 at 2400 px, while sensor noise alone (sigma 3-4 grey levels)
// holds it above ~0.004 however blurred the photo, so no one threshold
// worked. The edge width is in mm, so it is resolution-free, and averaging
// each profile along the edge cancels the noise. `laplacianVariance` stays
// as a utility.

import { applyHomography, localJacobian } from './homography';
import { sampleBilinear } from './sample';

/**
 * Variance of the 4-neighbour Laplacian over a box (half-open, clipped to
 * the image interior).
 */
export function laplacianVariance(gray, w, h, { x0 = 0, y0 = 0, x1 = w, y1 = h } = {}) {
  const ax = Math.max(1, Math.floor(x0));
  const ay = Math.max(1, Math.floor(y0));
  const bx = Math.min(w - 1, Math.ceil(x1));
  const by = Math.min(h - 1, Math.ceil(y1));
  let s = 0;
  let s2 = 0;
  let n = 0;
  for (let y = ay; y < by; y += 1) {
    const o = y * w;
    for (let x = ax; x < bx; x += 1) {
      const i = o + x;
      const l = gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i];
      s += l;
      s2 += l * l;
      n += 1;
    }
  }
  if (!n) return 0;
  const m = s / n;
  return s2 / n - m * m;
}

const at = (gray, w, h, H, x, y) => {
  const p = applyHomography(H, x, y);
  return sampleBilinear(gray, w, h, p.x, p.y);
};

const median = (a) => {
  const s = a.slice().sort((x, y) => x - y);
  return s[s.length >> 1];
};

/**
 * Are the four corners solid squares of `sizeMm` on clean paper? Through H
 * (page mm -> px): 9 points at +-2.4 mm round each centre (the middle of a
 * 7 mm square; 3.4 mm out from a bubble's centre, past its 2.3 mm edge) must
 * all be darker than halfway to the paper, which is the median of 16 points
 * at 5.5 mm (the 3 mm quiet zone), and the square must be at least 30%
 * darker than the paper.
 * @returns {boolean[]} one per centre
 */
export function verifySquares(gray, w, h, H, centres, sizeMm = 7) {
  const inner = sizeMm * 0.343;
  const ring = sizeMm * 0.785;
  return centres.map((c) => {
    const dark = [];
    for (const dy of [-inner, 0, inner]) for (const dx of [-inner, 0, inner]) dark.push(at(gray, w, h, H, c.x + dx, c.y + dy));
    const paper = [];
    for (let i = 0; i < 16; i += 1) {
      const a = ((i + 0.5) / 16) * 2 * Math.PI;
      paper.push(at(gray, w, h, H, c.x + ring * Math.cos(a), c.y + ring * Math.sin(a)));
    }
    const white = median(paper);
    const black = median(dark);
    if (white - black < 0.3 * white) return false;
    const cut = (white + black) / 2;
    return dark.every((v) => v < cut);
  });
}

export const BLUR = Object.freeze({
  reachMm: 2.5, // profile from 2.5 mm inside the edge to 2.5 mm out
  stepMm: 0.1,
  along: [-2, -1, 0, 1, 2], // mm along the edge, averaged
  minContrast: 20, // grey levels between the square and the paper
  // The camera pixel and the bilinear sampling widen every edge by about
  // this much (sigma, in image px; measured as the floor of the estimate on
  // synthetic photos at 3.6 and 7 px/mm). Taken off in quadrature, so a
  // sharp sheet far from the camera in a 640 px live frame (~1.1 px/mm)
  // doesn't read as blurred.
  pixelFloorPx: 0.45,
});

/**
 * The photo's blur in page mm (the sigma of a Gaussian with the same
 * 25%-75% edge rise, 1.349 sigma), from the 16 edges of the four corner
 * squares: each edge's profile is averaged over 5 lines across it, and the
 * median over the edges is returned, less the pixel's own spread
 * (BLUR.pixelFloorPx). A sharp capture reads ~0.05-0.2 mm. NaN when fewer
 * than 8 edges show contrast.
 */
export function edgeBlurMm(gray, w, h, H, centres, sizeMm = 7) {
  const { reachMm, stepMm, along, minContrast, pixelFloorPx } = BLUR;
  const n = Math.round((2 * reachMm) / stepMm) + 1;
  const half = sizeMm / 2;
  const sigmas = [];
  for (const c of centres) {
    const J = localJacobian(H, c.x, c.y);
    const floorMm = pixelFloorPx / Math.sqrt(Math.abs(J.a * J.d - J.b * J.c));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const prof = new Float64Array(n);
      for (const u of along) {
        for (let i = 0; i < n; i += 1) {
          const s = -reachMm + i * stepMm;
          const x = c.x + dx * (half + s) - dy * u;
          const y = c.y + dy * (half + s) + dx * u;
          prof[i] += at(gray, w, h, H, x, y) / along.length;
        }
      }
      const black = (prof[0] + prof[1] + prof[2] + prof[3] + prof[4]) / 5;
      const white = (prof[n - 1] + prof[n - 2] + prof[n - 3] + prof[n - 4] + prof[n - 5]) / 5;
      if (white - black < minContrast) continue;
      const cross = (level) => {
        const target = black + (white - black) * level;
        for (let i = 1; i < n; i += 1) {
          if (prof[i] >= target && prof[i - 1] < target) {
            return -reachMm + (i - 1 + (target - prof[i - 1]) / (prof[i] - prof[i - 1])) * stepMm;
          }
        }
        return NaN;
      };
      const rise = cross(0.75) - cross(0.25);
      if (Number.isFinite(rise) && rise > 0) {
        const sigma = rise / 1.349;
        sigmas.push(Math.sqrt(Math.max(0, sigma * sigma - floorMm * floorMm)));
      }
    }
  }
  return sigmas.length >= 8 ? median(sigmas) : NaN;
}
