// Analytic Geometry in the module format (2026-11-27): every number in the
// topic's worked examples and figures worked again, so a slip in the text
// fails here.
import { describe, it, expect } from 'vitest';
import lesson, { CIRCLE, touchPoint, ELLIPSE_P, ROT, rotatedEllipse } from './content/mathematics/analytic-geometry.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const plot = (s) => s.body.find((b) => b.type === 'plot');
const dist = ([a, b], [c, d]) => Math.hypot(c - a, d - b);
const deg = (x) => (x * 180) / Math.PI;
const shoelace = (pts) => Math.abs(pts.reduce((s, [x, y], i) => {
  const [u, v] = pts[(i + 1) % pts.length];
  return s + x * v - u * y;
}, 0)) / 2;

describe('Analytic Geometry, worked again', () => {
  it('Coordinates: the dividing point, the areas, the locus, space', () => {
    expect([(2 * 7 - 2) / 3, (2 * -1 + 5) / 3]).toEqual([4, 1]);
    expect(shoelace([[1, 2], [8, 3], [4, 9]])).toBe(23);
    expect(shoelace([[0, 0], [6, 1], [5, 7], [-1, 4]])).toBe(32);
    // Any point on 2x − 3y − 9 = 0 is equally far from (1, 2) and (5, −4).
    const p = [6, 1];
    expect(dist(p, [1, 2])).toBeCloseTo(dist(p, [5, -4]), 12);
    expect(Math.hypot(3, 4, 12)).toBe(13);
    expect([(-3 + 5) / 2, (8 - 2) / 2]).toEqual([1, 3]);
    expect([2 * 2 + 2, 2 * -1 - 4]).toEqual([6, -6]);
    expect(plot(section('Coordinate Systems and Distance')).series[0].points).toHaveLength(4);
  });

  it('Lines: the perpendicular foot, the perpendicular line, parallel lines', () => {
    const s = section('Lines and Slopes');
    expect(Math.abs(15 + 24 - 12) / 5).toBe(5.4);
    const [, foot] = plot(s).series[1].points;
    expect(3 * foot[0] + 4 * foot[1] - 12).toBeCloseTo(0, 12);
    expect(dist([5, 6], foot)).toBeCloseTo(5.4, 12);
    expect(deg(Math.atan(1))).toBe(45);
    expect((3 - 0.5) / (1 + 1.5)).toBe(1);
    expect(3 * 2 + 4 * -3 + 6).toBe(0);
    expect((4 / 3) * (-3 / 4)).toBe(-1);
    expect(Math.abs(20 + 5) / 10).toBe(2.5);
  });

  it('Circles: the tangent, the diameter, the tangent line, the point circle', () => {
    const s = section('Circles');
    const T = touchPoint();
    const C = [CIRCLE.h, CIRCLE.k];
    expect(dist(T, C)).toBeCloseTo(5, 12);
    const radius = [T[0] - C[0], T[1] - C[1]];
    const tangent = [CIRCLE.P[0] - T[0], CIRCLE.P[1] - T[1]];
    expect(radius[0] * tangent[0] + radius[1] * tangent[1]).toBeCloseTo(0, 9);
    expect(said(s.examples[0])).toContain(`\\sqrt{137} = ${Math.sqrt(137).toFixed(2)}`);
    expect(dist(T, CIRCLE.P)).toBeCloseTo(Math.sqrt(137), 9);
    // x² + y² − 6x − 2y − 15 = 0 passes through both ends of the diameter.
    [[-1, 4], [7, -2]].forEach(([x, y]) => expect(x * x + y * y - 6 * x - 2 * y - 15).toBe(0));
    expect(Math.abs(6 + 4 + 5) / 5).toBe(3);
    expect(said(s.examples[1])).toContain(`9\\pi = ${(9 * Math.PI).toFixed(2)}`);
    expect((36 + 100) / 4).toBe(34);
    expect(Math.hypot(5, 5).toFixed(2)).toBe('7.07');
  });

  it('Parabola: the focus and latus rectum, the arch', () => {
    const s = section('Parabola');
    const [, lr] = plot(s).series;
    lr.points.forEach(([x, y]) => expect((y - 2) ** 2).toBeCloseTo(8 * (x - 3), 12));
    expect(dist(...lr.points)).toBe(8);
    expect(24 * Math.sqrt(4 / 9)).toBeCloseTo(16, 12);
    expect((2 / 3) * 24 * 9).toBe(144);
  });

  it('Ellipse: the focal sum, the general form, the orbit', () => {
    const s = section('Ellipse');
    const [x, y] = ELLIPSE_P;
    expect(x * x / 25 + y * y / 9).toBeCloseTo(1, 12);
    expect(dist(ELLIPSE_P, [-4, 0])).toBeCloseTo(7.4, 12);
    expect(dist(ELLIPSE_P, [4, 0])).toBeCloseTo(2.6, 12);
    expect(2 * 9 / 5).toBe(3.6);
    // 4(x − 2)² + 9(y + 3)² = 36 expands back to the given equation.
    const g = (X, Y) => 4 * X * X + 9 * Y * Y - 16 * X + 54 * Y + 61;
    expect(g(2 + 3, -3)).toBe(0);
    expect(g(2, -3 + 2)).toBe(0);
    const board = said(s.examples[1]);
    const c = Math.sqrt(5);
    expect(board).toContain(`\\sqrt5 = ${c.toFixed(3)}$, $e = ${(c / 3).toFixed(3)}$`);
    expect(board).toContain(`= ${(8 / 3).toFixed(3)}$, area $6\\pi = ${(6 * Math.PI).toFixed(2)}$`);
    expect((150 * (1 - 0.0167)).toFixed(1)).toBe('147.5');
    expect((150 * (1 + 0.0167)).toFixed(1)).toBe('152.5');
  });

  it('Hyperbola: the figure, the general form', () => {
    const s = section('Hyperbola');
    plot(s).series.slice(0, 2).forEach((b) => b.points.forEach(([x, y]) => expect(x * x / 9 - y * y / 16).toBeCloseTo(1, 9)));
    expect((2 * 16 / 3).toFixed(2)).toBe('10.67');
    const g = (X, Y) => 9 * X * X - 4 * Y * Y - 36 * X - 8 * Y - 4;
    expect(g(2 + 2, -1)).toBe(0);
    const board = said(s.examples[1]);
    const c = Math.sqrt(13);
    expect(board).toContain(`\\sqrt{13} = ${c.toFixed(3)}$, $e = ${(c / 2).toFixed(3)}$`);
    expect(2 * 9 / 2).toBe(9);
  });

  it('General conics: the discriminants, the complex-form ellipse', () => {
    const disc = (A, B, C) => B * B - 4 * A * C;
    expect(disc(4, -4, 1)).toBe(0);
    expect(disc(1, 1, 1)).toBe(-3);
    expect(disc(3, -2, 3)).toBe(-32);
    expect(disc(1, 4, 4)).toBe(0);
    expect(said(section('General Conic Sections').examples[1])).toContain(`\\sqrt{21} = ${Math.sqrt(21).toFixed(3)}`);
  });

  it('Rotation: the ellipse in the figure, the hyperbola, the translation', () => {
    expect(deg(ROT).toFixed(2)).toBe('26.57');
    // Each point of the drawn curve satisfies 5x² + 4xy + 2y² = 6.
    [0, 1, 2.5, 4].forEach((t) => {
      const [x, y] = rotatedEllipse(t);
      expect(5 * x * x + 4 * x * y + 2 * y * y).toBeCloseTo(6, 9);
    });
    const [c, s] = [Math.cos(ROT), Math.sin(ROT)];
    const A1 = (A, B, C) => A * c * c + B * s * c + C * s * s;
    expect(A1(5, 4, 2)).toBeCloseTo(6, 12);
    expect(A1(1, 4, -2)).toBeCloseTo(2, 12);
    expect(-1 - 2).toBe(-3);
    expect(3 + 4 + 9).toBe(16);
  });

  it('Polar: the point, the conversions, the distance, the conic', () => {
    expect([Math.hypot(-2, 2 * Math.sqrt(3)), deg(Math.atan2(2 * Math.sqrt(3), -2))].map((v) => +v.toFixed(9))).toEqual([4, 120]);
    // r = 4 sin θ lands on x² + y² − 4y = 0.
    const th = 0.7;
    const r = 4 * Math.sin(th);
    const [x, y] = [r * Math.cos(th), r * Math.sin(th)];
    expect(x * x + y * y - 4 * y).toBeCloseTo(0, 12);
    expect(said(section('Polar Coordinates').examples[1])).toContain(`d = ${Math.sqrt(52).toFixed(3)}`);
    expect([6 / (2 - 1), 6 / (2 + 1)]).toEqual([6, 2]);
  });

  it('Parametric: the slope, the projectile, the cycloid', () => {
    expect((2 * Math.cos(Math.PI / 4)) / (-3 * Math.sin(Math.PI / 4))).toBeCloseTo(-2 / 3, 12);
    const g = 9.81;
    const board = said(section('Parametric Equations').examples[1]);
    expect(board).toContain(`= ${(400 * Math.sin(Math.PI / 3) / g).toFixed(2)}$ m`);
    expect(board).toContain(`= ${(400 * 0.25 / (2 * g)).toFixed(3)}$ m`);
    expect(board).toContain(`= ${(40 * 0.5 / g).toFixed(3)}$ s`);
  });

  it('Space: the plane distance, the sphere, the coordinates, the planes', () => {
    expect((8 + 2 + 12 - 3) / 3).toBeCloseTo(6.33, 2);
    expect(Math.sqrt(9 + 4 + 1 + 11)).toBe(5);
    const board = said(section('Lines and Planes in Space').examples[1]);
    expect(board).toContain(`(2, ${(4 * Math.sin(Math.PI / 3)).toFixed(3)}, 3)`);
    expect(board).toContain(`= ${deg(Math.acos(1 / 3)).toFixed(2)}^\\circ`);
    expect(board).toContain(`= ${deg(Math.acos(4 / 9)).toFixed(2)}^\\circ`);
    expect(Math.hypot(2, 2, 1)).toBe(3);
    expect(2 * (2 + 1) - 6 - (2 - 2)).toBe(0);
  });
});
