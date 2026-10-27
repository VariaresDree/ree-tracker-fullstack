// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  connectedComponents, isConvexQuad, isFiducialCandidate, orderCorners, pickQuad, polygonArea, quadAspect, quadSkew, shapeOf,
} from './components';
import { adaptiveThreshold } from './threshold';

// A white canvas with black shapes drawn at 1 px resolution.
function canvas(w, h) {
  const gray = new Uint8Array(w * h).fill(235);
  return {
    gray,
    w,
    h,
    rect(x0, y0, x1, y1, v = 20) {
      for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) gray[y * w + x] = v;
    },
    disc(cx, cy, r, v = 20) {
      for (let y = Math.floor(cy - r); y <= cy + r; y += 1) {
        for (let x = Math.floor(cx - r); x <= cx + r; x += 1) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) gray[y * w + x] = v;
      }
    },
  };
}

function candidates(c) {
  const bin = adaptiveThreshold(c.gray, c.w, c.h, { window: 151 });
  const comps = connectedComponents(bin, c.w, c.h, { minArea: 100, maxArea: 10000 });
  return { comps, ok: comps.filter((k) => isFiducialCandidate(k, c.gray, c.w, c.h, { labels: comps.labels })) };
}

describe('connectedComponents', () => {
  it('measures a square: area, box, centroid, s^2/12 spread, furthest-pixel ratio ~0.7', () => {
    const c = canvas(80, 60);
    c.rect(10, 20, 40, 50);
    const bin = c.gray.map((v) => (v < 128 ? 1 : 0));
    const comps = connectedComponents(bin, 80, 60);
    expect(comps).toHaveLength(1);
    const [k] = comps;
    expect(k).toMatchObject({ area: 900, minX: 10, minY: 20, maxX: 39, maxY: 49 });
    expect(k.cx).toBeCloseTo(24.5, 9);
    expect(k.cy).toBeCloseTo(34.5, 9);
    expect(k.sxx).toBeCloseTo(75, 6);
    expect(k.syy).toBeCloseTo(75, 6);
    expect(k.sxy).toBeCloseTo(0, 9);
    const s = shapeOf(k);
    expect(s.farRatio).toBeGreaterThan(0.69);
    expect(s.compactness).toBeCloseTo(1, 6);
    expect(s.eigenRatio).toBeCloseTo(1, 6);
    expect(comps.labels[35 * 80 + 25]).toBe(k.id);
  });

  it('keeps separate blobs apart, joins a U shape, and filters by area', () => {
    const c = canvas(100, 40);
    c.rect(5, 5, 15, 15);
    c.rect(30, 5, 32, 30); // U: two legs and a foot
    c.rect(40, 5, 42, 30);
    c.rect(30, 28, 42, 30);
    c.rect(60, 5, 62, 7); // a speck
    const bin = c.gray.map((v) => (v < 128 ? 1 : 0));
    expect(connectedComponents(bin, 100, 40).map((k) => k.area).sort((a, b) => a - b)).toEqual([4, 100, 116]);
    expect(connectedComponents(bin, 100, 40, { minArea: 50, maxArea: 110 }).map((k) => k.area)).toEqual([100]);
  });
});

describe('isFiducialCandidate', () => {
  it('takes a solid square, also turned, and refuses a disc, a QR finder ring, a bar and a pale blob', () => {
    const c = canvas(600, 200);
    c.rect(30, 30, 70, 70); // square, 40 px
    // A square turned 30 degrees.
    for (let y = 0; y < 200; y += 1) {
      for (let x = 100; x < 200; x += 1) {
        const u = (x - 150) * Math.cos(0.52) + (y - 50) * Math.sin(0.52);
        const v = -(x - 150) * Math.sin(0.52) + (y - 50) * Math.cos(0.52);
        if (Math.abs(u) < 20 && Math.abs(v) < 20) c.gray[y * 600 + x] = 20;
      }
    }
    c.disc(250, 50, 22); // disc, same area
    // QR finder: 7-module ring, white ring, 3-module core (6 px modules).
    c.rect(330, 20, 372, 62);
    c.rect(336, 26, 366, 56, 235);
    c.rect(342, 32, 360, 50);
    c.rect(420, 40, 500, 56); // bar
    c.rect(30, 120, 70, 160, 190); // pale grey square
    const { comps, ok } = candidates(c);
    const at = (x, y) => comps.find((k) => Math.abs(k.cx - x) < 4 && Math.abs(k.cy - y) < 4);
    expect(ok).toContain(at(49.5, 49.5));
    expect(ok).toContain(at(150, 50));
    expect(ok).toHaveLength(2);
    expect(shapeOf(at(250, 50)).farRatio).toBeLessThan(0.6);
  });

  it('refuses a square with ink right round it (no quiet zone)', () => {
    const c = canvas(200, 200);
    c.rect(80, 80, 120, 120);
    for (let x = 40; x < 160; x += 6) { c.rect(x, 62, x + 3, 66); c.rect(x, 134, x + 3, 138); }
    for (let y = 40; y < 160; y += 6) { c.rect(62, y, 66, y + 3); c.rect(134, y, 138, y + 3); }
    const { ok } = candidates(c);
    expect(ok).toHaveLength(0);
  });
});

