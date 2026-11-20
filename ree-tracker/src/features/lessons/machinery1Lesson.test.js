// Electrical Machinery 1 in the module format (2026-11-20): every number in the
// topic's worked examples, checks and figures, worked again from the machine
// equations (the transformer phasors as complex numbers), so a slip in the text
// fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/electrical-machinery-1.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figures = (s, type) => s.body.filter((b) => typeof b !== 'string' && b.type === type);
const deg = Math.PI / 180;
const mu0 = 4 * Math.PI * 1e-7;
// Tip of a chain of phasors [mag, angle°].
const tip = (...vs) => vs.reduce(([x, y], [m, a]) => [x + m * Math.cos(a * deg), y + m * Math.sin(a * deg)], [0, 0]);

describe('Electrical Machinery 1, worked again', () => {
  it('Magnetic Circuits: stacking factor and a fringing gap', () => {
    const [stack, gap] = section('Magnetic Circuits').examples;
    expect(said(stack)).toContain(`= ${0.92 * 25}$ cm²`);
    const Bg = 2.3e-3 / (5.2 ** 2 * 1e-4);
    expect(said(gap)).toContain(`= ${(5.2 ** 2).toFixed(2)}$ cm²`);
    expect(said(gap)).toContain(`= ${Bg.toFixed(3)}$ T`);
    expect(said(gap)).toContain(`= ${Math.round((Bg / mu0) * 0.002)}$ A·t`);
  });

  it('Transformer Principles: flux, currents, core loss on 50 Hz, the no-load phasors', () => {
    const s = section('Transformer Principles and EMF Equation');
    const [basic, freq] = s.examples;
    expect(said(basic)).toContain(`= ${((2400 / (4.44 * 60 * 1000)) * 1000).toFixed(2)}$ mWb`);
    expect(said(basic)).toContain(`= ${(10000 / 2400).toFixed(2)}$ A`);
    const h = 120 * (50 / 60);
    const e = 60 * (50 / 60) ** 2;
    expect(said(freq)).toContain(`= ${h}$ W`);
    expect(said(freq)).toContain(`= ${e.toFixed(1)}$ W`);
    expect(freq.answer).toContain(`${(h + e).toFixed(1)} W`);
    // I0 closes the triangle of Ic and Im.
    const [diagram] = figures(s, 'phasor');
    const [, , ic, im, i0] = diagram.vectors;
    const [x, y] = tip([ic.mag, ic.angle], [im.mag, im.angle]);
    expect(i0.mag).toBeCloseTo(Math.hypot(x, y), 3);
    expect(i0.angle).toBeCloseTo(Math.atan2(y, x) / deg, 1);
    expect(im.mag).toBeCloseTo(Math.sqrt(2 ** 2 - (180 / 240) ** 2), 3);
  });

  it('Equivalent Circuit: impedance, per unit from both sides, short-circuit current', () => {
    const [basic, low] = section('Equivalent Circuit').examples;
    const Zpu = 2.5 / (2400 ** 2 / 50000);
    expect(said(basic)).toContain(`= ${Zpu.toFixed(4)}$`);
    expect(0.025 / (240 ** 2 / 50000)).toBeCloseTo(Zpu, 12);
    expect(said(low)).toContain(`= ${(240 ** 2 / 50000).toFixed(3)}$ Ω`);
    expect(said(low)).toContain(`= ${Math.round(50000 / 240 / Zpu)}$ A`);
  });

  it('Regulation and Efficiency: approximate and exact regulation, efficiency, all-day', () => {
    const s = section('Regulation and Efficiency');
    const [full, day] = s.examples;
    const I = 50000 / 2400;
    const approx = (I * (1.5 * 0.8 + 2 * 0.6)) / 2400;
    const [vr, vi] = tip([2400, 0], [I * 2.5, -36.87 + Math.atan2(2, 1.5) / deg]);
    const exact = (Math.hypot(vr, vi) - 2400) / 2400;
    expect(said(full)).toContain(`= ${(approx * 100).toFixed(2)}\\%$`);
    expect(said(full)).toContain(`$V_1 = ${Math.hypot(vr, vi).toFixed(1)}$ V, ${(exact * 100).toFixed(2)}%`);
    const cu = I ** 2 * 1.5;
    expect(said(full)).toContain(`= ${Math.round(cu)}$ W`);
    expect(said(full)).toContain(`= ${((40000 / (40180 + cu)) * 100).toFixed(2)}\\%$`);
    expect(said(full)).toContain(`= ${Math.sqrt(180 / 651).toFixed(3)}$`);
    const copper = 8 * 651 + (6 * 651) / 4;
    expect(said(day)).toContain(`= ${copper}$ Wh`);
    expect(said(day)).toContain(`= ${((440 / (440 + (copper + 4320) / 1000)) * 100).toFixed(2)}\\%$`);
    // The illustrative phasor diagram closes: V1 is the sum of the chain.
    const [diagram] = figures(s, 'phasor');
    const [v2, , ir, ix, v1] = diagram.vectors;
    const [x, y] = tip([v2.mag, v2.angle], [ir.mag, ir.angle], [ix.mag, ix.angle]);
    expect(v1.mag).toBeCloseTo(Math.hypot(x, y), 3);
    expect(v1.angle).toBeCloseTo(Math.atan2(y, x) / deg, 2);
    // The efficiency curve peaks at the marked load.
    const [curve] = figures(s, 'plot');
    const f = curve.series[0].f;
    const xm = curve.marks[0].x;
    expect(f(xm)).toBeGreaterThan(f(xm * 0.95));
    expect(f(xm)).toBeGreaterThan(f(xm * 1.05));
  });

  it('Open and Short Circuit Tests: the circuit and an efficiency', () => {
    const s = section('Open and Short Circuit Tests');
    const [tests, eff] = s.examples;
    const Im = Math.sqrt(4 - 0.75 ** 2);
    const Z = 52.1 / 20.8;
    const R = 651 / 20.8 ** 2;
    expect(said(tests)).toContain(`= ${Im.toFixed(3)}$ A`);
    expect(said(tests)).toContain(`= ${(240 / Im).toFixed(1)}$ Ω`);
    expect(said(tests)).toContain(`= ${Z.toFixed(3)}$ Ω`);
    expect(said(tests)).toContain(`= ${R.toFixed(3)}$ Ω`);
    expect(said(tests)).toContain(`= ${Math.sqrt(Z * Z - R * R).toFixed(2)}$ Ω`);
    const cu = 0.75 ** 2 * 651;
    expect(said(eff)).toContain(`= ${cu.toFixed(1)}$ W`);
    expect(said(eff)).toContain(`= ${((37500 / (37500 + 180 + cu)) * 100).toFixed(2)}\\%$`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(Math.sqrt(180 / 651))).toBeCloseTo(curve.marks[0].y, 9);
  });

  it('Autotransformers: rating, saving, winding currents', () => {
    const [basic, currents] = section('Autotransformers').examples;
    expect(said(basic)).toContain(`= ${10 * (1 + 2400 / 240)}$ kVA`);
    expect(said(basic)).toContain(`= ${(2400 / 2640).toFixed(3)}$`);
    expect(said(currents)).toContain(`= ${(10000 / 230).toFixed(2)}$ A`);
    expect(said(currents)).toContain(`= ${(10000 / 200 - 10000 / 230).toFixed(2)}$ A`);
    expect(said(currents)).toContain(`= ${(10 * (1 - 200 / 230)).toFixed(2)}$ kVA`);
    expect(said(currents)).toContain(`${(10 * (200 / 230)).toFixed(2)} kVA is conducted`);
  });

  it('Three-Phase Connections: line voltage, open delta, bank currents', () => {
    const s = section('Three-Phase Connections');
    const [basic, bank] = s.examples;
    expect(said(basic)).toContain(`= ${(Math.sqrt(3) * 240).toFixed(1)}$ V`);
    expect(said(basic)).toContain(`= ${(Math.sqrt(3) * 50).toFixed(1)}$ kVA`);
    const IH = 500000 / (Math.sqrt(3) * 13800);
    expect(said(bank)).toContain(`= ${IH.toFixed(2)}$ A`);
    expect(said(bank)).toContain(`= ${(IH / Math.sqrt(3)).toFixed(2)}$ A`);
    expect(said(bank)).toContain(`= ${(500000 / (Math.sqrt(3) * 480)).toFixed(1)}$ A`);
    expect(s.check[0].a).toContain(`= ${(80 / Math.sqrt(3)).toFixed(1)}$ kVA`);
  });

  it('Parallel Operation: the largest load, a circulating current, the figure', () => {
    const s = section('Parallel Operation');
    const [share, circ] = s.examples;
    const kB = 200 / 0.04 / (100 / 0.05 + 200 / 0.04);
    expect(kB).toBeCloseTo(5 / 7, 12);
    expect(said(share)).toContain(`= ${200 / kB}$ kVA`);
    const Ic = 4 / Math.hypot(0.04, 0.08);
    expect(said(circ)).toContain(`= ${Ic.toFixed(1)}$ A`);
    expect(said(circ)).toContain(`${((Ic / (100000 / 240)) * 100).toFixed(1)}%`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(280)).toBeCloseTo(200, 9);
    expect(curve.series[1].f(280)).toBeCloseTo(80, 9);
  });

  it('DC Generator Principles: EMF, a duplex winding, the commutated ripple', () => {
    const s = section('DC Generator Principles');
    const [emf, duplex] = s.examples;
    expect((4 * 0.02 * 500 * 1200) / (60 * 4)).toBe(200);
    expect(said(emf)).toContain('= 200$ V');
    expect(said(duplex)).toContain(`= ${((60 * 12 * 250) / (6 * 720 * 900)).toFixed(4)}$ Wb`);
    const [curve] = figures(s, 'plot');
    const two = curve.series[0].f;
    let lo = 1;
    for (let t = 0; t <= 360; t += 0.5) lo = Math.min(lo, two(t));
    expect(lo).toBeCloseTo(Math.SQRT1_2, 3);
  });

  it('DC Generator Characteristics: shunt and long-shunt EMF', () => {
    const s = section('DC Generator Characteristics');
    const [shunt, compound] = s.examples;
    expect(said(shunt)).toContain(`= ${(230 + 102 * 0.05).toFixed(1)}$ V`);
    expect(said(compound)).toContain(`= ${(250 + 82 * 0.1 + 2).toFixed(1)}$ V`);
    expect(s.check[0].a).toContain(`= ${(230 * 1.06).toFixed(1)}$ V`);
  });

  it('Armature Reaction and Commutation: ampere-turns, reactance voltage, the field figure', () => {
    const s = section('Armature Reaction and Commutation');
    const [at, react] = s.examples;
    expect(said(at)).toContain(`= ${((480 * 25 * 8) / 360).toFixed(1)}$ A·t`);
    expect(said(at)).toContain(`= ${Math.round(480 * 25 * (1 / 8 - 8 / 360))}$ A·t`);
    expect(said(react)).toContain(`= ${(1e-4 * 50) / 5e-4}$ V`);
    // The resultant is stronger under one tip of each pole and weaker under the other.
    const [curve] = figures(s, 'plot');
    const res = curve.series[0].f;
    const main = curve.series[1].f;
    expect(res(40) - main(40)).toBeGreaterThan(0.2);
    expect(res(140) - main(140)).toBeLessThan(-0.2);
    expect(res(90)).toBeCloseTo(main(90), 9);
  });

  it('DC Motor Torque and Speed: shunt and series motors, the checks', () => {
    const s = section('DC Motor Torque and Speed');
    const [shunt, series] = s.examples;
    const w = (2 * Math.PI * 1200) / 60;
    expect(said(shunt)).toContain(`= ${((210 * 50) / w).toFixed(1)}$ N·m`);
    expect(said(shunt)).toContain(`= ${Math.round((1200 * 204) / 210)}$ rpm`);
    expect(said(series)).toContain(`= ${Math.round(((900 * 225) / 220) * 2)}$ rpm`);
    expect(s.check[0].a).toContain(`${((10 * 745.7) / ((2 * Math.PI * 1750) / 60)).toFixed(1)}$ N·m`);
    const out = 40 * ((2 * Math.PI * 1450) / 60);
    expect(s.check[1].a).toContain(`output ${Math.round(out)} W`);
    expect(s.check[1].a).toContain(`${((out / 7200) * 100).toFixed(1)}%`);
  });

  it('DC Motor Starting and Control: starter, speed control, brush drop, the sawtooth', () => {
    const s = section('DC Motor Starting and Control');
    const [starter, control] = s.examples;
    expect(said(starter)).toContain(`= ${(220 / 60).toFixed(3)}$ Ω`);
    expect(said(starter)).toContain(`= ${(220 / 60 - 0.4).toFixed(3)}$ Ω`);
    const n = Math.log(220 / 60 / 0.4) / Math.log(1.5);
    expect(said(starter)).toContain(`= ${n.toFixed(2)}$`);
    expect(Math.ceil(n)).toBe(6);
    expect(said(control)).toContain(`= ${Math.round((1000 * 160) / 208)}$ rpm`);
    expect(said(control)).toContain(`= ${((120 - 2) / 75 - 0.15).toFixed(3)}$ Ω`);
    // The sawtooth starts at 60 A and never leaves the 40 to 60 A band until the last step.
    const [curve] = figures(s, 'plot');
    const f = curve.series[0].f;
    expect(f(0)).toBeCloseTo(60, 9);
    for (let e = 0; e < 0.85; e += 0.01) {
      expect(f(e)).toBeLessThanOrEqual(60 + 1e-9);
      expect(f(e)).toBeGreaterThanOrEqual(40 - 1e-9);
    }
  });

  it('Losses and Efficiency: Swinburne, maximum efficiency, separating core losses', () => {
    const s = section('Losses and Efficiency');
    const [swin, core] = s.examples;
    const Pc = 230 * 4 - 9 * 0.2;
    expect(said(swin)).toContain(`= ${Pc}$ W`);
    expect(said(swin)).toContain(`= ${(((11730 - Pc - 500) / 11730) * 100).toFixed(1)}\\%$`);
    expect(said(swin)).toContain(`= ${Math.sqrt(Pc / 0.2).toFixed(1)}$ A`);
    const B = 200 / 5e5;
    const A = (800 - 1e6 * B) / 1000;
    expect(500 * A + 2.5e5 * B).toBeCloseTo(300, 9);
    expect(said(core)).toContain(`= ${A * 1200 + B * 1200 ** 2}$ W`);
    const [curve] = figures(s, 'plot');
    const f = curve.series[0].f;
    const im = curve.marks[0].x;
    expect(im).toBeCloseTo(Math.sqrt(Pc / 0.2), 9);
    expect(f(im)).toBeGreaterThan(f(im - 5));
    expect(f(im)).toBeGreaterThan(f(im + 5));
  });
});
