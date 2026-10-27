// src/features/omr/components.js
//
// Finding the four solid corner squares in a thresholded frame: label the dark
// blobs, keep the ones shaped like a solid square (not a filled bubble, a QR
// finder ring or a letter), then pick the four that make a sheet-shaped
// quadrilateral.

import { localJacobian, solveHomography } from './homography';

/**
 * 4-connected components of a binary image (1 = dark), two-pass with
 * union-find. Only components with minArea <= area <= maxArea are returned.
 * Each carries its centroid, its covariance (sxx, syy, sxy, in px^2, with the
 * 1/12 px^2 of a pixel's own extent added so a square of side s gives s^2/12)
 * and maxDist, the distance from the centroid to the far edge of the furthest
 * pixel (pixel-centre distance + 0.5; a square's ratio maxDist/sqrt(area) is
 * then ~0.707 even when small, a disc's ~0.564).
 *
 * The returned array also carries `labels` (Int32Array, w*h): the component
 * id of every pixel (0 = background), matching each component's `id`.
 */
export function connectedComponents(bin, w, h, { minArea = 1, maxArea = Infinity } = {}) {
  const n = w * h;
  const labels = new Int32Array(n);
  let parent = new Int32Array(1024);
  let next = 1;
  const find = (a) => {
    let r = a;
    while (parent[r] !== r) r = parent[r];
    while (parent[a] !== r) { const t = parent[a]; parent[a] = r; a = t; }
    return r;
  };
  for (let y = 0; y < h; y += 1) {
    const o = y * w;
    for (let x = 0; x < w; x += 1) {
      const i = o + x;
      if (!bin[i]) continue;
      const up = y > 0 ? labels[i - w] : 0;
      const left = x > 0 ? labels[i - 1] : 0;
      if (up && left) {
        const ru = find(up);
        const rl = find(left);
        if (ru !== rl) {
          if (ru < rl) parent[rl] = ru; else parent[ru] = rl;
        }
        labels[i] = ru < rl ? ru : rl;
      } else if (up || left) {
        labels[i] = up || left;
      } else {
        if (next >= parent.length) {
          const grown = new Int32Array(parent.length * 2);
          grown.set(parent);
          parent = grown;
        }
        parent[next] = next;
        labels[i] = next;
        next += 1;
      }
    }
  }
  const area = new Float64Array(next);
  const sx = new Float64Array(next);
  const sy = new Float64Array(next);
  const sxx = new Float64Array(next);
  const syy = new Float64Array(next);
  const sxy = new Float64Array(next);
  const minX = new Int32Array(next).fill(w);
  const minY = new Int32Array(next).fill(h);
  const maxX = new Int32Array(next).fill(-1);
  const maxY = new Int32Array(next).fill(-1);
  for (let y = 0; y < h; y += 1) {
    const o = y * w;
    for (let x = 0; x < w; x += 1) {
      const i = o + x;
      if (!labels[i]) continue;
      const r = find(labels[i]);
      labels[i] = r;
      area[r] += 1;
      sx[r] += x;
      sy[r] += y;
      sxx[r] += x * x;
      syy[r] += y * y;
      sxy[r] += x * y;
      if (x < minX[r]) minX[r] = x;
      if (x > maxX[r]) maxX[r] = x;
      if (y < minY[r]) minY[r] = y;
      if (y > maxY[r]) maxY[r] = y;
    }
  }
  const out = [];
  for (let r = 1; r < next; r += 1) {
    const a = area[r];
    if (!a || a < minArea || a > maxArea) continue;
    const cx = sx[r] / a;
    const cy = sy[r] / a;
    let far = 0;
    for (let y = minY[r]; y <= maxY[r]; y += 1) {
      const o = y * w;
      for (let x = minX[r]; x <= maxX[r]; x += 1) {
        if (labels[o + x] !== r) continue;
        const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d > far) far = d;
      }
    }
    out.push({
      id: r,
      area: a,
      minX: minX[r],
      minY: minY[r],
      maxX: maxX[r],
      maxY: maxY[r],
      cx,
      cy,
      sxx: sxx[r] / a - cx * cx + 1 / 12,
      syy: syy[r] / a - cy * cy + 1 / 12,
      sxy: sxy[r] / a - cx * cy,
      maxDist: Math.sqrt(far) + 0.5,
    });
  }
  out.labels = labels;
  return out;
}

