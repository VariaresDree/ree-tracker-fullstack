// src/features/omr/sample.js
//
// Reading a bubble: the darkness of its centre against the paper just
// outside it, sampled through H (page mm -> image px). Positions come from
// the sheet geometry, nudged per group of rows by `refineOffsets`, which
// finds the printed rings when a curled sheet has moved them off the plane
// the corner squares define.

import { localJacobian } from './homography';

/** Bilinear grey value at (x, y); pixel centres on integers, clamped at the edges. */
export function sampleBilinear(gray, w, h, x, y) {
  const cx = x < 0 ? 0 : x > w - 1 ? w - 1 : x;
  const cy = y < 0 ? 0 : y > h - 1 ? h - 1 : y;
  const x0 = cx | 0;
  const y0 = cy | 0;
  const x1 = x0 + 1 < w ? x0 + 1 : x0;
  const y1 = y0 + 1 < h ? y0 + 1 : y0;
  const fx = cx - x0;
  const fy = cy - y0;
  const r0 = y0 * w;
  const r1 = y1 * w;
  const top = gray[r0 + x0] + (gray[r0 + x1] - gray[r0 + x0]) * fx;
  const bottom = gray[r1 + x0] + (gray[r1 + x1] - gray[r1 + x0]) * fx;
  return top + (bottom - top) * fy;
}

function rings(spec) {
  const pts = [];
  spec.forEach(([radius, count, phase]) => {
    for (let i = 0; i < count; i += 1) {
      const a = phase + (i / count) * 2 * Math.PI;
      pts.push([radius * Math.cos(a), radius * Math.sin(a)]);
    }
  });
  return pts;
}

export const SAMPLING = Object.freeze({
  inner: 0.55, // inner disc radius, x r
  annulus: [1.35, 1.7], // the paper around the bubble, x r
  whitePercentile: 0.85, // fallback white when the plane can't be fitted
  inkBelow: 0.65, // annulus samples under this share of the fitted paper are ink (0.65-0.9 all keep
  // overflowing neighbours out; 0.65 flags the fewest rows along a hard shadow edge)
  ringBand: 0.15, // mm either side of the printed ring
  background: 1.5, // x r, for the ring contrast
  searchMm: 1.2,
  stepMm: 0.3,
  fineStepMm: 0.1,
  rowsPerGroup: 8,
  maxOffsetMm: 2.6,
  // A group whose best ring contrast is under this (grey levels) shows no
  // rings (heavy blur, a smudge): keep the predicted offset.
  minRingContrast: 2,
});

// 37 points on the unit disc (1 + 6 + 12 + 18 on rings 0, 1/3, 2/3, 1) and
// 24 on the annulus (12 + 12, staggered).
const INNER = rings([[0, 1, 0], [1 / 3, 6, 0], [2 / 3, 12, Math.PI / 12], [1, 18, 0]]);
const OUTER = rings([[1.4, 12, 0], [1.65, 12, Math.PI / 12]]);
const ANGLES12 = rings([[1, 12, 0]]);

// Least-squares plane v = a + b x + c y through the points with keep[i].
function fitPlane(xs, ys, vs, keep) {
  let n = 0; let sx = 0; let sy = 0; let sv = 0; let sxx = 0; let syy = 0; let sxy = 0; let sxv = 0; let syv = 0;
  for (let i = 0; i < vs.length; i += 1) {
    if (!keep[i]) continue;
    const x = xs[i]; const y = ys[i]; const v = vs[i];
    n += 1; sx += x; sy += y; sv += v; sxx += x * x; syy += y * y; sxy += x * y; sxv += x * v; syv += y * v;
  }
  // Normal equations, solved by Cramer's rule.
  const det = n * (sxx * syy - sxy * sxy) - sx * (sx * syy - sxy * sy) + sy * (sx * sxy - sxx * sy);
  if (n < 6 || Math.abs(det) < 1e-9) return null;
  const a = (sv * (sxx * syy - sxy * sxy) - sx * (sxv * syy - sxy * syv) + sy * (sxv * sxy - sxx * syv)) / det;
  const b = (n * (sxv * syy - sxy * syv) - sv * (sx * syy - sxy * sy) + sy * (sx * syv - sxv * sy)) / det;
  const c = (n * (sxx * syv - sxv * sxy) - sx * (sx * syv - sxv * sy) + sv * (sx * sxy - sxx * sy)) / det;
  return { a, b, c };
}

