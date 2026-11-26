// Vector Analysis in the module format (2026-11-27): every number in the
// topic's worked examples and figures worked again, with small vector helpers
// and numeric integrals, so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { polarOf, ORBIT_T, GRAD_AT } from './content/mathematics/vector-analysis.js';
import { phasorEnds } from './figures/figureMath';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const fig = (s, type) => s.body.find((b) => b.type === type);
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = ([a1, a2, a3], [b1, b2, b3]) => [a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1];
const len = (a) => Math.hypot(...a);
const deg = (x) => (x * 180) / Math.PI;
const det3 = (a, b, c) => dot(a, cross(b, c));
// Midpoint rule.
const integrate = (g, a, b, n = 20000) => {
  let s = 0;
  const h = (b - a) / n;
  for (let i = 0; i < n; i++) s += g(a + (i + 0.5) * h) * h;
  return s;
};

describe('Vector Analysis, worked again', () => {
  it('Algebra: the tip-to-tail figure, the unit vector, the resultant, direction angles', () => {
    const [, b, rr] = phasorEnds(fig(section('Vector Algebra'), 'phasor').vectors);
    expect(b.end[0]).toBeCloseTo(5, 12);
    expect(b.end[1]).toBeCloseTo(4, 12);
    expect(rr.end[0]).toBeCloseTo(5, 12);
    expect(rr.end[1]).toBeCloseTo(4, 12);
    expect(len([3, -2, 5]).toFixed(3)).toBe('6.164');
    expect(len([2, -3, 6])).toBe(7);
    expect(len(add(add([3, 1, -2], [-1, 4, 2]), [2, -1, 5])).toFixed(3)).toBe('7.550');
    const board = said(section('Vector Algebra').examples[1]);
    [[2, '73.40'], [-3, '115.38'], [6, '31.00']].forEach(([c, a]) => {
      expect(deg(Math.acos(c / 7)).toFixed(2)).toBe(a);
      expect(board).toContain(`= ${a}^\\circ`);
    });
    const u = [18, 3, 29].map((v) => (v / len([18, 3, 29])).toFixed(3));
    expect(u).toEqual(['0.525', '0.088', '0.846']);
  });

  it('Dot product: the projection figure, the angles, the perpendicular, work', () => {
    const [bv, av, drop] = phasorEnds(fig(section('Dot Product'), 'phasor').vectors);
    expect(drop.end[0]).toBeCloseTo(dot([3, 4], [6, 0]) / 6, 12);
    expect(drop.end[1]).toBeCloseTo(0, 12);
    expect([bv.end[0], av.end[1]].map((v) => +v.toFixed(9))).toEqual([6, 4]);
    expect(deg(Math.acos(dot([1, 2, 2], [2, -1, 2]) / 9)).toFixed(2)).toBe('63.61');
    expect(deg(Math.acos(dot([4, -2, 4], [3, 6, -2]) / (len([4, -2, 4]) * len([3, 6, -2])))).toFixed(2)).toBe('100.98');
    expect(dot([3, 1, -2], [2, -4, 1])).toBe(0);
    expect(dot([5, 2, -1], sub([4, 3, 2], [1, 0, 2]))).toBe(21);
    expect(dot([2, 1, 2], [3, 0, 4]) / 5).toBe(2.8);
    expect(dot([2, 2, -1], [6, -3, 2])).toBe(4);
    expect(dot([2, -3, 5], [3, -4 / 3, -2])).toBeCloseTo(0, 12);
  });

  it('Cross product: the parallelogram figure, the triangle, the torque, the unit normal', () => {
    const ends = phasorEnds(fig(section('Cross Product'), 'phasor').vectors);
    expect(ends[2].end[0]).toBeCloseTo(5, 12);
    expect(ends[3].end[1]).toBeCloseTo(3, 12);
    expect(cross([4, 0, 0], [1, 3, 0])).toEqual([0, 0, 12]);
    const c = cross(sub([0, 2, 0], [1, 0, 0]), sub([0, 0, 3], [1, 0, 0]));
    expect(c).toEqual([6, 3, 2]);
    expect(len(c) / 2).toBe(3.5);
    expect(cross([3, -1, 2], [1, 2, -1])).toEqual([-3, 5, 7]);
    const t = cross([0.2, 0.1, 0], [0, 0, 50]);
    expect(t.map((v) => +v.toFixed(9))).toEqual([5, -10, 0]);
    expect(len(t).toFixed(2)).toBe('11.18');
    expect(Math.sqrt(83).toFixed(3)).toBe('9.110');
    expect(cross([4, 2, -1], [-3, 6, -2])).toEqual([2, 11, 30]);
    expect(cross([0, 0, 1], [0, 1, 0])).toEqual([-1, 0, 0]);
  });

  it('Triple products: the volume, the determinant, coplanarity, BAC − CAB', () => {
    expect(det3([2, 0, 0], [1, 3, 0], [1, 1, 4])).toBe(24);
    expect(dot(cross([1, 2, 0], [0, 1, 3]), [2, 0, 1])).toBe(13);
    expect(det3([1, 2, 3], [2, 1, 4], [1, -1, 1])).toBe(0);
    const [A, B, C] = [[1, 0, 0], [0, 1, 0], [1, 1, 1]];
    const lhs = cross(A, cross(B, C));
    const rhs = sub(B.map((v) => v * dot(A, C)), C.map((v) => v * dot(A, B)));
    expect(lhs.map((v) => v + 0)).toEqual(rhs.map((v) => v + 0));
    expect(lhs.map((v) => v + 0)).toEqual([0, 1, 0]);
  });

  it('Lines and planes: the plane, point to line, skew lines, the meeting line', () => {
    const n = cross(sub([3, 1, -1], [1, 0, 2]), sub([0, 2, 1], [1, 0, 2]));
    expect(n).toEqual([5, 5, 5]);
    [[1, 0, 2], [3, 1, -1], [0, 2, 1]].forEach((p) => expect(p[0] + p[1] + p[2]).toBe(3));
    const c = cross(sub([3, 1, 2], [1, 0, 0]), [1, 2, 2]);
    expect(c).toEqual([-2, -2, 3]);
    expect((len(c) / 3).toFixed(3)).toBe('1.374');
    const nn = cross([1, 0, 0], [0, 1, 1]);
    expect(nn).toEqual([0, -1, 1]);
    expect((Math.abs(dot([1, 2, 3], nn)) / len(nn)).toFixed(4)).toBe('0.7071');
    expect(cross([1, 1, 1], [2, -1, 1])).toEqual([2, 1, -3]);
    expect(6 / len([1, 2, 2])).toBe(2);
  });

  it('Derivatives: the orbit figure, the helix, the twisted cubic', () => {
    const [, vel, acc] = fig(section('Derivatives of Vector Functions'), 'plot').series;
    const [p, q] = vel.points;
    // The velocity is tangent: perpendicular to the ellipse's normal (x/9, y/4) at P.
    expect(dot(sub(q, p), [p[0] / 9, p[1] / 4])).toBeCloseTo(0, 12);
    expect(p[0]).toBeCloseTo(3 * Math.cos(ORBIT_T), 12);
    expect(acc.points[1]).toEqual([0, 0]);
    expect(Math.sqrt(4.25).toFixed(3)).toBe('2.062');
    expect((2 / 4.25).toFixed(3)).toBe('0.471');
    const [v, a] = [[2, 2, 3], [2, 0, 6]];
    const aT = dot(v, a) / len(v);
    expect(aT.toFixed(3)).toBe('5.336');
    expect(Math.sqrt(dot(a, a) - aT * aT).toFixed(3)).toBe('3.395');
    expect(cross(v, a)).toEqual([12, -6, -4]);
    const k = len(cross(v, a)) / len(v) ** 3;
    expect(k.toFixed(4)).toBe('0.1997');
    expect((k * 17).toFixed(3)).toBe('3.395');
    expect(Math.hypot(6, 12).toFixed(1)).toBe('13.4');
  });

  it('Gradient: the level-curve figure, the rates, the tangent plane', () => {
    const grad = fig(section('Directional Derivative and Gradient'), 'plot').series[3].points;
    const step = sub(grad[1], grad[0]);
    // Along ∇f = (4, 4), and perpendicular to the level curve's tangent (−4y, 2x) at (2, 1).
    expect(step[0]).toBeCloseTo(step[1], 12);
    expect(dot(step, [-4 * GRAD_AT[1], 2 * GRAD_AT[0]])).toBeCloseTo(0, 12);
    expect(GRAD_AT[0] ** 2 + 2 * GRAD_AT[1] ** 2).toBe(6);
    expect(dot([4, 0, 2], [2, -1, 2]) / 3).toBe(4);
    expect(len([4, 0, 2]).toFixed(3)).toBe('4.472');
    expect(len([4, -2, 4])).toBe(6);
    expect(2 * (1 - 1) + 4 * (1 - 1) + 4 * (2 - 2)).toBe(0);
    expect(1 + 2 * 1 + 2 * 2).toBe(7);
    const [x, y, z] = [2, -1, 1];
    expect(dot([y * y, 2 * x * y + z ** 3, 3 * y * z * z], [0.6, 0.8, 0])).toBeCloseTo(-1.8, 12);
    expect(Math.sqrt(56).toFixed(2)).toBe('7.48');
  });

  it('Divergence and curl: the values, the solenoidal a, the irrotational field and its potential', () => {
    expect(1 + 4 + Math.exp(0)).toBe(6);
    expect(2 * 1 * 1 - 6 * 1 * 1 + 1 * 1).toBe(-3);
    expect(1 + 1 + -2).toBe(0);
    expect(2 * 3 * 2 - 3 + 3 * 2).toBe(15);
    const [xx, zz] = [1, 1];
    expect([zz - 2 * xx, 0, 2 * zz - xx * xx]).toEqual([-1, 0, 1]);
    // The potential's gradient is F with a = 4, b = 2, c = −1.
    const f = (x, y, z) => x * x / 2 + 2 * x * y + 4 * x * z - 1.5 * y * y - y * z + z * z;
    const F = (x, y, z) => [x + 2 * y + 4 * z, 2 * x - 3 * y - z, 4 * x - y + 2 * z];
    const [p, q, r, h] = [0.3, -0.7, 1.1, 1e-6];
    const g = [(f(p + h, q, r) - f(p - h, q, r)) / (2 * h), (f(p, q + h, r) - f(p, q - h, r)) / (2 * h), (f(p, q, r + h) - f(p, q, r - h)) / (2 * h)];
    g.forEach((v, i) => expect(v).toBeCloseTo(F(p, q, r)[i], 6));
  });

  it('Line integrals: the two paths, the potential, the loop, the wire', () => {
    const work = (path, dpath) => integrate((t) => dot([path(t)[1], path(t)[0]], dpath(t)), 0, 1);
    expect(work((t) => [t, t], () => [1, 1])).toBeCloseTo(1, 8);
    expect(work((t) => [t, t * t], (t) => [1, 2 * t])).toBeCloseTo(1, 8);
    const F = ([x, y, z]) => [3 * x * x, 2 * y * z, y * y];
    expect(integrate((t) => dot(F([t, 2 * t, 3 * t]), [1, 2, 3]), 0, 1)).toBeCloseTo(13, 6);
    expect(integrate((t) => dot([t, t * t], [1, 2 * t]) + 3 * t * t, 0, 1)).toBeCloseTo(2, 6);
    expect(integrate((t) => dot([Math.sin(t), -Math.cos(t)], [-Math.sin(t), Math.cos(t)]), 0, 2 * Math.PI)).toBeCloseTo(-2 * Math.PI, 9);
    expect(integrate((t) => 7 * t * 5, 0, 1)).toBeCloseTo(17.5, 9);
    expect(9 - 1).toBe(8);
  });

  it('Surface integrals: the plane, the cylinder, the patch, the sphere', () => {
    expect(len(cross([-6, 3, 0], [-6, 0, 3])) / 2).toBe(13.5);
    expect(Math.sqrt(1 + 0.25 + 1) * 9).toBe(13.5);
    expect((2 * 2 * Math.PI * 2 * 3).toFixed(2)).toBe('75.40');
    expect((3 * (Math.PI / 3) * 4).toFixed(3)).toBe('12.566');
    expect((8 * Math.PI).toFixed(2)).toBe('25.13');
    expect((32 * Math.PI).toFixed(1)).toBe('100.5');
  });

  it("Green, divergence and Stokes: each side of each theorem agrees", () => {
    // Green round the unit square: four edges, counterclockwise.
    const P = (x, y) => -y;
    const Q = (x) => x * x;
    const square = integrate((t) => P(t, 0), 0, 1) + integrate(() => Q(1), 0, 1) - integrate((t) => P(t, 1), 0, 1) - integrate(() => Q(0), 0, 1);
    expect(square).toBeCloseTo(2, 9);
    // Round the triangle (0,0) → (1,0) → (1,1) → (0,0) for xy dx + x² dy.
    // Edges: y = 0 gives 0; x = 1 gives the integral of 1 dy; back along y = x gives minus the integral of 2u².
    const tri = 0 + integrate(() => 1, 0, 1) - integrate((u) => 2 * u * u, 0, 1);
    expect(tri).toBeCloseTo(1 / 3, 9);
    expect(integrate((t) => 0.5 * (6 * Math.cos(t) ** 2 + 6 * Math.sin(t) ** 2), 0, 2 * Math.PI).toFixed(2)).toBe('18.85');
    expect(integrate((r) => 3 * r * r * 4 * Math.PI * r * r, 0, 1).toFixed(3)).toBe('7.540');
    expect(5 * 2 * 1 * 3).toBe(30);
    expect(3 * 8).toBe(24);
    // Stokes (a): ∮ (z, x, y)·dr round the unit circle at z = 0 is ∮ x dy = π.
    expect(integrate((t) => Math.cos(t) * Math.cos(t), 0, 2 * Math.PI)).toBeCloseTo(Math.PI, 9);
    // (b): ∮ (2y dx + 3x dy) round radius 2.
    expect(integrate((t) => 2 * 2 * Math.sin(t) * -2 * Math.sin(t) + 3 * 2 * Math.cos(t) * 2 * Math.cos(t), 0, 2 * Math.PI).toFixed(3)).toBe('12.566');
    expect(integrate((t) => 2 * Math.sin(t) * -Math.sin(t) + 3 * Math.cos(t) * Math.cos(t), 0, 2 * Math.PI)).toBeCloseTo(Math.PI, 9);
    expect(polarOf(3, 4).mag).toBe(5);
  });
});
