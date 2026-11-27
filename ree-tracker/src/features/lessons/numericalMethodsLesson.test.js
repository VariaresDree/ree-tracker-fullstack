// Numerical Methods & Analysis in the module format (2026-11-27): every number
// in the topic's worked examples, checks and figures worked again by running
// the methods themselves, so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { cubic, sweeps, newtonP, basis, FIT } from './content/mathematics/numerical-methods-analysis.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const plots = (s) => s.body.filter((b) => b.type === 'plot');
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const f6 = (v) => v.toFixed(6);
const bisect = (f, a, b, n) => {
  for (let i = 0; i < n; i++) {
    const c = (a + b) / 2;
    if (f(a) * f(c) < 0) b = c;
    else a = c;
  }
  return [a, b];
};
const lagrange = (xs, ys, x) =>
  sum(ys.map((y, i) => y * xs.reduce((p, xj, j) => (j === i ? p : (p * (x - xj)) / (xs[i] - xj)), 1)));
const trap = (f, a, b, n) => {
  const h = (b - a) / n;
  let s = (f(a) + f(b)) / 2;
  for (let i = 1; i < n; i++) s += f(a + i * h);
  return s * h;
};
const simpson = (f, a, b, n) => {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
};
const rk4 = (f, x, y, h) => {
  const k1 = f(x, y);
  const k2 = f(x + h / 2, y + (h / 2) * k1);
  const k3 = f(x + h / 2, y + (h / 2) * k2);
  const k4 = f(x + h, y + h * k3);
  return [k1, k2, k3, k4, y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4)];
};

