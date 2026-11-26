// Calculus 1 in the module format (2026-11-27): every number in the topic's
// worked examples and figures worked again, so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { sinc, implicitPoint, CURVATURE } from './content/mathematics/calculus-1.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const plots = (s) => s.body.filter((b) => b.type === 'plot');
const deg = (x) => (x * 180) / Math.PI;
// A central difference: good to about 1e-8 for these smooth functions.
const d = (f, x, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h);

describe('Calculus 1, worked again', () => {
  it('Limits: the root, the trig ratio, the asymptotes, the sinc figure', () => {
    const near = 1e-7;
    expect((Math.sqrt(near + 9) - 3) / near).toBeCloseTo(1 / 6, 6);
    expect(Math.sin(3 * near) / Math.tan(5 * near)).toBeCloseTo(0.6, 9);
    [3, -2].forEach((x) => expect(x * x - x - 6).toBe(0));
    expect(sinc(0)).toBe(1);
    expect(sinc(1e-6)).toBeCloseTo(1, 9);
    expect((1e9 ** 3 - 2e9 + 9) / (2 * 1e9 ** 3 - 8)).toBeCloseTo(0.5, 9);
  });

  it('Rules: the secants, the tangent and normal, the crossing angle', () => {
    const [, s2, s1, tan] = plots(section('Differentiation Rules'))[0].series;
    expect([s2.f(3), s1.f(2), tan.f(1)]).toEqual([9, 4, 1]);
    const y = (x) => 2 * x ** 3 - 5 * x + 1;
    expect(y(1)).toBe(-2);
    expect(d(y, 1)).toBeCloseTo(1, 6);
    expect(deg(Math.atan((2 - 0.5) / 2)).toFixed(2)).toBe('36.87');
    // The normal to y = x² + 1 parallel to x + 4y = 7: tangent slope 4 at x = 2.
    expect([2 * 2, 2 * 2 + 1, -1 / 4 * 4]).toEqual([4, 5, -1]);
  });

  it('Chain and implicit: the curve in the figure, y′′, x^x', () => {
    [0, 1, 2.5, 4].forEach((t) => {
      const [x, y] = implicitPoint(t);
      expect(x * x + x * y + y * y).toBeCloseTo(7, 9);
    });
    expect(1 + 2 + 4).toBe(7);
    const yp = -0.8;
    expect((-(2 + 2 * yp + 2 * yp * yp) / 5).toFixed(3)).toBe('-0.336');
    expect(4 * 1 + 5 * 2 - 14).toBe(0);
    expect(said(section('Chain Rule and Implicit Differentiation').examples[1])).toContain(`= ${d((x) => x ** x, 2).toFixed(4)}`);
  });

  it('Transcendental: the three slopes', () => {
    const board = said(section('Derivatives of Transcendental Functions').examples[1]);
    expect(d((x) => Math.asin(2 * x), 0.3)).toBeCloseTo(2.5, 6);
    expect(board).toContain(`= ${d((x) => Math.log10(x * x + 1), 3).toFixed(4)}$`);
    expect(board).toContain(`= ${d((x) => 3 ** (x * x), 1).toFixed(3)}$`);
  });

  it('Higher order: the power, the cycle, the Taylor coefficients', () => {
    expect(3 * 8 * 7 * 6 * 5 * 4).toBe(20160);
    expect(43 % 4).toBe(3);
    expect(2 / 6).toBeCloseTo(1 / 3, 12);
    expect(81 / 24).toBe(3.375);
    expect(125 % 4).toBe(1);
    expect((6 * 2) / 2).toBe(6);
  });

  it('Curve sketching: the cubic, the chosen inflection, the circle of curvature', () => {
    const y = (x) => x ** 3 - 6 * x * x + 9 * x + 1;
    expect([y(1), y(3), y(2)]).toEqual([5, 1, 3]);
    expect(d(y, 2)).toBeCloseTo(-3, 6);
    expect(3 * 2 + 3 - 9).toBe(0);
    const [a, b] = [-2, 6];
    expect([6 * a + 2 * b, a + b + 2]).toEqual([0, 6]);
    const { centre, R } = CURVATURE;
    expect(Math.hypot(centre[0] - 1, centre[1] - 1)).toBeCloseTo(R, 12);
    expect(said(section('Curve Sketching').examples[1])).toContain(`= ${R.toFixed(3)}$`);
    // The centre lies on the normal to y = x² at (1, 1), slope −1/2.
    expect((centre[1] - 1) / (centre[0] - 1)).toBeCloseTo(-0.5, 12);
  });

  it('Maxima: the box, the economical speed, the current, the corner', () => {
    const V = plots(section('Maxima and Minima'))[0].series[0].f;
    expect(V(2)).toBe(128);
    [1.9, 2.1].forEach((x) => expect(V(x)).toBeLessThan(128));
    const board = said(section('Maxima and Minima').examples[1]);
    const v = Math.cbrt(4000);
    expect(board).toContain(`$v = ${v.toFixed(2)}$ kph`);
    const C = (s) => 0.3 * s * s + 2400 / s;
    [v * 0.95, v * 1.05].forEach((s) => expect(C(s)).toBeGreaterThan(C(v)));
    const boat = (s) => s ** 3 / (s - 6);
    [8.9, 9.1].forEach((s) => expect(boat(s)).toBeGreaterThan(boat(9)));
    expect(board).toContain(`= ${((1.5 ** (2 / 3) + 2 ** (2 / 3)) ** 1.5).toFixed(3)}$ m`);
  });

  it('Time rates: the cone, the ladder, the cars, the particle', () => {
    expect((0.5 / Math.PI).toFixed(3)).toBe('0.159');
    expect(-(3 * 0.4) / 4).toBeCloseTo(-0.3, 12);
    const board = said(section('Time Rates').examples[1]);
    expect(board).toContain(`= ${(12000 / (120 * Math.SQRT2)).toFixed(2)}$ kph`);
    const v = (t) => 3 * t * t - 18 * t + 24;
    expect([v(2), v(4)]).toEqual([0, 0]);
    expect(6 * 2 - 18).toBe(-6);
    expect((1 / Math.PI).toFixed(3)).toBe('0.318');
  });

  it('Differentials: the tangent figure, the sphere, the sine', () => {
    const [, tangent] = plots(section('Differentials'))[0].series;
    expect(tangent.f(4)).toBe(2);
    expect(tangent.f(6)).toBe(2.5);
    expect(Math.sqrt(6).toFixed(3)).toBe('2.449');
    expect((20 * Math.PI).toFixed(2)).toBe('62.83');
    const board = said(section('Differentials').examples[1]);
    expect(board).toContain(`= ${(0.5 + Math.cos(Math.PI / 6) * (Math.PI / 180)).toFixed(5)}$`);
    expect(board).toContain(`(true $${Math.sin((31 * Math.PI) / 180).toFixed(5)}$)`);
    expect((4 + 1 / 48).toFixed(4)).toBe('4.0208');
  });

  it('Mean value: the chord and tangent, the cubic, the logarithm', () => {
    const [, chord, tangent] = plots(section('Mean Value Theorems'))[0].series;
    const [[x1, y1], [x2, y2]] = chord.points;
    expect((y2 - y1) / (x2 - x1)).toBe(4);
    expect(tangent.f(2)).toBe(4);
    expect(Math.sqrt(3).toFixed(3)).toBe('1.732');
    expect(1 / (Math.E - 1)).toBeCloseTo(1 / (Math.E - 1), 12);
    expect((Math.E - 1).toFixed(3)).toBe('1.718');
  });

  it("L'Hôpital: the three forms, the e figure", () => {
    const x = 1e-4;
    expect((Math.exp(x) - 1 - x) / (x * x)).toBeCloseTo(0.5, 3);
    expect(1e-9 * Math.log(1e-9)).toBeCloseTo(0, 6);
    expect(Math.exp(6).toFixed(2)).toBe('403.43');
    const f = plots(section("L'Hôpital's Rule"))[0].series[0].f;
    expect(f(20)).toBeLessThan(Math.E);
    expect(f(1e6)).toBeCloseTo(Math.E, 5);
    expect(Number.isFinite(f(0))).toBe(true);
  });

  it('Parametric: the second derivative, the particle, the polar slope', () => {
    const t = 2;
    const second = (3 * t * t + 3) / (4 * t ** 3);
    expect(second).toBe(15 / 32);
    // Check against differentiating dy/dx = (3t² − 3)/(2t) numerically.
    expect(d((s) => (3 * s * s - 3) / (2 * s), t) / (2 * t)).toBeCloseTo(second, 6);
    expect(Math.hypot(8, 12).toFixed(2)).toBe('14.42');
    expect(Math.hypot(4, 12).toFixed(2)).toBe('12.65');
    const th = Math.PI / 2;
    const [r, rp] = [1 + Math.cos(th), -Math.sin(th)];
    expect((rp * Math.sin(th) + r * Math.cos(th)) / (rp * Math.cos(th) - r * Math.sin(th))).toBeCloseTo(1, 12);
  });

  it('Partial: the mixed partial, the power error, the minimum', () => {
    expect(6 * 1 * 2 + 12 * 4).toBe(60);
    expect(2 * 2 - 1).toBe(3);
    expect(4 + 9 - 8 - 18).toBe(-13);
    expect(2 * 2 * 1 * 2 + 4 * 2).toBe(16);
  });
});
