// src/features/omr/__fixtures__/synthSheet.js
//
// Synthetic answer sheets for the scanner's tests, in pure JS:
//
//   renderSheet(page, opts)    the printed page from answerSheetGeometry, with
//                              pencil marks, as an ink buffer at `ppm` px/mm
//   curl(sheet, amountMm)      a curled sheet: a smooth bulge the corner
//                              squares can't see, `amountMm` at the middle
//   photograph(img, opts)      a phone photo of it: perspective, blur, light
//                              falloff, noise and a background, as RGBA
//   cameraH(...)               a random but plausible camera for photograph
//   sheetToRGBA(sheet)         the flat page as RGBA (a perfect scan)
//   mulberry32(seed)           the seeded RNG everything here takes
//
// photograph() also takes RGBA (a screenshot of the HTML sheet, in e2e).

// Explicit extension: e2e (Playwright, plain Node ESM) imports this file too.
import { invertHomography, solveHomography } from '../homography.js';

/** A small, fast, seeded PRNG: () => [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A standard normal from a uniform RNG (Box-Muller). */
export function gaussian(rng) {
  const u = Math.max(1e-12, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

const PT = 25.4 / 72; // mm per point

// ---------------------------------------------------------------------------
// A tiny stroke font: polylines in a unit box (x 0..1 across, y 0..1 down).
const GLYPHS = {
  A: [[[0, 1], [0.5, 0], [1, 1]], [[0.22, 0.6], [0.78, 0.6]]],
  B: [[[0, 0], [0, 1], [0.7, 1], [0.95, 0.82], [0.95, 0.66], [0.7, 0.5], [0, 0.5]], [[0, 0], [0.65, 0], [0.88, 0.14], [0.88, 0.36], [0.65, 0.5]]],
  C: [[[0.95, 0.15], [0.7, 0], [0.3, 0], [0, 0.25], [0, 0.75], [0.3, 1], [0.7, 1], [0.95, 0.85]]],
  D: [[[0, 0], [0, 1], [0.55, 1], [0.95, 0.72], [0.95, 0.28], [0.55, 0], [0, 0]]],
  E: [[[0.95, 0], [0, 0], [0, 1], [0.95, 1]], [[0, 0.5], [0.75, 0.5]]],
  F: [[[0.95, 0], [0, 0], [0, 1]], [[0, 0.5], [0.75, 0.5]]],
  H: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
  L: [[[0, 0], [0, 1], [0.9, 1]]],
  T: [[[0, 0], [1, 0]], [[0.5, 0], [0.5, 1]]],
  O: [[[0.3, 0], [0.7, 0], [1, 0.3], [1, 0.7], [0.7, 1], [0.3, 1], [0, 0.7], [0, 0.3], [0.3, 0]]],
  N: [[[0, 1], [0, 0], [1, 1], [1, 0]]],
  S: [[[0.95, 0.12], [0.7, 0], [0.25, 0], [0, 0.22], [0.2, 0.45], [0.8, 0.55], [1, 0.78], [0.75, 1], [0.25, 1], [0, 0.88]]],
  R: [[[0, 1], [0, 0], [0.7, 0], [0.95, 0.2], [0.7, 0.5], [0, 0.5]], [[0.5, 0.5], [1, 1]]],
  W: [[[0, 0], [0.25, 1], [0.5, 0.4], [0.75, 1], [1, 0]]],
  0: [[[0.2, 0], [0.8, 0], [1, 0.2], [1, 0.8], [0.8, 1], [0.2, 1], [0, 0.8], [0, 0.2], [0.2, 0]]],
  1: [[[0.25, 0.2], [0.55, 0], [0.55, 1]]],
  2: [[[0, 0.2], [0.25, 0], [0.75, 0], [1, 0.22], [1, 0.4], [0, 1], [1, 1]]],
  3: [[[0, 0.1], [0.3, 0], [0.75, 0], [1, 0.22], [0.7, 0.48], [1, 0.72], [0.75, 1], [0.3, 1], [0, 0.9]], [[0.35, 0.48], [0.7, 0.48]]],
  4: [[[0.75, 1], [0.75, 0], [0, 0.7], [1, 0.7]]],
  5: [[[1, 0], [0.1, 0], [0, 0.45], [0.7, 0.42], [1, 0.65], [0.85, 0.95], [0.4, 1], [0, 0.9]]],
  6: [[[0.9, 0.05], [0.4, 0], [0, 0.4], [0, 0.8], [0.3, 1], [0.75, 1], [1, 0.75], [0.8, 0.5], [0.3, 0.5], [0, 0.65]]],
  7: [[[0, 0], [1, 0], [0.35, 1]]],
  8: [[[0.5, 0.5], [0.1, 0.3], [0.2, 0], [0.8, 0], [0.9, 0.3], [0.5, 0.5], [0, 0.75], [0.2, 1], [0.8, 1], [1, 0.75], [0.5, 0.5]]],
  9: [[[0.1, 0.95], [0.6, 1], [1, 0.6], [1, 0.2], [0.7, 0], [0.25, 0], [0, 0.25], [0.2, 0.5], [0.7, 0.5], [1, 0.35]]],
};
const FALLBACK = ['H', 'N', 'O', 'S', 'R', 'E', 'T', 'L', 'W', 'A', 'C', 'D'];
const glyphFor = (ch) => {
  const up = ch.toUpperCase();
  if (GLYPHS[up]) return GLYPHS[up];
  return GLYPHS[FALLBACK[ch.charCodeAt(0) % FALLBACK.length]];
};

/** An ink layer (0 = paper, 1 = black) over a page at `ppm` px/mm. Pixel (i, j) covers mm [i/ppm, (i+1)/ppm). */
class Ink {
  constructor(wMm, hMm, ppm) {
    this.wMm = wMm;
    this.hMm = hMm;
    this.ppm = ppm;
    this.width = Math.round(wMm * ppm);
    this.height = Math.round(hMm * ppm);
    this.ink = new Float32Array(this.width * this.height);
  }

  add(i, v) {
    if (v <= 0) return;
    const a = this.ink[i];
    this.ink[i] = 1 - (1 - a) * (1 - Math.min(1, v));
  }

  // Pixels whose centres fall within the mm box, padded by `pad` px.
  span(x0, y0, x1, y1, pad = 2) {
    const p = this.ppm;
    return {
      i0: Math.max(0, Math.floor(x0 * p) - pad),
      j0: Math.max(0, Math.floor(y0 * p) - pad),
      i1: Math.min(this.width - 1, Math.ceil(x1 * p) + pad),
      j1: Math.min(this.height - 1, Math.ceil(y1 * p) + pad),
    };
  }

  fillRect(x0, y0, x1, y1, v = 1) {
    const p = this.ppm;
    const { i0, j0, i1, j1 } = this.span(x0, y0, x1, y1, 1);
    for (let j = j0; j <= j1; j += 1) {
      const oy = Math.max(0, Math.min((j + 1) / p, y1) - Math.max(j / p, y0)) * p;
      if (oy <= 0) continue;
      for (let i = i0; i <= i1; i += 1) {
        const ox = Math.max(0, Math.min((i + 1) / p, x1) - Math.max(i / p, x0)) * p;
        if (ox > 0) this.add(j * this.width + i, v * ox * oy);
      }
    }
  }

  // Coverage of a pixel by a band of width `wpx` at distance `dpx` from its middle line.
  static band(dpx, wpx) {
    return Math.max(0, Math.min(1, Math.min(dpx + 0.5, wpx / 2) - Math.max(dpx - 0.5, -wpx / 2)));
  }

  strokeSegment(ax, ay, bx, by, width, v = 1) {
    const p = this.ppm;
    const half = width / 2;
    const { i0, j0, i1, j1 } = this.span(Math.min(ax, bx) - half, Math.min(ay, by) - half, Math.max(ax, bx) + half, Math.max(ay, by) + half);
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1e-9;
    for (let j = j0; j <= j1; j += 1) {
      const y = (j + 0.5) / p;
      for (let i = i0; i <= i1; i += 1) {
        const x = (i + 0.5) / p;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
        const d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
        const c = Ink.band(d * p, width * p);
        if (c > 0) this.add(j * this.width + i, v * c);
      }
    }
  }

  strokePolyline(pts, width, v = 1) {
    for (let k = 1; k < pts.length; k += 1) this.strokeSegment(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], width, v);
  }

  strokeRect(x, y, w, h, width, v = 1) {
    this.strokePolyline([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], width, v);
  }

  strokeCircle(cx, cy, r, width, v = 1) {
    const p = this.ppm;
    const { i0, j0, i1, j1 } = this.span(cx - r - width, cy - r - width, cx + r + width, cy + r + width);
    for (let j = j0; j <= j1; j += 1) {
      const y = (j + 0.5) / p;
      for (let i = i0; i <= i1; i += 1) {
        const x = (i + 0.5) / p;
        const c = Ink.band(Math.abs(Math.hypot(x - cx, y - cy) - r) * p, width * p);
        if (c > 0) this.add(j * this.width + i, v * c);
      }
    }
  }

  // A filled disc; `texture(i, j)` scales the ink per pixel (pencil grain).
  fillDisc(cx, cy, r, v = 1, texture = null) {
    const p = this.ppm;
    const { i0, j0, i1, j1 } = this.span(cx - r, cy - r, cx + r, cy + r);
    for (let j = j0; j <= j1; j += 1) {
      const y = (j + 0.5) / p;
      for (let i = i0; i <= i1; i += 1) {
        const x = (i + 0.5) / p;
        const c = Math.max(0, Math.min(1, 0.5 - (Math.hypot(x - cx, y - cy) - r) * p));
        if (c > 0) this.add(j * this.width + i, v * c * (texture ? texture(i, j) : 1));
      }
    }
  }

  // Text: caps from the stroke font, `y` the baseline.
  text(str, x, y, sizePt, { weight = 'normal', anchor = 'start', v = 1 } = {}) {
    const cap = sizePt * PT * 0.7;
    const gw = cap * 0.62;
    const adv = cap * 0.82;
    const stroke = cap * (weight === 'bold' ? 0.17 : 0.1);
    const total = str.length * adv;
    let x0 = x;
    if (anchor === 'middle') x0 = x - total / 2;
    else if (anchor === 'end') x0 = x - total;
    [...str].forEach((ch, idx) => {
      if (ch === ' ') return;
      const ox = x0 + idx * adv;
      glyphFor(ch).forEach((line) => this.strokePolyline(line.map(([u, w]) => [ox + u * gw, y - cap + w * cap]), stroke, v));
    });
  }
}

/** Paper size from a geometry page: its corner centres sit 11.5 mm in from every edge. */
export const pageSizeOf = (page) => ({
  wMm: page.fiducials[1].x + page.fiducials[0].x,
  hMm: page.fiducials[3].y + page.fiducials[0].y,
});

/**
 * The printed page plus pencil marks.
 * @param {object} page one page of answerSheetGeometry(...).pages
 * @param {{
 *   ppm?: number,                         // px per mm (default 5)
 *   marks?: { [n]: number[] },            // option indexes shaded per item
 *   pencil?: { darkness?, coverage?, jitterMm?, spread? },  // .85, .9, .4, .08
 *   faint?: { [n]: number },              // a faint (30%) mark
 *   faintDarkness?: number,
 *   name?: boolean,                       // a handwritten name in the name box
 *   rng: () => number,
 * }} opts
 * @returns {{ ink: Float32Array, width, height, ppm, wMm, hMm }}
 */
export function renderSheet(page, opts = {}) {
  const {
    ppm = 5, marks = {}, pencil = {}, faint = {}, faintDarkness = 0.3, name = true, rng = mulberry32(1),
  } = opts;
  const { darkness = 0.85, coverage = 0.9, jitterMm = 0.4, spread = 0.08 } = pencil;
  const { wMm, hMm } = pageSizeOf(page);
  const c = new Ink(wMm, hMm, ppm);
  const fs = page.fiducialSize;
  page.fiducials.forEach((f) => c.fillRect(f.x - fs / 2, f.y - fs / 2, f.x + fs / 2, f.y + fs / 2, 1));
  page.idCells.forEach((cell) => { if (cell.filled) c.fillRect(cell.x, cell.y, cell.x + cell.size, cell.y + cell.size, 1); });

  // A stand-in QR: three finder patterns and random modules.
  const { qr } = page;
  const N = 25;
  const m = qr.size / N;
  const inFinder = (i, j) => (i < 8 && j < 8) || (i >= N - 8 && j < 8) || (i < 8 && j >= N - 8);
  for (let j = 0; j < N; j += 1) {
    for (let i = 0; i < N; i += 1) {
      if (!inFinder(i, j) && rng() < 0.5) c.fillRect(qr.x + i * m, qr.y + j * m, qr.x + (i + 1) * m, qr.y + (j + 1) * m, 1);
    }
  }
  // Finders last, as rings round a solid 3 x 3 centre.
  [[0, 0], [N - 7, 0], [0, N - 7]].forEach(([fx, fy]) => {
    for (let j = 0; j < 7; j += 1) {
      for (let i = 0; i < 7; i += 1) {
        const ring = i === 0 || j === 0 || i === 6 || j === 6;
        const core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        if (ring || core) c.fillRect(qr.x + (fx + i) * m, qr.y + (fy + j) * m, qr.x + (fx + i + 1) * m, qr.y + (fy + j + 1) * m, 1);
      }
    }
  });

  [page.nameBox, page.dateBox].filter(Boolean).forEach((b) => {
    c.strokeRect(b.x, b.y, b.w, b.h, 0.25, 1);
    c.text(b.label, b.x + 1.5, b.y + 2.6, 5.5, { v: 1 });
  });
  page.text.forEach((t) => {
    if (t.box) c.strokeRect(t.box.x, t.box.y, t.box.w, t.box.h, 0.35, 1);
    c.text(t.str, t.x, t.y, t.size, { weight: t.weight, anchor: t.anchor, v: 1 });
  });
  page.labels.forEach((l) => c.text(String(l.n), l.x, l.y + 1.2, 7, { weight: 'bold', anchor: 'end', v: 1 }));
  const stroke = 0.3 * PT;
  page.bubbles.forEach((b) => {
    c.strokeCircle(b.cx, b.cy, b.r, stroke, 1);
    c.text(b.letter, b.cx, b.cy + 5 * PT * 0.35, 5, { anchor: 'middle', v: 0.45 });
  });

  if (name && page.nameBox) {
    // A pencil scrawl across the name box.
    const nb = page.nameBox;
    const pts = [];
    for (let k = 0; k < 40; k += 1) {
      pts.push([nb.x + 6 + (k / 40) * Math.min(70, nb.w - 12), nb.y + nb.h * (0.45 + 0.3 * Math.sin(k * 1.7) * rng())]);
    }
    c.strokePolyline(pts, 0.35, 0.75);
  }

  const grain = (cov) => () => (rng() < cov ? 1 : 0.35);
  const mark = (b, dark) => {
    const r = b.r * (0.8 + 0.2 * rng());
    const a = rng() * 2 * Math.PI;
    const d = jitterMm * Math.sqrt(rng());
    c.fillDisc(b.cx + d * Math.cos(a), b.cy + d * Math.sin(a), r, dark, grain(coverage));
  };
  const bubbleAt = (n, k) => page.bubbles.find((b) => b.n === n && b.k === k);
  Object.entries(marks).forEach(([n, ks]) => (ks || []).forEach((k) => {
    const b = bubbleAt(Number(n), k);
    if (b) mark(b, Math.min(1, darkness + spread * (rng() * 2 - 1)));
  }));
  Object.entries(faint).forEach(([n, k]) => {
    const b = bubbleAt(Number(n), k);
    if (b) mark(b, faintDarkness);
  });
  return { ink: c.ink, width: c.width, height: c.height, ppm, wMm, hMm };
}

/**
 * Curl: move the printed content by a smooth bulge, amountMm * sin(pi u) *
 * sin(pi v) along `angleDeg` (u, v = position across and down the page), so
 * the middle shifts by amountMm while the corner squares stay put (they move
 * ~0.02 * amountMm), and the four-corner homography can't see it.
 */
export function curl(sheet, amountMm, { angleDeg = 60 } = {}) {
  const { ink, width, height, ppm, wMm, hMm } = sheet;
  const out = new Float32Array(width * height);
  const ux = Math.cos((angleDeg * Math.PI) / 180);
  const uy = Math.sin((angleDeg * Math.PI) / 180);
  for (let j = 0; j < height; j += 1) {
    const y = (j + 0.5) / ppm;
    const sv = Math.sin((Math.PI * y) / hMm);
    for (let i = 0; i < width; i += 1) {
      const x = (i + 0.5) / ppm;
      const d = amountMm * Math.sin((Math.PI * x) / wMm) * sv;
      // Content at p came from p - d (close enough for a smooth, small field).
      const sx = (x - d * ux) * ppm - 0.5;
      const sy = (y - d * uy) * ppm - 0.5;
      out[j * width + i] = bilinear(ink, width, height, sx, sy, 0);
    }
  }
  return { ...sheet, ink: out };
}

function bilinear(buf, w, h, x, y, outside) {
  if (x < -0.5 || y < -0.5 || x > w - 0.5 || y > h - 0.5) return outside;
  const cx = Math.max(0, Math.min(w - 1, x));
  const cy = Math.max(0, Math.min(h - 1, y));
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const fx = cx - x0;
  const fy = cy - y0;
  const a = buf[y0 * w + x0] + (buf[y0 * w + x1] - buf[y0 * w + x0]) * fx;
  const b = buf[y1 * w + x0] + (buf[y1 * w + x1] - buf[y1 * w + x0]) * fx;
  return a + (b - a) * fy;
}

/**
 * Paint over a box of a rendered sheet (page mm): `ink` 0 is a white sticker
 * (covers what's printed), 1 solid black, 0.8 a pencil scribble.
 * @returns a new sheet
 */
export function paintRect(sheet, x0, y0, x1, y1, ink) {
  const out = new Float32Array(sheet.ink);
  const { ppm, width, height } = sheet;
  for (let j = Math.max(0, Math.floor(y0 * ppm)); j < Math.min(height, Math.ceil(y1 * ppm)); j += 1) {
    for (let i = Math.max(0, Math.floor(x0 * ppm)); i < Math.min(width, Math.ceil(x1 * ppm)); i += 1) out[j * width + i] = ink;
  }
  return { ...sheet, ink: out };
}

/** The flat page as RGBA: paper 245, full ink 25. */
export function sheetToRGBA(sheet, { paper = 245, black = 25 } = {}) {
  const n = sheet.width * sheet.height;
  const data = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i += 1) {
    const v = paper - (paper - black) * sheet.ink[i];
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  return { data, width: sheet.width, height: sheet.height };
}

function gaussianBlur(buf, w, h, sigma) {
  if (!(sigma > 0.05)) return buf;
  const rad = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(2 * rad + 1);
  let s = 0;
  for (let i = -rad; i <= rad; i += 1) { k[i + rad] = Math.exp(-(i * i) / (2 * sigma * sigma)); s += k[i + rad]; }
  for (let i = 0; i < k.length; i += 1) k[i] /= s;
  const tmp = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const o = y * w;
    for (let x = 0; x < w; x += 1) {
      let acc = 0;
      for (let t = -rad; t <= rad; t += 1) {
        const xx = x + t < 0 ? 0 : x + t >= w ? w - 1 : x + t;
        acc += buf[o + xx] * k[t + rad];
      }
      tmp[o + x] = acc;
    }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let acc = 0;
      for (let t = -rad; t <= rad; t += 1) {
        const yy = y + t < 0 ? 0 : y + t >= h ? h - 1 : y + t;
        acc += tmp[yy * w + x] * k[t + rad];
      }
      out[y * w + x] = acc;
    }
  }
  return out;
}

