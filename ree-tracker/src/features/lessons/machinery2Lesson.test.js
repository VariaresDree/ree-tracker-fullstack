// Electrical Machinery 2 in the module format (2026-11-20): every number in the
// topic's worked examples, checks and figures, worked again from the machine
// equations (phasors as complex numbers), so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/electrical-machinery-2.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figures = (s, type) => s.body.filter((b) => typeof b !== 'string' && b.type === type);
const deg = Math.PI / 180;
const sin = (x) => Math.sin(x * deg);
const cos = (x) => Math.cos(x * deg);
// Complex numbers, just enough.
const C = (re, im = 0) => ({ re, im });
const polar = (m, a) => C(m * cos(a), m * sin(a));
const add = (a, b) => C(a.re + b.re, a.im + b.im);
const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const mag = (z) => Math.hypot(z.re, z.im);
const tip = (...vs) => vs.reduce((z, [m, a]) => add(z, polar(m, a)), C(0));
// The worked induction motor.
const V = 460 / Math.sqrt(3);
const ws = (2 * Math.PI * 1800) / 60;
const T = (s, R2 = 0.25) => (3 * V * V * (R2 / s)) / (ws * ((0.3 + R2 / s) ** 2 + 0.81));

describe('Electrical Machinery 2, worked again', () => {
  it('Synchronous Generator Principles: winding factors, EMFs, the pitch-factor figure', () => {
    const s = section('Synchronous Generator Principles');
    const [basic, board] = s.examples;
    const kp = sin(75);
    const kd = sin(30) / (4 * sin(7.5));
    expect(said(basic)).toContain(`= ${kp.toFixed(3)}$`);
    expect(said(basic)).toContain(`= ${kd.toFixed(3)}$`);
    expect(said(basic)).toContain(`= ${Math.round(4.44 * cos(15) * kd * 60 * 96 * 0.04)}$ V`);
    expect(said(board)).toContain(`= ${Math.abs(sin(375)).toFixed(3)}$`);
    expect(said(board)).toContain(`= ${Math.abs(sin(525)).toFixed(3)}$`);
    const E = 2.22 * kp * kd * 60 * 240 * 0.05;
    expect(said(board)).toContain(`= ${Math.round(E)}$ V`);
    expect(said(board)).toContain(`= ${Math.round(Math.sqrt(3) * E)}$ V`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[1].f(curve.marks[0].x)).toBeCloseTo(0, 12);
    expect(s.check[0].a).toContain(`= ${(120 * 60) / 300}$`);
  });

  it('Voltage Regulation: lagging and leading, from test data, the phasors and the curve', () => {
    const s = section('Voltage Regulation');
    const [basic, test] = s.examples;
    const lag = add(C(1000), mul(polar(100, -36.87), C(0.2, 4)));
    const lead = add(C(1000), mul(polar(100, 36.87), C(0.2, 4)));
    expect(said(basic)).toContain(`= ${Math.round(lag.re)} + j${Math.round(lag.im)}$`);
    expect(said(basic)).toContain(`= ${Math.round(mag(lag))}$ V: VR $= ${((mag(lag) - 1000) / 10).toFixed(1)}\\%$`);
    expect(said(basic)).toContain(`= ${Math.round(lead.re)} + j${Math.round(lead.im)}$`);
    expect(said(basic)).toContain(`VR $= -${(-(mag(lead) - 1000) / 10).toFixed(1)}\\%$`);
    const Eoc = 2300 / Math.sqrt(3);
    const Zs = Eoc / 200;
    const Xs = Math.sqrt(Zs ** 2 - 0.45 ** 2);
    const E = mag(add(C(Eoc), mul(polar(100, -36.87), C(0.45, Xs))));
    expect(said(test)).toContain(`= ${Zs.toFixed(3)}$ Ω`);
    expect(said(test)).toContain(`= ${Xs.toFixed(3)}$ Ω`);
    expect(said(test)).toContain(`= ${Math.round(E)}$ V`);
    expect(said(test)).toContain(`= ${(((E - Eoc) / Eoc) * 100).toFixed(1)}\\%$`);
    // The phasor chain closes on E, and the curve matches the worked points.
    const [diagram] = figures(s, 'phasor');
    const [v, , ir, ix, e] = diagram.vectors;
    const end = tip([v.mag, v.angle], [ir.mag, ir.angle], [ix.mag, ix.angle]);
    expect(e.mag).toBeCloseTo(mag(end), 0);
    expect(e.angle).toBeCloseTo(Math.atan2(end.im, end.re) / deg, 1);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(36.87)).toBeCloseTo((mag(lag) - 1000) / 10, 6);
    expect(curve.series[0].f(-36.87)).toBeCloseTo((mag(lead) - 1000) / 10, 6);
    expect(s.check[1].a).toContain(`= ${(1.5 * 0.4).toFixed(1)}$ Ω`);
  });

  it('Parallel Operation: droop sharing, power angle, synchronizing power, both figures', () => {
    const s = section('Parallel Operation of Alternators');
    const [droop, angle] = s.examples;
    const P2 = 3 / 1.5;
    expect(said(droop)).toContain(`$P_2 = ${P2.toFixed(1)}$ MW, $P_1 = ${(2.5 - P2).toFixed(1)}$ MW`);
    const [lines, pa] = figures(s, 'plot');
    expect(lines.series[0].f(0.5)).toBeCloseTo(60.5, 12);
    expect(lines.series[1].f(2)).toBeCloseTo(60.5, 12);
    const Pm = (3 * 2800 * 2400) / 5 / 1e6;
    expect(said(angle)).toContain(`= ${Pm.toFixed(3)}$ MW`);
    expect(said(angle)).toContain(`= ${(Pm * sin(25)).toFixed(2)}$ MW`);
    expect(said(angle)).toContain(`= ${(Pm * cos(25)).toFixed(3)}$ MW`);
    expect(angle.answer).toContain(`${(Pm * cos(25) * deg * 1000).toFixed(1)} kW per degree`);
    expect(pa.series[0].f(90)).toBeCloseTo(Pm, 9);
  });

  it('Synchronous Motors and V-Curves: unity pf, over-excited, the V-curve minimum', () => {
    const s = section('Synchronous Motors and V-Curves');
    const [unity, over] = s.examples;
    const I = 300000 / (3 * 2400);
    expect(said(unity)).toContain(`= ${I.toFixed(2)}$ A`);
    expect(said(unity)).toContain(`= ${Math.round(Math.hypot(2400, I * 6))}$ V`);
    const d = Math.asin(250 / 2800) / deg;
    const Io = Math.hypot(2400 - 2800 * cos(d), 250) / 6;
    const pf = 100000 / (2400 * Io);
    expect(said(over)).toContain(`= ${d.toFixed(2)}°$`);
    expect(said(over)).toContain(`= ${Io.toFixed(1)}$ A`);
    expect(said(over)).toContain(`= ${pf.toFixed(3)}$ leading`);
    expect(said(over)).toContain(`= ${Math.round((3 * 2400 * Io * Math.sqrt(1 - pf * pf)) / 1000)}$ kvar`);
    const [curve] = figures(s, 'plot');
    const f = curve.series[0].f;
    const Em = curve.marks[0].x;
    expect(f(Em)).toBeCloseTo(I, 6);
    expect(f(Em - 50)).toBeGreaterThan(f(Em));
    expect(f(Em + 50)).toBeGreaterThan(f(Em));
    expect(f(2800)).toBeCloseTo(Io, 6);
  });

  it('Power Factor Correction: a condenser, a correcting motor, the triangle closes', () => {
    const s = section('Power Factor Correction with Synchronous Machines');
    const [cond, motor] = s.examples;
    const q1 = 1000 * Math.tan(Math.acos(0.75));
    const q2 = 1000 * Math.tan(Math.acos(0.9));
    expect(said(cond)).toContain(`= ${q1.toFixed(1)}$ kvar`);
    expect(said(cond)).toContain(`= ${q2.toFixed(1)}$ kvar`);
    expect(said(cond)).toContain(`= ${(q1 - q2).toFixed(1)}$ kvar`);
    expect(cond.answer).toContain(`${Math.round(1000 / 0.75 - 1000 / 0.9)} kVA freed`);
    const Ql = 400 * Math.tan(Math.acos(0.7));
    const target = 500 * Math.tan(Math.acos(0.95));
    const Qm = Ql - target;
    expect(said(motor)).toContain(`= ${Ql.toFixed(1)}$ kvar`);
    expect(said(motor)).toContain(`= ${target.toFixed(1)}$ kvar`);
    expect(said(motor)).toContain(`= ${Qm.toFixed(1)}$ kvar`);
    expect(said(motor)).toContain(`= ${Math.hypot(100, Qm).toFixed(1)}$ kVA`);
    expect(said(motor)).toContain(`= ${(100 / Math.hypot(100, Qm)).toFixed(3)}$ leading`);
    const [tri] = figures(s, 'phasor');
    const [load, m, total] = tri.vectors;
    const end = tip([load.mag, load.angle], [m.mag, m.angle]);
    expect(total.mag).toBeCloseTo(mag(end), 0);
    expect(total.angle).toBeCloseTo(Math.atan2(end.im, end.re) / deg, 1);
  });

  it('Induction Motor Slip and Torque: torques, rotor quantities, the torque curve', () => {
    const s = section('Induction Motor Slip and Torque');
    const [circuit, rotor] = s.examples;
    const sm = 0.25 / Math.sqrt(0.9);
    expect(said(circuit)).toContain(`= ${V.toFixed(1)}$ V`);
    expect(said(circuit)).toContain(`= ${T(0.04).toFixed(1)}$ N·m`);
    expect(said(circuit)).toContain(`= ${sm.toFixed(3)}$`);
    expect(said(circuit)).toContain(`= ${T(sm).toFixed(1)}$ N·m`);
    expect(said(circuit)).toContain(`= ${T(1).toFixed(1)}$ N·m`);
    expect(said(rotor)).toContain(`= ${(3.6 / Math.hypot(0.08, 0.018)).toFixed(1)}$ A`);
    const [curve] = figures(s, 'plot');
    // Doubling R2 keeps the peak, at twice the slip.
    expect(curve.series[1].f(1800 * (1 - 2 * sm))).toBeCloseTo(T(sm), 6);
    expect(curve.marks[0].y).toBeCloseTo(T(sm), 1);
    expect(s.check[1].a).toContain(`= 3\\%$`);
  });

  it('Equivalent Circuit: power stages two ways', () => {
    const [basic, flow] = section('Equivalent Circuit').examples;
    expect(said(basic)).toContain(`= ${Math.round(40000 / ws)}$ N·m`);
    const Pg = 50 - 1.5 - 1;
    expect(said(flow)).toContain(`= ${Pg}$ kW`);
    expect(said(flow)).toContain(`= ${(0.04 * Pg).toFixed(1)}$ kW`);
    expect(said(flow)).toContain(`= ${(0.96 * Pg).toFixed(1)}$ kW`);
    expect(said(flow)).toContain(`= ${((((0.96 * Pg - 0.8) / 50) * 100)).toFixed(1)}\\%$`);
  });

  it('Starting Methods: torque ratios, the wound-rotor resistance, the curves', () => {
    const s = section('Starting Methods');
    const [ratios, wound] = s.examples;
    const dol = 36 * 0.03;
    expect(said(ratios)).toContain(`= ${dol.toFixed(2)}$`);
    expect(said(ratios)).toContain(`= ${(dol / 3).toFixed(2)}$`);
    expect(said(ratios)).toContain(`= ${(0.65 ** 2 * dol).toFixed(3)}$`);
    const Rt = Math.sqrt(0.9);
    expect(said(wound)).toContain(`= ${Rt.toFixed(3)}$ Ω`);
    expect(said(wound)).toContain(`= ${(Rt - 0.25).toFixed(3)}$ Ω`);
    expect(T(1, Rt)).toBeCloseTo(T(0.25 / Rt), 9);
    const [curve] = figures(s, 'plot');
    expect(curve.series[1].f(0) / curve.series[0].f(0)).toBeCloseTo(0.4225, 9);
    expect(curve.series[2].f(0) / curve.series[0].f(0)).toBeCloseTo(1 / 3, 9);
  });

  it('Speed Control: rotor resistance, a drive, voltage control, the drive curves', () => {
    const s = section('Speed Control');
    const [basic, volt] = s.examples;
    expect(said(basic)).toContain(`= ${1800 * 0.94}$ rpm`);
    const sv = 0.03 / 0.81;
    expect(said(volt)).toContain(`= ${sv.toFixed(4)}$`);
    expect(said(volt)).toContain(`= ${Math.round(1800 * (1 - sv))}$ rpm`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(1764)).toBeCloseTo(T(0.02), 6);
    expect(curve.series[2].f(900)).toBeCloseTo(0, 9);
    expect(s.check[0].a).toContain(`= ${(120 * 60) / 10}$ rpm`);
  });

  it('Single-Phase Motors: slips, the capacitor, zero torque at standstill', () => {
    const s = section('Single-Phase Motors');
    const [slips, cap] = s.examples;
    expect(said(slips)).toContain(`= ${(1800 - 1710) / 1800}$`);
    const Xc = 2 + (9 * 2) / 3.5;
    expect(said(cap)).toContain(`= ${Xc.toFixed(2)}$ Ω`);
    expect(said(cap)).toContain(`= ${Math.round(1e6 / (2 * Math.PI * 60 * Xc))}$ µF`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(0)).toBeCloseTo(0, 12);
    expect(curve.series[0].f(0.6)).toBeGreaterThan(0);
  });

  it('Special Machines: steppers and the staircase', () => {
    const s = section('Special Machines (Stepper, Servo)');
    const [hybrid, vr] = s.examples;
    expect(said(hybrid)).toContain(`= ${(1.8 * 400) / 6}$ rpm`);
    const step = ((12 - 8) / 96) * 360;
    expect(said(vr)).toContain(`= ${step}°$`);
    expect(said(vr)).toContain(`= ${(step * 300) / 6}$ rpm`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(20)).toBeCloseTo(8 * 1.8, 9);
    expect(s.check[1].a).toContain(`= ${(3 * 360) / 7.5}$`);
  });

  it('Machine Testing: blocked rotor, no load, SCR from the figure', () => {
    const s = section('Machine Testing and Efficiency');
    const [br, nl] = s.examples;
    const R = 1500 / (3 * 400);
    const Z = 48 / (Math.sqrt(3) * 20);
    expect(said(br)).toContain(`= ${Z.toFixed(3)}$ Ω`);
    expect(said(br)).toContain(`= ${Math.sqrt(Z * Z - R * R).toFixed(3)}$ Ω`);
    expect(said(nl)).toContain(`= ${3 * 64 * 0.5}$ W`);
    expect(said(nl)).toContain(`= ${900 - 96}$ W`);
    const [curve] = figures(s, 'plot');
    const ifOc = Math.atanh(1 / 1.25);
    const ifSc = 1 / 0.6;
    expect(curve.series[0].f(ifOc)).toBeCloseTo(1, 12);
    expect(curve.series[1].f(ifSc)).toBeCloseTo(1, 12);
    expect(said(nl)).toContain(`\\frac{${ifOc.toFixed(2)}}{${ifSc.toFixed(2)}} = ${(ifOc / ifSc).toFixed(2)}$`);
  });
});