/** Shape measures of a component: furthest-pixel ratio, moment compactness, eigenvalue ratio. */
export function shapeOf(c) {
  const det = c.sxx * c.syy - c.sxy * c.sxy;
  const tr = c.sxx + c.syy;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + disc;
  const l2 = tr / 2 - disc;
  return {
    farRatio: c.maxDist / Math.sqrt(c.area),
    compactness: det > 0 ? c.area / (12 * Math.sqrt(det)) : 0,
    eigenRatio: l2 > 0 ? l1 / l2 : Infinity,
  };
}

export const FIDUCIAL_RULES = Object.freeze({
  ringAt: 0.6, // ring points at 0.6x the equivalent radius
  ringPoints: 16,
  // The brief's 0.64 (square 0.707, disc 0.564) drops real squares once blur
  // rounds their corners: at ~0.8 mm of blur they measure 0.62-0.64. Discs
  // still fall below 0.6, and shaded bubbles that pixelate into squarish
  // blobs are turned away by pickQuad's per-corner scale check and the
  // pipeline's verifySquares.
  minFarRatio: 0.6,
  compactness: [0.85, 1.15],
  maxEigenRatio: 2.5,
  // The centre must be clearly darker than the paper around the square
  // (1.8x the equivalent radius is inside the 3 mm quiet zone): this drops
  // grey smudges and shadows the adaptive threshold let through.
  maxCentreToWhite: 0.7,
  // Quiet zone: of 16 points at 1.6x the equivalent radius (~6.3 mm from a
  // corner square's centre, inside its 3 mm margin), at most 2 may be dark.
  // At live resolution a QR finder pattern blurs into a solid 6 mm square;
  // its surroundings are QR modules, so this is what turns it away.
  quietAt: 1.6,
  quietLevel: 0.3,
  maxDarkInQuiet: 2,
});

/**
 * A solid square? Size is filtered by `connectedComponents`' area bounds; this
 * checks solidity (centroid and 16 ring points at 0.6x the equivalent radius
 * dark), square-not-disc (maxDist/sqrt(area) >= 0.6), moment compactness
 * 0.85-1.15 with an eigenvalue ratio under 2.5, and contrast against the
 * paper around it. "Dark" means inside this component when `labels` is
 * given (from `connectedComponents`), else darker than halfway between the
 * centre and the surrounding paper.
 */
export function isFiducialCandidate(c, gray, w, h, { labels } = {}) {
  const R = FIDUCIAL_RULES;
  const s = shapeOf(c);
  if (s.farRatio < R.minFarRatio) return false;
  if (s.compactness < R.compactness[0] || s.compactness > R.compactness[1]) return false;
  if (s.eigenRatio > R.maxEigenRatio) return false;
  const eq = Math.sqrt(c.area / Math.PI);
  const at = (x, y) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= w || yi >= h) return -1;
    return yi * w + xi;
  };
  const centre = at(c.cx, c.cy);
  if (centre < 0) return false;
  // Paper level: the median of 16 points at 1.8x the equivalent radius.
  const ring = [];
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * 2 * Math.PI;
    const j = at(c.cx + Math.cos(a) * eq * 1.8, c.cy + Math.sin(a) * eq * 1.8);
    if (j >= 0) ring.push(gray[j]);
  }
  if (ring.length < 8) return false;
  ring.sort((a, b) => a - b);
  const white = ring[ring.length >> 1];
  const centreGray = gray[centre];
  if (centreGray > white * R.maxCentreToWhite) return false;
  const cut = (white + centreGray) / 2;
  const dark = (j) => (j >= 0 && (labels ? labels[j] === c.id : gray[j] < cut));
  if (!dark(centre)) return false;
  for (let i = 0; i < R.ringPoints; i += 1) {
    const a = (i / R.ringPoints) * 2 * Math.PI;
    if (!dark(at(c.cx + Math.cos(a) * eq * R.ringAt, c.cy + Math.sin(a) * eq * R.ringAt))) return false;
  }
  // Busy = nearly as dark as the square. Paper under a shadow (half as
  // bright) is still well above 30% of the way up from the square.
  const quietCut = centreGray + R.quietLevel * (white - centreGray);
  let busy = 0;
  for (let i = 0; i < 16; i += 1) {
    const a = ((i + 0.5) / 16) * 2 * Math.PI;
    const j = at(c.cx + Math.cos(a) * eq * R.quietAt, c.cy + Math.sin(a) * eq * R.quietAt);
    if (j >= 0 && gray[j] < quietCut) busy += 1;
  }
  return busy <= R.maxDarkInQuiet;
}