/**
 * A random but plausible camera: the source image (srcW x srcH px) placed in
 * an outW x outH frame, `fill` of the frame's limiting side, turned by
 * `angleDeg` (plus 180 when `flip`), each corner pushed by up to `tilt` of
 * the sheet's size for perspective, and shifted by up to `shift` of the frame.
 * @returns {number[]} H, source px -> photo px (pixel centres on integers)
 */
export function cameraH({ srcW, srcH, outW, outH, rng, fill = 0.85, angleDeg = 0, flip = false, tilt = 0.05, shift = 0.03 }) {
  const a = ((angleDeg + (flip ? 180 : 0)) * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  // Bounding box of the turned sheet, scaled to `fill` of the frame.
  const bw = Math.abs(srcW * cos) + Math.abs(srcH * sin);
  const bh = Math.abs(srcW * sin) + Math.abs(srcH * cos);
  const s = fill * Math.min(outW / bw, outH / bh);
  const cx = outW / 2 + (rng() * 2 - 1) * shift * outW;
  const cy = outH / 2 + (rng() * 2 - 1) * shift * outH;
  const src = [[-0.5, -0.5], [srcW - 0.5, -0.5], [srcW - 0.5, srcH - 0.5], [-0.5, srcH - 0.5]];
  const size = s * Math.max(srcW, srcH);
  const dst = src.map(([x, y]) => {
    const u = (x - srcW / 2) * s;
    const v = (y - srcH / 2) * s;
    return [
      cx + u * cos - v * sin + (rng() * 2 - 1) * tilt * size,
      cy + u * sin + v * cos + (rng() * 2 - 1) * tilt * size,
    ];
  });
  return solveHomography(src, dst);
}

/**
 * Photograph a sheet (renderSheet/curl output) or an RGBA image.
 * @param {object} img `{ ink, width, height }` or `{ data (RGBA), width, height }`
 * @param {{
 *   H: number[],            // image px -> photo px (cameraH)
 *   outW: number, outH: number,
 *   blurPx?: number,        // Gaussian sigma, photo px (0.8)
 *   noiseSigma?: number,    // grey levels (3)
 *   light?: { gradient?: number, vignette?: number, angleDeg?: number },  // 0.2, 0.15
 *   background?: number,    // grey level of the table (70)
 *   shadow?: { angleDeg, offset, depth, softPx? },  // a hard shadow past a line `offset` (x diagonal) from the centre
 *   paper?: number, black?: number,  // ink-buffer levels (240, 30)
 *   rng: () => number,
 * }} opts
 * @returns {{ data: Uint8ClampedArray, width: number, height: number }} RGBA
 */
export function photograph(img, opts) {
  const {
    H, outW, outH, blurPx = 0.8, noiseSigma = 3, light = {}, background = 70, paper = 240, black = 30, rng = mulberry32(7),
  } = opts;
  const { gradient = 0.2, vignette = 0.15, angleDeg = rng() * 360 } = light;
  const { shadow = null } = opts;
  const sx = shadow ? Math.cos((shadow.angleDeg * Math.PI) / 180) : 0;
  const sy = shadow ? Math.sin((shadow.angleDeg * Math.PI) / 180) : 0;
  const Hinv = invertHomography(H);
  const { width: W, height: Hh } = img;
  let src;
  if (img.ink) {
    src = new Float32Array(W * Hh);
    for (let i = 0; i < src.length; i += 1) src[i] = paper - (paper - black) * img.ink[i];
  } else {
    src = new Float32Array(W * Hh);
    const d = img.data;
    const grey = d.length === W * Hh;
    for (let i = 0; i < src.length; i += 1) {
      src[i] = grey ? d[i] : (77 * d[i * 4] + 150 * d[i * 4 + 1] + 29 * d[i * 4 + 2]) / 256;
    }
  }
  const frame = new Float32Array(outW * outH);
  const ga = (angleDeg * Math.PI) / 180;
  const gx = Math.cos(ga);
  const gy = Math.sin(ga);
  const diag = Math.hypot(outW, outH);
  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const z = Hinv[6] * x + Hinv[7] * y + Hinv[8];
      const u = (Hinv[0] * x + Hinv[1] * y + Hinv[2]) / z;
      const v = (Hinv[3] * x + Hinv[4] * y + Hinv[5]) / z;
      const table = background * (0.9 + 0.2 * (((x * 7 + y * 13) % 17) / 17));
      const value = bilinear(src, W, Hh, u, v, -1);
      const ramp = ((x - outW / 2) * gx + (y - outH / 2) * gy) / diag + 0.5;
      const r2 = ((x - outW / 2) ** 2 + (y - outH / 2) ** 2) / ((diag / 2) ** 2);
      let lit = (1 - gradient * ramp) * (1 - vignette * r2);
      if (shadow) {
        // A hard-edged shadow (the phone, a hand) over one side of a line.
        const side = (x - outW / 2) * sx + (y - outH / 2) * sy - shadow.offset * diag;
        lit *= 1 - shadow.depth * Math.max(0, Math.min(1, 0.5 + side / (shadow.softPx || 6)));
      }
      frame[y * outW + x] = (value < 0 ? table : value) * lit;
    }
  }
  const blurred = gaussianBlur(frame, outW, outH, blurPx);
  const data = new Uint8ClampedArray(outW * outH * 4);
  // Noise from a table of 4096 normals (one Box-Muller per pixel is most of
  // the time this takes otherwise).
  const table = new Float32Array(4096);
  for (let i = 0; i < table.length; i += 1) table[i] = noiseSigma * gaussian(rng);
  for (let i = 0; i < outW * outH; i += 1) {
    const v = blurred[i] + (noiseSigma > 0 ? table[(rng() * 4096) | 0] : 0);
    data[i * 4] = v * 1.02;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v * 0.95;
    data[i * 4 + 3] = 255;
  }
  return { data, width: outW, height: outH };
}

/** Page mm -> source px for a rendered sheet (pixel centres on integers). */
export const mmToSheetPx = (ppm) => [ppm, 0, -0.5, 0, ppm, -0.5, 0, 0, 1];
