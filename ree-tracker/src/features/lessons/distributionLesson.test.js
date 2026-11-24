// Distribution Systems & Substation Design in the module format (2026-11-24):
// every number in the topic's worked examples, checks and figures, worked again,
// so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/distribution-systems-substation-design.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figures = (s, type) => s.body.filter((b) => typeof b !== 'string' && b.type === type);
const deg = Math.PI / 180;
const aging = (t) => Math.exp(15000 / 383 - 15000 / (t + 273));

describe('Distribution Systems & Substation Design, worked again', () => {
  it('System Types and Voltages: losses at two voltages, the conductor saved, the curve', () => {
    const s = section('System Types and Voltages');
    const [loss, cu] = s.examples;
    const P = (V) => ((1e7) ** 2 * 0.5) / (V * V * 0.81);
    expect(said(loss)).toContain(`= ${(P(13800) / 1000).toFixed(1)}$ kW`);
    expect(said(loss)).toContain(`${(P(34500) / 1000).toFixed(1)} kW`);
    expect(said(cu)).toContain(`= ${(34.5 / 13.8) ** 2}$`);
    expect(said(cu)).toContain(`= ${((13.8 / 34.5) ** 2).toFixed(2)}$`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(13.8)).toBeCloseTo(P(13800) / 1000, 6);
  });

  it('Load Characteristics: energy, load and loss factors, diversity, the load curve', () => {
    const s = section('Load Characteristics and Factors');
    const [factors, diversity] = s.examples;
    expect(said(factors)).toContain(`= ${14400 / 24000}`);
    expect(said(factors)).toContain(`= ${(8 + 16 * 0.16) / 24}$`);
    expect((0.3 * 0.6 + 0.7 * 0.36).toFixed(2)).toBe('0.43');
    expect(said(diversity)).toContain(`= ${(50 + 30 + 40) / 100}$`);
    const [curve] = figures(s, 'plot');
    let sum = 0;
    for (let h = 0; h < 24; h += 0.01) sum += curve.series[0].f(h + 0.005) * 0.01;
    expect(sum / 24).toBeCloseTo(curve.marks[0].y, 0);
  });

  it('Primary and Secondary Feeders: both-end currents, a distributor, the profile', () => {
    const s = section('Primary and Secondary Feeders');
    const [both, dist] = s.examples;
    const IA = 100 * 0.8 + 150 * 0.5 + 80 * 0.2;
    expect(said(both)).toContain(`= ${IA}$ A, $I_B = 330 - ${IA} = ${330 - IA}$ A`);
    expect(said(dist)).toContain(`= ${180 * 3 * 0.05 + 140 * 2 * 0.05 + 80 * 3 * 0.05}$ V`);
    expect(s.check[0].a).toContain(`= ${(200 * 0.6) / 2}$ V`);
    expect(s.check[0].a).toContain(`= ${(200 ** 2 * 0.6) / 3 / 1000}$ kW`);
    // The profile comes back to 230 V at the far end and is lowest at the mark.
    const [curve] = figures(s, 'plot');
    const f = curve.series[0].f;
    expect(f(1000)).toBeCloseTo(230, 9);
    expect(f(curve.marks[0].x)).toBeLessThan(f(curve.marks[0].x - 10));
    expect(f(curve.marks[0].x)).toBeLessThan(f(curve.marks[0].x + 10));
  });

  it('Voltage Drop: a primary feeder, a service, the phasor closes', () => {
    const s = section('Voltage Drop');
    const [primary, service] = s.examples;
    const sin = Math.sqrt(1 - 0.85 ** 2);
    const dV = 150 * (1.2 * 0.85 + 2.4 * sin);
    expect(said(primary)).toContain(`= ${sin.toFixed(3)}$`);
    expect(said(primary)).toContain(`= ${dV.toFixed(1)}$ V`);
    expect(said(primary)).toContain(`${((dV / (13800 / Math.sqrt(3))) * 100).toFixed(2)}%`);
    expect(said(service)).toContain(`= ${2 * 40 * 0.075 * 0.9}$ V`);
    expect(said(service)).toContain(`= ${((5.4 / 230) * 100).toFixed(2)}\\%$`);
    const [diagram] = figures(s, 'phasor');
    const [vr, , ir, ix, vs] = diagram.vectors;
    const pts = [vr, ir, ix].reduce(([x, y], v) => [x + v.mag * Math.cos(v.angle * deg), y + v.mag * Math.sin(v.angle * deg)], [0, 0]);
    expect(vs.mag).toBeCloseTo(Math.hypot(...pts), 3);
    expect(vs.angle).toBeCloseTo(Math.atan2(pts[1], pts[0]) / deg, 1);
  });

  it('Voltage Regulation and Capacitors: rise, placement, a regulator, the saving curve', () => {
    const s = section('Voltage Regulation and Capacitors');
    const [cap, reg] = s.examples;
    expect(said(cap)).toContain(`= ${((600 * 4) / (10 * 13.8 ** 2)).toFixed(2)}\\%$`);
    expect(said(reg)).toContain(`= ${(600 / (7620 / 120) * 2).toFixed(1)}$ V`);
    expect(said(reg)).toContain(`= ${5 / 0.625}$ steps`);
    const [curve] = figures(s, 'plot');
    const f = curve.series[0].f;
    expect(f(curve.marks[0].x)).toBeCloseTo(1, 12);
    expect(f(3000)).toBeCloseTo(0, 12);
  });

  it('Distribution Transformers: aging at 120 °C, a day, the aging curve', () => {
    const s = section('Distribution Transformers');
    const [hot, day] = s.examples;
    expect(said(hot)).toContain(`= ${aging(120).toFixed(2)}$`);
    expect(said(day)).toContain(`= ${aging(98).toFixed(3)}$`);
    expect(said(day)).toContain(`= ${((4 * 2.71 + 20 * aging(98)) / 24).toFixed(3)}$`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(110)).toBeCloseTo(1, 12);
  });

  it('Substation Types: breaker counts', () => {
    const [count] = section('Substation Types and Bus Schemes').examples;
    expect(said(count)).toContain(`= ${1.5 * 6}$`);
  });

  it('Substation Equipment: a reactor and a breaker rating', () => {
    const [reactor, breaker] = section('Substation Equipment').examples;
    expect(said(reactor)).toContain(`= ${(13.8 ** 2 / 100).toFixed(3)}$ Ω, so $0.10 \\times ${(13.8 ** 2 / 100).toFixed(3)} = ${(0.1 * 13.8 ** 2 / 100).toFixed(3)}$ Ω`);
    expect(said(breaker)).toContain(`= ${Math.round(50e6 / (Math.sqrt(3) * 13800))}$ A`);
  });

  it('Substation Grounding: resistivity, GPR, the grid limit', () => {
    const s = section('Substation Grounding');
    const [gpr, limit] = s.examples;
    expect(said(gpr)).toContain(`= ${Math.round(2 * Math.PI * 5 * 3.82)}$ Ω·m`);
    expect(said(gpr)).toContain(`= ${0.6 * 1.1 * 5000}$ A`);
    expect(said(limit)).toContain(`= ${(681 / 3300).toFixed(3)}$ Ω`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(681 / 3300)).toBeCloseTo(curve.marks[0].y, 9);
    expect(s.check[0].a).toContain(`= ${(2 * Math.PI * 3 * 10).toFixed(1)}$ Ω·m`);
  });

  it('Lightning Protection: a mast, strikes to a line, the rolling-sphere profile', () => {
    const s = section('Lightning Protection');
    const [mast, line] = s.examples;
    const d = Math.sqrt(30 * 60) - Math.sqrt(10 * 80);
    expect(said(mast)).toContain(`= ${d.toFixed(1)}$ m`);
    const Ng = 0.04 * 80 ** 1.25;
    expect(said(line)).toContain(`= ${Ng.toFixed(2)}$`);
    expect(said(line)).toContain(`= ${Math.round((Ng * (10 + 28 * 20 ** 0.6)) / 10)}$`);
    const [curve] = figures(s, 'plot');
    const f = curve.series[0].f;
    expect(f(0)).toBeCloseTo(30, 9);
    expect(f(curve.marks[0].x)).toBeCloseTo(10, 9);
    expect(f(Math.sqrt(1800))).toBeCloseTo(0, 9);
  });

  it('Reliability Indices: SAIFI to ASAI, series and parallel availability', () => {
    const [indices, avail] = section('Reliability Indices').examples;
    const saidi = (2000 * 90 + 500 * 30 + 1500 * 240) / 10000;
    expect(said(indices)).toContain(`= ${saidi}$ min`);
    expect(said(indices)).toContain(`= ${saidi / 0.4}$ min`);
    expect(said(indices)).toContain(`= ${(1 - saidi / 525600).toFixed(5)}$`);
    const A = 8760 / 8764;
    expect(said(avail)).toContain(`= ${A.toFixed(5)}$`);
    expect(said(avail)).toContain(`= ${(A * A).toFixed(5)}$`);
    expect(said(avail)).toContain(`= ${(1 - (1 - A) ** 2).toFixed(7)}$`);
  });

  it('Philippine Distribution Code: kvar to 0.85, unbalance, TDD', () => {
    const [pf, tdd] = section('Philippine Distribution Code').examples;
    const Q85 = 500 * Math.tan(Math.acos(0.85));
    expect(said(pf)).toContain(`is ${Q85.toFixed(1)} kvar, so at least ${(375 - Q85).toFixed(1)} kvar`);
    const avg = (400 + 392 + 386) / 3;
    expect(said(pf)).toContain(`${(((400 - avg) / avg) * 100).toFixed(2)}%`);
    expect(said(tdd)).toContain(`= ${((Math.hypot(12, 8) / 300) * 100).toFixed(2)}\\%$`);
    expect(Math.tan(Math.acos(0.85))).toBeCloseTo(0.62, 2);
  });
});
