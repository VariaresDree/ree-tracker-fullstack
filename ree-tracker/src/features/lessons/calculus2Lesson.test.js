// Calculus 2 in the module format (2026-11-27): every number in the topic's
// worked examples and figures worked again (most by numeric integration), so
// a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { SPRING } from './content/mathematics/calculus-2.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const plots = (s) => s.body.filter((b) => b.type === 'plot');
// Simpson's rule: exact for cubics, and good to many places for these smooth integrands.
const simpson = (g, a, b, n = 2000) => {
  const h = (b - a) / n;
  let s = g(a) + g(b);
  for (let i = 1; i < n; i++) s += g(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
};
const d = (f, x, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h);

describe('Calculus 2, worked again', () => {
  it('Formulas: each antiderivative differentiates back', () => {
    const pairs = [
      [(x) => Math.log(Math.abs((x - 3) / (x + 3))) / 6, (x) => 1 / (x * x - 9)],
      [(x) => Math.tan(x) - x, (x) => Math.tan(x) ** 2],
      [(x) => Math.exp(Math.sin(3 * x)) / 3, (x) => Math.exp(Math.sin(3 * x)) * Math.cos(3 * x)],
      [(x) => Math.asin(x / 4), (x) => 1 / Math.sqrt(16 - x * x)],
      [(x) => ((x * x + 9) ** 1.5) / 3, (x) => x * Math.sqrt(x * x + 9)],
      [(x) => Math.atan((x + 2) / 3) / 3, (x) => 1 / (x * x + 4 * x + 13)],
      [(t) => ((3 * t - 1) ** 4) / 12, (t) => (3 * t - 1) ** 3],
    ];
    pairs.forEach(([F, f]) => [0.4, 1.3].forEach((x) => expect(d(F, x)).toBeCloseTo(f(x), 6)));
  });

  it('Definite: Wallis, the particle, the absolute value, the averages', () => {
    expect(simpson((x) => Math.sin(x) ** 5, 0, Math.PI / 2)).toBeCloseTo(8 / 15, 9);
    const board = said(section('Definite Integrals').examples[1]);
    expect(simpson((x) => Math.sin(x) ** 4 * Math.cos(x) ** 2, 0, Math.PI / 2)).toBeCloseTo(Math.PI / 32, 9);
    expect(board).toContain(`= ${(Math.PI / 32).toFixed(5)}$`);
    const v = (t) => 3 * t * t - 12 * t + 9;
    expect(simpson(v, 0, 4)).toBeCloseTo(4, 9);
    expect(simpson((t) => Math.abs(v(t)), 0, 1) + simpson((t) => Math.abs(v(t)), 1, 3) + simpson((t) => Math.abs(v(t)), 3, 4)).toBeCloseTo(12, 9);
    expect(simpson(Math.abs, -2, 0) + simpson(Math.abs, 0, 3)).toBeCloseTo(6.5, 9);
    expect(simpson((x) => x * x, 0, 3) / 3).toBeCloseTo(3, 9);
    expect(simpson(Math.sin, 0, Math.PI) / Math.PI).toBeCloseTo(2 / Math.PI, 9);
  });

  it('Parts: the tabular answer, e^x sin x, x ln x', () => {
    const F = (x) => Math.exp(x) * (x * x - 2 * x + 2);
    expect(d(F, 1.1)).toBeCloseTo(1.1 ** 2 * Math.exp(1.1), 6);
    const board = said(section('Integration by Parts').examples[1]);
    expect(board).toContain(`= ${simpson((x) => Math.exp(x) * Math.sin(x), 0, Math.PI).toFixed(4)}$`);
    expect(board).toContain(`= ${simpson((x) => x * Math.log(x), 1, Math.E).toFixed(4)}$`);
    expect(simpson((x) => x * Math.exp(2 * x), 0, 1).toFixed(3)).toBe('2.097');
    expect(simpson(Math.log, 1, Math.E)).toBeCloseTo(1, 9);
  });

  it('Trig integrals: the limits, the product, the even powers', () => {
    expect(simpson((x) => Math.sin(x) ** 3 * Math.cos(x) ** 2, 0, Math.PI / 2)).toBeCloseTo(2 / 15, 9);
    const F = (x) => -Math.cos(8 * x) / 16 + Math.cos(2 * x) / 4;
    expect(d(F, 0.7)).toBeCloseTo(Math.sin(2.1) * Math.cos(3.5), 6);
    expect(simpson((x) => Math.sin(x) ** 2, 0, Math.PI)).toBeCloseTo(Math.PI / 2, 9);
    expect(simpson((x) => Math.sin(x) ** 6, 0, Math.PI / 2)).toBeCloseTo((5 * Math.PI) / 32, 9);
  });

  it('Trig substitution: the quarter circle, the triangle, the inverse sine', () => {
    expect(simpson((x) => 1 / (9 + x * x) ** 1.5, 0, 3).toFixed(4)).toBe('0.0786');
    const board = said(section('Trigonometric Substitution').examples[1]);
    expect(board).toContain(`= ${((9 * Math.PI) / 4).toFixed(4)}$`);
    const F = (x) => -Math.sqrt(x * x + 4) / (4 * x);
    expect(d(F, 1.5)).toBeCloseTo(1 / (1.5 ** 2 * Math.sqrt(1.5 ** 2 + 4)), 6);
    expect(simpson((x) => 1 / Math.sqrt(4 - x * x), 0, 1)).toBeCloseTo(Math.PI / 6, 9);
  });

  it('Partial fractions: the repeated factor, the limits, the division', () => {
    const F = (x) => (5 / 9) * Math.log(Math.abs(x - 1)) - 4 / (3 * (x - 1)) - (5 / 9) * Math.log(Math.abs(x + 2));
    expect(d(F, 2.5)).toBeCloseTo((3 * 2.5 + 1) / ((2.5 - 1) ** 2 * (2.5 + 2)), 6);
    expect(simpson((x) => 1 / (x * x + 3 * x + 2), 0, 1)).toBeCloseTo(Math.log(4 / 3), 9);
    const G = (x) => (x * x) / 2 + Math.log(Math.abs(x * x - 1)) / 2;
    expect(d(G, 2)).toBeCloseTo(8 / 3, 6);
    const H = (x) => 2 * Math.log(Math.exp(x) + 1) - x;
    expect(d(H, 0.5)).toBeCloseTo((Math.exp(0.5) - 1) / (Math.exp(0.5) + 1), 6);
  });

  it('Improper: p-integrals, gamma, the arctangent, the end blow-up', () => {
    expect(simpson((x) => x ** -3, 1, 2000, 200000)).toBeCloseTo(0.5, 5);
    expect(simpson((x) => x ** 3 * Math.exp(-x), 0, 60)).toBeCloseTo(6, 6);
    expect(simpson((x) => x * Math.exp(-x), 0, 60)).toBeCloseTo(1, 6);
    expect(Math.atan(1e9)).toBeCloseTo(Math.PI / 2, 8);
    const near = 1e-12;
    expect(-2 * Math.sqrt(near) + 2 * Math.sqrt(4)).toBeCloseTo(4, 5);
  });

  it('Areas: the strip figure, the parabolas, the sideways strips, the rose', () => {
    const strip = plots(section('Area Between Curves'))[0].series[2].points;
    strip.filter(([x, y]) => y < 2 * x - 0.05).forEach(([x, y]) => expect(y).toBeCloseTo(x * x, 12));
    expect(simpson((x) => 2 * x - x * x, 0, 2)).toBeCloseTo(4 / 3, 9);
    expect(simpson((x) => 6 * x - 2 * x * x, 0, 3)).toBeCloseTo(9, 9);
    expect(simpson((y) => y + 2 - y * y, -1, 2)).toBeCloseTo(4.5, 9);
    expect(said(section('Area Between Curves').examples[1])).toContain(`= ${(4.5 * Math.PI).toFixed(3)}$`);
    expect(simpson((t) => 0.5 * (3 * Math.sin(2 * t)) ** 2, 0, 2 * Math.PI)).toBeCloseTo(4.5 * Math.PI, 9);
    expect(simpson((t) => 0.5 * (2 * (1 + Math.cos(t))) ** 2, 0, 2 * Math.PI)).toBeCloseTo(6 * Math.PI, 9);
  });

  it('Volumes: discs and shells, washers, square sections, Pappus', () => {
    expect(Math.PI * simpson((x) => x, 0, 4)).toBeCloseTo(8 * Math.PI, 9);
    expect(2 * Math.PI * simpson((x) => x * Math.sqrt(x), 0, 4)).toBeCloseTo((128 * Math.PI) / 5, 6);
    const board = said(section('Volumes of Revolution').examples[1]);
    expect(board).toContain(`= ${(Math.PI * simpson((x) => x * x - x ** 4, 0, 1)).toFixed(4)}$`);
    expect(board).toContain(`= ${(2 * Math.PI * simpson((x) => x * (2 * x - x * x), 0, 2)).toFixed(3)}$`);
    expect(simpson((x) => 4 * (9 - x * x), -3, 3)).toBeCloseTo(144, 9);
    expect((40 * Math.PI ** 2).toFixed(2)).toBe('394.78');
    expect(Math.PI * simpson((x) => x ** 4, 0, 2)).toBeCloseTo((32 * Math.PI) / 5, 9);
  });

  it('Arc length: the semicubical arc, the cardioid, ln cos, the surface', () => {
    expect(simpson((x) => Math.sqrt(1 + x), 0, 3)).toBeCloseTo(14 / 3, 9);
    expect(simpson((t) => Math.hypot(3 * (1 + Math.cos(t)), 3 * Math.sin(t)), 0, 2 * Math.PI)).toBeCloseTo(24, 6);
    const board = said(section('Arc Length and Surface Area').examples[1]);
    expect(board).toContain(`= ${simpson((x) => Math.hypot(1, Math.tan(x)), 0, Math.PI / 4).toFixed(4)}$`);
    expect(board).toContain(`= ${(2 * Math.PI * simpson((x) => x ** 3 * Math.sqrt(1 + 9 * x ** 4), 0, 1)).toFixed(4)}$`);
    expect(simpson((t) => Math.hypot(3 * t * t - 3, 6 * t), 0, 1)).toBeCloseTo(4, 9);
  });

  it('Centroids: the figure, the masses, the lens, the shifted rectangle', () => {
    const A = simpson((x) => x * x, 0, 1);
    expect(simpson((x) => x ** 3, 0, 1) / A).toBeCloseTo(0.75, 9);
    expect(simpson((x) => x ** 4 / 2, 0, 1) / A).toBeCloseTo(0.3, 9);
    expect(plots(section('Centroids and Moments of Inertia'))[0].marks[0].at).toEqual([0.75, 0.3]);
    expect([(2 * 1 + 3 * -2 + 5 * 3) / 10, (2 * 4 + 3 * 1 + 5 * -2) / 10]).toEqual([1.1, 0.1]);
    const lens = simpson((x) => x - x * x, 0, 1);
    expect(simpson((x) => x * (x - x * x), 0, 1) / lens).toBeCloseTo(0.5, 9);
    expect(simpson((x) => (x * x - x ** 4) / 2, 0, 1) / lens).toBeCloseTo(0.4, 9);
    expect((8 * 27) / 12 + 24 * 2.5 ** 2).toBe(168);
    expect(Math.sqrt(168 / 24).toFixed(3)).toBe('2.646');
    expect(Math.round((5 * Math.PI * 625) / 4)).toBe(2454);
  });

  it('Work and pressure: the spring figure, the tank, the cable, the plates', () => {
    const { k, from, to } = SPRING;
    expect(simpson((x) => k * x, from, to)).toBeCloseTo(2.25, 9);
    expect(30 / 0.05).toBe(k);
    expect((9.81 * Math.PI * 2.25 * 4 * 2).toFixed(1)).toBe('554.7');
    // Slice by slice agrees with the centroid shortcut.
    expect(9.81 * Math.PI * 2.25 * simpson((y) => y, 0, 4)).toBeCloseTo(9.81 * Math.PI * 2.25 * 4 * 2, 6);
    expect(simpson((y) => 500 + 20 * (30 - y), 0, 30)).toBeCloseTo(24000, 6);
    expect(9.81 * 1.5 * 6).toBeCloseTo(88.29, 2);
    expect(1.5 + (2 * 27) / 12 / (1.5 * 6)).toBe(2);
    // The triangle: width (4/3)(3 − h) at depth h.
    expect(9.81 * simpson((h) => h * (4 / 3) * (3 - h), 0, 3)).toBeCloseTo(58.86, 6);
  });

  it('Multiple: the rectangle, the box, the quarter disc, the checks', () => {
    expect(simpson((y) => simpson((x) => 6 * x + 4 * y, 0, 1, 20), 0, 2, 20)).toBeCloseTo(14, 9);
    expect(0.5 * 2 * 4.5).toBe(4.5);
    expect(simpson(() => simpson((r) => r ** 3, 0, 2, 20), 0, Math.PI / 2, 20)).toBeCloseTo(2 * Math.PI, 9);
    expect(simpson((y) => (8 * y ** 3) / 3, 0, 2)).toBeCloseTo(32 / 3, 9);
    expect(simpson((y) => 4.5 + 3 * y, 1, 2)).toBeCloseTo(9, 9);
    expect(simpson((x) => simpson((y) => x * y, 0, x, 20), 0, 1, 20)).toBeCloseTo(1 / 8, 9);
  });
});