/**
 * The fill of one bubble: 1 - (mean of 37 samples in the inner 0.55 r disc,
 * each divided by the paper's brightness at that point), with the paper
 * modelled as a plane fitted to 24 samples on the 1.35 r - 1.7 r annulus.
 *
 * The brief's white level was the annulus's 85th percentile, one number. A
 * shadow edge across a bubble then sets "white" from the lit side, and a
 * blank bubble in the shadow reads half full: on synthetic photos with a
 * hard 50% shadow, two blanks read as marks. The plane follows a gradient or
 * an edge across the bubble. Ink in the annulus (a neighbour's overflowing
 * mark, a stray stroke) is trimmed: samples under `inkBelow` of the first
 * fit are dropped and the plane refitted. `white` is the plane at the centre.
 * cx, cy, r in page mm; H maps page mm -> image px.
 * @returns {{ fill: number, white: number, mean: number }}
 */
export function bubbleFill(gray, w, h, H, cx, cy, r) {
  const J = localJacobian(H, cx, cy);
  const n = OUTER.length;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  const vs = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    xs[i] = OUTER[i][0];
    ys[i] = OUTER[i][1];
    const ox = OUTER[i][0] * r;
    const oy = OUTER[i][1] * r;
    vs[i] = sampleBilinear(gray, w, h, J.x + J.a * ox + J.b * oy, J.y + J.c * ox + J.d * oy);
  }
  const keep = new Uint8Array(n).fill(1);
  let plane = fitPlane(xs, ys, vs, keep);
  for (let pass = 0; pass < 2 && plane; pass += 1) {
    let dropped = 0;
    for (let i = 0; i < n; i += 1) {
      const fit = plane.a + plane.b * xs[i] + plane.c * ys[i];
      keep[i] = vs[i] >= SAMPLING.inkBelow * fit ? 1 : 0;
      if (!keep[i]) dropped += 1;
    }
    if (!dropped) break;
    plane = fitPlane(xs, ys, vs, keep) || plane;
  }
  if (!plane) {
    const sorted = Array.from(vs).sort((p, q) => p - q);
    plane = { a: sorted[Math.round(SAMPLING.whitePercentile * (n - 1))], b: 0, c: 0 };
  }
  const ri = SAMPLING.inner;
  let sum = 0;
  let ratio = 0;
  for (let i = 0; i < INNER.length; i += 1) {
    const ux = INNER[i][0] * ri;
    const uy = INNER[i][1] * ri;
    const v = sampleBilinear(gray, w, h, J.x + (J.a * ux + J.b * uy) * r, J.y + (J.c * ux + J.d * uy) * r);
    sum += v;
    ratio += v / Math.max(1, plane.a + plane.b * ux + plane.c * uy);
  }
  return { fill: 1 - ratio / INNER.length, white: Math.max(1, plane.a), mean: sum / INNER.length };
}

/** Column, row and group (8 rows of one column) of item n on a geometry page. */
export function cellOf(page, n) {
  const k0 = n - page.from;
  const rows = Math.max(1, page.rows);
  const col = Math.floor(k0 / rows);
  const row = k0 % rows;
  return { col, row, group: `${col}:${Math.floor(row / SAMPLING.rowsPerGroup)}` };
}

