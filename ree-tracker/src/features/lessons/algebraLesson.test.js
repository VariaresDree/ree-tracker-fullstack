// Algebra in the module format (2026-11-26): every number in the topic's
// worked examples and figures worked again, so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { clockAngle, mixStrength, bounceDistance } from './content/mathematics/algebra.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s) => s.body.find((b) => typeof b !== 'string' && b.type === 'plot');
const det3 = ([[a, b, c], [d, e, f], [g, h, i]]) => a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
const choose = (n, k) => (k === 0 ? 1 : (choose(n, k - 1) * (n - k + 1)) / k);

describe('Algebra, worked again', () => {
  it('Expressions: the exponential and log equations, the mirror figure', () => {
    const board = said(section('Algebraic Expressions').examples[1]);
    expect(4 ** (5 + 1)).toBe(8 ** (5 - 1));
    expect(board).toContain('$x = 5$');
    expect(Math.log2(4) + Math.log2(4 - 2)).toBe(3);
    expect(board).toContain('$x = 4$ or $x = -2$');
    const [exp, log] = figure(section('Algebraic Expressions')).series;
    expect(exp.f(0)).toBe(1);
    log.points.forEach(([x, y]) => expect(2 ** y).toBeCloseTo(x, 12));
  });

  it('Functions: Vieta, the factor and remainder theorems, the parabola', () => {
    const s = section('Functions');
    expect((7 / 2) ** 2 - 2 * (3 / 2)).toBe(9.25);
    const f = (x) => x ** 3 + 3 * x * x - 4 * x - 12;
    expect(f(-2)).toBe(0);
    expect(said(s.examples[1])).toContain(`= ${f(3)}$`);
    const p = figure(s);
    expect(p.series[0].f(0.5)).toBe(0);
    expect(p.series[0].f(3)).toBe(0);
    expect(p.marks[2].at).toEqual([7 / 4, p.series[0].f(7 / 4)]);
  });

  it("Systems: Cramer's rule in two and three unknowns, the crossing lines", () => {
    const s = section('System of Equations');
    expect([2 * -1 - 1 * 3, 8 * -1 - -1 * 3, 2 * -1 - 1 * 8]).toEqual([-5, -5, -10]);
    const A = [[1, 1, 1], [2, -1, 1], [1, 2, -1]];
    const k = [6, 3, 2];
    const swap = (col) => A.map((row, i) => row.map((v, j) => (j === col ? k[i] : v)));
    const [D, Dx, Dy, Dz] = [det3(A), det3(swap(0)), det3(swap(1)), det3(swap(2))];
    expect([D, Dx, Dy, Dz]).toEqual([7, 7, 14, 21]);
    const board = said(s.examples[1]);
    [D, Dx, Dy, Dz].forEach((v) => expect(board).toContain(`= ${v}$`));
    const [l1, l2] = figure(s).series;
    expect(l1.f(1)).toBe(2);
    expect(l2.f(1)).toBe(2);
  });

  it('Binomial: the free term, the 5th term, the coefficient sum, the triangle', () => {
    const s = section('Binomial Theorem');
    expect(choose(6, 4) * 2 ** 4).toBe(240);
    expect(choose(7, 4) * 2 ** 3).toBe(280);
    expect(said(s.examples[1])).toContain('= 280x^3y^4$');
    const rows = [...s.body[0].matchAll(/\| (\d) \| ([\d ]+) \|/g)].map((m) => [Number(m[1]), m[2].trim().split(' ').map(Number)]);
    expect(rows).toHaveLength(7);
    rows.forEach(([n, coeffs]) => expect(coeffs).toEqual(Array.from({ length: n + 1 }, (_, k) => choose(n, k))));
  });

  it('Digits: the two- and three-digit numbers', () => {
    expect(83 - 38).toBe(45);
    expect(said(section('Number / Digit Problems').examples[1])).toContain('$561 - 165 = 396$');
    expect([1 + 6 + 5, 1 + 5, 561 - 165, 99 * 4]).toEqual([12, 6, 396, 396]);
  });

  it('Proportion: the proportionals and the inverse square', () => {
    const board = said(section('Proportion and Variation').examples[1]);
    expect([(5 * 12) / 3, Math.sqrt(4 * 25), 100 / 4, (90 * 4) / 9]).toEqual([20, 10, 25, 40]);
    expect(board).toContain('= 40$ lux');
    expect((6 * 4 ** 2) / 6).toBe(16);
  });

  it('Age: the three-times item and its check', () => {
    const x = 90 / 5;
    expect(x).toBe(3 * (2 * x - 30));
    expect(said(section('Age Problems').examples[1])).toContain('$x = 18$');
    expect([30 - 12, 18 - 12]).toEqual([18, 6]);
  });

  it('Mixture: strong into weak, drain and replace, evaporate, the curve', () => {
    const s = section('Mixture Problems');
    expect(mixStrength(15)).toBeCloseTo(30, 12);
    expect(mixStrength(0)).toBeCloseTo(20, 12);
    expect(mixStrength(1e9)).toBeLessThan(50);
    const x = 3 / 0.7;
    expect(0.3 * 20 - 0.3 * x + x).toBeCloseTo(0.45 * 20, 12);
    expect(said(s.examples[1])).toContain(`= ${x.toFixed(2)}$ L`);
    expect(Math.round((0.05 * 40) / 0.08)).toBe(25);
    expect(figure(s).series[0].f).toBe(mixStrength);
  });

  it('Motion: the clock, the boat, the round trip', () => {
    const s = section('Motion Problems');
    expect(said(s.examples[0])).toContain(`= ${(180 / 11).toFixed(2)}$ minutes`);
    expect(clockAngle(180 / 11)).toBeCloseTo(0, 9);
    expect(clockAngle(360 / 11)).toBeCloseTo(90, 9);
    expect(clockAngle(540 / 11)).toBeCloseTo(180, 9);
    expect(clockAngle(60)).toBe(120);
    expect(figure(s).caption).toContain(`3:${(360 / 11).toFixed(2)}`);
    expect(figure(s).caption).toContain(`3:${(540 / 11).toFixed(2)}`);
    expect([(18 + 12) / 2, (18 - 12) / 2, 240 / 5, (2 * 60 * 40) / 100]).toEqual([15, 3, 48, 48]);
    expect(Math.abs(30 * 2 - 5.5 * 30)).toBe(105);
  });

  it('Work: one starts early, pipes with a drain, two unknown times', () => {
    const s = section('Work Problems');
    expect((2 / 3) / (1 / 6 + 1 / 3)).toBeCloseTo(4 / 3, 12);
    expect(1 / (1 / 20 + 1 / 30 - 1 / 60)).toBeCloseTo(15, 12);
    expect(1 / 6 + 1 / 12).toBeCloseTo(1 / 4, 12);
    expect(6 * 6 - 2 * 6 - 24).toBe(0);
    expect(s.check[1].a).toContain(`about ${(120 / 13).toFixed(2)} minutes`);
    const [both] = figure(s).series;
    expect(both.points[1][1] + (both.points[2][0] - 2) * (1 / 6 + 1 / 3)).toBeCloseTo(1, 12);
  });

  it('Money: discount and profit, monthly compounding, the growth figure', () => {
    const s = section('Money-Related Problems');
    expect((200 * 1.3) / 0.8).toBeCloseTo(325, 9);
    const board = said(s.examples[1]);
    expect(board).toContain('= 68\\,000$');
    const F = 50000 * 1.01 ** 36;
    expect(board).toContain(`= ${F.toFixed(2).replace(/(\d)(\d{3})\./, '$1\\,$2.')}$`);
    expect(board).toContain(`₱${(F - 68000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more`);
    expect(board).toContain(`= ${((1.01 ** 12 - 1) * 100).toFixed(2)}\\%$`);
    expect(Math.round(figure(s).series[0].f(10))).toBe(25937);
    expect(s.check[0].a).toContain(`= ${Math.round((1 - 0.75 * 0.8) * 100)}\\%$`);
  });

  it('Progressions: the sums, the means, the bouncing ball', () => {
    expect(((57 / 2) * (7 + 399))).toBe(11571);
    expect((32 - 7) / 5).toBe(5);
    expect(10 * (2 * 6 + 19 * 4)).toBe(880);
    expect((10 * 11 * 21) / 6).toBe(385);
    const gp = section('Geometric Progression');
    expect(3 * (2 ** 8 - 1)).toBe(765);
    expect(said(gp.examples[1])).toContain(`= ${Math.sqrt(18).toFixed(3)}$`);
    expect(bounceDistance(0)).toBe(10);
    expect(bounceDistance(200)).toBeCloseTo(70, 9);
    expect(10 + 2 * (7.5 / 0.25)).toBe(70);
    expect(figure(gp).marks[0].y).toBe(70);
  });

  it('Diophantine, Venn and LCM: every count', () => {
    const sols = [];
    for (let y = 1; y < 22; y++) if ((500 - 23 * y) % 17 === 0 && 500 - 23 * y > 0) sols.push([(500 - 23 * y) / 17, y]);
    expect(sols).toEqual([[24, 4], [1, 21]]);
    expect(Array.from({ length: 9 }, (_, i) => i + 1).every((y) => 20 - 2 * y >= 1)).toBe(true);
    expect(45 + 50 + 40 - 20 - 15 - 18 + 8).toBe(90);
    expect(50 - 20 - 18 + 8).toBe(20);
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const lcm = (a, b) => (a * b) / gcd(a, b);
    expect([36, 84, 120].reduce(lcm)).toBe(2520);
    expect([36, 84, 120].reduce(gcd)).toBe(12);
    expect(said(section('Miscellaneous Problems').examples[1])).toContain('= 2520$ s');
  });
});