describe('orderCorners and quad measures', () => {
  it('orders four points clockwise from the top-left, whatever order they come in', () => {
    const q = orderCorners([{ x: 90, y: 110 }, { x: 10, y: 5 }, { x: 5, y: 100 }, { x: 100, y: 0 }]);
    expect(q.map((p) => [p.x, p.y])).toEqual([[10, 5], [100, 0], [90, 110], [5, 100]]);
    expect(isConvexQuad(q)).toBe(true);
    expect(isConvexQuad([q[0], q[2], q[1], q[3]])).toBe(false);
    expect(orderCorners([{ cx: 1, cy: 1 }, { cx: 9, cy: 1 }, { cx: 9, cy: 9 }, { cx: 1, cy: 9 }])[0]).toMatchObject({ x: 1, y: 1 });
  });

  it('measures area, skew and aspect', () => {
    const rect = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 150 }, { x: 0, y: 150 }];
    expect(polygonArea(rect)).toBe(15000);
    expect(quadSkew(rect)).toBe(0);
    expect(quadAspect(rect)).toBe(1.5);
    const trapezoid = [{ x: 20, y: 0 }, { x: 80, y: 0 }, { x: 100, y: 150 }, { x: 0, y: 150 }];
    expect(quadSkew(trapezoid)).toBeCloseTo(100 / 60 - 1, 9);
  });
});

describe('pickQuad', () => {
  const s = 4; // px per mm
  const corners = [[11.5, 11.5], [198.5, 11.5], [198.5, 285.5], [11.5, 285.5]].map(([x, y]) => ({ cx: x * s, cy: y * s, area: (7 * s) ** 2 }));
  const bubble = (x, y) => ({ cx: x * s, cy: y * s, area: (4.2 * s) ** 2 });
  const rects = [{ w: 187, h: 274 }, { w: 192.9, h: 256.4 }, { w: 192.9, h: 307.2 }];

  it('finds the four corner squares among shaded bubbles, as the largest sheet-shaped quad', () => {
    const cands = [...corners, bubble(40, 80), bubble(100, 150), bubble(170, 260), bubble(60, 270), bubble(180, 75)];
    const got = pickQuad(cands, { rects });
    expect(got.quad.map((p) => [p.x / s, p.y / s])).toEqual([[11.5, 11.5], [198.5, 11.5], [198.5, 285.5], [11.5, 285.5]]);
    expect(got.score).toBeCloseTo(187 * 274 * s * s, 6);
    expect(Array.isArray(got.alternatives)).toBe(true);
    expect(pickQuad(cands, { aspects: rects.map((r) => r.h / r.w) }).quad[1].x).toBe(198.5 * s);
  });

  it('with a corner missing, a bubble standing in is refused by the per-corner scale check', () => {
    const cands = [corners[0], corners[2], corners[3], bubble(175, 30)];
    expect(pickQuad(cands, { aspects: rects.map((r) => r.h / r.w) })).not.toBeNull(); // aspect alone lets it in
    expect(pickQuad(cands, { rects })).toBeNull();
  });

  it('refuses four bubbles posing as a half-size sheet when real corner squares lie outside them', () => {
    const half = [[11.5, 11.5], [198.5, 11.5], [198.5, 285.5], [11.5, 285.5]]
      .map(([x, y]) => ({ cx: (105 + (x - 105) * 0.55) * s, cy: (148.5 + (y - 148.5) * 0.55) * s, area: (4.2 * s) ** 2 }));
    expect(pickQuad(half, { rects })).not.toBeNull(); // alone, they are self-consistent
    const got = pickQuad([...half, corners[0], corners[1], corners[2]], { rects, keep: 10 });
    // A mixed quad may survive here (the pipeline's ID strip check turns it
    // away); the four bubbles together never do.
    const allBubbles = (q) => q.quad.every((p) => p.size < 20);
    expect(got === null || ![got, ...got.alternatives].some(allBubbles)).toBe(true);
  });

  it('refuses a square layout (no paper is 1:1) and fewer than four squares', () => {
    const square = [[0, 0], [100, 0], [100, 100], [0, 100]].map(([x, y]) => ({ cx: x * s + 50, cy: y * s + 50, area: 400 }));
    expect(pickQuad(square, { rects })).toBeNull();
    expect(pickQuad(corners.slice(0, 3), { rects })).toBeNull();
  });
});
