// Solid Geometry in the module format (2026-11-27): every number in the
// topic's worked examples and figures worked again, so a slip in the text
// fails here.
import { describe, it, expect } from 'vitest';
import lesson, { CAN, canArea } from './content/mathematics/solid-geometry.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const plot = (s) => s.body.find((b) => b.type === 'plot');
const f2 = (x) => x.toFixed(2);

describe('Solid Geometry, worked again', () => {
  it('Polyhedrons: Euler on mixed faces, the tetrahedron, the table', () => {
    const s = section('Polyhedrons');
    const E = (8 * 3 + 6 * 4) / 2;
    expect([E, 2 - 14 + E]).toEqual([24, 12]);
    const board = said(s.examples[1]);
    expect(board).toContain(`= ${f2(216 / (6 * Math.SQRT2))}$ cm³`);
    expect(board).toContain(`= ${f2(36 * Math.sqrt(3))}$ cm²`);
    const rows = [...s.body[0].matchAll(/\| ([a-z ()]+) \| [a-z]+ \| (\d+) \| (\d+) \| (\d+) \|/g)];
    expect(rows).toHaveLength(5);
    rows.forEach(([, , V, Ed, F]) => expect(Number(V) - Number(Ed) + Number(F)).toBe(2));
  });

  it('Prisms: the box, the oblique prism', () => {
    expect(Math.sqrt(9 + 16 + 144)).toBe(13);
    expect(2 * (12 + 48 + 36)).toBe(192);
    expect([20 * 15, 18 * 15]).toEqual([300, 270]);
    expect(said(section('Prisms').examples[0])).toContain(`= ${f2(6 * Math.sqrt(3))}$ cm²`);
  });

  it('Pyramids: from the lateral edge', () => {
    const board = said(section('Pyramids').examples[1]);
    expect(Math.sqrt(625 - 49)).toBe(24);
    expect(0.5 * 56 * 24).toBe(672);
    const h = Math.sqrt(625 - 98);
    expect(board).toContain(`= ${f2(h)}$ cm`);
    expect(board).toContain(`= ${((196 * h) / 3).toFixed(1)}$ cm³`);
  });

  it('Frustums: the pyramid frustum, the bucket', () => {
    const board = said(section('Frustums').examples[1]);
    expect((4 / 3) * (36 + 9 + Math.sqrt(324))).toBeCloseTo(84, 12);
    const L = Math.sqrt(16 + 2.25);
    expect(board).toContain(`= ${L.toFixed(3)}$ cm`);
    expect(board).toContain(`= ${f2(0.5 * 36 * L)}$ cm²`);
    expect(board).toContain(`= 14\\,${((4750 * Math.PI) % 1000).toFixed(1)}$ cm³`);
    expect(Math.round(4750 * Math.PI / 10) / 100).toBe(14.92);
  });

  it('Cylinders: the best can, the lying tank, the area curve', () => {
    const s = section('Cylinders');
    const r = Math.cbrt(CAN / (2 * Math.PI));
    const board = said(s.examples[1]);
    expect(board).toContain(`= ${f2(r)}$ cm and $h = ${f2(2 * r)}$ cm, with area $${canArea(r).toFixed(1)}$`);
    [r * 0.9, r * 1.1].forEach((x) => expect(canArea(x)).toBeGreaterThan(canArea(r)));
    expect(Math.PI * r * r * 2 * r).toBeCloseTo(CAN, 9);
    const th = 2 * Math.acos(0.5);
    const seg = 0.5 * (th - Math.sin(th));
    expect(board).toContain(`= ${seg.toFixed(4)}$ m²`);
    expect(board).toContain(`$${(3 * seg).toFixed(4)}$ m³, about ${(3000 * seg).toFixed(1)} L`);
    expect(plot(s).marks[0].x).toBeCloseTo(r, 12);
  });

  it('Cones: from a sector, a height from a volume', () => {
    const board = said(section('Cones').examples[1]);
    expect((9 * 240) / 360).toBe(6);
    const h = Math.sqrt(45);
    expect(board).toContain(`= ${h.toFixed(3)}$ cm`);
    expect(board).toContain(`= ${f2((Math.PI * 36 * h) / 3)}$ cm³`);
    expect((3 * 100) / 25).toBe(12);
  });

  it('Spheres: packing, lune, wedge', () => {
    const board = said(section('Spheres').examples[1]);
    const balls = 27 * (4 / 3) * Math.PI;
    expect(board).toContain(`= ${f2(216 - balls)}$ cm³`);
    expect(board).toContain(`= ${f2(20 * Math.PI)}$ cm²`);
    expect(board).toContain(`= ${f2(40 * Math.PI)}$ cm³`);
    expect((Math.PI * 36 * 50) / 90).toBeCloseTo(20 * Math.PI, 12);
    expect((Math.PI * 216 * 50) / 270).toBeCloseTo(40 * Math.PI, 12);
  });

  it('Segments and sectors: the tank, the spherical sector', () => {
    const board = said(section('Spherical Segments and Sectors').examples[1]);
    const cap = (Math.PI * 1.5 ** 2 * (6 - 1.5)) / 3;
    expect(board).toContain(`= ${f2(cap)}$ m³`);
    expect(Math.round((cap / ((32 * Math.PI) / 3)) * 1000) / 10).toBe(31.6);
    expect(board).toContain(`= ${f2((2 / 3) * Math.PI * 400)}$ cm³`);
    expect(Math.sqrt(100 - 36)).toBe(8);
    expect(board).toContain(`= ${f2(160 * Math.PI)}$ cm²`);
  });

  it('Prismatoids: the wedge both ways', () => {
    expect(((4 * 5) / 6) * (2 * 6 + 3)).toBe(50);
    expect((5 / 6) * (24 + 4 * (4.5 * 2) + 0)).toBe(50);
    expect((3 / 6) * (16 + 36 + 4)).toBe(28);
  });

  it('Revolution: Pappus on a triangle, the ellipsoid', () => {
    expect(2 * Math.PI * (4 / 3) * 6).toBeCloseTo(16 * Math.PI, 12);
    expect((Math.PI * 16 * 3) / 3).toBeCloseTo(16 * Math.PI, 12);
    expect(said(section('Solids of Revolution').examples[1])).toContain(`= ${f2(80 * Math.PI)}$ cm³`);
    expect(section('Solids of Revolution').check[1].a).toContain((80 * Math.PI ** 2).toFixed(1));
  });

  it('Similar solids: paint, the half-volume cut, the curves', () => {
    const s = section('Similar Solids');
    expect(Math.cbrt(2000 / 250)).toBeCloseTo(2, 12);
    expect(said(s.examples[1])).toContain(`= ${(12 / Math.cbrt(2)).toFixed(3)}$ cm`);
    const [vol, area, len] = plot(s).series;
    expect([vol.f(2), area.f(2), len.f(2)]).toEqual([8, 4, 2]);
    expect((4 / 9) ** 3).toBeCloseTo((8 / 27) ** 2, 12);
  });
});
