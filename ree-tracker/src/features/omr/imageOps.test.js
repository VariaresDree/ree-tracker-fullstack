// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { downscaleGray, downscalePoint, toGray, upscalePoint } from './gray';
import {
  adaptiveThreshold, boxMean, boxSum, integralImage,
} from './threshold';
import { mulberry32 } from './__fixtures__/synthSheet';

describe('toGray', () => {
  it('weights RGB as (77r + 150g + 29b) >> 8', () => {
    const img = { data: new Uint8ClampedArray([255, 255, 255, 255, 255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 10, 200, 30, 255]), width: 5, height: 1 };
    expect(Array.from(toGray(img))).toEqual([255, 76, 149, 28, (77 * 10 + 150 * 200 + 29 * 30) >> 8]);
  });

  it('copies a one-byte-per-pixel image through', () => {
    const img = { data: new Uint8Array([1, 2, 3, 4]), width: 2, height: 2 };
    const g = toGray(img);
    expect(Array.from(g)).toEqual([1, 2, 3, 4]);
    expect(g).not.toBe(img.data);
  });
});

describe('downscaleGray', () => {
  it('box-averages by an integer factor and drops the ragged edge', () => {
    const gray = new Uint8Array([
      0, 4, 8, 8, 1,
      4, 0, 8, 8, 1,
      2, 2, 0, 0, 1,
    ]);
    const out = downscaleGray(gray, 5, 3, 2);
    expect(out.w).toBe(2);
    expect(out.h).toBe(1);
    expect(Array.from(out.gray)).toEqual([2, 8]);
    expect(downscaleGray(gray, 5, 3, 1).gray).toBe(gray);
  });

  it('maps points between scales with the pixel-centre offset', () => {
    expect(upscalePoint({ x: 0, y: 0 }, 2)).toEqual({ x: 0.5, y: 0.5 });
    expect(upscalePoint({ x: 3, y: 1 }, 3)).toEqual({ x: 10, y: 4 });
    expect(downscalePoint(upscalePoint({ x: 7.25, y: 2 }, 4), 4)).toEqual({ x: 7.25, y: 2 });
  });
});

describe('integral image', () => {
  it('box sums and means match brute force', () => {
    const rng = mulberry32(2);
    const w = 37;
    const h = 23;
    const gray = new Uint8Array(w * h).map(() => Math.floor(rng() * 256));
    const ii = integralImage(gray, w, h);
    expect(ii).toHaveLength((w + 1) * (h + 1));
    for (let t = 0; t < 100; t += 1) {
      const x0 = Math.floor(rng() * w);
      const y0 = Math.floor(rng() * h);
      const x1 = x0 + 1 + Math.floor(rng() * (w - x0));
      const y1 = y0 + 1 + Math.floor(rng() * (h - y0));
      let s = 0;
      for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) s += gray[y * w + x];
      expect(boxSum(ii, w, x0, y0, x1, y1)).toBe(s);
      expect(boxMean(ii, w, x0, y0, x1, y1)).toBeCloseTo(s / ((x1 - x0) * (y1 - y0)), 9);
    }
    expect(boxMean(ii, w, 3, 3, 3, 9)).toBe(0);
  });
});

describe('adaptiveThreshold', () => {
  it('finds a dark square under a strong lighting gradient, and nothing on plain paper', () => {
    const w = 200;
    const h = 160;
    const gray = new Uint8Array(w * h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const paper = 240 - x * 0.8; // 240 on the left down to 80 on the right
        const inSquare = x >= 150 && x < 170 && y >= 60 && y < 80;
        gray[y * w + x] = inSquare ? paper * 0.2 : paper;
      }
    }
    const bin = adaptiveThreshold(gray, w, h);
    let inside = 0;
    let outside = 0;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const inSquare = x >= 150 && x < 170 && y >= 60 && y < 80;
        if (bin[y * w + x]) { if (inSquare) inside += 1; else outside += 1; }
      }
    }
    expect(inside).toBe(400);
    expect(outside).toBe(0);
  });

  it('honours an explicit window and t, and reuses an integral image', () => {
    const w = 30;
    const h = 30;
    const gray = new Uint8Array(w * h).fill(200);
    gray[15 * w + 15] = 170; // 15% darker than its surroundings
    const ii = integralImage(gray, w, h);
    expect(adaptiveThreshold(gray, w, h, { window: 9, t: 0.1, ii })[15 * w + 15]).toBe(1);
    expect(adaptiveThreshold(gray, w, h, { window: 9, t: 0.18, ii })[15 * w + 15]).toBe(0);
  });
});