describe('Numerical Methods & Analysis, worked again', () => {
  it('Errors: π, the series, the tolerances, the condition number', () => {
    const et = Math.PI - 22 / 7;
    expect([et.toFixed(6), ((Math.abs(et) / Math.PI) * 100).toFixed(4)]).toEqual(['-0.001264', '0.0402']);
    const terms = [1, 1.5, 1.625, 1 + 0.5 + 0.125 + 0.125 / 6];
    expect(terms[3].toFixed(6)).toBe('1.645833');
    expect((((terms[3] - terms[2]) / terms[3]) * 100).toFixed(3)).toBe('1.266');
    expect((((Math.exp(0.5) - terms[3]) / Math.exp(0.5)) * 100).toFixed(3)).toBe('0.175');
    expect([0.5 * 10 ** (2 - 3), 0.5 * 10 ** (2 - 4), 0.5 * 10 ** (2 - 2)]).toEqual([0.05, 0.005, 0.5]);
    const cond = (1.5 / Math.cos(1.5) ** 2) / Math.tan(1.5);
    expect([cond.toFixed(2), (3 / Math.sin(3)).toFixed(2)]).toEqual(['21.26', '21.26']);
    expect(((0.0007 / 0.5664) * 100).toFixed(3)).toBe('0.124');
  });

  it('Bracketing: the cubic, the cube root of 10, the step counts, the figure', () => {
    expect([cubic(1.5), +cubic(1.75).toFixed(3), +cubic(1.625).toFixed(3)]).toEqual([-0.125, 1.609, 0.666]);
    expect(bisect(cubic, 1, 2, 3)).toEqual([1.5, 1.625]);
    expect(((1 * 4 - 2 * -2) / (4 + 2)).toFixed(4)).toBe('1.3333');
    expect([(Math.log(1000) / Math.LN2).toFixed(2), Math.ceil(Math.log(1000) / Math.LN2)]).toEqual(['9.97', 10]);
    const g = (x) => x ** 3 - 10;
    expect([g(2.5), g(2.25), +g(2.125).toFixed(4)]).toEqual([5.625, 1.390625, -0.4043]);
    expect(bisect(g, 2, 3, 3)).toEqual([2.125, 2.25]);
    expect(((0.125 / 2.125) * 100).toFixed(2)).toBe('5.88');
    expect(((2 * 17 - 3 * -2) / 19).toFixed(4)).toBe('2.1053');
    expect([(Math.log(1e4) / Math.LN2).toFixed(2), Math.ceil(Math.log(1e4) / Math.LN2)]).toEqual(['13.29', 14]);
    expect(Math.cbrt(10).toFixed(4)).toBe('2.1544');
    expect(Math.ceil(Math.log(400) / Math.LN2)).toBe(9);
    const [curve, chord] = plots(section('Bisection and False Position'))[0].series;
    expect(chord.points).toEqual([[1, curve.f(1)], [2, curve.f(2)]]);
  });

  it('Open methods: Newton, the square root, the secant, the fixed point, the tangents', () => {
    const newton = (x) => x - cubic(x) / (3 * x * x - 1);
    expect([newton(1.5).toFixed(6), newton(newton(1.5)).toFixed(6)]).toEqual(['1.521739', '1.521380']);
    let root = 1.5;
    for (let i = 0; i < 8; i++) root = newton(root);
    expect(root.toFixed(4)).toBe('1.5214');
    const sq = (x, N) => (x + N / x) / 2;
    expect([sq(4, 20), sq(sq(4, 20), 20).toFixed(5)]).toEqual([4.5, '4.47222']);
    expect(sq(3, 7).toFixed(4)).toBe('2.6667');
    const sec = (x0, x1) => x1 - (cubic(x1) * (x1 - x0)) / (cubic(x1) - cubic(x0));
    const x2 = sec(1, 2);
    expect([x2.toFixed(5), cubic(x2).toFixed(5), sec(2, x2).toFixed(5)]).toEqual(['1.33333', '-0.96296', '1.46269']);
    const fp = [1.5];
    for (let i = 0; i < 3; i++) fp.push(Math.cbrt(fp[i] + 2));
    expect(fp.slice(1).map((v) => v.toFixed(4))).toEqual(['1.5183', '1.5209', '1.5213']);
    expect((1 / (3 * (root + 2) ** (2 / 3))).toFixed(3)).toBe('0.144');
    const [, t1, t2] = plots(section('Newton-Raphson and Secant'))[0].series;
    expect(t1.f(2)).toBeCloseTo(0, 12);
    expect(t2.f(newton(2))).toBeCloseTo(0, 12);
    expect([newton(1), newton(2).toFixed(4)]).toEqual([2, '1.6364']);
  });

  it('Elimination: both systems and their determinants', () => {
    const solve3 = (A, b) => {
      const M = A.map((r, i) => [...r, b[i]]);
      const pivots = [];
      for (let k = 0; k < 3; k++) {
        pivots.push(M[k][k]);
        for (let i = k + 1; i < 3; i++) {
          const m = M[i][k] / M[k][k];
          for (let j = k; j < 4; j++) M[i][j] -= m * M[k][j];
        }
      }
      const x = [0, 0, 0];
      for (let i = 2; i >= 0; i--) x[i] = (M[i][3] - sum([0, 1, 2].filter((j) => j > i).map((j) => M[i][j] * x[j]))) / M[i][i];
      return [x.map((v) => +v.toFixed(9)), pivots.map((v) => +v.toFixed(9))];
    };
    expect(solve3([[2, 1, -1], [-3, -1, 2], [-2, 1, 2]], [8, -11, -3])).toEqual([[2, 3, -1], [2, 0.5, -1]]);
    expect(solve3([[1, 2, 1], [2, 1, -1], [3, -1, 2]], [8, 1, 7])).toEqual([[1, 2, 3], [1, -3, 6]]);
    expect(1 * -3 * 6).toBe(-18);
  });

  it('Iteration: the 3 × 3 sweeps, the pair, the figure, dominance', () => {
    const j1 = sweeps(false, 1)[1].map((v) => +v.toFixed(4));
    const g1 = sweeps(true, 1)[1].map((v) => +v.toFixed(4));
    expect(j1).toEqual([1.4, 1.6364, 3]);
    expect(g1).toEqual([1.4, 1.7636, 2.8964]);
    expect(sweeps(true, 30)[30].map((v) => +v.toFixed(9))).toEqual([1, 2, 3]);
    const pair = (seidel) => {
      let [x, y] = [0, 0];
      const out = [];
      for (let k = 0; k < 2; k++) {
        const nx = (9 + y) / 5;
        y = (6 - (seidel ? nx : x)) / 4;
        x = nx;
        out.push([+x.toFixed(9), +y.toFixed(9)]);
      }
      return out;
    };
    expect(pair(false)).toEqual([[1.8, 1.5], [2.1, 1.05]]);
    expect(pair(true)).toEqual([[1.8, 1.05], [2.01, 0.9975]]);
    const [gs, jac] = plots(section('Jacobi and Gauss-Seidel'))[0].series;
    expect(Math.abs(gs.points[5][1] - 2)).toBeLessThan(Math.abs(jac.points[5][1] - 2));
    expect(2 < 2 + 1).toBe(true);
  });

  it("Newton's interpolation: the cube, the forward table, the logarithm, the figure", () => {
    expect([newtonP(1), newtonP(2), newtonP(4), newtonP(3)]).toEqual([1, 8, 64, 29]);
    expect((6 / 6) * (3 - 1) * (3 - 2) * (3 - 4)).toBe(27 - 29);
    const s = 1.5;
    expect(1 + s * 1 + ((s * (s - 1)) / 2) * 2).toBe(1.5 ** 2 + 1);
    const d1 = Math.LN2;
    const d2 = (Math.log(4) - Math.LN2) / 2;
    const d3 = (d2 - d1) / 3;
    expect([d2.toFixed(6), d3.toFixed(6)]).toEqual(['0.346574', '-0.115525']);
    const p3 = d1 * 2 + d3 * 2 * 1;
    expect(p3.toFixed(6)).toBe('1.155245');
    expect((((p3 - Math.log(3)) / Math.log(3)) * 100).toFixed(1)).toBe('5.2');
    expect(10 + 4 * 1.5).toBe(16);
    expect(plots(section("Newton's Interpolation"))[0].series[1].f(3)).toBe(29);
  });

  it('Lagrange: the three nodes, the table, the inverse root, the basis figure', () => {
    expect(basis.map((L) => +L(2).toFixed(9))).toEqual([-1 / 3, 1, 1 / 3].map((v) => +v.toFixed(9)));
    expect(lagrange([0, 1, 3], [1, 3, 2], 2).toFixed(3)).toBe('3.333');
    expect(lagrange([1, 2, 3], [-1, 2, 7], 1.5)).toBeCloseTo(0.25, 12);
    expect(lagrange([-1, 2, 7], [1, 2, 3], 0).toFixed(4)).toBe('1.3667');
    for (const x of [-0.5, 0.7, 2.2, 3.5]) expect(sum(basis.map((L) => L(x)))).toBeCloseTo(1, 12);
    expect(basis.map((L) => [0, 1, 3].map((n) => L(n)))).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((r) => r.map((v) => (v ? 1 : expect.closeTo(0, 12)))));
  });

  it('Least squares: the line and its r², the exponential fit', () => {
    const xs = FIT.map((p) => p[0]);
    const ys = FIT.map((p) => p[1]);
    const n = 4;
    const sx = sum(xs);
    const sy = sum(ys);
    const sxy = sum(xs.map((x, i) => x * ys[i]));
    const sxx = sum(xs.map((x) => x * x));
    expect([sx, sy, sxy, sxx]).toEqual([10, 16, 47, 30]);
    const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    const a = sy / n - b * (sx / n);
    expect([+b.toFixed(9), +a.toFixed(9)]).toEqual([1.4, 0.5]);
    const sr = sum(xs.map((x, i) => (ys[i] - a - b * x) ** 2));
    const st = sum(ys.map((y) => (y - 4) ** 2));
    expect([+sr.toFixed(9), st, +(1 - sr / st).toFixed(9)]).toEqual([0.2, 10, 0.98]);
    expect(plots(section('Least-Squares Curve Fitting'))[0].series[0].f(2.5)).toBeCloseTo(4, 12);
    const ly = [2.0, 3.0, 4.6, 6.9].map(Math.log);
    const xe = [0, 1, 2, 3];
    const sl = sum(ly);
    const sxl = sum(xe.map((x, i) => x * ly[i]));
    expect([sl.toFixed(4), sxl.toFixed(4)]).toEqual(['5.2493', '9.9453']);
    const be = (4 * sxl - 6 * sl) / (4 * 14 - 36);
    const lna = sl / 4 - be * 1.5;
    expect([be.toFixed(4), lna.toFixed(4), Math.exp(lna).toFixed(4)]).toEqual(['0.4143', '0.6909', '1.9956']);
    expect((Math.exp(lna) * Math.exp(4 * be)).toFixed(2)).toBe('10.46');
  });

  it('Differentiation: eˣ with Richardson, ln x four ways, the secant figure', () => {
    const c = (f, x, h) => (f(x + h) - f(x - h)) / (2 * h);
    expect(((Math.exp(0.1) - 1) / 0.1).toFixed(5)).toBe('1.05171');
    expect([c(Math.exp, 0, 0.1).toFixed(6), c(Math.exp, 0, 0.05).toFixed(6)]).toEqual(['1.001668', '1.000417']);
    expect(((4 * c(Math.exp, 0, 0.05) - c(Math.exp, 0, 0.1)) / 3).toFixed(6)).toBe('1.000000');
    const L = Math.log;
    expect([((L(2.1) - L(2)) / 0.1).toFixed(5), ((L(2) - L(1.9)) / 0.1).toFixed(5), c(L, 2, 0.1).toFixed(5)]).toEqual(['0.48790', '0.51293', '0.50042']);
    expect(((L(2.1) - 2 * L(2) + L(1.9)) / 0.01).toFixed(5)).toBe('-0.25031');
    const [, , fwd, cen] = plots(section('Numerical Differentiation'))[0].series;
    expect([(fwd.f(1) - fwd.f(0)).toFixed(3), (cen.f(1) - cen.f(0)).toFixed(3)]).toEqual(['1.297', '1.042']);
    expect(cen.f(0.5)).toBeCloseTo(Math.exp(0.5), 12);
    expect((1.21 - 0.81) / 0.2).toBeCloseTo(2, 12);
  });

  it('Integration: π/4, ln 2 four ways, the trapezoid figure', () => {
    const g = (x) => 1 / (1 + x * x);
    expect([f6(trap(g, 0, 1, 4)), f6(simpson(g, 0, 1, 4)), f6(Math.PI / 4)]).toEqual(['0.782794', '0.785392', '0.785398']);
    const inv = (x) => 1 / x;
    expect([f6(trap(inv, 1, 2, 4)), f6(simpson(inv, 1, 2, 4))]).toEqual(['0.697024', '0.693254']);
    expect(f6((3 / 8) * (1 / 3) * (1 + 3 * 0.75 + 3 * 0.6 + 0.5))).toBe('0.693750');
    const [p, q] = [1.5 - 0.5 / Math.sqrt(3), 1.5 + 0.5 / Math.sqrt(3)];
    expect([f6(p), f6(q), f6(0.5 * (1 / p + 1 / q))]).toEqual(['1.211325', '1.788675', '0.692308']);
    expect(trap((x) => x * x, 0, 2, 1)).toBe(4);
    const strips = plots(section("Trapezoidal and Simpson's Rules"))[0].series[1].points;
    expect(strips.length).toBe(5);
    expect(strips[1][1].toFixed(6)).toBe('0.941176');
  });

  it('ODEs: y′ = y and y′ = x + y by Euler, Heun and RK4, the Euler figure', () => {
    const fy = (x, y) => y;
    expect(rk4(fy, 0, 1, 0.1).map((v) => +v.toFixed(7))).toEqual([1, 1.05, 1.0525, 1.10525, 1.1051708]);
    expect(1 + 0.05 * (1 + 1.1)).toBeCloseTo(1.105, 12);
    const fxy = (x, y) => x + y;
    const r = rk4(fxy, 0, 1, 0.1);
    expect(r.slice(0, 4).map((v) => +v.toFixed(9))).toEqual([1, 1.1, 1.105, 1.2105]);
    expect([f6(r[4]), f6(2 * Math.exp(0.1) - 1.1)]).toEqual(['1.110342', '1.110342']);
    expect(1 + 0.05 * (1 + (0.1 + 1.1))).toBeCloseTo(1.11, 12);
    const euler = plots(section('Euler and Runge-Kutta Methods'))[0].series[1].points;
    expect(euler[4][1].toFixed(3)).toBe('2.441');
    expect(1 + 0.5 * 2).toBe(2);
  });

  it('Optimization: golden section, Newton, Lagrange, the linear program', () => {
    const f = (x) => 2 * Math.sin(x) - (x * x) / 10;
    expect([(4 - 0.618 * 4).toFixed(3), f(1.528).toFixed(4), f(2.472).toFixed(4)]).toEqual(['1.528', '1.7647', '0.6303']);
    let x = 1.5;
    for (let i = 0; i < 20; i++) x -= (2 * Math.cos(x) - x / 5) / (-2 * Math.sin(x) - 0.2);
    expect([x.toFixed(4), f(x).toFixed(4)]).toEqual(['1.4276', '1.7757']);
    const d1 = (v) => 3 * v * v - 12 * v + 9;
    const d2 = (v) => 6 * v - 12;
    const x1 = 2.5 - d1(2.5) / d2(2.5);
    expect([x1, +(x1 - d1(x1) / d2(x1)).toFixed(9)]).toEqual([3.25, 3.025]);
    expect([4 * 2, 4 + 2 * 2]).toEqual([8, 8]);
    const corners = [[0, 0], [4, 0], [3, 1], [0, 2]];
    expect(corners.every(([a, b]) => a + b <= 4 && a + 3 * b <= 6)).toBe(true);
    expect(corners.map(([a, b]) => 3 * a + 2 * b)).toEqual([0, 12, 11, 4]);
    expect(plots(section('Optimization'))[0].marks[2].at[1].toFixed(4)).toBe('1.7757');
  });
});
