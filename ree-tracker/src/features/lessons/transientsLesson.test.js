// Electrical Transient Analysis in the module format (2026-11-20): every number
// in the topic's worked examples, checks and figures, worked again (closed forms
// checked against a numerical solution of the circuit's differential equation),
// so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/electrical-transient-analysis.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figures = (s, type) => s.body.filter((b) => typeof b !== 'string' && b.type === type);
const series = (fig, label) => fig.series.find((x) => x.label === label).f;
const thin = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');

// Series RLC switched onto V from rest, stepped with RK4: returns [i, vC] at t.
const rlc = (R, L, C, V, t, n = 20000) => {
  let i = 0;
  let q = 0;
  const h = t / n;
  const f = (ii, qq) => [(V - R * ii - qq / C) / L, ii];
  for (let k = 0; k < n; k++) {
    const [a1, b1] = f(i, q);
    const [a2, b2] = f(i + (h / 2) * a1, q + (h / 2) * b1);
    const [a3, b3] = f(i + (h / 2) * a2, q + (h / 2) * b2);
    const [a4, b4] = f(i + h * a3, q + h * b3);
    i += (h / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
    q += (h / 6) * (b1 + 2 * b2 + 2 * b3 + b4);
  }
  return [i, q / C];
};

describe('Electrical Transient Analysis, worked again', () => {
  it('Initial and Final Conditions: switching onto C, opening an RL', () => {
    const s = section('Initial and Final Conditions');
    const [cap, open] = s.examples;
    const Rth = (4 * 8) / 12;
    expect(said(cap)).toContain(`= ${Rth.toFixed(3)}$ Ω`);
    expect(said(cap)).toContain(`= ${(Rth * 300e-6 * 1000).toFixed(1)}$ ms`);
    const [cur] = figures(s, 'plot');
    expect(cur.series[0].f(0)).toBeCloseTo(12 / 4, 12);
    expect(cur.series[0].f(1e6)).toBeCloseTo(12 / 12, 12);
    // The plotted decay uses τ = Rth·C in ms.
    expect(cur.series[0].f(Rth * 0.3)).toBeCloseTo(1 + 2 * Math.exp(-1), 9);
    expect(said(open)).toContain(`= ${20 / 4}$ A`);
    expect(said(open)).toContain(`= ${5 * 6}$ V`);
    expect(said(open)).toContain(`= ${-30 / 0.2}$ A/s`);
    expect(said(open)).toContain(`= ${((0.2 / 6) * 1000).toFixed(1)}$ ms`);
  });

  it('RL Transients: switching on, a discharge resistor, the checks', () => {
    const s = section('RL Transients');
    const [on, field] = s.examples;
    expect(said(on)).toContain(`= ${(3 * (1 - Math.exp(-2))).toFixed(3)}$ A`);
    expect(said(on)).toContain(`= ${(24 * Math.exp(-2)).toFixed(3)}$ V`);
    const Rd = 600 / 500;
    const tau = 8 / (0.2 + Rd);
    expect(said(field)).toContain(`= ${Rd}$ Ω`);
    expect(said(field)).toContain(`= ${tau.toFixed(3)}$ s`);
    expect(said(field)).toContain(`= ${(tau * Math.log(10)).toFixed(2)}$ s`);
    expect(s.check[0].a).toContain(`= ${12 / 0.004}$ A/s`);
    expect(3 / Math.log(8 / 2.94)).toBeCloseTo(3.0, 2);
    const [curve] = figures(s, 'plot');
    expect(series(curve, 'i / I')(1)).toBeCloseTo(0.632, 3);
    expect(curve.marks[0].at[1]).toBeCloseTo(series(curve, 'v_L / V')(1), 12);
  });

  it('RC Transients: time to a voltage, a pre-charged capacitor', () => {
    const s = section('RC Transients');
    const [time, pre] = s.examples;
    expect(said(time)).toContain(`= ${Math.log(5).toFixed(3)}$ s`);
    expect(said(time)).toContain(`= ${0.5 * 1e-4 * 50 ** 2}$ J`);
    const v = 200 - 150 * Math.exp(-2);
    expect(said(pre)).toContain(`= ${((200 - 50) / 5000) * 1000}$ mA`);
    expect(said(pre)).toContain(`150 \\times ${Math.exp(-2).toFixed(4)} = ${v.toFixed(1)}$ V`);
    expect(said(pre)).toContain(`= ${(0.1 * Math.log(3)).toFixed(4)}$ s`);
    expect(s.check[0].a).toContain(`= ${Math.log(4).toFixed(2)}$ s`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(curve.marks[0].x)).toBeCloseTo(curve.marks[1].y, 9);
  });

  it('RLC Transients: the kind of response, and a ringing current against the ODE', () => {
    const s = section('RLC Transients');
    const [kind, ring] = s.examples;
    expect(said(kind)).toContain(`= ${Math.round(Math.sqrt(1000 ** 2 - 100 ** 2))}$ rad/s`);
    const a = 7 / (2 * 0.5);
    const w0 = 1 / Math.sqrt(0.5 * 0.0032);
    const wd = Math.sqrt(w0 ** 2 - a ** 2);
    expect(a).toBe(7);
    expect(w0).toBeCloseTo(25, 9);
    expect(wd).toBeCloseTo(24, 9);
    const K = 120 / (wd * 0.5);
    expect(K).toBeCloseTo(10, 9);
    for (const t of [0.02, 0.1, 0.3]) expect(rlc(7, 0.5, 0.0032, 120, t)[0]).toBeCloseTo(K * Math.exp(-a * t) * Math.sin(wd * t), 6);
    const tp = Math.atan2(wd, a) / wd;
    expect(said(ring)).toContain(`= ${tp.toFixed(5)}$ s`);
    expect(said(ring)).toContain(`\\frac{${Math.atan2(wd, a).toFixed(4)}}{24}`);
    expect(said(ring)).toContain(`= ${(K * Math.exp(-a * tp) * Math.sin(wd * tp)).toFixed(2)}$ A`);
    const [curve] = figures(s, 'plot');
    expect(curve.marks[0].at[1]).toBeCloseTo(series(curve, 'i')(tp), 12);
    expect(s.check[0].a).toContain(`= ${(4 * 1) / 4 ** 2}$ F`);
  });

  it('Natural and Forced Response: a second-order fit, against the ODE and the figure', () => {
    const s = section('Natural and Forced Response');
    const [, fit] = s.examples;
    const A2 = 10 / 3;
    const A1 = -4 * A2;
    expect(said(fit)).toContain(`$A_2 = ${A2.toFixed(3)}$ and $A_1 = ${A1.toFixed(2)}$`);
    for (const t of [0.3, 1, 3]) expect(rlc(5, 1, 0.25, 10, t)[1]).toBeCloseTo(10 + A1 * Math.exp(-t) + A2 * Math.exp(-4 * t), 6);
    const [curve] = figures(s, 'plot');
    expect(series(curve, 'total')(0)).toBeCloseTo(0, 12);
    expect(series(curve, 'natural')(2) + curve.marks[0].y).toBeCloseTo(series(curve, 'total')(2), 12);
    expect(s.check[1].a).toContain(`= ${Math.log(-A1 / 0.1).toFixed(2)}$ s`);
  });

  it('Damping: ζ, decrement, critical resistance, and the plotted step responses', () => {
    const s = section('Damping');
    const [basic, board] = s.examples;
    const dec = (2 * Math.PI * 0.2) / Math.sqrt(0.96);
    expect(said(basic)).toContain(`= ${dec.toFixed(3)}$`);
    expect(said(basic)).toContain(`= ${Math.exp(-dec).toFixed(3)}$`);
    expect(2 * Math.sqrt(1 / 4e-6)).toBeCloseTo(1000, 9);
    const d = Math.log(50 / 30);
    expect(said(board)).toContain(`= ${d.toFixed(4)}$`);
    expect(said(board)).toContain(`= ${(d / Math.sqrt(4 * Math.PI ** 2 + d * d)).toFixed(4)}$`);
    expect(said(board)).toContain(`= ${(d / 0.002).toFixed(1)}$ Np/s`);
    expect(2 * Math.sqrt(0.2 / 5e-6)).toBeCloseTo(400, 9);
    // The plotted curves are the normalised RLC step: ω0 = 1, R = 2ζ.
    const [curve] = figures(s, 'plot');
    for (const [z, label] of [[0.2, 'ζ = 0.2'], [1, 'ζ = 1'], [2, 'ζ = 2']]) {
      for (const x of [0.5, 2, 6]) expect(series(curve, label)(x)).toBeCloseTo(rlc(2 * z, 1, 1, 1, x)[1], 6);
    }
  });

  it('Step and Impulse Response: overshoot, design, the table and the figure', () => {
    const s = section('Step and Impulse Response');
    const [read, design] = s.examples;
    const os = (z) => 100 * Math.exp((-Math.PI * z) / Math.sqrt(1 - z * z));
    expect(said(read)).toContain(`= ${os(0.2).toFixed(1)}\\%$`);
    expect(said(read)).toContain(`= ${((Math.PI / 980) * 1000).toFixed(2)}$ ms`);
    const z = -Math.log(0.1) / Math.sqrt(Math.PI ** 2 + Math.log(0.1) ** 2);
    expect(said(design)).toContain(`= ${z.toFixed(4)}$`);
    expect(said(design)).toContain(`= ${(2 * z * 100).toFixed(1)}$ Ω`);
    expect(os(z)).toBeCloseTo(10, 9);
    const table = s.body.find((b) => typeof b === 'string' && b.startsWith('| ζ'));
    for (const zz of [0.1, 0.2, 0.3, 0.5, 0.707]) expect(table).toContain(`${os(zz).toFixed(1)}%`);
    expect(s.check[0].a).toContain(`= ${os(0.5).toFixed(1)}\\%$`);
    const [curve] = figures(s, 'plot');
    const [peak] = curve.marks;
    expect(curve.series[0].f(peak.at[0])).toBeCloseTo(peak.at[1], 12);
    expect((peak.at[1] - 1) * 100).toBeCloseTo(os(0.2), 1);
    expect(curve.series[0].f(peak.at[0] + 0.01)).toBeLessThan(peak.at[1]);
    expect(curve.series[0].f(peak.at[0] - 0.01)).toBeLessThan(peak.at[1]);
  });

  it('Laplace Transform Solutions: the three answers against the time domain', () => {
    const s = section('Laplace Transform Solutions');
    const [rest, start, second] = s.examples;
    expect(said(rest)).toContain('2(1 - e^{-5t})');
    expect(said(start)).toContain('2 - e^{-5t}');
    // Same answer from the first-order recipe: i(0) = 1, i(∞) = 2, τ = 0.2 s.
    for (const t of [0.1, 0.4]) expect(2 + (1 - 2) * Math.exp(-t / 0.2)).toBeCloseTo(2 - Math.exp(-5 * t), 12);
    expect((10 - 5) / -5).toBe(-1);
    expect(said(second)).toContain(`= ${(40 / -3).toFixed(2)}$`);
    expect(said(second)).toContain(`= ${(40 / 12).toFixed(3)}$`);
    const [curve] = figures(s, 'plot');
    expect(series(curve, 'from 1 A')(0)).toBe(1);
    expect(series(curve, 'from rest')(0)).toBe(0);
  });

  it('Transfer Functions: poles, a first-order system, and the resonant peak', () => {
    const s = section('Transfer Functions');
    const [rlcH] = s.examples;
    expect(said(rlcH)).toContain(`-100 \\pm j${Math.round(Math.sqrt(1e6 - 1e4))}`);
    const [curve] = figures(s, 'plot');
    const f = curve.series[0].f;
    const [peak] = curve.marks;
    expect(f(peak.at[0])).toBeCloseTo(peak.at[1], 12);
    expect(f(peak.at[0] * 1.001)).toBeLessThan(peak.at[1]);
    expect(f(peak.at[0] * 0.999)).toBeLessThan(peak.at[1]);
    expect(peak.label).toContain(peak.at[1].toFixed(2));
  });

  it('AC Transients and Switching: offset, fault peak, chopping, inrush', () => {
    const s = section('AC Transients and Switching');
    const [angle, fault, bank] = s.examples;
    expect(said(angle)).toContain(`= ${((Math.atan2(4, 3) * 180) / Math.PI).toFixed(2)}^\\circ$`);
    expect(said(angle)).toContain(`= ${((230 * Math.SQRT2) / 5).toFixed(2)}$ A`);
    expect(said(angle)).toContain(`= ${((4 / (120 * Math.PI) / 3) * 1000).toFixed(2)}$ ms`);
    const k = 1 + Math.exp(-Math.PI / 10);
    expect(said(fault)).toContain(`${(20 * Math.SQRT2).toFixed(2)} \\times ${k.toFixed(3)} = ${(20 * Math.SQRT2 * k).toFixed(2)}$ kA`);
    const z = Math.sqrt(0.5 / 2e-9);
    expect(said(fault)).toContain(`3 \\times ${thin(Math.round(z))} = ${((3 * z) / 1000).toFixed(2)}$ kV`);
    const Vp = (13800 * Math.SQRT2) / Math.sqrt(3);
    expect(said(bank)).toContain(`= ${thin(Math.round(Vp))}$ V`);
    expect(said(bank)).toContain(`= ${Math.round(Vp * Math.sqrt(0.1))}$ A`);
    expect(said(bank)).toContain(`= ${Math.round(1 / (2 * Math.PI * Math.sqrt(50e-6 * 0.5e-3)))}$ Hz`);
    const [curve] = figures(s, 'plot');
    expect(series(curve, 'i')(0)).toBeCloseTo(0, 12);
    expect(curve.marks[0].at[1]).toBeCloseTo(k, 12);
    expect(series(curve, 'i')(180)).toBeCloseTo(k, 12);
  });

  it('Traveling Waves: a cable junction, line constants, reflections settling', () => {
    const s = section('Traveling Waves');
    const [junction, line, settle] = s.examples;
    const G = (40 - 400) / (40 + 400);
    expect(said(junction)).toContain(`= ${G.toFixed(4)}$`);
    expect(said(junction)).toContain(`= ${(G * 600).toFixed(1)}$ kV`);
    expect(said(junction)).toContain(`= ${((1 + G) * 600).toFixed(1)}$ kV`);
    expect(said(junction)).toContain(`= ${Math.round(((1 + G) * 600 * 1000) / 40)}$ A`);
    const LC = 1.2e-3 * 9.5e-9;
    expect(said(line)).toContain(`= ${Math.sqrt(1.2e-3 / 9.5e-9).toFixed(1)}$ Ω`);
    expect(said(line)).toContain(`= ${thin(Math.round(1 / Math.sqrt(LC) / 100) * 100)}$ km/s`);
    expect(said(line)).toContain(`= ${(150 * Math.sqrt(LC) * 1e6).toFixed(1)}$ µs`);
    // The plotted staircase is the far-end voltage, and it closes on the dc answer.
    const [curve] = figures(s, 'plot');
    const f = curve.series[0].f;
    const arrivals = [1, 3, 5, 7].map((t) => f(t + 0.5));
    expect(arrivals).toEqual([150, 75, 112.5, 93.75]);
    expect(settle.answer).toContain('150, 75, 112.5, 93.75 V');
    expect(f(41)).toBeCloseTo(curve.marks[0].y, 4);
    expect((200 - 400) / (200 + 400)).toBeCloseTo(-1 / 3, 12);
  });
});