/**
 * Four points in reading order: clockwise around their centroid (y down),
 * starting from the one nearest the top-left (smallest x + y).
 */
export function orderCorners(pts) {
  const P = pts.map((p) => ({ ...p, x: p.x ?? p.cx, y: p.y ?? p.cy }));
  const mx = P.reduce((s, p) => s + p.x, 0) / P.length;
  const my = P.reduce((s, p) => s + p.y, 0) / P.length;
  P.sort((a, b) => Math.atan2(a.y - my, a.x - mx) - Math.atan2(b.y - my, b.x - mx));
  let start = 0;
  P.forEach((p, i) => { if (p.x + p.y < P[start].x + P[start].y) start = i; });
  return P.slice(start).concat(P.slice(0, start));
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Shoelace area of a polygon. */
export function polygonArea(q) {
  let s = 0;
  for (let i = 0; i < q.length; i += 1) {
    const a = q[i];
    const b = q[(i + 1) % q.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

/** Strictly convex, clockwise in image coordinates (y down)? */
export function isConvexQuad(q) {
  for (let i = 0; i < 4; i += 1) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    const c = q[(i + 2) % 4];
    if ((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) <= 0) return false;
  }
  return true;
}

/**
 * How far from a flat, square-on view: the larger of the two opposite-side
 * length ratios, minus 1 (0 for a rectangle; a phone tilted ~15 degrees over
 * an A4 sheet at 30 cm gives ~0.3).
 */
export function quadSkew(q) {
  const top = dist(q[0], q[1]);
  const right = dist(q[1], q[2]);
  const bottom = dist(q[2], q[3]);
  const left = dist(q[3], q[0]);
  return Math.max(Math.max(top, bottom) / Math.min(top, bottom), Math.max(left, right) / Math.min(left, right)) - 1;
}

/** Long side over short side, averaged over opposite sides (>= 1 either way up). */
export function quadAspect(q) {
  const across = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2;
  const down = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2;
  return across > down ? across / down : down / across;
}

export const QUAD_RULES = Object.freeze({
  maxCandidates: 12,
  maxSizeRatio: 2.5,
  maxOppositeRatio: 1.6,
  aspectTolerance: 0.25,
  // A corner square is ~3% of the sheet's size (7 mm against sqrt(187 x 274)
  // mm). Four small specks far apart, or four big blobs close together, are
  // not a sheet. Wide bounds (0.5x-2x) leave room for perspective.
  squareToQuad: [0.015, 0.065],
  // With `rects`: each square's size against the size the quad's own
  // homography predicts at that corner (7 mm x local scale). A shaded bubble
  // is ~0.6 of that (a 4.6 mm disc), an ID cell 0.43, a corner square ~1
  // (slightly more after thresholding a blurred edge). At live resolution
  // (~2 px/mm) a shaded bubble looks as square as a corner square does, and
  // the near side of a tilted sheet makes its bubbles as big as the far
  // side's squares, so this per-corner check is what keeps bubbles out.
  cornerScale: [0.75, 1.5],
  // The corner squares are the outermost squares on a sheet. With one of
  // them covered, four shaded bubbles can pose as the corners of a sheet half
  // the size (at ~2 px/mm a 4.6 mm disc passes for a 3.5 mm square, and
  // their sizes agree with that smaller quad), but the real squares then lie
  // outside it. Two or more square-like blobs at least 0.8x the quad's
  // smallest square, outside it, and it is refused.
  maxOutside: 1,
  outsideSize: 0.8,
});

// Is p outside the convex quad q (clockwise, y down), by more than `margin` px?
function outsideQuad(q, p, margin) {
  for (let i = 0; i < 4; i += 1) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    if (((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / len < -margin) return true;
  }
  return false;
}

// Each corner square's size over the size predicted by the quad's homography.
function cornerScales(q, rect, squareMm) {
  const across = (Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y) + Math.hypot(q[2].x - q[3].x, q[2].y - q[3].y)) / 2;
  const down = (Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y) + Math.hypot(q[2].x - q[1].x, q[2].y - q[1].y)) / 2;
  const W = across > down ? Math.max(rect.w, rect.h) : Math.min(rect.w, rect.h);
  const Hh = across > down ? Math.min(rect.w, rect.h) : Math.max(rect.w, rect.h);
  const mm = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: Hh }, { x: 0, y: Hh }];
  const H = solveHomography(mm, q);
  if (!H) return null;
  return mm.map((p, i) => {
    const J = localJacobian(H, p.x, p.y);
    const scale = Math.sqrt(Math.abs(J.a * J.d - J.b * J.c));
    return q[i].size / (squareMm * scale);
  });
}

