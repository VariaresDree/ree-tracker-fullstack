// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  applyHomography, composeHomography, invertHomography, localJacobian, rectifyRGBA, solveHomography, solveLinear8, warpPerspective,
} from './homography';
import { mulberry32 } from './__fixtures__/synthSheet';

const A4 = [{ x: 11.5, y: 11.5 }, { x: 198.5, y: 11.5 }, { x: 198.5, y: 285.5 }, { x: 11.5, y: 285.5 }];

// A random plausible photo of the four corners: 1200 x 1600, turned, tilted.
function randomQuad(rng) {
  const a = (rng() - 0.5) * 0.6;
  const s = 4 + rng() * 3;
  return A4.map((p) => {
    const u = (p.x - 105) * s;
    const v = (p.y - 148.5) * s;
    return {
      x: 600 + u * Math.cos(a) - v * Math.sin(a) + (rng() - 0.5) * 120,
      y: 800 + u * Math.sin(a) + v * Math.cos(a) + (rng() - 0.5) * 120,
    };
  });
}

describe('solveLinear8', () => {
  it('solves a well-posed system and refuses a singular one', () => {
    const rng = mulberry32(3);
    const A = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => rng() * 2 - 1));
    const x = Array.from({ length: 8 }, (_, i) => i - 3.5);
    const b = A.map((row) => row.reduce((s, v, j) => s + v * x[j], 0));
    const got = solveLinear8(A, b);
    got.forEach((v, i) => expect(v).toBeCloseTo(x[i], 9));
    const flat = new Float64Array(64);
    A.forEach((row, r) => row.forEach((v, c) => { flat[r * 8 + c] = v; }));
    solveLinear8(flat, b).forEach((v, i) => expect(v).toBeCloseTo(x[i], 9));
    const singular = A.map((row) => row.slice());
    singular[7] = singular[6].slice();
    expect(solveLinear8(singular, b)).toBeNull();
  });
});

describe('solveHomography', () => {
  it('maps each source corner onto its target to within 1e-6, over many random quads', () => {
    const rng = mulberry32(11);
    for (let t = 0; t < 200; t += 1) {
      const dst = randomQuad(rng);
      const H = solveHomography(A4, dst);
      expect(H).not.toBeNull();
      expect(H[8]).toBe(1);
      A4.forEach((p, i) => {
        const q = applyHomography(H, p.x, p.y);
        expect(Math.abs(q.x - dst[i].x)).toBeLessThan(1e-6);
        expect(Math.abs(q.y - dst[i].y)).toBeLessThan(1e-6);
      });
    }
  });

  it('takes [x, y] pairs too, and the identity for identical sets', () => {
    const H = solveHomography(A4.map((p) => [p.x, p.y]), A4.map((p) => [p.x, p.y]));
    [1, 0, 0, 0, 1, 0, 0, 0, 1].forEach((v, i) => expect(H[i]).toBeCloseTo(v, 9));
  });

  it('its inverse composes to the identity and maps every point back', () => {
    const rng = mulberry32(5);
    for (let t = 0; t < 50; t += 1) {
      const H = solveHomography(A4, randomQuad(rng));
      const inv = invertHomography(H);
      const I = composeHomography(inv, H);
      [1, 0, 0, 0, 1, 0, 0, 0, 1].forEach((v, i) => expect(Math.abs(I[i] - v)).toBeLessThan(1e-9));
      for (let k = 0; k < 20; k += 1) {
        const x = rng() * 210;
        const y = rng() * 297;
        const p = applyHomography(H, x, y);
        const back = applyHomography(inv, p.x, p.y);
        expect(Math.abs(back.x - x)).toBeLessThan(1e-6);
        expect(Math.abs(back.y - y)).toBeLessThan(1e-6);
      }
    }
  });

  it('gives null for collinear points, in either set, and for repeated points', () => {
    const line = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }];
    expect(solveHomography(line, A4)).toBeNull();
    expect(solveHomography(A4, line)).toBeNull();
    const threeOnALine = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }, { x: 50, y: 80 }];
    expect(solveHomography(threeOnALine, A4)).toBeNull();
    expect(solveHomography([A4[0], A4[0], A4[2], A4[3]], A4)).toBeNull();
    expect(solveHomography(A4.slice(0, 3), A4.slice(0, 3))).toBeNull();
  });

  it('invertHomography refuses a singular map', () => {
    expect(invertHomography([1, 2, 3, 2, 4, 6, 0, 0, 1])).toBeNull();
  });
});

describe('localJacobian', () => {
  it('matches finite differences', () => {
    const H = solveHomography(A4, randomQuad(mulberry32(8)));
    const J = localJacobian(H, 80, 120);
    const e = 1e-4;
    const p = applyHomography(H, 80, 120);
    const px = applyHomography(H, 80 + e, 120);
    const py = applyHomography(H, 80, 120 + e);
    expect(J.x).toBeCloseTo(p.x, 9);
    expect(J.a).toBeCloseTo((px.x - p.x) / e, 4);
    expect(J.c).toBeCloseTo((px.y - p.y) / e, 4);
    expect(J.b).toBeCloseTo((py.x - p.x) / e, 4);
    expect(J.d).toBeCloseTo((py.y - p.y) / e, 4);
  });
});

describe('warpPerspective and rectifyRGBA', () => {
  it('resamples through Hinv (output px -> input px), filling outside', () => {
    const w = 20;
    const h = 10;
    const gray = new Uint8Array(w * h).map((_, i) => (i % w) * 10);
    // Output pixel x reads input pixel x + 2.
    const out = warpPerspective(gray, w, h, [1, 0, 2, 0, 1, 0, 0, 0, 1], 20, 10, 7);
    expect(out[0]).toBe(20);
    expect(out[5 * 20 + 10]).toBe(120);
    expect(out[5 * 20 + 19]).toBe(7);
    // Half a pixel: bilinear.
    expect(warpPerspective(gray, w, h, [1, 0, 0.5, 0, 1, 0, 0, 0, 1], 4, 1)[0]).toBe(5);
  });

  it('straightens a page at the asked px/mm, ImageData-shaped', () => {
    const img = { data: new Uint8ClampedArray(40 * 30 * 4).fill(200), width: 40, height: 30 };
    const H = [0.2, 0, 0, 0, 0.1, 0, 0, 0, 1]; // 1 mm -> 0.2 px across, 0.1 px down
    const out = rectifyRGBA(img, H, { wMm: 100, hMm: 50, ppm: 2 });
    expect(out.width).toBe(200);
    expect(out.height).toBe(100);
    expect(out.data).toHaveLength(200 * 100 * 4);
    expect(out.data[0]).toBe(200);
    expect(out.data[3]).toBe(255);
  });
});
