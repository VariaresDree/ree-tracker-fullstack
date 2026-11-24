// Power Plant Engineering in the module format (2026-11-24): every number in the
// topic's worked examples, checks and figures, worked again, so a slip in the
// text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/power-plant-engineering.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figures = (s, type) => s.body.filter((b) => typeof b !== 'string' && b.type === type);
const thin = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');
// Brute-force maximum of f over [a, b].
const argmax = (f, a, b, n = 100000) => { let best = a; for (let k = 0; k <= n; k++) { const x = a + ((b - a) * k) / n; if (f(x) > f(best)) best = x; } return best; };

describe('Power Plant Engineering, worked again', () => {
  it('Load Curves and Plant Factors: capacity, use, utilization, operating factors', () => {
    const [basic, board] = section('Load Curves and Plant Factors').examples;
    const CF = 350000 / (100 * 8760);
    const use = 350000 / (100 * 6000);
    expect(said(basic)).toContain(`= ${CF.toFixed(2)}$`);
    expect(said(basic)).toContain(`= ${use.toFixed(3)}$`);
    const op = 6000 / 8760;
    expect(said(board)).toContain(`= ${op.toFixed(3)}$`);
    expect(op * use).toBeCloseTo(CF, 12);
  });

  it('Steam Plants: heat rate, coal, other units', () => {
    const [basic, units] = section('Steam Plants').examples;
    const eta = 0.88 * 0.42 * 0.98 * 0.98;
    expect(said(basic)).toContain(`= ${eta.toFixed(3)}$`);
    expect(said(basic)).toContain(`= ${thin(Math.round(3600 / eta))}$ kJ/kWh`);
    expect(said(basic)).toContain(`= ${thin(Math.round((100000 * 3600) / eta / 25000))}$ kg/h`);
    expect(said(units)).toContain(`= ${Math.round(3413 / eta)}$ BTU/kWh`);
    expect(said(units)).toContain(`= ${Math.round(860 / eta)}$ kcal/kWh`);
  });

  it('Hydroelectric Plants: output, jet, reservoir energy, the Pelton peak', () => {
    const s = section('Hydroelectric Plants');
    const [basic, res] = s.examples;
    expect(said(basic)).toContain(`= ${((9.81 * 20 * 95 * 0.88) / 1000).toFixed(1)}$ MW`);
    const jet = 0.98 * Math.sqrt(2 * 9.81 * 400);
    expect(said(basic)).toContain(`= ${jet.toFixed(1)}$ m/s`);
    expect(said(basic)).toContain(`= ${(0.46 * jet).toFixed(1)}$ m/s`);
    expect(said(res)).toContain(`= ${((1000 * 9.81 * 1e7 * 80 * 0.85) / 3.6e6 / 1e6).toFixed(3)} \\times 10^6$ kWh`);
    const [curve] = figures(s, 'plot');
    expect(argmax(curve.series[0].f, 0, 1)).toBeCloseTo(curve.marks[0].x, 4);
  });

  it('Diesel Plants: indicated power, part-load efficiency, the curve', () => {
    const s = section('Diesel Plants');
    const [basic, part] = s.examples;
    const A = (Math.PI / 4) * 0.15 ** 2;
    const IP = (800 * 0.2 * A * 1500 * 6) / 120;
    expect(said(basic)).toContain(`= ${A.toFixed(5)}$ m²`);
    expect(said(basic)).toContain(`= ${IP.toFixed(1)}$ kW`);
    expect(said(basic)).toContain(`= ${((180 / IP) * 100).toFixed(1)}\\%$`);
    expect(said(basic)).toContain(`= ${((3600 / (0.2 * 43000)) * 100).toFixed(1)}\\%$`);
    const eta = (p) => (3600 * p) / ((10 + 0.18 * p) * 43000);
    expect(said(part)).toContain(`= ${(eta(500) * 100).toFixed(1)}\\%$`);
    expect(said(part)).toContain(`= ${(eta(100) * 100).toFixed(1)}\\%$`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(100)).toBeCloseTo(eta(100) * 100, 9);
    expect(curve.marks[0].label).toContain(`${Math.round(eta(100) * 100)}%`);
  });

  it('Gas Turbine and Combined Cycle: best ratio, combined efficiency, the curves', () => {
    const s = section('Gas Turbine and Combined Cycle');
    const [basic, eff] = s.examples;
    const rp = 4 ** 1.75;
    expect(said(basic)).toContain(`= ${rp.toFixed(1)}$`);
    expect(said(basic)).toContain(`= ${((0.35 + 0.3 * 0.65) * 100).toFixed(1)}\\%$`);
    expect(1 - rp ** -(0.4 / 1.4)).toBeCloseTo(0.5, 12);
    expect(eff.answer).toContain('50%');
    const [curve] = figures(s, 'plot');
    expect(argmax(curve.series[0].f, 1, 40)).toBeCloseTo(rp, 2);
  });

  it('Geothermal Plants: flash fraction, output, the brine', () => {
    const [basic, brine] = section('Geothermal Plants').examples;
    const x = (1100 - 670.4) / 2085.8;
    expect(said(basic)).toContain(`= ${x.toFixed(3)}$`);
    expect(said(basic)).toContain(`= ${((Number(x.toFixed(3)) * 100 * 456 * 0.85 * 0.97) / 1000).toFixed(2)}$ MW`);
    const b = 100 * (1 - Number(x.toFixed(3)));
    expect(said(brine)).toContain(`= ${b.toFixed(1)}$ kg/s`);
    expect(said(brine)).toContain(`= ${((b * 670.4) / 1000).toFixed(1)}$ MW`);
  });

  it('Nuclear Plants: a year of fuel, energy per gram', () => {
    const [year, gram] = section('Nuclear Plants').examples;
    const heat = (1e9 / 0.33) * 8760 * 3600;
    expect(said(year)).toContain(`= ${(heat / 1e16).toFixed(2)} \\times 10^{16}$ J`);
    expect(said(year)).toContain(`= ${(heat / 8.2e10 / 1e6).toFixed(3)} \\times 10^6$ g`);
    expect(said(gram)).toContain(`= ${((200 * 1.602e-13 * 6.022e23) / 235 / 1e10).toFixed(2)} \\times 10^{10}$ J`);
  });

  it('Solar PV: hot-module output, array size, the maximum power point', () => {
    const s = section('Solar PV');
    const [hot, mpp] = s.examples;
    const Tc = 32 + (25 / 800) * 1000;
    expect(said(hot)).toContain(`= ${Tc.toFixed(1)}$ °C`);
    expect(said(hot)).toContain(`= ${Math.round(400 * (1 - 0.004 * (Tc - 25)))}$ W`);
    expect(said(hot)).toContain(`= ${(20 / 3.9).toFixed(2)}$ kW: ${Math.ceil(20 / 3.9 / 0.4)} modules`);
    const P = (v) => v * 10.5 * (1 - Math.exp((v - 49.5) / 2.2));
    expect(said(mpp)).toContain(`= ${Math.round(P(40))}$ W`);
    expect(said(mpp)).toContain(`= ${Math.round(P(42.9))}$ W`);
    expect(said(mpp)).toContain(`= ${Math.round(P(45))}$ W`);
    const [curve] = figures(s, 'plot');
    expect(argmax(curve.series[0].f, 30, 49)).toBeCloseTo(curve.marks[0].x, 1);
  });

  it('Wind: hub height, tip speed, Betz, the power curve', () => {
    const s = section('Wind');
    const [hub, betz] = s.examples;
    const v = 6 * 8 ** (1 / 7);
    expect(said(hub)).toContain(`= ${v.toFixed(2)}$ m/s`);
    expect(said(hub)).toContain(`= ${((v / 6) ** 3).toFixed(2)}$`);
    expect(said(hub)).toContain(`= ${((2 * Math.PI * 15 * 50) / 600).toFixed(2)}$`);
    const P = 0.5 * 1.225 * Math.PI * 2500 * 1000;
    expect(said(betz)).toContain(`= ${(P / 1e6).toFixed(2)}$ MW`);
    expect(said(betz)).toContain(`${((P * 16) / 27 / 1e6).toFixed(2)} MW at most`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(12)).toBe(2);
    expect(curve.series[0].f(26)).toBe(0);
    expect(curve.series[0].f(2)).toBe(0);
  });

  it('Biomass: as-fired heating value, output, drying first', () => {
    const s = section('Biomass');
    const [wet, dry] = s.examples;
    expect(said(wet)).toContain(`= ${19 * 0.5 - 2.44 * 0.5}$ MJ/kg`);
    expect(said(wet)).toContain(`= ${((10000 * 8280 * 0.22) / 3600 / 1000).toFixed(2)}$ MW`);
    const lhv = 19 * 0.7 - 2.44 * 0.3;
    expect(said(dry)).toContain(`= ${lhv.toFixed(2)}$ MJ/kg`);
    const P = ((5000 / 0.7) * lhv * 1000 * 0.22) / 3600 / 1000;
    expect(said(dry)).toContain(`= ${P.toFixed(2)}$ MW`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(0.5)).toBeCloseTo(8.28, 12);
  });

  it('Plant Economics: CRF and cost per kWh, break-even, economical pf, the crossing', () => {
    const s = section('Plant Economics');
    const [cost, pf] = s.examples;
    const crf = (0.1 * 1.1 ** 25) / (1.1 ** 25 - 1);
    expect(said(cost)).toContain(`= ${crf.toFixed(4)}$`);
    expect(said(cost)).toContain(`= ${Math.round(5000 * crf)}$ M`);
    expect(said(cost)).toContain(`₱${((5000 * crf + 1000) / 700).toFixed(2)}/kWh`);
    expect(said(pf)).toContain(`= ${Math.sqrt(1 - 0.09).toFixed(3)}$`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(curve.marks[0].x)).toBeCloseTo(curve.series[1].f(curve.marks[0].x), 9);
  });

  it('Plant Auxiliaries: pump, net heat rate, a fan', () => {
    const [basic, fan] = section('Plant Auxiliaries').examples;
    expect(said(basic)).toContain(`= ${Math.round((1000 * 9.81 * 0.5 * 120) / 0.8 / 1000)}$ kW`);
    expect(said(basic)).toContain(`= ${thin(Math.round((10000 * 100) / 93))}$ kJ/kWh`);
    expect(said(fan)).toContain(`= ${(150 * 3000) / 0.75 / 1000}$ kW`);
  });
});
