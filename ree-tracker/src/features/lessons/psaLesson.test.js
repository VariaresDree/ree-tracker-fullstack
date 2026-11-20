// Power System Analysis in the module format (2026-11-20): every number in the
// topic's worked examples, checks and figures, worked again (complex arithmetic
// for the lines and faults, a matrix for Y-bus), so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/power-system-analysis.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figures = (s, type) => s.body.filter((b) => typeof b !== 'string' && b.type === type);
const deg = Math.PI / 180;
const thin = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');
const C = (re, im = 0) => ({ re, im });
const polar = (m, a) => C(m * Math.cos(a * deg), m * Math.sin(a * deg));
const add = (a, b) => C(a.re + b.re, a.im + b.im);
const sub = (a, b) => C(a.re - b.re, a.im - b.im);
const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const div = (a, b) => { const d = b.re ** 2 + b.im ** 2; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
const mag = (z) => Math.hypot(z.re, z.im);
const ang = (z) => Math.atan2(z.im, z.re) / deg;

describe('Power System Analysis, worked again', () => {
  it('Per-Unit System: change of base, zone bases, a line in per unit', () => {
    const s = section('Per-Unit System');
    const [gen, zone] = s.examples;
    expect(said(gen)).toContain(`= ${(0.15 * (13.2 / 13.8) ** 2 * 2).toFixed(3)}$ pu`);
    expect(said(gen)).toContain(`= ${(13.8 ** 2 / 100).toFixed(3)}$ Ω`);
    expect(said(gen)).toContain(`= ${(100 / (Math.sqrt(3) * 13.8)).toFixed(3)}$ kA`);
    expect(said(zone)).toContain(`= ${(138 ** 2 / 100).toFixed(1)}$ Ω`);
    expect(said(zone)).toContain(`= ${((100 / (Math.sqrt(3) * 138)) * 1000).toFixed(1)}$ A`);
    expect(said(zone)).toContain(`= ${(40 / (138 ** 2 / 100)).toFixed(3)}$ pu`);
    expect(s.check[0].a).toContain(`= ${69 ** 2 / 100}$ Ω`);
  });

  it('One-Line and Impedance Diagrams: a load impedance and a series total', () => {
    const [load, total] = section('One-Line and Impedance Diagrams').examples;
    const Z = 13.8 ** 2 / 10;
    expect(said(load)).toContain(`= ${Z.toFixed(2)}$ Ω`);
    expect(said(load)).toContain(`${(Z * 0.8).toFixed(2)} + j${(Z * 0.6).toFixed(2)}$ Ω`);
    expect(Z / 1.9044).toBeCloseTo(10, 9);
    const line = 40 / (138 ** 2 / 100);
    const Xg = 0.15 * (13.2 / 13.8) ** 2 * 2;
    expect(said(total)).toContain(`= ${(Number(Xg.toFixed(3)) + 0.1 + Number(line.toFixed(3))).toFixed(3)}$ pu`);
  });

  it('Line R, L and C: bundle reactance, skin effect, the reactance curves', () => {
    const s = section('Line Resistance, Inductance and Capacitance');
    const [bundle, skin] = s.examples;
    const gmr = Math.sqrt(0.0122 * 0.45);
    const Deq = 8 * Math.cbrt(2);
    expect(said(bundle)).toContain(`= ${gmr.toFixed(4)}$ m`);
    expect(said(bundle)).toContain(`= ${Deq.toFixed(2)}$ m`);
    expect(said(bundle)).toContain(`= ${(0.0754 * Math.log(Deq / gmr)).toFixed(3)}$ Ω/km`);
    // 0.0754 is 2π·60·2e-7 per km.
    expect(2 * Math.PI * 60 * 2e-7 * 1000).toBeCloseTo(0.0754, 4);
    const F = 0.0105 * 0.8 ** 2 * 60;
    const k = (1 + Math.sqrt(1 + F * F)) / 2;
    expect(said(skin)).toContain(`= ${F.toFixed(4)}$`);
    expect(said(skin)).toContain(`= ${k.toFixed(3)}$`);
    expect(said(skin)).toContain(`= ${(k * 0.05).toFixed(4)}$ Ω/km`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[1].f(Deq)).toBeCloseTo(0.0754 * Math.log(Deq / gmr), 12);
    for (let i = 1; i < 4; i++) expect(curve.series[i].f(8)).toBeLessThan(curve.series[i - 1].f(8));
  });

  it('Short, Medium and Long Lines: a short line, a nominal pi, the Ferranti curve', () => {
    const s = section('Short, Medium and Long Lines');
    const [short, medium] = s.examples;
    const I = 10e6 / (Math.sqrt(3) * 33000 * 0.8);
    const Vr = 33000 / Math.sqrt(3);
    const Vs = mag(add(C(Vr), mul(polar(I, -36.87), C(6, 12))));
    expect(said(short)).toContain(`= ${I.toFixed(1)}$ A`);
    expect(said(short)).toContain(`$\\lvert V_s\\rvert = ${thin(Math.round(Vs))}$ V`);
    expect(said(short)).toContain(`${((Vs * Math.sqrt(3)) / 1000).toFixed(2)} kV line`);
    expect(said(short)).toContain(`= ${(((Vs - Vr) / Vr) * 100).toFixed(2)}\\%$`);
    const loss = 3 * I * I * 6;
    expect(said(short)).toContain(`= ${(loss / 1000).toFixed(1)}$ kW`);
    expect(said(short)).toContain(`= ${((10e6 / (10e6 + loss)) * 100).toFixed(2)}\\%$`);
    const A = add(C(1), div(mul(C(0, 660e-6), C(4.5, 52.5)), C(2)));
    expect(said(medium)).toContain(`= ${A.re.toFixed(4)} + j${A.im.toFixed(4)}$`);
    expect(said(medium)).toContain(`= ${(230 / mag(A)).toFixed(1)}$ kV`);
    const [curve] = figures(s, 'plot');
    expect(curve.marks[0].label).toContain(curve.series[0].f(curve.marks[0].x).toFixed(2));
    expect(s.check[0].a).toContain(`= ${Math.round(230 ** 2 / 400)}$ MW`);
  });

  it('ABCD Constants: regulation, C, and AD - BC = 1', () => {
    const [reg, abcd] = section('ABCD Constants').examples;
    const Z = C(4.5, 52.5);
    const Y = C(0, 660e-6);
    const A = add(C(1), div(mul(Y, Z), C(2)));
    const Cc = mul(Y, add(C(1), div(mul(Y, Z), C(4))));
    expect(said(reg)).toContain(`= ${(240 / mag(A)).toFixed(1)}$ kV`);
    expect(said(reg)).toContain(`= ${(((240 / mag(A) - 220) / 220) * 100).toFixed(1)}\\%$`);
    expect(said(abcd)).toContain(`j${(Cc.im * 1e4).toFixed(3)} \\times 10^{-4}$ S`);
    const det = sub(mul(A, A), mul(Z, Cc));
    expect(det.re).toBeCloseTo(1, 12);
    expect(det.im).toBeCloseTo(0, 12);
  });

  it('Power Circle Diagrams: the peak at delta = beta, and a short line', () => {
    const s = section('Power Circle Diagrams');
    const [peak, short] = s.examples;
    const Pmax = 529 - 0.98 * 529 * Math.cos(84.9 * deg);
    expect(said(peak)).toContain(`= ${Pmax.toFixed(1)}$ MW`);
    const [curve] = figures(s, 'plot');
    const f = curve.series[0].f;
    expect(f(85)).toBeCloseTo(Pmax, 9);
    expect(f(84)).toBeLessThan(f(85));
    expect(f(86)).toBeLessThan(f(85));
    const lim = 138 ** 2 / 50;
    expect(said(short)).toContain(`= ${(lim * Math.sin(20 * deg)).toFixed(1)}$ MW`);
    expect(said(short)).toContain(`${lim.toFixed(1)} MW`);
  });

  it('Bus Admittance Matrix: elements, the whole matrix, and Z-bus from it', () => {
    const [two, whole] = section('Bus Admittance Matrix').examples;
    expect(said(two)).toContain('$Y_{11} = -j5 - j4 = -j9$');
    // The susceptance matrix from the branch reactances.
    const branches = [[0, 1, 0.2], [0, 2, 0.25], [1, 2, 0.1]];
    const B = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const [i, j, x] of branches) { B[i][i] -= 1 / x; B[j][j] -= 1 / x; B[i][j] += 1 / x; B[j][i] += 1 / x; }
    expect(B.map((row) => row.map((v) => Math.round(v)))).toEqual([[-9, 5, 4], [5, -15, 10], [4, 10, -14]]);
    expect(said(whole)).toContain('-9 & 5 & 4 \\\\ 5 & -15 & 10 \\\\ 4 & 10 & -14');
  });

  it('Load Flow: the DC estimate, one Gauss-Seidel step, the comparison curve', () => {
    const s = section('Load Flow');
    const [, gs] = s.examples;
    const V2 = mul(div(C(1), C(0, -10)), sub(C(-0.5, 0.2), mul(C(0, 10), C(1))));
    expect(V2.re).toBeCloseTo(0.98, 12);
    expect(V2.im).toBeCloseTo(-0.05, 12);
    expect(said(gs)).toContain(`= ${mag(V2).toFixed(4)}$ at $${ang(V2).toFixed(2)}°$`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[1].f(0.1 / deg)).toBeCloseTo(0.5, 12);
    expect(Math.abs(curve.series[0].f(10) - curve.series[1].f(10)) / curve.series[0].f(10)).toBeLessThan(0.01);
  });

  it('Symmetrical Faults: fault current, breaker ratings, the decay curve', () => {
    const s = section('Symmetrical Faults');
    const [fault, breaker] = s.examples;
    const Ib = 100 / (Math.sqrt(3) * 138);
    expect(said(fault)).toContain(`= ${(Ib * 1000).toFixed(1)}$ A`);
    expect(said(fault)).toContain(`= ${Math.round(2.5 * Ib * 1000)}$ A`);
    expect(said(breaker)).toContain(`= ${(Math.sqrt(3) * 13.8 * 6.5).toFixed(1)}$ MVA`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(0)).toBeCloseTo(1 / 0.2, 12);
    expect(curve.series[0].f(1e3)).toBeCloseTo(curve.marks[0].y, 12);
  });

  it('Symmetrical Components: a line-to-line set', () => {
    const [, ll] = section('Symmetrical Components').examples;
    const a = polar(1, 120);
    const a2 = polar(1, 240);
    const Ia = C(10);
    const Ib = C(-10);
    const I1 = div(add(Ia, mul(a, Ib)), C(3));
    const I2 = div(add(Ia, mul(a2, Ib)), C(3));
    expect(said(ll)).toContain(`= ${mag(I1).toFixed(3)}\\angle{${Math.round(ang(I1))}°}$ A`);
    expect(said(ll)).toContain(`= ${mag(I2).toFixed(3)}\\angle${Math.round(ang(I2))}°$ A`);
  });

  it('Unsymmetrical Faults: four faults at a bus, and in amperes', () => {
    const [four, amps] = section('Unsymmetrical Faults').examples;
    const par = (0.25 * 0.1) / 0.35;
    const Ia1 = 1 / (0.25 + par);
    const Ia0 = (-Ia1 * 0.25) / 0.35;
    expect(said(four)).toContain(`= ${(Math.sqrt(3) / 0.5).toFixed(2)}$ pu`);
    expect(said(four)).toContain(`= ${par.toFixed(4)}$`);
    expect(said(four)).toContain(`= ${Ia1.toFixed(2)}$`);
    expect(said(four)).toContain(`= -${(-Ia0).toFixed(2)}$`);
    expect(said(four)).toContain(`${(-3 * Ia0).toFixed(2)}$ pu`);
    const Ib = (100 / (Math.sqrt(3) * 13.8)) * 1000;
    expect(said(amps)).toContain(`= ${Math.round(Ib)}$ A`);
    expect(said(amps)).toContain(`= ${((5 * Ib) / 1000).toFixed(2)}$ kA`);
  });

  it('Stability and Equal Area: critical angle by the areas, time, acceleration', () => {
    const s = section('Stability and Equal Area');
    const [crit, accel] = s.examples;
    const d0 = Math.PI / 6;
    const dcr = Math.acos((Math.PI - 2 * d0) * Math.sin(d0) - Math.cos(d0));
    const dmax = Math.PI - d0;
    // Equal areas: accelerating (Pm - 0) from d0 to dcr = decelerating (2 sin - 1) from dcr to dmax.
    const accelArea = 1 * (dcr - d0);
    const decelArea = 2 * (Math.cos(dcr) - Math.cos(dmax)) - (dmax - dcr);
    expect(accelArea).toBeCloseTo(decelArea, 12);
    expect(said(crit)).toContain(`= ${(dcr / deg).toFixed(1)}°$`);
    expect(said(crit)).toContain(`= ${Math.sqrt((4 * 5 * (dcr - d0)) / 377).toFixed(3)}$ s`);
    expect(said(accel)).toContain(`= ${((377 / 10) * 0.6).toFixed(2)}$ rad/s²`);
    const [curve] = figures(s, 'plot');
    expect(curve.marks[2].x).toBeCloseTo(dcr / deg, 2);
  });

  it('Economic Dispatch: equal lambda, a unit at its limit', () => {
    const s = section('Economic Dispatch');
    const [two, limit] = s.examples;
    const lambda = (500 + 8 / 0.008 + 7.5 / 0.012) / (1 / 0.008 + 1 / 0.012);
    expect(lambda).toBeCloseTo(10.2, 12);
    expect(said(two)).toContain(`$P_1 = ${Math.round((lambda - 8) / 0.008)}$ MW, $P_2 = ${Math.round((lambda - 7.5) / 0.012)}$ MW`);
    expect(said(limit)).toContain(`= ${(8 + 0.008 * 300).toFixed(1)}$ ₱/MWh`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(275)).toBeCloseTo(curve.marks[0].y, 12);
    expect(curve.series[1].f(225)).toBeCloseTo(curve.marks[0].y, 12);
  });

  it('Voltage Control: a drop, a capacitor size, the compensation curve', () => {
    const s = section('Voltage Control');
    const [drop, cap] = s.examples;
    const V = 66 / Math.sqrt(3);
    const dV = (2 * (10 / 3) + 20 * (5 / 3)) / V;
    expect(said(drop)).toContain(`= ${dV.toFixed(2)}$ kV, ${((dV / V) * 100).toFixed(2)}%`);
    expect(said(cap)).toContain(`= ${500 * 0.02}$ Mvar`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(0.5)).toBeCloseTo(2, 12);
    expect(curve.series[0].f(2 / 3)).toBeCloseTo(3, 9);
  });

  it('Corona: critical voltage, loss, the loss curve', () => {
    const s = section('Corona');
    const [vd, loss] = s.examples;
    const Vd = 21.1 * 0.85 * Math.log(200);
    expect(said(vd)).toContain(`= ${Vd.toFixed(1)}$ kV phase, ${(Vd * Math.sqrt(3)).toFixed(1)} kV line`);
    const P = 241 * 85 * Math.sqrt(1 / 200) * (110 - Vd) ** 2 * 1e-5;
    expect(said(loss)).toContain(`= ${P.toFixed(2)}$ kW/km`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(110)).toBeCloseTo(P, 2);
    expect(curve.series[0].f(90)).toBe(0);
  });

  it('Sag and Tension: level span, unequal supports, the profile', () => {
    const s = section('Sag and Tension');
    const [level, unequal] = s.examples;
    const S = (6 * 300 ** 2) / (8 * 20000);
    expect(said(level)).toContain(`= ${S}$ m`);
    expect(said(level)).toContain(`= ${(300 + (8 * S * S) / 900).toFixed(2)}$ m`);
    const x1 = 150 - (20000 * 5) / (6 * 300);
    expect(said(unequal)).toContain(`= ${x1.toFixed(2)}$ m`);
    expect(said(unequal)).toContain(`= ${((6 * x1 * x1) / 40000).toFixed(3)}$ m`);
    expect(said(unequal)).toContain(`= ${((6 * (300 - x1) ** 2) / 40000).toFixed(3)}$ m`);
    expect((6 * (300 - x1) ** 2 - 6 * x1 * x1) / 40000).toBeCloseTo(5, 12);
    expect(said(unequal)).toContain(`= ${thin(Math.round(Math.hypot(20000, 900)))}$ N`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(150) - curve.series[0].f(0)).toBeCloseTo(S, 12);
  });
});
