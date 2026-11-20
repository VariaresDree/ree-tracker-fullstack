// Electronics 1 and 2 in the module format (2026-11-20): every number in the
// topic's worked examples, checks and figures, worked again from the device
// equations, so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/electronics-1-and-2.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figures = (s, type) => s.body.filter((b) => typeof b !== 'string' && b.type === type);
const series = (fig, label) => fig.series.find((x) => x.label === label).f;
const par = (a, b) => (a * b) / (a + b);
const q = 1.602e-19;

describe('Electronics 1 and 2, worked again', () => {
  it('Semiconductors and PN Junction: carriers, barrier, a triode, an escaping electron', () => {
    const s = section('Semiconductors and PN Junction');
    const [junction, tube] = s.examples;
    const V0 = 0.02585 * Math.log(1e12);
    expect(said(junction)).toContain(`= ${V0.toFixed(3)}$ V`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(16)).toBeCloseTo(V0, 9);
    expect(curve.marks[0].x).toBe(16);
    expect(curve.marks[0].label).toContain(V0.toFixed(3));
    const mu = 20 / 0.8;
    const rp = 20 / 0.002;
    expect(said(tube)).toContain(`= ${mu}$`);
    expect(said(tube)).toContain(`= ${rp / 1000}$ kΩ`);
    expect(said(tube)).toContain(`= ${(mu / rp) * 1000}$ mS`);
    const v = Math.sqrt((2 * 2.5 * q) / 9.109e-31);
    expect(said(tube)).toContain(`${(2.5 * q * 1e19).toFixed(3)} \\times 10^{-19}`);
    expect(said(tube)).toContain(`= ${(v / 1e5).toFixed(2)} \\times 10^5$ m/s`);
  });

  it('Diodes: the two models, and the knees in the figure', () => {
    const s = section('Diodes');
    const [simple, model] = s.examples;
    expect(said(simple)).toContain(`= ${(26 / 4.3).toFixed(1)}$ Ω`);
    const I = 4.3 / 102;
    expect(said(model)).toContain(`= ${(I * 1000).toFixed(2)}$ mA`);
    expect(said(model)).toContain(`= ${(0.7 + I * 2).toFixed(3)}$ V`);
    const [curve] = figures(s, 'plot');
    expect(series(curve, 'Si')(0.7)).toBeCloseTo(10, 9);
    expect(series(curve, 'Ge')(0.3)).toBeCloseTo(10, 9);
    // Ten times the current for about 60 mV more.
    expect(series(curve, 'Si')(0.7 + 0.02585 * Math.log(10)) / series(curve, 'Si')(0.7)).toBeCloseTo(10, 9);
    expect(0.02585 * Math.log(10)).toBeCloseTo(0.06, 2);
  });

  it('Rectifiers and Filters: a bridge, half-wave with resistances, a center-tap, the table', () => {
    const s = section('Rectifiers and Filters');
    const [bridge, half, ct] = s.examples;
    const Vm = 12 * Math.SQRT2 - 1.4;
    const Vr = 0.5 / (120 * 2200e-6);
    expect(said(bridge)).toContain(`= ${Vm.toFixed(2)}$ V`);
    expect(said(bridge)).toContain(`= ${Vr.toFixed(2)}$ V`);
    expect(said(bridge)).toContain(`= ${(Vm - Vr / 2).toFixed(1)}$ V`);
    const Im = (20 * Math.SQRT2 - 0.7) / 20.4;
    expect(said(half)).toContain(`= ${Im.toFixed(3)}$ A`);
    expect(said(half)).toContain(`= ${(Im / Math.PI).toFixed(4)}$ A`);
    expect(said(half)).toContain(`= ${((Im / Math.PI) * 20).toFixed(2)}$ V`);
    const Vdc = (2 * 100 * Math.SQRT2) / Math.PI;
    expect(said(ct)).toContain(`= ${Vdc.toFixed(2)}$ V`);
    expect(said(ct)).toContain(`= ${(Vdc / 40).toFixed(3)}$ A`);
    expect(said(ct)).toContain(`= ${(200 * Math.SQRT2).toFixed(1)}$ V`);
    // Ripple factors and efficiencies from the sampled waves.
    const avg = (f) => { let a = 0; let b = 0; const n = 20000; for (let k = 0; k < n; k++) { const v = f((2 * Math.PI * (k + 0.5)) / n); a += v; b += v * v; } return [a / n, b / n]; };
    const [hA, hS] = avg((t) => Math.max(Math.sin(t), 0));
    const [fA, fS] = avg((t) => Math.abs(Math.sin(t)));
    const table = s.body.find((b) => typeof b === 'string' && b.startsWith('| | Half-wave'));
    expect(table).toContain(`| ${Math.sqrt(hS / hA ** 2 - 1).toFixed(2)} |`);
    expect(table).toContain(`| ${Math.sqrt(fS / fA ** 2 - 1).toFixed(3)} |`);
    expect(table).toContain(`${((hA ** 2 / hS) * 100).toFixed(1)}%`);
    expect(table).toContain(`${((fA ** 2 / fS) * 100).toFixed(1)}%`);
    // The filtered curve never dips below the rectified one, and touches every peak.
    const [wave] = figures(s, 'plot');
    for (const x of [0.2, 0.9, 1.3, 2.7, 3.5]) expect(series(wave, 'filtered')(x)).toBeGreaterThanOrEqual(series(wave, 'rectified')(x) - 1e-12);
    for (const x of [0.5, 1.5, 2.5]) expect(series(wave, 'filtered')(x)).toBeCloseTo(1, 9);
  });

  it('Zener Regulators: currents, power, the RS range, the knee in the figure', () => {
    const s = section('Zener Regulators');
    const [basic, range] = s.examples;
    expect(said(basic)).toContain(`= ${(((15 - 9.1) / 200 - 0.02) * 1000).toFixed(1)}$ mA`);
    expect(said(basic)).toContain(`= ${((9.1 * (18 - 9.1)) / 200).toFixed(3)}$ W`);
    expect(said(range)).toContain(`= ${((12 - 6.8) / 0.035).toFixed(1)}$ Ω`);
    expect(said(range)).toContain(`= ${((0.5 / 6.8) * 1000).toFixed(1)}$ mA`);
    expect(said(range)).toContain(`= ${((16 - 6.8) / 0.0735).toFixed(1)}$ Ω`);
    const RL = 9.1 / 0.02;
    const knee = (9.1 * (200 + RL)) / RL;
    const [curve] = figures(s, 'plot');
    expect(RL).toBeCloseTo(455, 9);
    expect(curve.marks[0].at[0]).toBeCloseTo(knee, 9);
    expect(curve.series[0].f(knee - 0.01)).toBeLessThan(9.1);
    expect(curve.series[0].f(knee + 1)).toBe(9.1);
  });

  it('BJT Biasing: divider bias, base bias at two betas, and the load line', () => {
    const s = section('BJT Biasing');
    const [divider, base] = s.examples;
    const VTH = (15 * 8.2) / 47.2;
    const RTH = ((39 * 8.2) / 47.2) * 1000;
    const IE = (VTH - 0.7) / (1000 + RTH / 121);
    expect(said(divider)).toContain(`= ${VTH.toFixed(3)}$ V`);
    expect(said(divider)).toContain(`= ${(RTH / 1000).toFixed(3)}$ kΩ`);
    expect(said(divider)).toContain(`= ${(IE * 1000).toFixed(3)}$ mA`);
    expect(said(divider)).toContain(`= ${(15 - IE * 4300).toFixed(2)}$ V`);
    for (const [beta, VCE] of [[100, 5.65], [200, 1.21]]) {
      const IB = 11.3 / (470e3 + (beta + 1) * 1000);
      expect(said(base)).toContain(`= ${(IB * 1e6).toFixed(2)}$ µA`);
      expect(said(base)).toContain(`$I_C = ${(beta * IB * 1000).toFixed(3)}$ mA`);
      expect(12 - beta * IB * 2200 - (beta + 1) * IB * 1000).toBeCloseTo(VCE, 2);
    }
    const [curve] = figures(s, 'plot');
    const line = series(curve, 'load line');
    expect(line(0)).toBeCloseTo(15 / 4.3, 12);
    expect(line(15)).toBeCloseTo(0, 12);
    const [Q] = curve.marks;
    expect(Q.at[0]).toBeCloseTo(15 - IE * 4300, 3);
    expect(line(Q.at[0])).toBeCloseTo(Q.at[1], 2);
    expect(series(curve, 'I_B = 15 µA')(10)).toBeCloseTo(120 * 0.015, 6);
    expect(s.check[0].a).toContain(`= ${50 / 0.4}$`);
  });

  it('BJT Amplifiers: CE gains, an emitter follower, the gain curve', () => {
    const s = section('BJT Amplifiers');
    const [ce, cc] = s.examples;
    const re = 26 / 1.805;
    const RL = par(3300, 10000);
    expect(said(ce)).toContain(`= ${re.toFixed(1)}$ Ω`);
    expect(said(ce)).toContain(`= ${Math.round(RL)}$ Ω`);
    expect(said(ce)).toContain(`= -${Math.round(RL / re)}$`);
    expect(said(ce)).toContain(`= -${(RL / (re + 220)).toFixed(1)}$`);
    const R = par(2200, 1000);
    expect(said(cc)).toContain(`= ${R}$ Ω`);
    expect(said(cc)).toContain(`= ${(R / (13 + R)).toFixed(3)}$`);
    expect(said(cc)).toContain(`= ${((101 * (13 + R)) / 1000).toFixed(2)}$ kΩ`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(0)).toBeCloseTo(RL / re, 0);
    expect(curve.marks[0].at[1]).toBeCloseTo(RL / (re + 220), 1);
  });

  it('FETs and MOSFETs: self-bias by the quadratic and on the figure, an E-MOSFET', () => {
    const s = section('FETs and MOSFETs');
    const [jfet, mos] = s.examples;
    const disc = Math.sqrt(3.5 ** 2 - 4 * 0.3125 * 5);
    const vgs = (-3.5 + disc) / (2 * 0.3125);
    const other = (-3.5 - disc) / (2 * 0.3125);
    const id = 10 * (1 + vgs / 4) ** 2;
    expect(said(jfet)).toContain(`= ${vgs.toFixed(3)}$ V`);
    expect(said(jfet)).toContain(`${other.toFixed(2).replace("-", "−")} V`);
    expect(said(jfet)).toContain(`= ${id.toFixed(3)}$ mA`);
    expect(said(jfet)).toContain(`5(1 - ${(vgs / -4).toFixed(4)}) = ${(5 * (1 + vgs / 4)).toFixed(3)}$ mS`);
    expect(-vgs / 500).toBeCloseTo(id / 1000, 12);
    const [curve] = figures(s, 'plot');
    const [Q] = curve.marks;
    expect(series(curve, 'transfer curve')(Q.at[0])).toBeCloseTo(Q.at[1], 3);
    expect(series(curve, 'bias line')(Q.at[0])).toBeCloseTo(Q.at[1], 3);
    expect(series(curve, 'transfer curve')(0)).toBe(10);
    expect(said(mos)).toContain(`= ${0.5 * 3 ** 2}$ mA`);
    expect(said(mos)).toContain(`= ${15 - 4.5 * 2}$ V`);
    expect(said(mos)).toContain(`= ${2 * 0.5 * 3}$ mS`);
  });

  it('Frequency Response: corners, Miller, decibels, the response curve', () => {
    const s = section('Frequency Response');
    const [corner, db] = s.examples;
    expect(said(corner)).toContain(`= ${(1 / (2 * Math.PI * 1e4 * 1e-6)).toFixed(1)}$ Hz`);
    expect(said(db)).toContain(`= ${10 ** (40 / 20)}$`);
    expect(said(db)).toContain(`= ${(10 * Math.log10(20 / 0.001)).toFixed(1)}$ dBm`);
    expect(s.check[0].a).toContain(`= ${(20 * Math.log10(60)).toFixed(1)}$ dB`);
    expect(s.check[1].a).toContain(`= ${10 * Math.log10(100 / 0.001)}$ dB`);
    const [curve] = figures(s, 'plot');
    const f = curve.series[0].f;
    expect(f(1000)).toBeCloseTo(40, 1);
    expect(f(15.915)).toBeCloseTo(37, 1);
    expect(f(2e5)).toBeCloseTo(37, 1);
  });

  it('Multistage and Feedback Amplifiers: bandwidth shrinkage, feedback both ways, the figure', () => {
    const s = section('Multistage and Feedback Amplifiers');
    const [two, back] = s.examples;
    expect(said(two)).toContain(`= ${(100 * Math.sqrt(Math.SQRT2 - 1)).toFixed(1)}$ kHz`);
    expect(said(two)).toContain(`= ${(1e4 / 101).toFixed(1)}$`);
    const A = 200 / (1 - 200 * 0.004);
    expect(A).toBeCloseTo(1000, 9);
    expect(A / (1 + A * 0.004)).toBeCloseTo(200, 9);
    expect(back.answer).toContain('1000');
    const [curve] = figures(s, 'plot');
    const open = series(curve, 'open loop');
    const closed = series(curve, 'with feedback');
    expect(open(100)).toBeCloseTo(77, 0);
    expect(closed(10100)).toBeCloseTo(20 * Math.log10(1e4 / 101) - 3, 0);
    // Far above both corners the two curves meet: the same gain-bandwidth product.
    expect(closed(1e7)).toBeCloseTo(open(1e7), 1);
  });

  it('Operational Amplifiers: slew rate, bandwidth, an inverting stage, a Schmitt trigger', () => {
    const s = section('Operational Amplifiers');
    const [slew, board] = s.examples;
    expect(said(slew)).toContain(`= ${(0.5e6 / (2 * Math.PI * 10) / 1000).toFixed(2)}$ kHz`);
    expect(said(board)).toContain(`= ${(1e6 / 11 / 1000).toFixed(1)}$ kHz`);
    const beta = 10 / (10 + 40);
    expect(said(board)).toContain(`= ${beta}$`);
    expect(said(board)).toContain(`= \\pm${(beta * 12).toFixed(1)}$ V`);
    expect(board.answer).toContain(`${(2 * beta * 12).toFixed(1)} V of hysteresis`);
    expect(s.check[0].a).toContain(`= ${1 + 47 / 4.7}$`);
  });

  it('Oscillators: Wien, phase shift, Colpitts, Hartley, and the Wien peak', () => {
    const s = section('Oscillators');
    const [rc, lc] = s.examples;
    const fw = 1 / (2 * Math.PI * 1e4 * 1e-8);
    expect(said(rc)).toContain(`= ${(fw / 1000).toFixed(2)}$ kHz`);
    expect(said(rc)).toContain(`= ${Math.round(fw / Math.sqrt(6))}$ Hz`);
    expect(said(lc)).toContain(`= ${(1 / (2 * Math.PI * Math.sqrt(1e-4 * par(0.02e-6, 0.02e-6))) / 1000).toFixed(1)}$ kHz`);
    expect(said(lc)).toContain(`= ${(1 / (2 * Math.PI * Math.sqrt(1.2e-3 * 100e-12)) / 1000).toFixed(1)}$ kHz`);
    const [curve] = figures(s, 'plot');
    const b = curve.series[0].f;
    expect(b(1)).toBeCloseTo(1 / 3, 12);
    expect(b(0.9)).toBeLessThan(1 / 3);
    expect(b(1.1)).toBeLessThan(1 / 3);
  });

  it('Power Amplifiers: class B powers, the heat sink, the efficiency curves', () => {
    const s = section('Power Amplifiers');
    const [classB, sink] = s.examples;
    const Po = 12 ** 2 / 16;
    const Pdc = (2 * 15 * 12) / (Math.PI * 8);
    expect(said(classB)).toContain(`= ${Po}$ W`);
    expect(said(classB)).toContain(`= ${Pdc.toFixed(1)}$ W`);
    expect(said(classB)).toContain(`= ${((Po / Pdc) * 100).toFixed(1)}\\%$`);
    expect(said(classB)).toContain(`= ${((2 * 15 ** 2) / (Math.PI ** 2 * 8)).toFixed(2)}$ W`);
    expect(said(sink)).toContain(`= ${(125 / 5.7 - 2).toFixed(1)}$ °C/W`);
    const [curve] = figures(s, 'plot');
    expect(series(curve, 'class B')(1)).toBeCloseTo((Math.PI / 4) * 100, 9);
    expect(series(curve, 'class B')(12 / 15)).toBeCloseTo((Po / Pdc) * 100, 9);
    expect(series(curve, 'class A, transformer')(1)).toBe(50);
    expect(series(curve, 'class A, resistive')(1)).toBe(25);
  });
});
