// Engineering Economics in the module format (2026-11-25): every number in
// the topic's worked examples, checks and figures, worked again, so a slip in
// the text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { keepCost } from './content/esas/engineering-economics.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s) => s.body.find((b) => typeof b !== 'string' && b.type === 'plot');
// ₱ amounts as the lesson writes them: thousands split by {,} (or \, in plain numbers).
const peso = (x) => Math.round(x).toLocaleString('en-US').replace(/,/g, '{,}');
const PA = (i, n) => (1 - (1 + i) ** -n) / i;
const PF = (i, n) => (1 + i) ** -n;
const AF = (i, n) => i / ((1 + i) ** n - 1);
const AP = (i, n) => i / (1 - (1 + i) ** -n);
const FA = (i, n) => ((1 + i) ** n - 1) / i;

describe('Engineering Economics, worked again', () => {
  it('Simple and Compound Interest: quarterly, simple, days, interest in advance, the curves', () => {
    const s = section('Simple and Compound Interest');
    const [q, board] = s.examples;
    expect(said(q)).toContain(`= ₱${peso(50000 * 1.02 ** 20)}$`);
    expect(said(q)).toContain(`= ₱${peso(50000 * 0.08 * 3)}$`);
    expect(21 + 30 + 31 + 30 + 31 + 31 + 30 + 31 + 25).toBe(260);
    expect(said(board)).toContain(`= ₱${((8000 * 0.12 * 260) / 365).toFixed(2)}$`);
    expect(said(board)).toContain(`= ₱${((8000 * 0.12 * 260) / 360).toFixed(2)}$`);
    expect(said(board)).toContain(`= ${((7500 / 42500) * 100).toFixed(2)}\\%$`);
    const f = figure(s);
    expect(f.series[0].f(f.marks[0].x)).toBeCloseTo(100, 9);
    expect(f.series[1].f(20)).toBeCloseTo(130, 9);
  });

  it('Nominal and Effective Rates: monthly, continuous, daily, a swap, a card', () => {
    const s = section('Nominal and Effective Rates');
    const [basic, board] = s.examples;
    expect(said(basic)).toContain(`= ${((1.01 ** 12 - 1) * 100).toFixed(2)}\\%$`);
    expect(said(basic)).toContain(`= ${(Math.expm1(0.12) * 100).toFixed(2)}\\%$`);
    expect(said(board)).toContain(`= ${(((1 + 0.15 / 360) ** 360 - 1) * 100).toFixed(2)}\\%$`);
    expect(said(board)).toContain(`= ${(4 * (1.05 ** 0.5 - 1) * 100).toFixed(3)}\\%$`);
    expect(said(board)).toContain(`= ${((1.02 ** 12 - 1) * 100).toFixed(2)}\\%$`);
    expect(s.check[1].a).toContain('= 10.25');
    const [eff, cont] = figure(s).series;
    expect(eff.f(1)).toBeCloseTo(12, 9);
    expect(eff.f(365)).toBeLessThan(cont.f(0));
  });

  it('Cash Flow and Equivalence: two amounts, the last instalment, real rate, discounting', () => {
    const s = section('Cash Flow and Equivalence');
    const [two, inst] = s.examples;
    expect(said(two)).toContain(`= ₱${peso(10000 * 1.1 ** 5 + 20000 * 1.1 ** 2)}$`);
    const rem = 1200000 - 300000 - 250000 / 1.12 - 350000 / 1.12 ** 2;
    expect(said(inst)).toContain(`= ₱${peso(rem)}$`);
    expect(said(inst)).toContain(`= ₱${peso(rem * 1.12 ** 4)}$`);
    expect(s.check[0].a).toContain(`= ${((1.1 / 1.04 - 1) * 100).toFixed(2)}\\%$`);
    expect(figure(s).series[1].f(10)).toBeCloseTo(100 / 1.1 ** 10, 12);
  });

  it('Annuities: the car loan, deferred and due, the balance curve', () => {
    const s = section('Annuities');
    const [car, board] = s.examples;
    const A = 800000 * AP(0.01, 60);
    expect(said(car)).toContain(`= ₱${peso(A)}$`);
    expect(said(car)).toContain(`= ₱${peso(A * PA(0.01, 36))}$`);
    const def = 12000 * PA(0.05, 10) * PF(0.05, 5);
    expect(said(board)).toContain(`= 150\\,000 + ${peso(def).replace('{,}', '\\,')} = ₱${peso(150000 + def)}$`);
    expect(said(board)).toContain(`= \\frac{600\\,000}{${(PA(0.05, 10) * 1.05).toFixed(4)}} = ₱${peso(600000 / (PA(0.05, 10) * 1.05))}$`);
    const bal = figure(s).series[0].f;
    expect(bal(0)).toBeCloseTo(800, 9);
    expect(bal(24) * 1000).toBeCloseTo(A * PA(0.01, 36), 6);
    expect(bal(60)).toBeCloseTo(0, 9);
  });

  it('Perpetuity and Capitalized Cost: the machine, the trust fund, the limit', () => {
    const s = section('Perpetuity and Capitalized Cost');
    const [mach, trust] = s.examples;
    const split = (x) => x.toFixed(2).replace(/(\d)(\d{3})\./, '$1\\,$2.');
    expect(said(mach)).toContain(`${split(12000 / 0.07)} + ${split(450000 / (1.07 ** 20 - 1))}`);
    expect(said(mach)).toContain(`= ₱${peso(500000 + 12000 / 0.07 + 450000 / (1.07 ** 20 - 1))}$`);
    const rep = 300000 / (1.06 ** 5 - 1);
    expect(said(trust)).toContain(`= ₱${peso(120000 / 0.06)}$`);
    expect(said(trust)).toContain(`= ₱${peso(rep)}$`);
    expect(said(trust)).toContain(`= ₱${peso(2500000 + 2000000 + rep)}$`);
    expect(s.check[0].a).toContain(`= ₱${peso(6000 / 0.08)}$`);
    const [pa, lim] = figure(s).series;
    expect(pa.f(100)).toBeLessThan(lim.f(0));
    expect(lim.f(0) - pa.f(100)).toBeLessThan(0.02);
  });

  it('Gradients: rising maintenance, a geometric gradient, the two series', () => {
    const s = section('Gradients');
    const [ar, geo] = s.examples;
    const base = 5000 * PA(0.1, 10);
    const grad = (1000 / 0.1) * (PA(0.1, 10) - 10 * PF(0.1, 10));
    expect(said(ar)).toContain(`= ₱${peso(base)}$`);
    expect(said(ar)).toContain(`= ₱${peso(grad)}$`);
    expect(said(ar)).toContain(`₱${Math.round(base + grad).toLocaleString('en-US')}`);
    expect(said(geo)).toContain(`= ₱${peso((2000 * (1 - (1.08 / 1.12) ** 10)) / 0.04)}$`);
    const [a, g] = figure(s).series;
    expect(a.points.at(-1)).toEqual([10, 14]);
    expect(g.points.at(-1)[1]).toBeCloseTo(5 * 1.1 ** 9, 12);
  });

  it('Depreciation: four methods, sinking fund, DDB year 4, the book values', () => {
    const s = section('Depreciation');
    const [four, board] = s.examples;
    expect(said(four)).toContain(`= ${((1 - 0.1 ** 0.2) * 100).toFixed(1)}\\%$`);
    const d = 4500000 * AF(0.08, 25);
    expect(said(board)).toContain(`= ₱${peso(d)}$`);
    expect(said(board)).toContain(`${peso(d * FA(0.08, 10)).replace('{,}', '\\,')} = ₱${peso(5000000 - d * FA(0.08, 10))}$`);
    expect(said(board)).toContain(`= ₱${80000 * 0.2 * 0.8 ** 3}$`.replace('8192.000000000002', '8192'));
    expect(Math.round(80000 * 0.2 * 0.8 ** 3)).toBe(8192);
    const f = figure(s);
    const [line, syd, mat, ddb] = f.series;
    expect(line.points.at(-1)[1]).toBe(10);
    expect(syd.points.map(([, v]) => v)).toEqual([100, 70, 46, 28, 16, 10]);
    expect(mat.points.at(-1)[1]).toBeCloseTo(10, 9);
    expect(ddb.points.at(-1)[1]).toBeLessThan(f.marks[0].y);
  });

  it('Bonds: semiannual, premium, the price curve', () => {
    const s = section('Bonds');
    const [semi, prem] = s.examples;
    expect(said(semi)).toContain(`= ${Math.round(400 * PA(0.05, 20))} + ${Math.round(10000 * PF(0.05, 20))} = ₱${Math.round(400 * PA(0.05, 20) + 10000 * PF(0.05, 20))}$`);
    const P = 10000 * PA(0.08, 15) + 100000 * PF(0.08, 15);
    expect(said(prem)).toContain(`= ₱${peso(P)}$`);
    expect(said(prem)).toContain(`= ${((10000 / P) * 100).toFixed(2)}\\%$`);
    const v = figure(s).series[0].f;
    expect(v(8)).toBeCloseTo(10, 9);
    expect(v(10) * 1000).toBeCloseTo(400 * PA(0.05, 20) + 10000 * PF(0.05, 20), 6);
    expect(v(14).toFixed(2)).toBe('6.82');
  });

  it('Break-Even: a plant, transformers, two machines, the chart', () => {
    const s = section('Break-Even Analysis');
    const [plant, board] = s.examples;
    expect(said(plant)).toContain(`= ${(200000 / 20).toLocaleString('en-US').replace(',', '\\,')}$ units`);
    expect(said(board)).toContain(`= ${2700000 / 18000}$ units`);
    expect(said(board)).toContain(`= ${60000 / 15}$ units`);
    const [rev, cost] = figure(s).series;
    expect(rev.f(10000)).toBeCloseTo(cost.f(10000), 9);
  });

  it('Present and Annual Worth: a machine, unequal lives', () => {
    const [mach, board] = section('Present and Annual Worth').examples;
    expect(said(mach)).toContain(`= ${peso(72000 * AP(0.1, 8)).replace('{,}', '\\,')} + 800`);
    expect(said(mach)).toContain(`= ₱${peso(72000 * AP(0.1, 8) + 800 + 5000)}$`);
    const X = 270000 * AP(0.1, 6);
    const Y = 405000 * AP(0.1, 9);
    expect(said(board)).toContain(`= ${peso(X).replace('{,}', '\\,')} + 43\\,000 = ₱${peso(X + 43000)}$`);
    expect(said(board)).toContain(`= ${peso(Y).replace('{,}', '\\,')} + 29\\,500 = ₱${peso(Y + 29500)}$`);
    expect(said(board)).toContain(`₱${Math.round(X + 43000 - Y - 29500).toLocaleString('en-US')} a year less`);
  });

  it('Rate of Return: IRR, payback, discounted payback, the NPW curve', () => {
    const s = section('Rate of Return and Payback');
    const [irr, lift] = s.examples;
    let lo = 0.1;
    let hi = 0.2;
    for (let k = 0; k < 60; k += 1) {
      const m = (lo + hi) / 2;
      if (30000 * PA(m, 5) > 100000) lo = m;
      else hi = m;
    }
    expect(said(irr)).toContain(`= ${(lo * 100).toFixed(1)}\\%$`);
    expect(said(lift)).toContain(`= ${2400000 / 600000}$ years`);
    expect(said(lift)).toContain(`= ${(-Math.log(1 - 0.4) / Math.log(1.1)).toFixed(2)}$ years`);
    const f = figure(s);
    expect(f.series[0].f(f.marks[0].x)).toBeCloseTo(0, 2);
    expect(f.series[0].f(0.0001)).toBeCloseTo(50, 1);
  });

  it('Benefit-Cost Ratio: flood control, conventional and modified', () => {
    const [flood, road] = section('Benefit-Cost Ratio').examples;
    expect(said(flood)).toContain(`= ${(12 / 9).toFixed(2)}`);
    expect(said(road)).toContain(`= ${(2.1 / 1.9).toFixed(2)}$`);
    expect(said(road)).toContain(`= ${(1.7 / 1.5).toFixed(2)}$`);
  });

  it('Replacement: keep or replace, a replacement fund, the economic life', () => {
    const s = section('Replacement Studies');
    const [keep, fund] = s.examples;
    expect(said(keep)).toContain(`= ₱${peso(60000 * AP(0.1, 3) + 40000)}$`);
    expect(said(keep)).toContain(`= ₱${peso(180000 * AP(0.1, 10) + 17000)}$`);
    const fut = 50000 * 1.06 ** 6;
    expect(said(fund)).toContain(`= ₱${peso(fut)}$`);
    expect(said(fund)).toContain(`${AF(0.08, 6).toFixed(5)} = ₱${Math.round(fut * AF(0.08, 6))}$`);
    // The marked economic life is the lowest annual cost.
    const f = figure(s);
    const costs = f.series[0].points.map(([, c]) => c);
    expect(costs.indexOf(Math.min(...costs)) + 1).toBe(f.marks[0].x);
    expect(keepCost(1)).toBeCloseTo(75000, 6);
  });

  it('Decisions: expected value, maximin, maximax, Hurwicz, Laplace, regret, the lines', () => {
    const s = section('Decisions Under Certainty, Risk and Uncertainty');
    const [basic, board] = s.examples;
    const ev = (x) => 0.3 * x[0] + 0.5 * x[1] + 0.2 * x[2];
    const plans = { A: [50, 20, -10], B: [30, 25, 10], C: [15, 15, 15] };
    expect([ev(plans.A), ev(plans.B), ev(plans.C)].map((v) => Math.round(v * 10) / 10)).toEqual([23, 23.5, 15]);
    expect(said(basic)).toContain('A 23, B 23.5, C 15');
    const hurwicz = (x, a) => a * Math.max(...x) + (1 - a) * Math.min(...x);
    expect(said(board)).toContain(`= ${hurwicz(plans.A, 0.6)}$`);
    expect(said(board)).toContain(`= ${hurwicz(plans.B, 0.6)}$`);
    expect(said(board)).toContain(`= ${(65 / 3).toFixed(1)}$`);
    const best = [0, 1, 2].map((k) => Math.max(plans.A[k], plans.B[k], plans.C[k]));
    const regret = (x) => Math.max(...x.map((v, k) => best[k] - v));
    expect([regret(plans.A), regret(plans.B), regret(plans.C)]).toEqual([25, 20, 35]);
    const [A, B, C] = figure(s).series;
    expect(A.f(0.5)).toBeCloseTo(B.f(0.5), 12);
    expect(B.f(0.25)).toBeCloseTo(C.f(0), 12);
  });
});