/**
 * Per group of 8 rows in a column, the (dx, dy) in page mm that best lines the
 * geometry's bubbles up with the printed rings: the mean, over the group's
 * bubbles, of (paper at 1.5 r) - (the ring band r +- 0.15 mm). Searched over
 * +-1.2 mm in 0.3 mm steps, then +-0.2 mm in 0.1 mm steps around the best.
 *
 * The search is centred on a prediction, not on zero: the group above in the
 * same column, or the first group of the previous column. Curl moves the
 * sheet smoothly, so neighbours differ by far less than the window while the
 * middle of a curled page can sit 2 mm off; centring on zero alone would cap
 * the correction at 1.2 mm.
 *
 * @returns {Map<string, { dx: number, dy: number, contrast: number }>} keyed by cellOf(...).group
 */
export function refineOffsets(gray, w, h, H, page) {
  const groups = new Map();
  for (const b of page.bubbles) {
    const { col, row, group } = cellOf(page, b.n);
    if (!groups.has(group)) groups.set(group, { col, band: Math.floor(row / SAMPLING.rowsPerGroup), bubbles: [] });
    groups.get(group).bubbles.push(b);
  }
  // Per bubble: the local linear map, and every sample's offset in px.
  const band = SAMPLING.ringBand;
  const prepared = new Map();
  for (const [key, g] of groups) {
    prepared.set(key, g.bubbles.map((b) => {
      const J = localJacobian(H, b.cx, b.cy);
      const ring = [];
      for (const [ux, uy] of ANGLES12) {
        for (const rr of [b.r - band, b.r, b.r + band]) {
          ring.push(J.a * ux * rr + J.b * uy * rr, J.c * ux * rr + J.d * uy * rr);
        }
      }
      const bg = [];
      for (const [ux, uy] of ANGLES12) {
        const rr = b.r * SAMPLING.background;
        bg.push(J.a * ux * rr + J.b * uy * rr, J.c * ux * rr + J.d * uy * rr);
      }
      return { J, ring, bg };
    }));
  }
  const score = (list, dx, dy) => {
    let total = 0;
    for (const { J, ring, bg } of list) {
      const x0 = J.x + J.a * dx + J.b * dy;
      const y0 = J.y + J.c * dx + J.d * dy;
      let rs = 0;
      for (let i = 0; i < ring.length; i += 2) rs += sampleBilinear(gray, w, h, x0 + ring[i], y0 + ring[i + 1]);
      let bs = 0;
      for (let i = 0; i < bg.length; i += 2) bs += sampleBilinear(gray, w, h, x0 + bg[i], y0 + bg[i + 1]);
      total += bs / (bg.length / 2) - rs / (ring.length / 2);
    }
    return total / list.length;
  };
  const out = new Map();
  const ordered = [...groups.entries()].sort((a, b) => a[1].col - b[1].col || a[1].band - b[1].band);
  const { searchMm, stepMm, fineStepMm, maxOffsetMm, minRingContrast } = SAMPLING;
  const steps = Math.round(searchMm / stepMm);
  const clampMm = (v) => Math.max(-maxOffsetMm, Math.min(maxOffsetMm, v));
  for (const [key, g] of ordered) {
    const pred = out.get(`${g.col}:${g.band - 1}`) || out.get(`${g.col - 1}:0`) || { dx: 0, dy: 0 };
    const list = prepared.get(key);
    let best = { dx: pred.dx, dy: pred.dy, s: -Infinity };
    for (let i = -steps; i <= steps; i += 1) {
      for (let j = -steps; j <= steps; j += 1) {
        const dx = clampMm(pred.dx + i * stepMm);
        const dy = clampMm(pred.dy + j * stepMm);
        const s = score(list, dx, dy);
        if (s > best.s) best = { dx, dy, s };
      }
    }
    const coarse = best;
    for (let i = -2; i <= 2; i += 1) {
      for (let j = -2; j <= 2; j += 1) {
        if (!i && !j) continue;
        const dx = clampMm(coarse.dx + i * fineStepMm);
        const dy = clampMm(coarse.dy + j * fineStepMm);
        const s = score(list, dx, dy);
        if (s > best.s) best = { dx, dy, s };
      }
    }
    if (best.s < minRingContrast) best = { dx: pred.dx, dy: pred.dy, s: best.s };
    out.set(key, { dx: best.dx, dy: best.dy, contrast: best.s });
  }
  return out;
}
