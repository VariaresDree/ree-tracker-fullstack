// Electric Circuits 2 in the module format (2026-11-20): every number in the
// topic's worked examples, checks and figures, worked again from first
// principles (complex arithmetic, solvers, sampled waveforms), so a slip in the
// text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/electric-circuits-2.js';
import { sectionFor } from './lessonContent';
import { phasorEnds, samplesOf } from './figures/figureMath';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figures = (s, type) => s.body.filter((b) => typeof b !== 'string' && b.type === type);
const deg = Math.PI / 180;

// Complex numbers, just enough.
const C = (re, im = 0) => ({ re, im });
const polar = (m, a) => C(m * Math.cos(a * deg), m * Math.sin(a * deg));
const add = (...zs) => zs.reduce((s, z) => C(s.re + z.re, s.im + z.im), C(0));
const sub = (a, b) => C(a.re - b.re, a.im - b.im);
const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const div = (a, b) => { const d = b.re ** 2 + b.im ** 2; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
const mag = (z) => Math.hypot(z.re, z.im);
const ang = (z) => Math.atan2(z.im, z.re) / deg;
const a = polar(1, 120);
const a2 = polar(1, 240);

describe('Electric Circuits 2, worked again', () => {
  it('AC Power: one load, meter readings, two loads, and the power wave', () => {
    const s = section('AC Power (Real, Reactive, Apparent)');
    const [one, meter, two] = s.examples;
    const Z = Math.hypot(10, 5);
    const I = 230 / Z;
    expect(said(one)).toContain(`= ${Z.toFixed(2)}$ Ω`);
    expect(said(one)).toContain(`= ${I.toFixed(2)}$ A`);
    expect(said(one)).toContain(`${(I * I).toFixed(1)} \\times 10 = ${Math.round(I * I * 10)}$ W`);
    expect(said(one)).toContain(`= ${Math.round(I * I * 5)}$ var`);
    expect(said(one)).toContain(`= ${Math.round(230 * I)}$ VA`);
    expect(said(one)).toContain(`= ${(10 / Z).toFixed(3)}$ lagging`);
    expect(said(meter)).toContain(`= ${(1500 / 1840).toFixed(3)}$`);
    expect(said(meter)).toContain(`= ${Math.round(Math.sqrt(1840 ** 2 - 1500 ** 2))}$ var`);
    const Q = 5 * Math.tan(Math.acos(0.8)) - 3 * Math.tan(Math.acos(0.6));
    const S = Math.hypot(8, Q);
    expect(Q).toBeCloseTo(-0.25, 9);
    expect(said(two)).toContain(`= ${S.toFixed(3)}$ kVA`);
    expect(said(two)).toContain(`= ${(8 / S).toFixed(4)}$ leading`);
    expect(said(two)).toContain(`= ${((S * 1000) / 230).toFixed(2)}$ A`);
    // The plotted power's average is VI cos 60° = 0.25 (per unit of peaks).
    const [wave] = figures(s, 'plot');
    const p = samplesOf(wave.series[2], wave.x);
    const avg = p.slice(0, -1).reduce((sum, [, y]) => sum + y, 0) / (p.length - 1);
    expect(avg).toBeCloseTo(0.25, 3);
    expect(Math.min(...p.map(([, y]) => y))).toBeLessThan(0);
    expect(s.check[0].a).toContain(`${40 * 0.8} kW and ${40 * 0.6} kvar`);
  });

  it('Power Factor Correction: kvar, capacitance, the saving and a delta bank', () => {
    const [size, saving, bank] = section('Power Factor Correction').examples;
    const t1 = Math.tan(Math.acos(0.7));
    const t2 = Math.tan(Math.acos(0.95));
    const Qc = 100 * (t1 - t2);
    expect(said(size)).toContain(`= ${Qc.toFixed(2)}$ kvar`);
    const Cf = (Qc * 1000) / (2 * Math.PI * 60 * 230 ** 2);
    expect(size.answer).toContain(`${(Cf * 1000).toFixed(2)} mF`);
    const i1 = 100000 / (230 * 0.7);
    const i2 = 100000 / (230 * 0.95);
    expect(said(saving)).toContain(`= ${i1.toFixed(1)}$ A`);
    expect(said(saving)).toContain(`= ${i2.toFixed(1)}$ A`);
    expect(saving.answer).toContain(`${(100 * (1 - (i2 / i1) ** 2)).toFixed(1)}%`);
    const Q3 = 150 * (Math.tan(Math.acos(0.75)) - Math.tan(Math.acos(0.92)));
    expect(said(bank)).toContain(`= ${Q3.toFixed(2)}$ kvar`);
    const Cd = (Q3 * 1000) / (3 * 2 * Math.PI * 60 * 400 ** 2);
    expect(bank.answer).toContain(`${Math.round(Cd * 1e6)} µF`);
  });

  it('Maximum Power in AC', () => {
    const [both, fixed] = section('Maximum Power in AC').examples;
    expect(said(both)).toContain(`= ${(1e4 / 24).toFixed(1)}$ W`);
    expect(said(both)).toContain(`= ${(1e4 * 10) / (16 ** 2 + 8 ** 2)}$ W`);
    // The fixed-reactance optimum, by search as well as by formula.
    const P = (rl) => (2500 * rl) / ((4 + rl) ** 2 + 4 ** 2);
    const best = Array.from({ length: 20001 }, (_, i) => i / 1000).reduce((b, rl) => (P(rl) > P(b) ? rl : b), 0);
    expect(best).toBeCloseTo(Math.sqrt(32), 2);
    expect(said(fixed)).toContain(`= ${Math.sqrt(32).toFixed(3)}$ Ω`);
    expect(said(fixed)).toContain(`= ${P(Math.sqrt(32)).toFixed(1)}$ W`);
  });

  it('Series and Parallel Resonance', () => {
    const s = section('Series and Parallel Resonance');
    const [basic, magnified, tank] = s.examples;
    const w0 = 1 / Math.sqrt(0.1 * 1e-5);
    expect(w0).toBeCloseTo(1000, 9);
    expect(said(basic)).toContain(`= ${(w0 / (2 * Math.PI)).toFixed(1)}$ Hz`);
    expect(said(basic)).toContain(`(${(100 / (2 * Math.PI)).toFixed(2)} Hz)`);
    const w1 = Math.sqrt(w0 ** 2 + 50 ** 2) - 50;
    const w2 = Math.sqrt(w0 ** 2 + 50 ** 2) + 50;
    expect(said(magnified)).toContain(`${w1.toFixed(1)} and ${w2.toFixed(1)} rad/s`);
    expect(magnified.answer).toContain(`${(w1 / (2 * Math.PI)).toFixed(1)} Hz and ${(w2 / (2 * Math.PI)).toFixed(1)} Hz`);
    expect(w1 * w2).toBeCloseTo(w0 ** 2, 6);
    // At the half-power points the current really is 1/√2 of the peak.
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(w1)).toBeCloseTo(Math.SQRT1_2, 9);
    expect(curve.series[0].f(1000)).toBeCloseTo(1, 9);
    const wt = Math.sqrt(1 / (0.1 * 1e-5) - 20 ** 2 / 0.1 ** 2);
    expect(said(tank)).toContain(`= ${wt.toFixed(1)}$ rad/s, which is ${(wt / (2 * Math.PI)).toFixed(1)} Hz`);
    // The tank's impedance at that frequency is resistive and equals L/(RC).
    const w = wt;
    const Zp = div(C(1), add(div(C(1), C(20, w * 0.1)), C(0, w * 1e-5)));
    expect(Zp.re).toBeCloseTo(500, 6);
    expect(Zp.im).toBeCloseTo(0, 6);
  });

  it('Magnetically Coupled Circuits', () => {
    const [basic, measure, reflected] = section('Magnetically Coupled Circuits').examples;
    expect(said(basic)).toContain(`= ${(0.25 / Math.sqrt(0.1)).toFixed(3)}$`);
    expect(said(measure)).toContain(`= ${(0.2 / Math.sqrt(0.15)).toFixed(3)}$`);
    const refl = div(C(100 ** 2 * 0.1 ** 2), C(10, 20));
    expect(refl.re).toBeCloseTo(2, 12);
    expect(refl.im).toBeCloseTo(-4, 12);
    const Zin = add(C(2, 10), refl);
    expect(Zin.re).toBeCloseTo(4, 12);
    expect(Zin.im).toBeCloseTo(6, 12);
    expect(reflected.answer).toContain('4 + j6');
  });

  it('Balanced Three-Phase Systems', () => {
    const s = section('Balanced Three-Phase Systems');
    const [wye, delta] = s.examples;
    const I = 400 / Math.sqrt(3) / 10;
    expect(said(wye)).toContain(`I = ${I.toFixed(2)}$ A`);
    expect(Math.round(3 * I * I * 8)).toBe(12800);
    const Ip = 400 / 15;
    expect(said(delta)).toContain(`= ${Ip.toFixed(2)}$ A`);
    expect(said(delta)).toContain(`= ${(Math.sqrt(3) * Ip).toFixed(2)}$ A`);
    expect(Math.round(3 * Ip * Ip * 12)).toBe(25600);
    expect(Math.round(Math.sqrt(3) * 400 * Math.sqrt(3) * Ip * 0.8)).toBe(25600);
    expect(s.check[0].a).toContain((5e6 / (Math.sqrt(3) * 13800)).toFixed(1));
    // The line voltage in the figure is V_an − V_bn: √3 long at 30°.
    const vab = sub(polar(1, 0), polar(1, -120));
    expect(mag(vab)).toBeCloseTo(Math.sqrt(3), 12);
    expect(ang(vab)).toBeCloseTo(30, 9);
  });

  it('Unbalanced Three-Phase Systems: neutral current, a delta, a floating star point', () => {
    const s = section('Unbalanced Three-Phase Systems');
    const [neutral, delta, floating] = s.examples;
    const In = add(polar(10, 0), polar(10, -120), polar(5, 120));
    expect(mag(In)).toBeCloseTo(5, 12);
    expect(ang(In)).toBeCloseTo(-60, 9);
    expect(neutral.answer).toContain('5\\angle-60^\\circ');
    const [diagram] = figures(s, 'phasor');
    const ends = phasorEnds(diagram.vectors);
    expect(ends[2].end[0]).toBeCloseTo(ends[3].end[0], 9);
    expect(ends[2].end[1]).toBeCloseTo(ends[3].end[1], 9);
    const Ia = sub(C(10), polar(6, 120));
    expect(said(delta)).toContain(`${Ia.re.toFixed(0)} - j${(-Ia.im).toFixed(3)}`);
    expect(delta.answer).toContain(`${mag(Ia).toFixed(1)}\\angle${ang(Ia).toFixed(2)}`);
    const Vp = 208 / Math.sqrt(3);
    const Va = polar(Vp, 0);
    const Vb = polar(Vp, -120);
    const Vc = polar(Vp, 120);
    const shift = div(add(mul(Va, C(0.1)), mul(Vb, C(0.05)), mul(Vc, C(0.05))), C(0.2));
    expect(mag(shift)).toBeCloseTo(0.25 * Vp, 9);
    expect(said(floating)).toContain(`${mag(shift).toFixed(2)}\\angle0^\\circ`);
    expect(said(floating)).toContain(`${mag(sub(Va, shift)).toFixed(2)}$ V`);
    expect(said(floating)).toContain(`${mag(sub(Vb, shift)).toFixed(1)} V`);
    expect(mag(sub(Vc, shift))).toBeCloseTo(mag(sub(Vb, shift)), 9);
  });

  it('Three-Phase Power Measurement', () => {
    const s = section('Three-Phase Power Measurement');
    const [basic, predict, negative] = s.examples;
    const th = Math.atan(Math.sqrt(3) * 4 / 12) / deg;
    expect(th).toBeCloseTo(30, 9);
    expect(basic.answer).toContain(Math.cos(th * deg).toFixed(3));
    const Q = 30 * Math.tan(Math.acos(0.6));
    const diff = Q / Math.sqrt(3);
    expect(said(predict)).toContain(`= ${diff.toFixed(2)}$ kW`);
    expect(predict.answer).toContain(`${((30 + diff) / 2).toFixed(2)} kW and ${((30 - diff) / 2).toFixed(2)} kW`);
    // The readings from the formulas, at the same θ, agree (per unit of V_L I_L).
    const VI = 30 / (Math.sqrt(3) * 0.6);
    expect(VI * Math.cos((30 - 53.1301) * deg)).toBeCloseTo((30 + diff) / 2, 2);
    const Qn = Math.sqrt(3) * (6 + 2);
    expect(said(negative)).toContain(`= ${Qn.toFixed(2)}$ kvar`);
    const thn = Math.atan(Qn / 4) / deg;
    expect(said(negative)).toContain(`\\theta = ${thn.toFixed(1)}^\\circ`);
    expect(negative.answer).toContain(Math.cos(thn * deg).toFixed(3));
    const [plot] = figures(s, 'plot');
    expect(plot.series[1].f(60)).toBeCloseTo(0, 12);
  });

  it('Symmetrical Components', () => {
    const [, currents] = section('Symmetrical Components').examples;
    const [Ia, Ib, Ic] = [polar(10, 0), polar(10, -120), polar(5, 120)];
    const third = (z) => C(z.re / 3, z.im / 3);
    const I0 = third(add(Ia, Ib, Ic));
    const I1 = third(add(Ia, mul(a, Ib), mul(a2, Ic)));
    const I2 = third(add(Ia, mul(a2, Ib), mul(a, Ic)));
    expect(currents.answer).toContain(`${mag(I0).toFixed(3)}\\angle${ang(I0).toFixed(0)}`);
    expect(currents.answer).toContain(`${mag(I1).toFixed(3)}\\angle0`);
    expect(ang(I1)).toBeCloseTo(0, 9);
    expect(currents.answer).toContain(`${mag(I2).toFixed(3)}\\angle${ang(I2).toFixed(0)}`);
    const back = add(I0, I1, I2);
    expect(back.re).toBeCloseTo(10, 9);
    expect(back.im).toBeCloseTo(0, 9);
    expect(mag(add(C(1), a, a2))).toBeCloseTo(0, 12);
  });

  it('Non-Sinusoidal Waves and Fourier: the table, the examples and the plot', () => {
    const s = section('Non-Sinusoidal Waves and Fourier');
    const [rms, heat, power] = s.examples;
    expect(said(rms)).toContain(`= ${Math.hypot(10, 100, 30).toFixed(1)}$ V`);
    expect(said(heat)).toContain(`= ${Math.sqrt(141).toFixed(2)}$ A`);
    expect(power.answer).toContain(`${Math.round(500 + 1000 * Math.cos(30 * deg) + 100 * Math.cos(60 * deg))}$ W`);
    // The table, from the waves themselves (peak 1, sampled over one period).
    const N = 200000;
    const stats = (f) => {
      let sum = 0;
      let sq = 0;
      for (let k = 0; k < N; k++) { const y = f((k + 0.5) / N); sum += Math.abs(y); sq += y * y; }
      return { avg: sum / N, rms: Math.sqrt(sq / N) };
    };
    const half = stats((t) => Math.max(0, Math.sin(2 * Math.PI * t)));
    expect(half.avg).toBeCloseTo(0.318, 3);
    expect(half.rms).toBeCloseTo(0.5, 3);
    const tri = stats((t) => 1 - 4 * Math.abs(t - 0.5));
    expect(tri.avg).toBeCloseTo(0.5, 3);
    expect(tri.rms).toBeCloseTo(0.577, 3);
    const table = s.body.find((b) => typeof b === 'string' && b.includes('Form factor'));
    expect(table).toContain('1.57');
    expect(table).toContain('1.155');
    expect(s.check[0].a).toContain(`${(20 / Math.PI).toFixed(2)} A and ${(10 / Math.SQRT2).toFixed(2)} A`);
  });

  it('Two-Port Networks', () => {
    const [, abcd] = section('Two-Port Networks').examples;
    const [z11, z12, z21, z22] = [8, 6, 6, 9];
    const A = z11 / z21;
    const B = (z11 * z22 - z12 * z21) / z21;
    const Cc = 1 / z21;
    const D = z22 / z21;
    expect(A * D - B * Cc).toBeCloseTo(1, 12);
    expect(abcd.answer).toContain(`A = ${A.toFixed(3)}, B = ${B} Ω, C = ${Cc.toFixed(4)} S, D = ${D}`);
  });

  it('Laplace in Circuits: the coil example, by its differential equation', () => {
    const s = section('Laplace in Circuits');
    const [, coil] = s.examples;
    const i = (t) => 5 - 3 * Math.exp(-20 * t);
    // L di/dt + R i = 50 with i(0) = 2.
    const h = 1e-6;
    for (const t of [0.01, 0.05, 0.2]) expect(0.5 * (i(t + h) - i(t - h)) / (2 * h) + 10 * i(t)).toBeCloseTo(50, 4);
    expect(i(0)).toBe(2);
    expect(coil.answer).toContain('5 - 3e^{-20t}');
    const [plot] = figures(s, 'plot');
    expect(plot.series[0].f(0.1)).toBeCloseTo(i(0.1), 12);
    // Initial and final values of (3s + 6)/(s(s + 3)).
    const sF = (x) => (3 * x + 6) / (x + 3);
    expect(sF(1e9)).toBeCloseTo(3, 6);
    expect(sF(0)).toBe(2);
  });

  it('Filters', () => {
    const s = section('Filters');
    const [lp, hp] = s.examples;
    const fc = 1 / (2 * Math.PI * 1e3 * 1e-6);
    expect(said(lp)).toContain(`= ${fc.toFixed(1)}$ Hz`);
    const g = 1 / Math.sqrt(101);
    expect(said(lp)).toContain(`= ${g.toFixed(4)}$`);
    expect(said(lp)).toContain(`= ${(20 * Math.log10(g)).toFixed(2)}$ dB`);
    expect(said(hp)).toContain(`= ${Math.round(1 / (2 * Math.PI * 1000 * 1e-7))}$ Ω`);
    const gh = 0.25 / Math.sqrt(1.0625);
    expect(said(hp)).toContain(`= ${gh.toFixed(4)}$`);
    expect(said(hp)).toContain(`${(20 * Math.log10(gh)).toFixed(2).replace('-', '−')} dB`);
    const [bode] = figures(s, 'plot');
    expect(bode.series[0].f(fc)).toBeCloseTo(-3.0103, 3);
    expect(bode.series[0].f(fc * 10)).toBeCloseTo(-20.04, 2);
    expect(s.check[0].a).toContain((20 * Math.log10(0.5)).toFixed(2));
  });
});
