// src/features/omr/threshold.js
//
// Bradley-Roth adaptive threshold on an integral image: a pixel is dark when
// it is more than `t` below the mean of the window around it. A window an
// eighth of the frame wide keeps the 7 mm corner squares solid while
// following lighting gradients and shadows across the sheet.

/**
 * Summed-area table with a zero first row and column:
 * ii[(y+1)*(w+1) + (x+1)] = sum of gray over [0..x] x [0..y].
 * A 2400 x 2400 white frame sums to 1.47e9, inside Uint32.
 * @returns {Uint32Array} (w+1)*(h+1)
 */
export function integralImage(gray, w, h) {
  const W = w + 1;
  const ii = new Uint32Array(W * (h + 1));
  for (let y = 0; y < h; y += 1) {
    let row = 0;
    const o = y * w;
    const r0 = y * W;
    const r1 = r0 + W;
    for (let x = 0; x < w; x += 1) {
      row += gray[o + x];
      ii[r1 + x + 1] = ii[r0 + x + 1] + row;
    }
  }
  return ii;
}

/** Sum over the half-open box [x0, x1) x [y0, y1). `w` is the image width. */
export function boxSum(ii, w, x0, y0, x1, y1) {
  const W = w + 1;
  return ii[y1 * W + x1] - ii[y0 * W + x1] - ii[y1 * W + x0] + ii[y0 * W + x0];
}

/** Mean over the half-open box [x0, x1) x [y0, y1); 0 for an empty box. */
export function boxMean(ii, w, x0, y0, x1, y1) {
  const n = (x1 - x0) * (y1 - y0);
  return n > 0 ? boxSum(ii, w, x0, y0, x1, y1) / n : 0;
}

/**
 * Bradley-Roth: 1 where gray < (window mean) * (1 - t), else 0.
 * @param {{ window?: number, t?: number, ii?: Uint32Array }} [opts]
 *   window defaults to (min(w, h) / 8) | 1; pass `ii` to reuse an integral image.
 * @returns {Uint8Array} w * h, 1 = dark
 */
export function adaptiveThreshold(gray, w, h, { window, t = 0.18, ii } = {}) {
  const win = Math.max(3, window || ((Math.min(w, h) / 8) | 1));
  const half = win >> 1;
  const table = ii || integralImage(gray, w, h);
  const W = w + 1;
  const k = 1 - t;
  const bin = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const y0 = y - half < 0 ? 0 : y - half;
    const y1 = y + half + 1 > h ? h : y + half + 1;
    const top = y0 * W;
    const bottom = y1 * W;
    const rows = y1 - y0;
    const o = y * w;
    for (let x = 0; x < w; x += 1) {
      const x0 = x - half < 0 ? 0 : x - half;
      const x1 = x + half + 1 > w ? w : x + half + 1;
      const sum = table[bottom + x1] - table[top + x1] - table[bottom + x0] + table[top + x0];
      if (gray[o + x] * (x1 - x0) * rows < sum * k) bin[o + x] = 1;
    }
  }
  return bin;
}
