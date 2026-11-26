// Plane Geometry in the module format (2026-11-27): every number in the
// topic's worked examples and figures worked again, so a slip in the text
// fails here.
import { describe, it, expect } from 'vitest';
import lesson, { fenced } from './content/mathematics/plane-geometry.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const rad = (d) => (d * Math.PI) / 180;
const deg = (x) => (x * 180) / Math.PI;
const f2 = (x) => x.toFixed(2);
const f3 = (x) => x.toFixed(3);
const choose = (n, k) => (k === 0 ? 1 : (choose(n, k - 1) * (n - k + 1)) / k);

describe('Plane Geometry, worked again', () => {
  it('Lines and angles: lines and triangles from points, a transversal, the crossing lines', () => {
    const s = section('Lines and Angles');
    expect([(10 * 9) / 2, choose(10, 3)]).toEqual([45, 120]);
    expect([3 * 30 + 20, 2 * 30 + 10]).toEqual([110, 70]);
    const fig = s.body.find((b) => b.type === 'phasor');
    const [a1, a2, b] = fig.arcs;
    expect(a1.to - a1.from).toBe(a2.to - a2.from);
    expect(a1.to - a1.from + (b.to - b.from)).toBe(180);
  });

  it('Triangles: the median, the bisector split and length', () => {
    const s = section('Triangles');
    expect(0.5 * Math.sqrt(2 * 49 + 2 * 81 - 64)).toBe(7);
    expect([15 * (18 / 30), 15 * (12 / 30)]).toEqual([9, 6]);
    const t = Math.sqrt(12 * 18 * (30 ** 2 - 15 ** 2)) / 30;
    expect(said(s.examples[1])).toContain(`= ${f2(t)}$`);
    expect(12 * 18 * (900 - 225)).toBe(145800);
  });

  it('Similar figures: shadow, area ratio, parallel line, model', () => {
    expect(8 * (1.8 / 1.2)).toBeCloseTo(12, 12);
    expect(108 * (7 / 9)).toBeCloseTo(84, 12);
    expect((4 * 9) / 6).toBe(6);
    expect(2 * 50 ** 3).toBe(250000);
  });

  it('Quadrilaterals: Bretschneider and Brahmagupta, the parallelogram', () => {
    const board = said(section('Quadrilaterals').examples[1]);
    const P = 12 * 10 * 8 * 6;
    expect(P).toBe(6 * 8 * 10 * 12);
    expect(board).toContain(`= ${f2(Math.sqrt(P - P * Math.cos(rad(120)) ** 2))}$ m²`);
    expect(board).toContain(`= ${f2(Math.sqrt(P))}$ m²`);
    expect(board).toContain(`= ${f2(140 * Math.sin(rad(50)))}$ cm²`);
    const d1 = Math.sqrt(296 + 280 * Math.cos(rad(50)));
    const d2 = Math.sqrt(296 - 280 * Math.cos(rad(50)));
    expect(board).toContain(`$d = ${f2(d1)}$ and $${f2(d2)}$ cm`);
    expect(d1 ** 2 + d2 ** 2).toBeCloseTo(592, 9);
  });

  it('Polygons: the octagon, sides from diagonals', () => {
    const s = section('Polygons');
    expect(360 / 24).toBe(15);
    const board = said(s.examples[1]);
    expect(board).toContain(`= ${f2(2 * (1 + Math.SQRT2) * 16)}$ cm²`);
    expect(board).toContain(`= ${f3(4 / (2 * Math.sin(rad(22.5))))}$ cm`);
    expect(board).toContain(`= ${f3(4 / (2 * Math.tan(rad(22.5))))}$ cm`);
    expect((10 * 7) / 2).toBe(35);
    expect(s.check[1].a).toContain(f2(1.5 * Math.sqrt(3) * 36));
  });

  it('Circles: the chord, the track, the arc', () => {
    const board = said(section('Circles').examples[1]);
    expect(Math.hypot(12, 5)).toBe(13);
    expect(board).toContain(`= ${f2(Math.PI * (56 ** 2 - 50 ** 2))}$ m²`);
    expect(board).toContain(`= ${f2((13 * 70 * Math.PI) / 180)}$ cm`);
  });

  it('Arcs, chords and tangents: power of a point, common tangents, secant angle', () => {
    const board = said(section('Arcs, Chords and Tangents').examples[1]);
    expect((8 * 6) / 4).toBe(12);
    expect(board).toContain(`= ${f2(Math.sqrt(200))}$ cm`);
    expect(board).toContain(`= ${f2(Math.sqrt(56))}$ cm`);
    expect((110 - 40) / 2).toBe(35);
    expect(8 * 18).toBe(12 ** 2);
  });

  it('Sectors and segments: the 60° sector, the arch', () => {
    const s = section('Sectors and Segments');
    const r = 14.5;
    expect(400 / 32 + 2).toBe(r);
    expect(r - Math.sqrt(r * r - 100)).toBeCloseTo(4, 12);
    const half = Math.asin(10 / r);
    const th = 2 * half;
    const board = said(s.examples[1]);
    expect(board).toContain(`= ${f2(deg(half))}^\\circ$ and $\\theta = ${f2(deg(th))}^\\circ = ${th.toFixed(4)}$ rad`);
    expect(board).toContain(`= ${f2(0.5 * r * r * (th - Math.sin(th)))}$ m²`);
    expect(s.check[1].a).toContain(f2(18 * ((2 * Math.PI) / 3 - Math.sin((2 * Math.PI) / 3))));
  });

  it('Inscribed figures: the right triangle, the cyclic quadrilateral', () => {
    const board = said(section('Inscribed and Circumscribed Figures').examples[1]);
    expect([(9 + 12 - 15) / 2, 15 / 2]).toEqual([3, 7.5]);
    expect(board).toContain(`= ${f3(Math.sqrt(7.5 * 1.5))}$`);
    const A = Math.sqrt(8 * 7 * 6 * 5);
    expect(board).toContain(`= ${f2(A)}$`);
    expect([5 * 6 + 7 * 8, 5 * 7 + 6 * 8, 5 * 8 + 6 * 7]).toEqual([86, 83, 82]);
    expect(board).toContain(`= ${f3(Math.sqrt(86 * 83 * 82) / (4 * A))}$`);
  });

  it('Area and perimeter: wire shapes, Pick, ellipse, the rectangle curve', () => {
    const s = section('Area and Perimeter');
    const board = said(s.examples[1]);
    expect(board).toContain(`= ${f3(48 / (2 * Math.PI))}$ cm`);
    expect(board).toContain(`= ${f2(48 ** 2 / (4 * Math.PI))}$ cm²`);
    expect(Math.round((48 ** 2 / (4 * Math.PI) / 144 - 1) * 100)).toBe(27);
    expect(10 + 8 / 2 - 1).toBe(13);
    expect(board).toContain(`= ${f2(24 * Math.PI)}$`);
    expect(fenced(8.5)).toBe(72.25);
    expect(fenced(12)).toBe(60);
    [5, 8, 9, 12].forEach((w) => expect(fenced(w)).toBeLessThan(fenced(8.5)));
  });

  it("Ptolemy: the diagonals from the sides", () => {
    const board = said(section("Ptolemy's Theorem").examples[1]);
    const p = Math.sqrt((83 * 82) / 86);
    const q = Math.sqrt((83 * 86) / 82);
    expect(board).toContain(`= ${f3(p)}$`);
    expect(board).toContain(`= ${f3(q)}$`);
    expect(p * q).toBeCloseTo(83, 9);
  });
});
