// Probability & Statistics in the module format (2026-11-27): every count,
// probability and statistic in the topic's worked examples, checks and
// figures worked again, several by brute-force enumeration, so a slip in the
// text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { choose, normalPdf, skewPdf } from './content/mathematics/probability-statistics.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const plots = (s) => s.body.filter((b) => b.type === 'plot');
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
const P = (n, r) => fact(n) / fact(n - r);
// Standard normal CDF by integrating the density (Simpson), good to 1e-9.
const Phi = (z) => {
  const a = -10;
  const n = 4000;
  const h = (z - a) / n;
  let s = normalPdf(a, 0, 1) + normalPdf(z, 0, 1);
  for (let i = 1; i < n; i++) s += normalPdf(a + i * h, 0, 1) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
};
const dice2 = () => [1, 2, 3, 4, 5, 6].flatMap((a) => [1, 2, 3, 4, 5, 6].map((b) => [a, b]));
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const ss = (xs) => xs.reduce((s, x) => s + (x - mean(xs)) ** 2, 0);

describe('Probability & Statistics, worked again', () => {
  it('Counting: digits by enumeration, plates, the true-false test', () => {
    const three = [];
    for (let n = 100; n < 1000; n++) if (new Set(String(n)).size === 3) three.push(n);
    expect(three.length).toBe(648);
    expect(three.filter((n) => n % 2 === 0).length).toBe(328);
    expect(26 * 25 * 24 * 10 * 9 * 8).toBe(11232000);
    let even4 = 0;
    for (let n = 1000; n < 10000; n++) {
      const d = String(n);
      if (new Set(d).size === 4 && [...d].every((c) => c <= '6') && n % 2 === 0) even4++;
    }
    expect(even4).toBe(420);
    expect([2 ** 8, 4 * 3 * 5, 5 * 4]).toEqual([256, 60, 20]);
  });

  it('Permutations: the words, the tables, the pair apart, the necklace', () => {
    expect(fact(8) / (fact(3) * fact(2))).toBe(3360);
    expect([fact(5), 2 * fact(4)]).toEqual([120, 48]);
    expect(fact(10) / (fact(3) * fact(3) * fact(2))).toBe(50400);
    expect([2 * fact(4) * fact(4), fact(3) * fact(4)]).toEqual([1152, 144]);
    expect(fact(7) - 2 * fact(6)).toBe(3600);
    expect(fact(9) / 2).toBe(181440);
    expect([P(6, 3), fact(7)]).toEqual([120, 5040]);
  });

  it('Combinations: the committees, the binomial term and sum, the figure', () => {
    expect(choose(6, 3) * choose(5, 2)).toBe(200);
    expect(choose(6, 3) * choose(7, 2) + choose(6, 4) * choose(7, 1) + choose(6, 5)).toBe(531);
    expect(choose(7, 4) * 2 ** 3).toBe(280);
    expect((2 - 3) ** 5).toBe(-1);
    expect(choose(10, 2) - 10).toBe(35);
    const stems = plots(section('Combinations'))[0].series;
    expect(stems.reduce((s, st) => s + st.points[1][1], 0)).toBe(1024);
    expect(Math.max(...stems.map((st) => st.points[1][1]))).toBe(252);
    expect([choose(9, 3), 2 ** 7 - 1]).toEqual([84, 127]);
  });

  it('Probability basics: dice by enumeration, the ring, the table, hearts', () => {
    const d = dice2();
    expect(d.filter(([a, b]) => a + b === 9).length / 36).toBeCloseTo(1 / 9, 12);
    expect(d.filter(([a, b]) => a + b <= 4).length / 36).toBeCloseTo(1 / 6, 12);
    expect((1 - (5 / 6) ** 4).toFixed(4)).toBe('0.5177');
    const [outer, inner] = plots(section('Probability Basics'))[0].series;
    expect([outer.points[0][0], inner.points[0][0]]).toEqual([10, 5]);
    expect((100 - 25) / 100).toBe(0.75);
    expect((64 - 36) / 64).toBe(0.4375);
    expect((20 - 6) / 50).toBe(0.28);
    expect((choose(13, 3) / choose(52, 3)).toFixed(5)).toBe('0.01294');
    expect(choose(13, 2) / choose(52, 2)).toBeCloseTo(1 / 17, 12);
  });

  it('Exclusive and independent: unions, neither, at least one, exactly one', () => {
    expect(0.6 + 0.5 - 0.3).toBeCloseTo(0.8, 12);
    expect((80 - (45 + 38 - 20)) / 80).toBe(0.2125);
    expect(1 - 0.2 * 0.3).toBeCloseTo(0.94, 12);
    expect(0.8 * 0.3 + 0.2 * 0.7).toBeCloseTo(0.38, 12);
    expect((26 + 12 - 6) / 52).toBeCloseTo(8 / 13, 12);
    expect(((12 / 20) * 8) / 19).toBeCloseTo(24 / 95, 12);
    expect(0.6 ** 3 * 0.4 ** 2).toBeCloseTo(0.03456, 12);
  });

  it('Conditional and Bayes: the machines, the bags, the test, the checks', () => {
    expect((0.006 / 0.017).toFixed(3)).toBe('0.353');
    const red = 0.5 * (5 / 8) + 0.5 * (2 / 8);
    expect((0.5 * (5 / 8)) / red).toBeCloseTo(5 / 7, 12);
    expect((0.019 / (0.019 + 0.98 * 0.04)).toFixed(4)).toBe('0.3265');
    expect(0.18 / 0.5).toBeCloseTo(0.36, 12);
    expect(0.06 / (0.06 + 0.1)).toBeCloseTo(0.375, 12);
  });

  it('Expectation: the fair game, the die figure, the lottery, the distribution', () => {
    expect(100 / 6 - (20 * 5) / 6).toBeCloseTo(0, 12);
    const stems = plots(section('Mathematical Expectation'))[0].series;
    expect(stems.reduce((s, st) => s + st.points[1][0] * st.points[1][1], 0)).toBeCloseTo(3.5, 12);
    expect((91 / 6 - 12.25).toFixed(3)).toBe('2.917');
    expect((50 / 2e6) * 5e6).toBe(125);
    expect(60 / 6 - (15 * 5) / 6).toBeCloseTo(-2.5, 12);
    const [E, E2] = [0 * 0.2 + 1 * 0.5 + 2 * 0.3, 0 + 0.5 + 4 * 0.3];
    expect([E, E2 - E * E].map((v) => +v.toFixed(9))).toEqual([1.1, 0.49]);
    expect((3 * 2) / 6 - 3 / 6).toBeCloseTo(0.5, 12);
  });

  it('Binomial and Poisson: the figure, the five board values, the checks', () => {
    const stems = plots(section('Binomial and Poisson'))[0].series;
    // The binomial stems sit 0.12 left of their integer so they don't hide the Poisson ones.
    const bin = stems.slice(0, 10).reduce((s, st) => s + (st.points[1][0] + 0.12) * st.points[1][1], 0);
    expect(bin).toBeCloseTo(3, 3);
    expect((5 * 0.1 * 0.9 ** 4).toFixed(4)).toBe('0.3281');
    expect([Math.exp(-3), 4.5 * Math.exp(-3)].map((v) => v.toFixed(4))).toEqual(['0.0498', '0.2240']);
    expect((choose(6, 4) * 0.8 ** 4 * 0.2 ** 2).toFixed(4)).toBe('0.2458');
    expect(1 - 6 / 32).toBe(0.8125);
    expect(((choose(4, 1) * choose(8, 2)) / choose(12, 3)).toFixed(4)).toBe('0.5091');
    expect((3 * Math.exp(-2)).toFixed(4)).toBe('0.4060');
    expect(30 * 0.2 * 0.8).toBeCloseTo(4.8, 12);
    expect(choose(6, 4) / 64).toBe(15 / 64);
  });

  it('Normal: the shaded figure, the bulbs, the cut-off, the uniform density', () => {
    expect((Phi(1.5) - Phi(-1)).toFixed(4)).toBe('0.7745');
    const shade = plots(section('Normal Distribution'))[0].series[1].points;
    expect([shade[0][0], shade.at(-1)[0]]).toEqual([60, 85]);
    const board = said(section('Normal Distribution').examples[1]);
    expect(board).toContain(`$1 - 0.9332 = ${(1 - Phi(1.5)).toFixed(4)}$`);
    expect((Phi(1.25) - Phi(-1.25)).toFixed(4)).toBe('0.7887');
    expect(Phi(1.2816)).toBeCloseTo(0.9, 4);
    expect((500 + 1.2816 * 80).toFixed(1)).toBe('602.5');
    expect(0.25 * 1.5).toBe(0.375);
    expect((Phi(-2) * 100).toFixed(2)).toBe('2.28');
  });

  it('Central tendency: the skewed figure, the five board measures, the checks', () => {
    const xs = [12, 15, 11, 18, 15, 20, 15, 13, 17, 14];
    expect(mean(xs)).toBe(15);
    // The figure: mode 2 (peak), median 3.357, mean 4 for the gamma(2, 2) density.
    expect(skewPdf(2)).toBeGreaterThan(skewPdf(1.9));
    expect(skewPdf(2)).toBeGreaterThan(skewPdf(2.1));
    let [area, first] = [0, 0];
    for (let x = 0.0005; x < 60; x += 0.001) {
      area += skewPdf(x) * 0.001;
      first += x * skewPdf(x) * 0.001;
    }
    expect(area).toBeCloseTo(1, 6);
    expect(first).toBeCloseTo(4, 4);
    expect(1 - Math.exp(-3.357 / 2) * (1 + 3.357 / 2)).toBeCloseTo(0.5, 3);
    expect((72 / 11).toFixed(3)).toBe('6.545');
    expect((78 + 84 + 270) / 5).toBe(86.4);
    expect(2 / (1 / 40 + 1 / 60)).toBeCloseTo(48, 12);
    expect(Math.cbrt(2 * 8 * 32)).toBeCloseTo(8, 12);
    expect([(5 + 7) / 2, (8 + 10) / 2, (12 + 15) / 2]).toEqual([6, 9, 13.5]);
    expect((12 + 15 + 21) / 10).toBe(4.8);
    expect((12 * 75 + 18 * 80) / 30).toBe(78);
  });

  it('Dispersion: the ten values, every measure of spread, the checks', () => {
    const xs = [12, 15, 11, 18, 15, 20, 15, 13, 17, 14];
    expect(ss(xs)).toBe(68);
    expect([Math.sqrt(68 / 9), Math.sqrt(6.8)].map((v) => v.toFixed(3))).toEqual(['2.749', '2.608']);
    const ys = [4, 7, 9, 10, 15];
    expect([mean(ys), Math.max(...ys) - Math.min(...ys), ss(ys)]).toEqual([9, 11, 66]);
    expect(ys.reduce((s, y) => s + Math.abs(y - 9), 0) / 5).toBe(2.8);
    expect([Math.sqrt(16.5), Math.sqrt(13.2)].map((v) => v.toFixed(3))).toEqual(['4.062', '3.633']);
    expect(((Math.sqrt(16.5) / 9) * 100).toFixed(1)).toBe('45.1');
    expect(1 - 1 / 4).toBe(0.75);
    expect(Math.sqrt(ss([8, 10, 11, 11, 10]) / 4).toFixed(2)).toBe('1.22');
    expect([1, 4, 5, 7, 13].reduce((s, y) => s + Math.abs(y - 6), 0) / 5).toBe(3.2);
    const [narrow, wide] = plots(section('Dispersion'))[0].series;
    expect(narrow.f(0) / wide.f(0)).toBeCloseTo(2, 12);
  });

  it('Odds: both directions, the die, the expectation, the checks', () => {
    expect(0.2 / 0.8).toBe(0.25);
    expect(2 / 7).toBeCloseTo(0.286, 3);
    expect(2 / 4).toBe(0.5);
    expect((5 / 8) * 4000).toBe(2500);
    expect(12 / 40).toBe(3 / 10);
    expect(dice2().filter(([a, b]) => a + b === 7).length).toBe(6);
  });
});
