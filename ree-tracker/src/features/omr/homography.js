// src/features/omr/homography.js
//
// The plane-to-plane map from page millimetres to photo pixels, fitted to the
// four corner squares. `H` is a flat 9-element array, row-major, scaled so
// H[8] = 1:
//
//   x' = (H0 x + H1 y + H2) / (H6 x + H7 y + H8)
//   y' = (H3 x + H4 y + H5) / (H6 x + H7 y + H8)

const pt = (p) => (Array.isArray(p) ? { x: p[0], y: p[1] } : p);

/**
 * Solve an 8 x 8 linear system by Gaussian elimination with partial pivoting.
 * @param {number[][]|Float64Array} A 8 rows of 8, or a flat 64-element array (not modified)
 * @param {number[]} b 8 values (not modified)
 * @param {number} [eps] a pivot smaller than this means singular
 * @returns {Float64Array|null}
 */
export function solveLinear8(A, b, eps = 1e-10) {
  const M = new Float64Array(72); // 8 x 9, augmented
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) M[r * 9 + c] = A.length === 64 ? A[r * 8 + c] : A[r][c];
    M[r * 9 + 8] = b[r];
  }
  for (let col = 0; col < 8; col += 1) {
    let best = col;
    let bestAbs = Math.abs(M[col * 9 + col]);
    for (let r = col + 1; r < 8; r += 1) {
      const a = Math.abs(M[r * 9 + col]);
      if (a > bestAbs) { best = r; bestAbs = a; }
    }
    if (!(bestAbs > eps)) return null;
    if (best !== col) {
      for (let c = col; c < 9; c += 1) {
        const t = M[col * 9 + c];
        M[col * 9 + c] = M[best * 9 + c];
        M[best * 9 + c] = t;
      }
    }
    const p = M[col * 9 + col];
    for (let r = col + 1; r < 8; r += 1) {
      const f = M[r * 9 + col] / p;
      if (f === 0) continue;
      for (let c = col; c < 9; c += 1) M[r * 9 + c] -= f * M[col * 9 + c];
    }
  }
  const x = new Float64Array(8);
  for (let r = 7; r >= 0; r -= 1) {
    let s = M[r * 9 + 8];
    for (let c = r + 1; c < 8; c += 1) s -= M[r * 9 + c] * x[c];
    x[r] = s / M[r * 9 + r];
  }
  return x;
}

// Hartley normalisation: centroid to the origin, mean distance sqrt(2), so
// the 8 x 8 system is well conditioned whether points are in mm or in pixels.
function normaliser(pts) {
  let mx = 0;
  let my = 0;
  pts.forEach((p) => { mx += p.x; my += p.y; });
  mx /= pts.length;
  my /= pts.length;
  let d = 0;
  pts.forEach((p) => { d += Math.hypot(p.x - mx, p.y - my); });
  d /= pts.length;
  const s = d > 0 ? Math.SQRT2 / d : 1;
  return { s, mx, my };
}

// Any three of four points on one line (relative to the spread): no homography.
function hasCollinearTriple(pts) {
  let scale = 0;
  for (let i = 0; i < 4; i += 1) for (let j = i + 1; j < 4; j += 1) scale = Math.max(scale, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
  if (!(scale > 0)) return true;
  const tol = 1e-9 * scale * scale;
  for (let i = 0; i < 4; i += 1) {
    for (let j = i + 1; j < 4; j += 1) {
      for (let k = j + 1; k < 4; k += 1) {
        const a = pts[i];
        const b = pts[j];
        const c = pts[k];
        if (Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) <= tol) return true;
      }
    }
  }
  return false;
}

/** A composed with B (B applied first), scaled so [8] = 1 when it can be. */
export function composeHomography(A, B) {
  const C = new Array(9);
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
    }
  }
  const k = Math.abs(C[8]) > 1e-15 ? C[8] : 1;
  return C.map((v) => v / k);
}

/**
 * The homography taking each src point to its dst point (4-point DLT with
 * h33 = 1, solved on normalised coordinates). Points are {x, y} or [x, y].
 * @returns {number[]|null} null when three points of either set are collinear
 */