/**
 * The best sheet-shaped quadrilateral among the candidates: over the 12
 * largest, every convex 4-subset whose squares are within 2.5x in size,
 * whose opposite sides are within 1.6x, whose aspect is within 25% of one of
 * the papers' (either way up), whose squares are in scale with it, and with
 * at most one comparable square outside it. Scored by area.
 * @param {{ cx, cy, area }[]} cands
 * @param {{
 *   aspects?: number[],                  // corner-centre aspects, (h - 23) / (w - 23)
 *   rects?: { w: number, h: number }[],  // or the corner-centre rectangles in mm (aspects follow),
 *                                        // which also turns on the per-corner scale check
 *   squareMm?: number,                   // corner square side (7)
 *   keep?: number,                       // runners-up to return too (3)
 * }} opts
 * @returns {{ quad: {x,y,size}[], score: number, outside: number, alternatives: object[] } | null}
 *   quad in reading order (TL, TR, BR, BL as seen); size = sqrt(area);
 *   outside: comparable squares outside it (0 or 1)
 */
export function pickQuad(cands, { aspects: given = [], rects = null, squareMm = 7, keep = 3 } = {}) {
  const R = QUAD_RULES;
  const aspects = rects ? rects.map((r) => r.h / r.w) : given;
  const all = cands.map((c) => ({ x: c.cx, y: c.cy, size: Math.sqrt(c.area) })).sort((a, b) => b.size - a.size);
  const top = all.slice(0, R.maxCandidates);
  const found = [];
  const n = top.length;
  for (let a = 0; a < n; a += 1) {
    for (let b = a + 1; b < n; b += 1) {
      for (let c = b + 1; c < n; c += 1) {
        for (let d = c + 1; d < n; d += 1) {
          const four = [top[a], top[b], top[c], top[d]];
          const sizes = four.map((p) => p.size);
          if (Math.max(...sizes) / Math.min(...sizes) > R.maxSizeRatio) continue;
          const q = orderCorners(four);
          if (!isConvexQuad(q)) continue;
          if (quadSkew(q) + 1 > R.maxOppositeRatio) continue;
          const aspect = quadAspect(q);
          if (aspects.length && !aspects.some((t) => Math.abs(aspect / t - 1) <= R.aspectTolerance)) continue;
          const area = polygonArea(q);
          const meanSize = sizes.reduce((s, v) => s + v, 0) / 4;
          const rel = meanSize / Math.sqrt(area);
          if (rel < R.squareToQuad[0] || rel > R.squareToQuad[1]) continue;
          if (rects) {
            const rect = rects.reduce((best, r) => (Math.abs(r.h / r.w - aspect) < Math.abs(best.h / best.w - aspect) ? r : best));
            const scales = cornerScales(q, rect, squareMm);
            if (!scales || scales.some((s) => s < R.cornerScale[0] || s > R.cornerScale[1])) continue;
          }
          const smallest = Math.min(...sizes);
          let outside = 0;
          for (const p of all) {
            if (p.size < smallest * R.outsideSize) break;
            if (!four.includes(p) && outsideQuad(q, p, smallest)) outside += 1;
          }
          if (outside > R.maxOutside) continue;
          found.push({ quad: q, score: area, outside });
        }
      }
    }
  }
  if (!found.length) return null;
  found.sort((p, q) => q.score - p.score);
  return { ...found[0], alternatives: found.slice(1, 1 + keep) };
}
