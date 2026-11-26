// Differential Equations in the module format (2026-11-27): every solution in
// the topic's worked examples and figures is put back into its equation, and
// every number worked again, so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { UNDER, CRITICAL, OVER, COOL_K } from './content/mathematics/differential-equations.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const plots = (s) => s.body.filter((b) => b.type === 'plot');
// Central differences: first and second derivatives, good to about 1e-6 here.
const d1 = (f, x, h = 1e-4) => (f(x + h) - f(x - h)) / (2 * h);
const d2 = (f, x, h = 1e-3) => (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
const XS = [0.3, 0.8, 1.4];

describe('Differential Equations, worked again', () => {
  it('Order and solutions: the family, the orthogonal ellipses', () => {
    const y = (x) => 2 * Math.exp(2 * x) - 5 * Math.exp(-3 * x);
    XS.forEach((x) => expect(d2(y, x) + d1(y, x) - 6 * y(x)).toBeCloseTo(0, 3));
    // Slopes of y = Cx² and x² + 2y² = k multiply to −1 where they cross.
    const [x, C] = [1.2, 0.5];
    const yy = C * x * x;
    expect((2 * C * x) * (-x / (2 * yy))).toBeCloseTo(-1, 12);
  });

  it('Separable: the products, the tangent substitution, the exponential', () => {
    expect(2 * Math.exp(0.5)).toBeCloseTo(3.297, 3);
    // (x² + 1)(y² + 1) = 2 through (0, 1): check the slope against the equation.
    const y = (x) => Math.sqrt(2 / (x * x + 1) - 1);
    const x = 0.4;
    expect(x * (y(x) ** 2 + 1) + y(x) * (x * x + 1) * d1(y, x)).toBeCloseTo(0, 6);
    const C = 0.2;
    const z = (t) => Math.tan(t + C) - t - 1;
    expect(d1(z, 0.3)).toBeCloseTo((0.3 + z(0.3) + 1) ** 2, 6);
    expect(said(section('Separable Equations').examples[1])).toContain(`= ${(2 * Math.E).toFixed(4)}$`);
  });

  it('Homogeneous: the ratio form, the shifted lines', () => {
    const y = (x) => Math.sqrt(2 * x * x * (Math.log(x) + 2));
    expect(y(1)).toBeCloseTo(2, 12);
    XS.map((v) => v + 1).forEach((x) => expect(d1(y, x)).toBeCloseTo(y(x) / x + x / y(x), 6));
    expect(said(section('Homogeneous Equations').examples[1])).toContain(`= ${(Math.E * Math.sqrt(6)).toFixed(3)}$`);
    // F = (x−2)² + 2(x−2)(y−1) − (y−1)²: F_x = M and F_y = N.
    const [x, yv] = [3.1, 0.4];
    expect(2 * (x - 2) + 2 * (yv - 1)).toBeCloseTo(2 * (x + yv - 3), 12);
    expect(2 * (x - 2) - 2 * (yv - 1)).toBeCloseTo(2 * (x - yv - 1), 12);
  });

  it('Exact: both solutions differentiate back to M and N', () => {
    const [x, y] = [0.7, 1.3];
    const F = (a, b) => a ** 3 + a * a * b + 2 * b * b;
    expect(d1((a) => F(a, y), x)).toBeCloseTo(3 * x * x + 2 * x * y, 6);
    expect(d1((b) => F(x, b), y)).toBeCloseTo(x * x + 4 * y, 6);
    const G = (a, b) => a ** 4 / 4 + (a * a * b * b) / 2 + a ** 3 / 3;
    expect(d1((a) => G(a, y), x)).toBeCloseTo(x * (x * x + y * y + x), 6);
    expect(d1((b) => G(x, b), y)).toBeCloseTo(x * x * y, 6);
  });

  it('Linear: the figure, the variable coefficient, the trigonometric one', () => {
    const [sol] = plots(section('Linear First-Order'))[0].series;
    XS.forEach((x) => expect(d1(sol.f, x) + 2 * sol.f(x)).toBeCloseTo(x, 4));
    expect(sol.f(0)).toBeCloseTo(1, 12);
    const y = (x) => x ** 3 + 1 / x;
    XS.forEach((x) => expect(d1(y, x) + y(x) / x).toBeCloseTo(4 * x * x, 4));
    expect(y(2)).toBe(8.5);
    const z = (x) => (x + 1) * Math.cos(x);
    XS.forEach((x) => expect(d1(z, x) + z(x) * Math.tan(x)).toBeCloseTo(Math.cos(x), 4));
  });

  it('Bernoulli: both solutions satisfy their equations', () => {
    const y = (x) => 1 / (1 + Math.exp(x));
    XS.forEach((x) => expect(d1(y, x) + y(x)).toBeCloseTo(y(x) ** 2, 6));
    const z = (x) => 2 / (3 * x - x ** 3);
    [1, 1.2, 1.5].forEach((x) => expect(d1(z, x) + z(x) / x).toBeCloseTo(x * x * z(x) ** 2, 4));
    expect(said(section("Bernoulli's Equation").examples[1])).toContain(`= ${z(1.5).toFixed(4)}$`);
  });

  it('Growth and cooling: the figure, half-life, tripling, the milk, interest', () => {
    const T = plots(section('Growth, Decay and Cooling'))[0].series[0].f;
    expect(T(5)).toBeCloseTo(70, 9);
    expect(Math.log(65 / 15) / COOL_K).toBeCloseTo(19.94, 2);
    const board = said(section('Growth, Decay and Cooling').examples[1]);
    expect(board).toContain(`= ${((50 * Math.LN2) / Math.log(1 / 0.96)).toFixed(2)}$ years`);
    expect(board).toContain(`= ${((40 * Math.log(3)) / Math.LN2).toFixed(2)}$ years`);
    expect(board).toContain(`$${(25 + (55 * 55) / 70).toFixed(2)}^\\circ$C`);
    expect(board).toContain(`= ${((10 * Math.log(70 / 15)) / Math.log(70 / 55)).toFixed(2)}$ min`);
    expect((Math.LN2 / 0.05).toFixed(2)).toBe('13.86');
    expect((Math.LN2 / 1200).toExponential(2)).toBe('5.78e-4');
  });

  it('Mixing and circuits: the RL figure, the filling tank, the RC charge', () => {
    const i = plots(section('Mixing and Circuit Applications'))[0].series[0].f;
    XS.forEach((t) => expect(2 * d1(i, t) + 4 * i(t)).toBeCloseTo(12, 5));
    expect(i(1).toFixed(3)).toBe('2.594');
    const Q = (t) => 100 + t - 600000 / (100 + t) ** 2;
    expect(Q(0)).toBeCloseTo(40, 9);
    [5, 20, 40].forEach((t) => expect(d1(Q, t)).toBeCloseTo(3 - (4 * Q(t)) / (200 + 2 * t), 5));
    expect(Q(50).toFixed(2)).toBe('123.33');
    expect((5e-3 * (1 - Math.exp(-2)) * 1000).toFixed(3)).toBe('4.323');
    expect((0.01 * Math.exp(-2) * 1000).toFixed(3)).toBe('1.353');
    const q = (t) => 20 * (1 - Math.exp(-0.05 * t));
    expect(d1(q, 7)).toBeCloseTo(1 - 0.05 * q(7), 6);
  });

  it('Constant coefficients: the damping figure, the cubic, the repeated root, the spring', () => {
    const w = 2;
    [[UNDER, 0.25], [CRITICAL, 1], [OVER, 2]].forEach(([x, z]) => {
      expect(x(0)).toBeCloseTo(1, 12);
      expect(d1(x, 0, 1e-6)).toBeCloseTo(0, 4);
      XS.forEach((t) => expect(d2(x, t) + 2 * z * w * d1(x, t) + w * w * x(t)).toBeCloseTo(0, 3));
    });
    [1, -2, 3].forEach((m) => expect(m ** 3 - 2 * m * m - 5 * m + 6).toBe(0));
    const y = (x) => (2 + 5 * x) * Math.exp(-3 * x);
    expect(d1(y, 0, 1e-6)).toBeCloseTo(-1, 5);
    XS.forEach((x) => expect(d2(y, x) + 6 * d1(y, x) + 9 * y(x)).toBeCloseTo(0, 3));
    expect([Math.sqrt(50 / 2), (5 / (2 * Math.PI)).toFixed(3), ((2 * Math.PI) / 5).toFixed(4), 2 * Math.sqrt(100)]).toEqual([5, '0.796', '1.2566', 20]);
    expect((1000 / (2 * Math.PI)).toFixed(2)).toBe('159.15');
  });

  it('Undetermined coefficients: resonance figure and the three particular solutions', () => {
    const x = plots(section('Undetermined Coefficients'))[0].series[0].f;
    XS.forEach((t) => expect(d2(x, t) + x(t)).toBeCloseTo(Math.cos(t), 4));
    const a = (t) => 2 * t + 3;
    expect(d2(a, 1) - 3 * d1(a, 1) + 2 * a(1)).toBeCloseTo(4, 5);
    const b = (t) => -2 * t * Math.cos(2 * t);
    XS.forEach((t) => expect(d2(b, t) + 4 * b(t)).toBeCloseTo(8 * Math.sin(2 * t), 4));
    const c = (t) => 1.5 * t * Math.exp(t);
    XS.forEach((t) => expect(d2(c, t) - c(t)).toBeCloseTo(3 * Math.exp(t), 4));
    expect(6 / (4 + 4 + 3)).toBeCloseTo(6 / 11, 12);
    const e = (t) => Math.cos(t) / 5 + Math.sin(t) / 10;
    XS.forEach((t) => expect(d2(e, t) - 4 * d1(e, t) + 3 * e(t)).toBeCloseTo(Math.sin(t), 4));
  });

  it('Variation of parameters: the three particular solutions', () => {
    const a = (x) => Math.cos(x) * Math.log(Math.cos(x)) + x * Math.sin(x);
    XS.forEach((x) => expect(d2(a, x) + a(x)).toBeCloseTo(1 / Math.cos(x), 4));
    const b = (x) => -Math.cos(x) * Math.log(1 / Math.cos(x) + Math.tan(x));
    XS.forEach((x) => expect(d2(b, x) + b(x)).toBeCloseTo(Math.tan(x), 4));
    const c = (x) => x * Math.exp(x) * Math.log(x);
    XS.map((v) => v + 1).forEach((x) => expect(d2(c, x) - 2 * d1(c, x) + c(x)).toBeCloseTo(Math.exp(x) / x, 3));
  });

  it('Cauchy-Euler: repeated, complex, fitted', () => {
    const XP = [0.7, 1.3, 2.1];
    const a = (x) => (1 + 2 * Math.log(x)) * x * x;
    XP.forEach((x) => expect(x * x * d2(a, x) - 3 * x * d1(a, x) + 4 * a(x)).toBeCloseTo(0, 3));
    const b = (x) => Math.cos(2 * Math.log(x)) + Math.sin(2 * Math.log(x));
    XP.forEach((x) => expect(x * x * d2(b, x) + x * d1(b, x) + 4 * b(x)).toBeCloseTo(0, 3));
    const c = (x) => x ** 4 + 4 / x;
    XP.forEach((x) => expect(x * x * d2(c, x) - 2 * x * d1(c, x) - 4 * c(x)).toBeCloseTo(0, 2));
    expect([c(1), d1(c, 1), c(2)].map((v) => +v.toFixed(6))).toEqual([5, 0, 18]);
  });

  it('Laplace: the free response, the step figure, the inverse pair', () => {
    const y0 = (t) => 2 * Math.exp(-t) - Math.exp(-2 * t);
    XS.forEach((t) => expect(d2(y0, t) + 3 * d1(y0, t) + 2 * y0(t)).toBeCloseTo(0, 3));
    const y = plots(section('Laplace Transform Solutions'))[0].series[0].f;
    expect(y(0)).toBeCloseTo(0, 12);
    expect(d1(y, 0, 1e-6)).toBeCloseTo(0, 5);
    XS.forEach((t) => expect(d2(y, t) + 4 * d1(y, t) + 3 * y(t)).toBeCloseTo(6, 3));
    expect(said(section('Laplace Transform Solutions').examples[1])).toContain(`= ${y(1).toFixed(4)}$`);
    // e^(−2t)(cos 3t + sin 3t) has transform (s + 5)/(s² + 4s + 13): check at s = 1 numerically.
    const f = (t) => Math.exp(-2 * t) * (Math.cos(3 * t) + Math.sin(3 * t));
    let F = 0;
    for (let t = 0, h = 1e-3; t < 30; t += h) F += Math.exp(-(t + h / 2)) * f(t + h / 2) * h;
    expect(F).toBeCloseTo(6 / 18, 5);
  });

  it('Systems: both solutions satisfy both equations', () => {
    const x = (t) => 2 * Math.exp(3 * t) + Math.exp(-t);
    const y = (t) => 2 * Math.exp(3 * t) - Math.exp(-t);
    XS.forEach((t) => {
      expect(d1(x, t)).toBeCloseTo(x(t) + 2 * y(t), 4);
      expect(d1(y, t)).toBeCloseTo(2 * x(t) + y(t), 4);
    });
    const u = (t) => 2 * Math.exp(2 * t) + 2 * Math.exp(3 * t);
    const v = (t) => 2 * Math.exp(2 * t) + Math.exp(3 * t);
    expect([u(0), v(0)]).toEqual([4, 3]);
    XS.forEach((t) => {
      expect(d1(u, t)).toBeCloseTo(4 * u(t) - 2 * v(t), 4);
      expect(d1(v, t)).toBeCloseTo(u(t) + v(t), 4);
    });
  });
});
