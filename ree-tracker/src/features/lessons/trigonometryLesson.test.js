// Trigonometry in the module format (2026-11-26): every number in the topic's
// worked examples and figures worked again, so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { eq } from './content/mathematics/trigonometry.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figures = (s, type) => s.body.filter((b) => typeof b !== 'string' && (type ? b.type === type : true));
const rad = (d) => (d * Math.PI) / 180;
const deg = (x) => (x * 180) / Math.PI;
const f2 = (x) => x.toFixed(2);

describe('Trigonometry, worked again', () => {
  it('Angle measure: belt speed, unit conversions, the complement, the quadrant', () => {
    const s = section('Angle Measure');
    expect(said(s.examples[0])).toContain(`= ${f2(0.4 * (2 * Math.PI * 300) / 60)}$ m/s`);
    const board = said(s.examples[1]);
    expect(800 * (360 / 6400)).toBe(45);
    expect(board).toContain(`= ${(250 * (2 * Math.PI) / 400).toFixed(3)}$ rad`);
    expect(180 - 67.5).toBe(5 * (90 - 67.5));
    expect(-1000 + 3 * 360).toBe(80);
    expect(s.body.find((b) => b.figure).figure).toBe('sector');
  });

  it('Functions: QIII values, versines, the graph, the unit circle', () => {
    const s = section('Trigonometric Functions');
    const A = Math.PI + Math.acos(5 / 13);
    expect(Math.cos(A)).toBeCloseTo(-5 / 13, 12);
    expect(Math.sin(A)).toBeCloseTo(-12 / 13, 12);
    expect(Math.cos(A) / Math.sin(A)).toBeCloseTo(5 / 12, 12);
    expect([1 - 0.8, 1 - 0.6].map((v) => +v.toFixed(10))).toEqual([0.2, 0.4]);
    const [unit] = figures(s, 'phasor');
    const [c, sn] = unit.vectors;
    expect(-c.mag).toBeCloseTo(Math.cos(rad(150)), 12);
    expect(sn.mag).toBeCloseTo(Math.sin(rad(150)), 12);
    const [sin, cos] = figures(s, 'plot')[0].series;
    expect(sin.f(90)).toBeCloseTo(1, 12);
    expect(cos.f(180)).toBeCloseTo(-1, 12);
    expect(Math.cos(rad(210))).toBeCloseTo(-Math.sqrt(3) / 2, 12);
  });

  it('Identities: sec minus cos over tan, tan 2 in QI', () => {
    const t = rad(37);
    expect((1 / Math.cos(t) - Math.cos(t)) / Math.tan(t)).toBeCloseTo(Math.sin(t), 12);
    const board = said(section('Fundamental Identities').examples[1]);
    expect(board).toContain(`= ${Math.sqrt(5).toFixed(3)}$`);
    expect(board).toContain(`= ${(2 / Math.sqrt(5)).toFixed(3)}$`);
    expect(Math.sin(Math.atan(2))).toBeCloseTo(2 / Math.sqrt(5), 12);
  });

  it('Sum, double, half, triple: every value', () => {
    const s = section('Sum, Difference, Double and Half Angle');
    expect(said(s.examples[0])).toContain(`= ${Math.sin(rad(75)).toFixed(4)}$`);
    const A = Math.asin(3 / 5);
    const B = Math.acos(5 / 13);
    const board = said(s.examples[1]);
    expect(Math.sin(A + B)).toBeCloseTo(63 / 65, 12);
    expect(board).toContain(`= ${(63 / 65).toFixed(4)}$`);
    expect(Math.cos(2 * A)).toBeCloseTo(0.28, 12);
    expect(Math.tan(A / 2)).toBeCloseTo(1 / 3, 12);
    expect(Math.sin(3 * A)).toBeCloseTo(117 / 125, 12);
    expect(117 / 125).toBe(0.936);
    expect(Math.tan(rad(15))).toBeCloseTo(2 - Math.sqrt(3), 12);
  });

  it('Right triangles: the ladder, the legs from the hypotenuse, the 3-4-5 figure', () => {
    const s = section('Right Triangles');
    expect(said(s.examples[0])).toContain(`= ${deg(Math.acos(0.6)).toFixed(2)}^\\circ$`);
    expect(10 ** 2 + 24 ** 2).toBe(26 ** 2);
    expect(said(s.examples[1])).toContain(`= ${deg(Math.atan(2.4)).toFixed(2)}^\\circ$`);
    const [b, a, c] = figures(s, 'phasor')[0].vectors;
    expect(Math.hypot(b.mag, a.mag)).toBe(c.mag);
    expect(Math.tan(rad(c.angle))).toBeCloseTo(3 / 4, 12);
    expect(s.check[0].a).toContain(`${(6 * Math.sqrt(3)).toFixed(2)}`);
  });

  it('Elevation and bearings: two sightings, the car, the ship', () => {
    const s = section('Angles of Elevation and Depression');
    expect(said(s.examples[0])).toContain(`= ${f2(20 / (Math.sqrt(3) - 1))}$ m`);
    const board = said(s.examples[1]);
    expect(board).toContain(`= ${f2(40 / Math.tan(rad(25)))}$ m`);
    expect(board).toContain(`= ${f2(Math.hypot(30, 50))}$ km`);
    const turn = deg(Math.atan(50 / 30));
    expect(board).toContain(`= ${f2(turn)}^\\circ$`);
    expect(board).toContain(`azimuth $${f2(40 + turn)}^\\circ$, which is S ${f2(180 - 40 - turn)}° E`);
    expect(s.check[1].a).toContain(f2(50 * Math.tan(rad(35))));
    const [bearing] = figures(s, 'phasor').at(-1).vectors;
    expect(90 - bearing.angle).toBe(35);
  });

  it('Sine and cosine laws: the third side, the two triangles, the median', () => {
    const s = section('Sine and Cosine Laws');
    expect(said(s.examples[0])).toContain(`= ${f2(Math.sqrt(57))}$`);
    const sinB = (10 * Math.sin(rad(40))) / 8;
    const B1 = deg(Math.asin(sinB));
    const B2 = 180 - B1;
    const cOf = (B) => (8 * Math.sin(rad(180 - 40 - B))) / Math.sin(rad(40));
    const board = said(s.examples[1]);
    expect(board).toContain(`= ${sinB.toFixed(4)}$, so $B = ${f2(B1)}^\\circ$ or $${f2(B2)}^\\circ$`);
    expect(board).toContain(`$C = ${f2(140 - B1)}^\\circ$ or $${f2(140 - B2)}^\\circ$`);
    expect(board).toContain(`$c = ${f2(cOf(B1))}$ or $c = ${f2(cOf(B2))}$`);
    expect(s.check[0].a).toContain(`$C = ${f2(deg(Math.acos(0.2)))}^\\circ$`);
    expect(s.check[1].a).toContain(f2(0.5 * Math.sqrt(2 * 100 + 2 * 256 - 196)));
  });

  it('Areas: Heron, the equilateral triangle, similar triangles, the escribed circle', () => {
    const s = section('Area of Triangles');
    expect(Math.sqrt(21 * 8 * 7 * 6)).toBe(84);
    expect((13 * 14 * 15) / (4 * 84)).toBe(8.125);
    const A = (Math.sqrt(3) / 4) * 144;
    const r = A / 18;
    const R = 12 ** 3 / (4 * A);
    const board = said(s.examples[1]);
    expect(board).toContain(`= ${f2(A)}$ cm²`);
    expect(board).toContain(`= ${r.toFixed(3)}$ cm, a circle of $\\pi r^2 = ${f2(Math.PI * r * r)}$`);
    expect(board).toContain(`= ${R.toFixed(3)}$ cm, a circle of $${f2(Math.PI * R * R)}$`);
    expect(140 * (4 / 7)).toBe(80);
    expect(84 / (21 - 14)).toBe(12);
  });

  it('Inverses: the sum of arctangents, a principal value, the curves', () => {
    const s = section('Inverse Functions');
    expect(deg(Math.atan(1 / 2) + Math.atan(1 / 3))).toBeCloseTo(45, 12);
    expect(Math.cos(Math.asin(-5 / 13))).toBeCloseTo(12 / 13, 12);
    expect(deg(Math.asin(Math.sin(rad(150))))).toBeCloseTo(30, 12);
    const [asin, acos] = figures(s, 'plot')[0].series;
    [-1, -0.3, 0, 0.6, 1].forEach((x) => expect(asin.f(x) + acos.f(x)).toBeCloseTo(90, 9));
  });

  it('Equations: the roots of both, and the curve', () => {
    const s = section('Trigonometric Equations');
    [90, 210, 330].forEach((x) => expect(eq(x)).toBeCloseTo(0, 12));
    expect(eq(270)).toBeCloseTo(2, 12);
    expect(figures(s, 'plot')[0].marks.map((m) => m.x)).toEqual([90, 210, 330]);
    [0, 120, 240].forEach((x) => expect(Math.cos(rad(2 * x))).toBeCloseTo(Math.cos(rad(x)), 12));
    expect(Math.tan(rad(60))).toBeCloseTo(Math.sqrt(3), 12);
  });

  it('Hyperbolic: from cosh 5/4, the values at 1.2, the inverse', () => {
    const s = section('Hyperbolic Functions');
    expect(Math.acosh(5 / 4)).toBeCloseTo(Math.log(2), 12);
    const board = said(s.examples[1]);
    expect(board).toContain(`= ${Math.sinh(1.2).toFixed(4)}$ and $\\cosh 1.2 = ${Math.cosh(1.2).toFixed(4)}$`);
    expect(board).toContain(`= ${Math.asinh(2).toFixed(4)}$`);
    expect(Math.cosh(1.2) ** 2 - Math.sinh(1.2) ** 2).toBeCloseTo(1, 12);
  });

  it('Spherical: the excess area, the great-circle distance', () => {
    const s = section('Spherical Trigonometry');
    expect(said(s.examples[0])).toContain(`= ${f2((Math.PI * 100 * 40) / 180)}$`);
    const cosc = Math.sin(rad(14.6)) * Math.sin(rad(35.7)) + Math.cos(rad(14.6)) * Math.cos(rad(35.7)) * Math.cos(rad(18.7));
    const c = Math.acos(cosc);
    const board = said(s.examples[1]);
    expect(board).toContain(`= ${cosc.toFixed(4)}$`);
    expect(board).toContain(`$c = ${f2(deg(c))}^\\circ = ${c.toFixed(4)}$ rad`);
    expect(board).toContain(`= ${Math.round(6371 * c)}$ km, about ${Math.round((6371 * c) / 1.852)} nautical miles`);
  });
});
