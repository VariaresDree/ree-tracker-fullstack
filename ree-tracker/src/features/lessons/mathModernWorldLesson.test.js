// Math in the Modern World in the module format (2026-11-27): every number in
// the topic's worked examples, checks and figures worked again, so a slip in
// the text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { fib, LOAN, payment, balance, octagon, OCT_STEP, GAP, HOUSE, BALLOTS } from './content/mathematics/math-in-the-modern-world.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const plots = (s) => s.body.filter((b) => b.type === 'plot');
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const phi = (1 + Math.sqrt(5)) / 2;
const dist = ([a, b], [c, d]) => Math.hypot(a - c, b - d);
const money = (v) => v.toFixed(2);

describe('Math in the Modern World, worked again', () => {
  it('Patterns: Binet, the sums, the rectangle, the ratio figure', () => {
    expect([fib(1), fib(2), fib(12), fib(15), fib(17), fib(20)]).toEqual([1, 1, 144, 610, 1597, 6765]);
    expect((phi ** 15 / Math.sqrt(5)).toFixed(4)).toBe('609.9997');
    expect((phi ** 20 / Math.sqrt(5)).toFixed(5)).toBe('6765.00003');
    expect(sum(Array.from({ length: 10 }, (_, k) => fib(k + 1)))).toBe(143);
    expect(sum(Array.from({ length: 15 }, (_, k) => fib(k + 1)))).toBe(1596);
    expect(sum(Array.from({ length: 8 }, (_, k) => fib(k + 1) ** 2))).toBe(fib(8) * fib(9));
    expect(fib(8) * fib(9)).toBe(714);
    expect([(50 * phi).toFixed(1), (30 / phi).toFixed(1)]).toEqual(['80.9', '18.5']);
    const fig = plots(section('Patterns and Numbers in Nature'))[0];
    expect(fig.series[0].points.slice(0, 4).map((p) => +p[1].toFixed(3))).toEqual([1, 2, 1.5, 1.667]);
    expect(Math.abs(fig.series[0].points[9][1] - phi)).toBeLessThan(0.001);
    expect(fig.marks[0].y).toBeCloseTo(phi, 12);
  });

  it('Language: the expressions and the intervals', () => {
    expect((18 / 3) * 2 - 2 ** 2).toBe(8);
    expect(2 + (3 * (8 - 2) ** 2) / 9).toBe(14);
    expect(20 - (12 / 4) * 2).toBe(14);
    expect([-(3 ** 2), (-3) ** 2]).toEqual([-9, 9]);
    const inA = (x) => x >= -3 && x < 4;
    const inB = (x) => x > 1 && x <= 7;
    const grid = Array.from({ length: 1201 }, (_, k) => -4 + k / 100);
    const both = grid.filter((x) => inA(x) && inB(x));
    const either = grid.filter((x) => inA(x) || inB(x));
    expect([Math.min(...both) > 1, Math.max(...both) < 4, inA(1), inA(4)]).toEqual([true, true, true, false]);
    expect([Math.min(...either), Math.max(...either)].map((v) => +v.toFixed(9))).toEqual([-3, 7]);
  });

  it('Reasoning: the two quadratic patterns, the pigeonhole, the handshakes', () => {
    expect([1, 2, 3, 4, 5].map((n) => n * n + n)).toEqual([2, 6, 12, 20, 30]);
    expect(10 * 10 + 10).toBe(110);
    expect([1, 2, 3, 4, 5].map((n) => n * n + 2 * n)).toEqual([3, 8, 15, 24, 35]);
    expect(20 * 20 + 40).toBe(440);
    expect([2 * 12 + 1, Math.ceil(25 / 12), Math.ceil(24 / 12)]).toEqual([25, 3, 2]);
    expect([2, 3, 4, 12].map((n) => (n * (n - 1)) / 2)).toEqual([1, 3, 6, 66]);
    expect(Math.ceil(3 / 2)).toBe(2);
  });

  it('Logic: the invalid and valid forms, the survey, the counts', () => {
    const imp = (p, q) => !p || q;
    const rows = [[true, true], [true, false], [false, true], [false, false]];
    // Affirming the consequent has a row with true premises and a false conclusion; modus tollens has none.
    expect(rows.some(([p, q]) => imp(p, q) && q && !p)).toBe(true);
    expect(rows.some(([p, q]) => imp(p, q) && !q && p)).toBe(false);
    expect(rows.every(([p, q]) => imp(p, q) === imp(!q, !p))).toBe(true);
    expect(rows.every(([p, q]) => imp(p, q) === imp(q, p))).toBe(false);
    expect([60 - 25, 100 - (60 + 45 - 25)]).toEqual([35, 20]);
    expect([2 ** 5, 2 ** 4]).toEqual([32, 16]);
  });

  it('Data: percentile rank, midrange, z-scores, weighted mean, the histogram', () => {
    const scores = [55, 60, 62, 70, 70, 75, 80, 85, 90, 95];
    const B = scores.filter((s) => s < 70).length;
    const E = scores.filter((s) => s === 70).length;
    expect(((B + 0.5 * E) / 10) * 100).toBe(40);
    expect((Math.max(...scores) + Math.min(...scores)) / 2).toBe(75);
    expect([(82 - 75) / 5, (88 - 80) / 8]).toEqual([1.4, 1]);
    expect((1.5 * 3 + 2.0 * 5 + 1.25 * 2) / 10).toBeCloseTo(1.7, 12);
    expect([(58 - 70) / 6, (82 - 70) / 6]).toEqual([-2, 2]);
    expect([(31 + 12) / 2, 60 - 1.5 * 4]).toEqual([21.5, 54]);
    const counts = [50, 60, 70, 80, 90].map((lo) => scores.filter((s) => s >= lo && s < lo + 10).length);
    expect(counts).toEqual([1, 2, 3, 2, 2]);
    const bars = plots(section('Data Management'))[0].series[0].points;
    expect([bars[1][1], bars[3][1], bars[5][1], bars[7][1], bars[8][1]]).toEqual(counts);
  });

  it('Designs: the angles, the symmetries, the 4.8.8 figure fits edge to edge', () => {
    const angle = (n) => ((n - 2) * 180) / n;
    expect([3, 4, 5, 6, 8, 9, 12].map(angle)).toEqual([60, 90, 108, 120, 135, 140, 150]);
    expect([360 % 60, 360 % 90, 360 % 120]).toEqual([0, 0, 0]);
    expect([(360 / 135).toFixed(2), (360 / 108).toFixed(2)]).toEqual(['2.67', '3.33']);
    expect([90 + 2 * 135, 60 + 2 * 150, 3 * 60 + 2 * 90]).toEqual([360, 360, 360]);
    expect(2 * 5).toBe(10);
    const o = octagon(0, 0);
    for (let k = 0; k < 8; k++) expect(dist(o[k], o[k + 1])).toBeCloseTo(1, 12);
    for (let k = 0; k < 4; k++) expect(dist(GAP[k], GAP[k + 1])).toBeCloseTo(1, 12);
    // The gap's corners are corners of the octagons round it.
    const all = [[0, 0], [OCT_STEP, 0], [0, OCT_STEP], [OCT_STEP, OCT_STEP]].flatMap(([x, y]) => octagon(x, y));
    for (const g of GAP) expect(all.some((p) => dist(p, g) < 1e-9)).toBe(true);
    // Neighbouring octagons share a whole side.
    const right = octagon(OCT_STEP, 0);
    expect(right.some((p) => dist(p, o[0]) < 1e-9) && right.some((p) => dist(p, o[7]) < 1e-9)).toBe(true);
  });

  it('Codes: the ISBNs, the UPC, Caesar and the affine cipher', () => {
    const isbn10 = [0, 3, 0, 6, 4, 0, 6, 1, 5];
    const s10 = sum(isbn10.map((d, k) => (10 - k) * d));
    expect([s10, s10 % 11, (11 - (s10 % 11)) % 11]).toEqual([130, 9, 2]);
    const upc = [7, 5, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const su = sum(upc.map((d, k) => (k % 2 ? 1 : 3) * d));
    expect([su, (10 - (su % 10)) % 10]).toEqual([121, 9]);
    const isbn13 = [9, 7, 8, 9, 7, 1, 2, 3, 4, 5, 6, 7];
    const s13 = sum(isbn13.map((d, k) => (k % 2 ? 3 : 1) * d));
    expect([s13, (10 - (s13 % 10)) % 10]).toEqual([132, 8]);
    const shift = (w, k) => [...w].map((c) => String.fromCharCode(((c.charCodeAt(0) - 65 + k + 26) % 26) + 65)).join('');
    expect([shift('HELLO', 3), shift('WKH', -3)]).toEqual(['KHOOR', 'THE']);
    const affine = (w) => [...w].map((c) => String.fromCharCode(((5 * (c.charCodeAt(0) - 65) + 8) % 26) + 65)).join('');
    expect(affine('MATH')).toBe('QIZR');
    expect((5 * 21) % 26).toBe(1);
    const undo = [...'QIZR'].map((c) => String.fromCharCode((((21 * (c.charCodeAt(0) - 65 - 8)) % 26) + 26) % 26 + 65)).join('');
    expect(undo).toBe('MATH');
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    expect(gcd(4, 26)).toBe(2);
  });

  it('Linear programming: the five corners, the mix, the figure', () => {
    const ok = ([x, y]) => x <= 4 && 2 * y <= 12 && 3 * x + 2 * y <= 18 && x >= 0 && y >= 0;
    const corners = [[0, 0], [4, 0], [4, 3], [2, 6], [0, 6]];
    expect(corners.every(ok)).toBe(true);
    expect(corners.map(([x, y]) => 3 * x + 5 * y)).toEqual([0, 12, 27, 36, 30]);
    expect([4 - 2, 12 - 12, 18 - (6 + 12)]).toEqual([2, 0, 0]);
    const mix = [[0, 8], [2, 4], [6, 0]];
    expect(mix.every(([x, y]) => x + y >= 6 && 2 * x + y >= 8)).toBe(true);
    expect(mix.map(([x, y]) => 40 * x + 30 * y)).toEqual([240, 200, 240]);
    const [region, edge, iso] = plots(section('Linear Programming'))[0].series;
    expect(region.points.every(ok)).toBe(true);
    expect(edge.points.every(([x, y]) => 3 * x + 2 * y === 18)).toBe(true);
    expect(iso.f(2)).toBeCloseTo(6, 12);
  });

  it('Finance: the loan, its balance, the rates, the savings, the perpetuities', () => {
    const A = payment(LOAN);
    expect(money(A)).toBe('10138.20');
    expect([money(LOAN.P * LOAN.i), money(A - LOAN.P * LOAN.i), money(60 * A - LOAN.P)]).toEqual(['3333.33', '6804.86', '108291.83']);
    expect(money((10138.2 * (1 - (1 + LOAN.i) ** -24)) / LOAN.i)).toBe('224161.11');
    expect(Math.abs(balance(36) - 224161.11)).toBeLessThan(0.1);
    expect(balance(60)).toBeCloseTo(0, 6);
    expect(Math.round(balance(30))).toBe(274835);
    expect([((1.03 ** 4 - 1) * 100).toFixed(2), ((1.03 ** 2 - 1) * 100).toFixed(2)]).toEqual(['12.55', '6.09']);
    expect(money((2000 * (1.005 ** 120 - 1)) / 0.005)).toBe('327758.69');
    expect([50000 / 0.05, 12000 / 0.04]).toEqual([1000000, 300000]);
    const fig = plots(section('Mathematics of Finance'))[0];
    expect(fig.series[0].f(0)).toBeCloseTo(500, 9);
    expect(fig.series[0].f(30)).toBeGreaterThan(fig.series[1].points[0][1] / 2);
  });

  it('Apportionment and voting: Hamilton, Jefferson, Webster, the four counts', () => {
    const pops = [5300, 2650, 1830, 720];
    const d = sum(pops) / 21;
    const q = pops.map((p) => p / d);
    expect([d, ...q.map((v) => +v.toFixed(2))]).toEqual([500, 10.6, 5.3, 3.66, 1.44]);
    const lower = q.map(Math.floor);
    const extra = 21 - sum(lower);
    const order = q.map((v, k) => [v - Math.floor(v), k]).sort((a, b) => b[0] - a[0]).slice(0, extra).map((p) => p[1]);
    const ham = lower.map((v, k) => v + (order.includes(k) ? 1 : 0));
    expect(ham).toEqual([11, 5, 4, 1]);
    expect(pops.map((p) => Math.floor(p / 457.5))).toEqual(ham);
    expect(q.map(Math.round)).toEqual(ham);
    expect([Math.sqrt(20).toFixed(2), 4.48 > Math.sqrt(20)]).toEqual(['4.47', true]);
    const first = (c) => sum(BALLOTS.filter(([, r]) => r[0] === c).map(([n]) => n));
    expect(['A', 'B', 'C'].map(first)).toEqual([8, 7, 6]);
    const borda = (c) => sum(BALLOTS.map(([n, r]) => n * (2 - r.indexOf(c))));
    expect(['A', 'B', 'C'].map(borda)).toEqual([16, 28, 19]);
    const beats = (x, y) => sum(BALLOTS.filter(([, r]) => r.indexOf(x) < r.indexOf(y)).map(([n]) => n));
    expect([beats('B', 'A'), beats('B', 'C'), beats('C', 'A')]).toEqual([13, 15, 13]);
    // Elimination: drop C, its ballots move to their next choice.
    const afterC = (c) => sum(BALLOTS.map(([n, r]) => (r.filter((x) => x !== 'C')[0] === c ? n : 0)));
    expect([afterC('A'), afterC('B')]).toEqual([8, 13]);
    expect((5 * 4) / 2).toBe(10);
  });

  it('Graphs: degrees, the house path, K₅ and K₆, the faces, Kruskal', () => {
    const deg = (v) => HOUSE.e.filter((e) => e.includes(v)).length;
    expect(Object.keys(HOUSE.v).map(deg)).toEqual([2, 2, 3, 3, 2]);
    const path = ['TL', 'P', 'TR', 'TL', 'BL', 'BR', 'TR'];
    const used = path.slice(1).map((v, k) => [path[k], v].sort().join());
    expect(used.sort()).toEqual(HOUSE.e.map((e) => [...e].sort().join()).sort());
    expect([[3, 3, 3, 5].filter((x) => x % 2).length, sum([4, 3, 3, 2, 2]) / 2]).toEqual([4, 7]);
    const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
    expect([fact(5) / 2, fact(4) / 2, (5 * 4) / 2]).toEqual([60, 12, 10]);
    expect(2 - 8 + 12).toBe(6);
    const edges = [['A', 'B', 4], ['A', 'C', 2], ['A', 'D', 7], ['B', 'C', 5], ['B', 'D', 3], ['C', 'D', 6]];
    const parent = { A: 'A', B: 'B', C: 'C', D: 'D' };
    const root = (v) => (parent[v] === v ? v : root(parent[v]));
    const tree = [];
    for (const [a, b, w] of [...edges].sort((x, y) => x[2] - y[2])) {
      if (root(a) !== root(b)) {
        parent[root(a)] = root(b);
        tree.push(a + b);
        if (tree.length === 3) break;
      }
      void w;
    }
    expect(tree).toEqual(['AC', 'BD', 'AB']);
    expect([15 - 1, 4 ** 2]).toEqual([14, 16]);
    expect(plots(section('Graph Theory'))[0].series.length).toBe(HOUSE.e.length + 5);
  });
});
