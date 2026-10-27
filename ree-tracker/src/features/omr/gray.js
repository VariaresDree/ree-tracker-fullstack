// src/features/omr/gray.js
//
// The scanner works on one 8-bit luminance channel. Pure: no DOM, so it runs
// in the worker, on the main thread and in node tests alike.

/**
 * RGBA (ImageData-like `{ data, width, height }`) to luminance,
 * (77r + 150g + 29b) >> 8. A buffer that already holds one byte per pixel is
 * copied through, so callers can hand in a grey image too.
 * @returns {Uint8Array} width * height
 */
export function toGray(img) {
  const { data, width, height } = img;
  const n = width * height;
  if (data.length === n) return Uint8Array.from(data);
  const out = new Uint8Array(n);
  for (let i = 0, j = 0; i < n; i += 1, j += 4) {
    out[i] = (77 * data[j] + 150 * data[j + 1] + 29 * data[j + 2]) >> 8;
  }
  return out;
}

/**
 * Box-average an image down by an integer factor. Output pixel X covers input
 * pixels f*X .. f*X+f-1, so its centre sits at f*X + (f-1)/2 in input pixels
 * (see `upscalePoint`).
 * @returns {{ gray: Uint8Array, w: number, h: number }}
 */
export function downscaleGray(gray, w, h, factor) {
  const f = Math.max(1, Math.floor(factor || 1));
  if (f === 1) return { gray, w, h };
  const ow = Math.floor(w / f);
  const oh = Math.floor(h / f);
  const out = new Uint8Array(ow * oh);
  const acc = new Uint32Array(ow);
  const area = f * f;
  for (let oy = 0; oy < oh; oy += 1) {
    acc.fill(0);
    for (let dy = 0; dy < f; dy += 1) {
      const row = (oy * f + dy) * w;
      for (let ox = 0, x = 0; ox < ow; ox += 1) {
        let s = 0;
        for (let dx = 0; dx < f; dx += 1, x += 1) s += gray[row + x];
        acc[ox] += s;
      }
    }
    const o = oy * ow;
    for (let ox = 0; ox < ow; ox += 1) out[o + ox] = (acc[ox] + (area >> 1)) / area;
  }
  return { gray: out, w: ow, h: oh };
}

/** A point in a `factor`-downscaled image, back in the full image's pixels. */
export const upscalePoint = (p, factor) => ({ x: p.x * factor + (factor - 1) / 2, y: p.y * factor + (factor - 1) / 2 });

/** A full-resolution point in a `factor`-downscaled image's pixels. */
export const downscalePoint = (p, factor) => ({ x: (p.x - (factor - 1) / 2) / factor, y: (p.y - (factor - 1) / 2) / factor });