export function solveHomography(src4, dst4) {
  if (!src4 || !dst4 || src4.length !== 4 || dst4.length !== 4) return null;
  const src = src4.map(pt);
  const dst = dst4.map(pt);
  if (hasCollinearTriple(src) || hasCollinearTriple(dst)) return null;
  const ns = normaliser(src);
  const nd = normaliser(dst);
  const A = new Float64Array(64);
  const b = new Float64Array(8);
  for (let i = 0; i < 4; i += 1) {
    const x = (src[i].x - ns.mx) * ns.s;
    const y = (src[i].y - ns.my) * ns.s;
    const u = (dst[i].x - nd.mx) * nd.s;
    const v = (dst[i].y - nd.my) * nd.s;
    A.set([x, y, 1, 0, 0, 0, -u * x, -u * y], (2 * i) * 8);
    A.set([0, 0, 0, x, y, 1, -v * x, -v * y], (2 * i + 1) * 8);
    b[2 * i] = u;
    b[2 * i + 1] = v;
  }
  const h = solveLinear8(A, b);
  if (!h) return null;
  const Hn = [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  const Ts = [ns.s, 0, -ns.s * ns.mx, 0, ns.s, -ns.s * ns.my, 0, 0, 1];
  const TdInv = [1 / nd.s, 0, nd.mx, 0, 1 / nd.s, nd.my, 0, 0, 1];
  const H = composeHomography(TdInv, composeHomography(Hn, Ts));
  return H.every(Number.isFinite) ? H : null;
}

/** Map one point. @returns {{x: number, y: number}} */
export function applyHomography(H, x, y) {
  const w = H[6] * x + H[7] * y + H[8];
  return { x: (H[0] * x + H[1] * y + H[2]) / w, y: (H[3] * x + H[4] * y + H[5]) / w };
}

/** The inverse map, scaled so [8] = 1, or null when H is singular. */
export function invertHomography(H) {
  const [a, b, c, d, e, f, g, h, i] = H;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  const scale = Math.max(...H.map(Math.abs));
  if (!(Math.abs(det) > 1e-14 * scale * scale * scale)) return null;
  const inv = [
    A, -(b * i - c * h), b * f - c * e,
    B, a * i - c * g, -(a * f - c * d),
    C, -(a * h - b * g), a * e - b * d,
  ];
  const k = Math.abs(inv[8]) > 1e-15 * scale * scale ? inv[8] : det;
  return inv.map((v) => v / k);
}

/**
 * The local linear part of H at (x, y): d(x', y') = J d(x, y).
 * @returns {{ x: number, y: number, a: number, b: number, c: number, d: number }}
 *   the mapped point and J = [[a, b], [c, d]]
 */
export function localJacobian(H, x, y) {
  const w = H[6] * x + H[7] * y + H[8];
  const X = (H[0] * x + H[1] * y + H[2]) / w;
  const Y = (H[3] * x + H[4] * y + H[5]) / w;
  return {
    x: X,
    y: Y,
    a: (H[0] - X * H[6]) / w,
    b: (H[1] - X * H[7]) / w,
    c: (H[3] - Y * H[6]) / w,
    d: (H[4] - Y * H[7]) / w,
  };
}

/**
 * Resample a grey image through a homography. `Hinv` maps OUTPUT pixels to
 * INPUT pixels (to straighten a sheet at `ppm` px/mm, pass H composed with a
 * 1/ppm scale: `composeHomography(H, [1/ppm,0,0, 0,1/ppm,0, 0,0,1])`).
 * Pixel centres sit on integer coordinates; outside the input gives `fill`.
 * @returns {Uint8Array} outW * outH
 */
export function warpPerspective(gray, w, h, Hinv, outW, outH, fill = 255) {
  const out = new Uint8Array(outW * outH);
  const [a, b, c, d, e, f, g, hh, i] = Hinv;
  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const z = g * x + hh * y + i;
      const sx = (a * x + b * y + c) / z;
      const sy = (d * x + e * y + f) / z;
      if (!(sx >= 0 && sy >= 0 && sx <= w - 1 && sy <= h - 1)) {
        out[y * outW + x] = fill;
        continue;
      }
      const x0 = sx | 0;
      const y0 = sy | 0;
      const x1 = x0 + 1 < w ? x0 + 1 : x0;
      const y1 = y0 + 1 < h ? y0 + 1 : y0;
      const fx = sx - x0;
      const fy = sy - y0;
      const r0 = y0 * w;
      const r1 = y1 * w;
      const top = gray[r0 + x0] + (gray[r0 + x1] - gray[r0 + x0]) * fx;
      const bottom = gray[r1 + x0] + (gray[r1 + x1] - gray[r1 + x0]) * fx;
      out[y * outW + x] = top + (bottom - top) * fy + 0.5;
    }
  }
  return out;
}

/**
 * Straighten an RGBA photo of a sheet: page mm -> photo px is `H`; the result
 * is the page at `ppm` px/mm, ImageData-shaped (`new ImageData(data, width, height)`).
 * @returns {{ data: Uint8ClampedArray, width: number, height: number, ppm: number }}
 */
export function rectifyRGBA(img, H, { wMm, hMm, ppm = 3 }) {
  const outW = Math.max(1, Math.round(wMm * ppm));
  const outH = Math.max(1, Math.round(hMm * ppm));
  const { data, width: w, height: h } = img;
  const out = new Uint8ClampedArray(outW * outH * 4);
  const grey = data.length === w * h;
  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      // Output pixel centre (x + 0.5) / ppm mm.
      const mx = (x + 0.5) / ppm;
      const my = (y + 0.5) / ppm;
      const z = H[6] * mx + H[7] * my + H[8];
      const sx = (H[0] * mx + H[1] * my + H[2]) / z;
      const sy = (H[3] * mx + H[4] * my + H[5]) / z;
      const o = (y * outW + x) * 4;
      out[o + 3] = 255;
      if (!(sx >= 0 && sy >= 0 && sx <= w - 1 && sy <= h - 1)) {
        out[o] = 255; out[o + 1] = 255; out[o + 2] = 255;
        continue;
      }
      const x0 = sx | 0;
      const y0 = sy | 0;
      const x1 = x0 + 1 < w ? x0 + 1 : x0;
      const y1 = y0 + 1 < h ? y0 + 1 : y0;
      const fx = sx - x0;
      const fy = sy - y0;
      const step = grey ? 1 : 4;
      const i00 = (y0 * w + x0) * step;
      const i01 = (y0 * w + x1) * step;
      const i10 = (y1 * w + x0) * step;
      const i11 = (y1 * w + x1) * step;
      for (let ch = 0; ch < 3; ch += 1) {
        const c = grey ? 0 : ch;
        const top = data[i00 + c] + (data[i01 + c] - data[i00 + c]) * fx;
        const bottom = data[i10 + c] + (data[i11 + c] - data[i10 + c]) * fx;
        out[o + ch] = top + (bottom - top) * fy;
      }
    }
  }
  return { data: out, width: outW, height: outH, ppm };
}
