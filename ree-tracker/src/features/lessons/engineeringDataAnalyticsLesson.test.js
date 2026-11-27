// Engineering Data Analytics in the module format (2026-11-27): every number
// in the topic's worked examples, checks and figures worked again from the raw
// data, so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { normalPdf, BOX_DATA, XY, MIXES, CENTRES } from './content/mathematics/engineering-data-analytics.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const plots = (s) => s.body.filter((b) => b.type === 'plot');
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
const choose = (n, k) => fact(n) / (fact(k) * fact(n - k));
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const mean = (xs) => sum(xs) / xs.length;
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length / 2;
  return s.length % 2 ? s[Math.floor(m)] : (s[m - 1] + s[m]) / 2;
};
const Phi = (z) => {
  const a = -10;
  const n = 4000;
  const h = (z - a) / n;
  let s = normalPdf(a) + normalPdf(z);
  for (let i = 1; i < n; i++) s += normalPdf(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
};

describe('Engineering Data Analytics, worked again', () => {
  it('Sampling: Slovin, the figure, strata, systematic, random samples', () => {
    expect((1000 / (1 + 1000 * 0.0025)).toFixed(1)).toBe('285.7');
    expect(2500 / (1 + 2500 * 0.0016)).toBe(500);
    expect([1500 / 60, (80 * 400) / 800, (80 * 300) / 800, (80 * 100) / 800]).toEqual([25, 40, 30, 10]);
    expect(choose(20, 3)).toBe(1140);
    expect(10000 / (1 + 10000 * 0.0004)).toBe(2000);
    expect(plots(section('Obtaining Data and Sampling'))[0].series[0].f(1e9)).toBeCloseTo(400, 3);
  });

  it('Descriptive: Sturges, the box plot from its data, the skewness', () => {
    expect((1 + 3.322 * Math.log10(50)).toFixed(1)).toBe('6.6');
    expect((1 + 3.322 * Math.log10(120)).toFixed(3)).toBe('7.907');
    expect(Math.ceil(81 / 8)).toBe(11);
    const lower = BOX_DATA.slice(0, 5);
    const upper = BOX_DATA.slice(5);
    const [q1, q2, q3] = [median(lower), median(BOX_DATA), median(upper)];
    expect([q1, q2, q3]).toEqual([17, 20.5, 25]);
    const iqr = q3 - q1;
    expect([q1 - 1.5 * iqr, q3 + 1.5 * iqr]).toEqual([5, 37]);
    expect(BOX_DATA.filter((x) => x > 37)).toEqual([41]);
    const m = mean(BOX_DATA);
    const s = Math.sqrt(sum(BOX_DATA.map((x) => (x - m) ** 2)) / 9);
    expect([m, s.toFixed(3), ((3 * (m - q2)) / s).toFixed(3)]).toEqual([21.8, '8.094', '0.482']);
    const [box, med] = plots(section('Descriptive Statistics'))[0].series;
    expect([box.points[0][0], box.points[1][0], med.points[0][0]]).toEqual([q1, q3, q2]);
    expect(Math.ceil(1 + 3.322 * Math.log10(200))).toBe(9);
  });

  it('Reliability: series, parallel, the redundancy target, the network', () => {
    expect(0.9 * 0.8 * 0.95).toBeCloseTo(0.684, 12);
    expect(1 - 0.1 * 0.2 * 0.05).toBeCloseTo(0.999, 12);
    expect(0.99 * 0.95).toBeCloseTo(0.9405, 12);
    expect([(0.85 ** 3).toFixed(4), (1 - 0.15 ** 3).toFixed(4)]).toEqual(['0.6141', '0.9966']);
    expect(1 - 0.2 ** 4).toBeLessThan(0.999);
    expect(1 - 0.2 ** 5).toBeGreaterThanOrEqual(0.999);
    expect(0.95 * 0.98).toBeCloseTo(0.931, 12);
    expect((0.99 ** 10).toFixed(3)).toBe('0.904');
  });

  it('Discrete: the Poisson CDF figure, faults, the die, the binomial CDF, the first defect', () => {
    const stair = plots(section('Discrete Distributions'))[0].series[0].points;
    expect(stair[0][1].toFixed(3)).toBe('0.135');
    expect(stair[2][1].toFixed(3)).toBe('0.406');
    expect((3 * Math.exp(-2)).toFixed(4)).toBe('0.4060');
    expect((1 - 5 * Math.exp(-2)).toFixed(4)).toBe('0.3233');
    expect((35 / 12).toFixed(3)).toBe('2.917');
    expect((choose(4, 0) + choose(4, 1) + choose(4, 2)) / 16).toBe(0.6875);
    expect(0.9 ** 4 * 0.1).toBeCloseTo(0.06561, 12);
  });

  it('Continuous: the exponential figure, the bus, the lamp, the density, the pair', () => {
    expect(Math.exp(-0.5).toFixed(4)).toBe('0.6065');
    expect(plots(section('Continuous Distributions'))[0].marks[0].at[1]).toBeCloseTo(Math.exp(-0.5), 12);
    expect((20 / Math.sqrt(12)).toFixed(2)).toBe('5.77');
    expect([Math.exp(-0.6).toFixed(4), (Math.LN2 / 0.002).toFixed(1)]).toEqual(['0.5488', '346.6']);
    expect(6 / 20).toBe(0.3);
    let [area, below2, first] = [0, 0, 0];
    for (let x = 0.0005; x < 3; x += 0.001) {
      const f = (x * x) / 9;
      area += f * 0.001;
      if (x < 2) below2 += f * 0.001;
      first += x * f * 0.001;
    }
    expect(area).toBeCloseTo(1, 5);
    expect(below2.toFixed(4)).toBe('0.2963');
    expect(first).toBeCloseTo(2.25, 4);
    expect((1 - (1 - Math.exp(-1)) ** 2).toFixed(4)).toBe('0.6004');
    expect(0.1 * 4.5).toBeCloseTo(0.45, 12);
  });

  it('Normal: the assembly, the resistors, the percentile, the large Poisson', () => {
    expect((1 - Phi(2)).toFixed(4)).toBe('0.0228');
    expect(Math.sqrt(12).toFixed(3)).toBe('3.464');
    expect((1 - Phi(6 / Math.sqrt(12))).toFixed(4)).toBe('0.0416');
    expect((80 + 1.645 * 5).toFixed(1)).toBe('88.2');
    expect(Phi(-0.95).toFixed(4)).toBe('0.1711');
    expect((10 * Math.sqrt(2 / Math.PI)).toFixed(2)).toBe('7.98');
  });

  it('Sampling distributions: the figure, the mean of 64, the bulbs, the proportion', () => {
    const [single, means] = plots(section('Sampling Distributions and Point Estimation'))[0].series;
    expect(means.f(200) / single.f(200)).toBeCloseTo(8, 12);
    expect(Phi(-1.6).toFixed(4)).toBe('0.0548');
    expect((1 - Phi(1.5)).toFixed(4)).toBe('0.0668');
    const se = Math.sqrt(0.21 / 200);
    expect(se.toFixed(4)).toBe('0.0324');
    expect((1 - Phi(0.05 / se)).toFixed(4)).toBe('0.0614');
  });

  it('Confidence intervals: the figure catches 19 of 20, the three board intervals', () => {
    expect(CENTRES.filter((c) => Math.abs(c - 50) <= 2).length).toBe(19);
    expect(plots(section('Confidence Intervals'))[0].series.filter((s) => s.dashed).length).toBe(1);
    expect(((2.262 * 1.5) / Math.sqrt(10)).toFixed(3)).toBe('1.073');
    expect([72 - 2.576 * 2, 72 + 2.576 * 2].map((v) => v.toFixed(2))).toEqual(['66.85', '77.15']);
    expect((1.96 * Math.sqrt(0.24 / 400)).toFixed(3)).toBe('0.048');
    expect(Math.ceil(((1.96 * 12) / 2) ** 2)).toBe(139);
    expect(Math.ceil((1.96 ** 2 * 0.25) / 0.0025)).toBe(385);
  });

  it('Hypothesis tests: the z test, the t test, the proportion, the chi-square', () => {
    expect((490 - 500) / (24 / 6)).toBe(-2.5);
    expect((2 * Phi(-2.5)).toFixed(4)).toBe('0.0124');
    expect(2.4 / (4 / 4)).toBe(2.4);
    const z = 0.05 / Math.sqrt(0.09 / 200);
    expect([z.toFixed(3), (1 - Phi(z)).toFixed(4)]).toEqual(['2.357', '0.0092']);
    expect(sum([8, 12, 9, 11, 6, 14].map((o) => (o - 10) ** 2 / 10))).toBeCloseTo(4.2, 12);
  });

  it('Regression: the figure from its points, the strong line, Spearman', () => {
    const xs = XY.map((p) => p[0]);
    const ys = XY.map((p) => p[1]);
    const S = (a, b) => sum(a.map((v, i) => v * b[i])) - (sum(a) * sum(b)) / a.length;
    expect([S(xs, xs), S(xs, ys), S(ys, ys)]).toEqual([10, 6, 6]);
    const line = plots(section('Regression and Correlation'))[0].series[0];
    expect(line.f(3)).toBeCloseTo(mean(ys), 12);
    expect((6 / Math.sqrt(60)).toFixed(3)).toBe('0.775');
    const [u, v] = [[2, 4, 6, 8, 10], [5, 9, 10, 15, 16]];
    expect([S(u, u), S(u, v), S(v, v)]).toEqual([40, 56, 82]);
    const b1 = S(u, v) / S(u, u);
    const b0 = mean(v) - b1 * mean(u);
    expect([b1, +b0.toFixed(9), +(b0 + 7 * b1).toFixed(9)]).toEqual([1.4, 2.6, 12.4]);
    const r = S(u, v) / Math.sqrt(S(u, u) * S(v, v));
    expect([r.toFixed(4), (r * r).toFixed(3)]).toEqual(['0.9778', '0.956']);
    const d = [1, 2, 3, 4, 5].map((x, i) => x - [2, 1, 4, 3, 5][i]);
    expect(1 - (6 * sum(d.map((x) => x * x))) / (5 * 24)).toBeCloseTo(0.8, 12);
    expect(13 - 2 * 5).toBe(3);
  });

  it('ANOVA: the mixes from the raw data, the completed table', () => {
    const means = MIXES.map(mean);
    expect(means).toEqual([19.5, 24.5, 21.5]);
    const grand = mean(MIXES.flat());
    const sstr = sum(means.map((m) => 4 * (m - grand) ** 2));
    const sse = sum(MIXES.map((g) => sum(g.map((x) => (x - mean(g)) ** 2))));
    expect([sstr.toFixed(2), sse]).toEqual(['50.67', 15]);
    expect((sstr / 2 / (sse / 9)).toFixed(1)).toBe('15.2');
    expect([60 / 3, 80 / 16, 60 / 3 / (80 / 16)]).toEqual([20, 5, 4]);
  });

  it('Design of experiments: the effects, the interaction figure, the run counts', () => {
    const eff = ([one, a, b, ab], n) => [(a + ab - b - one) / (2 * n), (b + ab - a - one) / (2 * n), (ab + one - a - b) / (2 * n)];
    expect(eff([42, 62, 50, 90], 2)).toEqual([15, 9, 5]);
    expect(eff([30, 48, 36, 66], 3)).toEqual([8, 4, 2]);
    const [low, high] = plots(section('Design of Experiments'))[0].series;
    expect([low.points[0][1], low.points[1][1], high.points[0][1], high.points[1][1]]).toEqual([42 / 2, 62 / 2, 50 / 2, 90 / 2]);
    expect([2 * 8, 2 ** 3, 2 ** 4, 3 * 4]).toEqual([16, 8, 16, 12]);
  });
});
