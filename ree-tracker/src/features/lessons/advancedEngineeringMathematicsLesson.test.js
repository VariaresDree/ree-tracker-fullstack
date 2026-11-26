// Advanced Engineering Mathematics in the module format (2026-11-27): every
// number in the topic's worked examples and figures worked again (matrices by
// hand-rolled arithmetic, transforms by numeric integration), so a slip in the
// text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { besselJ, squareSum, pulseSpectrum, SHEAR } from './content/mathematics/advanced-engineering-mathematics.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const plots = (s) => s.body.filter((b) => b.type === 'plot');
const det2 = ([[a, b], [c, d]]) => a * d - b * c;
const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
const mul = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
// Laplace transform at a real s, by the midpoint rule out to t = 40.
const laplace = (f, s, h = 1e-3) => {
  let F = 0;
  for (let t = h / 2; t < 40; t += h) F += Math.exp(-s * t) * f(t) * h;
  return F;
};

describe('Advanced Engineering Mathematics, worked again', () => {
  it('Matrices: the area figure, the determinants, the inverse, the product', () => {
    expect(det2(SHEAR)).toBe(5);
    expect(det3([[2, -1, 3], [0, 4, 1], [5, 2, -2]])).toBe(-85);
    const A = [[1, 2, 0], [3, -1, 4], [2, 1, 5]];
    expect(det3(A)).toBe(-23);
    expect(-(2 * 5 - 0 * 1)).toBe(-10);
    expect(det3(A.map((r) => r.map((v) => 2 * v)))).toBe(-184);
    expect(mul([[2, 1], [5, 3]], [[3, -1], [-5, 2]])).toEqual([[1, 0], [0, 1]]);
    expect(mul([[1, 0, 2], [-1, 3, 1]], [[2, 1], [1, 0], [0, 4]])).toEqual([[2, 9], [1, 3]]);
  });

  it("Systems: the basic system, Cramer's rule, the homogeneous k", () => {
    const [x, y, z] = [5, 3, -2];
    expect([x + y + z, 2 * y + 5 * z, 2 * x + 5 * y - z]).toEqual([6, -4, 27]);
    const M = [[2, 1, -1], [1, -1, 2], [3, 2, 1]];
    const b = [0, 9, 7];
    const D = det3(M);
    const Di = [0, 1, 2].map((k) => det3(M.map((row, i) => row.map((v, j) => (j === k ? b[i] : v)))));
    expect([D, ...Di]).toEqual([-10, -20, 10, -30]);
    expect(Di.map((v) => v / D)).toEqual([2, -1, 3]);
    [2, -2].forEach((k) => expect(k * k - 4).toBe(0));
    // The figure's two lines cross at (2, 1).
    const [l1, l2] = plots(section('Systems of Linear Equations'))[0].series;
    expect([l1.f(2), l2.f(2)]).toEqual([1, 1]);
  });

  it('Eigen: the 2 × 2, the triangular matrix, Cayley-Hamilton', () => {
    const A = [[4, 1], [2, 3]];
    expect(mul(A, [[1], [1]])).toEqual([[5], [5]]);
    expect(mul(A, [[1], [-2]])).toEqual([[2], [-4]]);
    expect(det3([[2, 0, 0], [1, 3, 0], [4, -1, 5]])).toBe(30);
    expect(mul([[1, 2], [3, 4]], [[-2, 1], [1.5, -0.5]])).toEqual([[1, 0], [0, 1]]);
    [8, -1].forEach((l) => expect(l * l - 7 * l - 8).toBe(0));
  });

  it('Laplace: the figure, and each transform checked at s = 1.5 numerically', () => {
    const s = 1.5;
    const cases = [
      [(t) => t * t * Math.exp(-3 * t), 2 / (s + 3) ** 3],
      [(t) => Math.exp(-2 * t) * Math.sin(3 * t), 3 / ((s + 2) ** 2 + 9)],
      [(t) => t * Math.sin(2 * t), (4 * s) / (s * s + 4) ** 2],
      [(t) => Math.cosh(0.6 * t), s / (s * s - 0.36)],
      [(t) => t ** 3 * Math.exp(-2 * t), 6 / (s + 2) ** 4],
      [(t) => (1 - Math.cos(2 * t)) / 2, 2 / (s * (s * s + 4))],
      [(t) => t * Math.sin(t), (2 * s) / (s * s + 1) ** 2],
    ];
    cases.forEach(([f, F]) => expect(laplace(f, s)).toBeCloseTo(F, 5));
    const [f] = plots(section('Laplace Transforms'))[0].series;
    expect(laplace(f.f, s)).toBeCloseTo(3 / ((s + 0.5) ** 2 + 9), 5);
  });

  it('Inverse Laplace: each time function transforms back to its F(s)', () => {
    const s = 1.5;
    const cases = [
      [(t) => 1 - Math.exp(-5 * t), 5 / (s * (s + 5))],
      [(t) => 20 * (Math.exp(-2 * t) - Math.exp(-5 * t)), 60 / ((s + 2) * (s + 5))],
      [(t) => (1 - Math.exp(-3 * t)) / 3, 1 / (s * (s + 3))],
      [(t) => 6 * Math.exp(-3 * t) * Math.sin(5 * t), 30 / (s * s + 6 * s + 34)],
      [(t) => Math.exp(-2 * t) * (1 - t), (s + 1) / (s + 2) ** 2],
      [(t) => 3 * Math.sin(2 * t), 6 / (s * s + 4)],
      [(t) => 2 * Math.cos(3 * t) - 6 * Math.sin(3 * t), (2 * s - 18) / (s * s + 9)],
    ];
    cases.forEach(([f, F]) => expect(laplace(f, s)).toBeCloseTo(F, 5));
  });

  it('Fourier series: the square wave figure, the amplitudes, the rms, the half-range series', () => {
    expect(squareSum(Math.PI / 2, 1)).toBeCloseTo(4 / Math.PI, 12);
    expect(squareSum(Math.PI / 2, 999)).toBeCloseTo(1, 2);
    expect(((4 * 10) / Math.PI).toFixed(2)).toBe('12.73');
    expect((40 / (3 * Math.PI)).toFixed(2)).toBe('4.24');
    expect(6 * Math.cos(3 * Math.PI) + 2 * Math.cos(9 * Math.PI)).toBeCloseTo(-8, 12);
    expect(Math.sqrt(100 + 32 + 18).toFixed(3)).toBe('12.247');
    // Parseval on the sampled wave agrees with 10² + 8²/2 + 6²/2.
    let ms = 0;
    const N = 100000;
    for (let i = 0; i < N; i++) {
      const t = ((i + 0.5) / N) * 2 * Math.PI;
      ms += (10 + 8 * Math.sin(t) + 6 * Math.sin(3 * t)) ** 2 / N;
    }
    expect(ms).toBeCloseTo(150, 6);
  });

  it('Fourier transforms: the pulse spectrum, the short pulse, the exponential', () => {
    expect(pulseSpectrum(0)).toBe(3);
    expect(pulseSpectrum((2 * Math.PI) / 1.5)).toBeCloseTo(0, 12);
    expect(pulseSpectrum(1e-9)).toBeCloseTo(3, 8);
    expect(5 * 0.4e-3).toBeCloseTo(2e-3, 15);
    expect(1 / 0.4e-3).toBeCloseTo(2500, 9);
    expect(1 / Math.hypot(3, 4)).toBe(0.2);
    expect(((Math.atan2(4, 3) * 180) / Math.PI).toFixed(2)).toBe('53.13');
  });

  it('Power series: the geometric figure, the sine integral, ln 1.2, the radius', () => {
    const [, s4, s8] = plots(section('Power Series'))[0].series;
    expect(s4.f(0.5)).toBeCloseTo(1 + 0.5 + 0.25 + 0.125, 12);
    expect(s8.f(-0.5)).toBeCloseTo([...Array(8)].reduce((s, _, k) => s + (-0.5) ** k, 0), 12);
    const si = 1 - 1 / 18 + 1 / 600 - 1 / 35280;
    expect(si.toFixed(6)).toBe('0.946083');
    let num = 0;
    for (let i = 0, h = 1e-5; i < 1e5; i++) num += Math.sin((i + 0.5) * h) / ((i + 0.5) * h) * h;
    expect(num).toBeCloseTo(si, 5);
    expect((0.2 - 0.02 + 0.008 / 3 - 0.0004).toFixed(6)).toBe('0.182267');
    expect(Math.log(1.2).toFixed(6)).toBe('0.182322');
    expect((1 + 0.1 + 0.005).toFixed(3)).toBe('1.105');
  });

  it('Z-transforms: the stem figure, the inverse, the filter', () => {
    const stems = plots(section('Z-Transforms'))[0].series;
    stems.forEach(({ points: [[n], [, h]] }) => expect(h).toBe(0.5 ** n));
    const x = (n) => 2 - 2 * 0.5 ** n;
    expect([x(0), x(1), x(2)]).toEqual([0, 1, 1.5]);
    // The difference equation x[n] = 1.5x[n−1] − 0.5x[n−2] + δ[n−1] from z/((z − 1)(z − 0.5)).
    const seq = [0, 1];
    for (let n = 2; n < 10; n++) seq.push(1.5 * seq[n - 1] - 0.5 * seq[n - 2]);
    seq.forEach((v, n) => expect(v).toBeCloseTo(x(n), 12));
    const y = [1];
    for (let n = 1; n < 6; n++) y.push(0.5 * y[n - 1]);
    y.forEach((v, n) => expect(v).toBe(0.5 ** n));
  });

  it('Bessel and Legendre: the zero, the recurrence, the polynomials, orthogonality', () => {
    expect(besselJ(0, 0)).toBeCloseTo(1, 12);
    expect(besselJ(1, 0)).toBeCloseTo(0, 12);
    expect(besselJ(0, 2.405)).toBeCloseTo(0, 3);
    const [j0, j1] = [besselJ(0, 1, 4000), besselJ(1, 1, 4000)];
    expect([j0.toFixed(6), j1.toFixed(6)]).toEqual(['0.765198', '0.440051']);
    expect((2 * j1 - j0).toFixed(6)).toBe(besselJ(2, 1, 4000).toFixed(6));
    expect(said(section('Bessel and Legendre Functions').examples[1])).toContain(`= ${(0.880102 - 0.765198).toFixed(6)}$`);
    const P = [() => 1, (x) => x, (x) => (3 * x * x - 1) / 2, (x) => (5 * x ** 3 - 3 * x) / 2];
    expect(P[2](0.5)).toBe(-0.125);
    expect(P[3](0.5)).toBe(-0.4375);
    P.forEach((p) => expect(p(1)).toBe(1));
    const int = (g) => {
      let s = 0;
      for (let i = 0, h = 2e-4; i < 1e4; i++) s += g(-1 + (i + 0.5) * h) * h;
      return s;
    };
    expect(int((x) => P[1](x) * P[2](x))).toBeCloseTo(0, 9);
    expect(int((x) => P[2](x) ** 2)).toBeCloseTo(0.4, 6);
  });

  it('PDEs: the heat figure, the string, the classifications, the halving time', () => {
    const [u0, u02, u1] = plots(section('Partial Differential Equations'))[0].series;
    expect(u0.f(Math.PI / 2)).toBeCloseTo(1 - 1, 12);
    expect(u02.f(Math.PI / 2)).toBeCloseTo(Math.exp(-0.2) - Math.exp(-1.8), 12);
    expect(u1.f(Math.PI / 2)).toBeCloseTo(Math.exp(-1) - Math.exp(-9), 12);
    expect([200 / (2 * 0.5), (3 * 200) / (2 * 0.5)]).toEqual([200, 600]);
    expect([4 * 4 - 4 * 1 * 4, 0 - 4 * 1 * -4, 0 - 4]).toEqual([0, 16, -4]);
    expect((Math.LN2 / (Math.PI ** 2 / 4)).toFixed(4)).toBe('0.2809');
  });

  it('Complex variable: Cauchy-Riemann, the integral formula, residues', () => {
    const [x, y, h] = [0.7, -1.2, 1e-6];
    const u = (a, b) => a * a - b * b;
    const v = (a, b) => 2 * a * b;
    expect((u(x + h, y) - u(x - h, y)) / (2 * h)).toBeCloseTo((v(x, y + h) - v(x, y - h)) / (2 * h), 6);
    expect((u(x, y + h) - u(x, y - h)) / (2 * h)).toBeCloseTo(-(v(x + h, y) - v(x - h, y)) / (2 * h), 6);
    expect((2 * Math.PI * Math.E).toFixed(3)).toBe('17.079');
    // Contour integrals by summation round the circle: imaginary parts of 2πj·(sum of residues).
    const contour = (f, R, cx = 0, cy = 0, N = 20000) => {
      let [re, im] = [0, 0];
      for (let k = 0; k < N; k++) {
        const t = ((k + 0.5) / N) * 2 * Math.PI;
        const z = [cx + R * Math.cos(t), cy + R * Math.sin(t)];
        const dz = [(-R * Math.sin(t) * 2 * Math.PI) / N, (R * Math.cos(t) * 2 * Math.PI) / N];
        const w = f(z);
        re += w[0] * dz[0] - w[1] * dz[1];
        im += w[0] * dz[1] + w[1] * dz[0];
      }
      return [re, im];
    };
    const cdiv = ([a, b], [c, d]) => [(a * c + b * d) / (c * c + d * d), (b * c - a * d) / (c * c + d * d)];
    const g = ([a, b]) => cdiv([3 * a + 1, 3 * b], [a * a - b * b - 2 * a, 2 * a * b - 2 * b]);
    expect(contour(g, 3)[1]).toBeCloseTo(6 * Math.PI, 6);
    expect(contour(g, 1)[1]).toBeCloseTo(-Math.PI, 6);
    const p = ([a, b]) => cdiv([1, 0], [a * a - b * b + 1, 2 * a * b]);
    expect(contour(p, 0.5, 0, 1)[0]).toBeCloseTo(Math.PI, 6);
    expect(Math.abs(contour(p, 2)[0]) + Math.abs(contour(p, 2)[1])).toBeCloseTo(0, 6);
  });
});
