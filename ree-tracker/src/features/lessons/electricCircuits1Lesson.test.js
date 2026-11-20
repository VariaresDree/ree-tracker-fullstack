// Electric Circuits 1 in the module format (pilot 2026-11-19, the rest 2026-11-20): every number in the
// topic's worked examples, checks, tables and figures (the pilot's four, then the rest), worked
// again from the circuit, so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/electric-circuits-1.js';
import { sectionFor } from './lessonContent';
import { phasorEnds } from './figures/figureMath';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figures = (s, type) => s.body.filter((b) => typeof b !== 'string' && b.type === type);

describe('Electric Circuits 1 pilot, worked again', () => {
  it('Voltage and Current Laws: the dividers and the mixed circuit', () => {
    const [divider, current, mixed] = section('Voltage and Current Laws').examples;
    const I = 12 / (2000 + 4000);
    expect(I * 1000).toBe(2);
    expect(divider.answer).toContain(`V_2 = ${I * 4000}$`);
    const I1 = (6 * 6) / (3 + 6);
    expect(current.answer).toContain(`I_1 = ${I1}$`);
    expect(current.answer).toContain(`I_2 = ${6 - I1}$`);
    expect(I1 * 3).toBe((6 - I1) * 6);
    const Rp = (6 * 12) / (6 + 12);
    const IT = 24 / (4 + Rp);
    expect(said(mixed)).toContain(`I_T = \\frac{24}{8} = ${IT}$`);
    expect(mixed.answer).toMatch(new RegExp(`^${IT * (6 / 18)} A`));
    const [threeEqual, kvl] = section('Voltage and Current Laws').check;
    expect(threeEqual.a).toContain(`${12 / (6 / 3)} Ω`);
    expect(kvl.a).toContain(`${10 + 3 + 5}$ V`);
  });

  it('Nodal Analysis: one node by KCL, two by the conductance matrix', () => {
    const [one, two] = section('Nodal Analysis').examples;
    // (v − 12)/2 + v/4 = 3
    const v = (3 + 12 / 2) / (1 / 2 + 1 / 4);
    expect(one.answer).toContain(`v_A = ${v}$`);
    expect((v - 12) / 2).toBe(0);
    const [gAA, gBB, gAB] = [1 / 2 + 1 / 4 + 1 / 3, 1 / 3 + 1 / 6, 1 / 3];
    const det = gAA * gBB - gAB * gAB;
    expect(det).toBeCloseTo(31 / 72, 12);
    const vA = (6 * gBB + gAB * 1) / det;
    const vB = (gAA * 1 + gAB * 6) / det;
    expect(vA).toBeCloseTo(240 / 31, 12);
    expect(vB).toBeCloseTo(222 / 31, 12);
    expect(two.answer).toContain(`v_A = ${vA.toFixed(2)}$`);
    expect(two.answer).toContain(`v_B = ${vB.toFixed(2)}$`);
    // The KCL check at B, as the step writes it.
    expect(said(two)).toContain(`= ${((vA - vB) / 3).toFixed(3)}$`);
    expect(said(two)).toContain(`= ${(vB / 6).toFixed(3)}$`);
    expect((vA - vB) / 3 + 1).toBeCloseTo(vB / 6, 9);
  });

  it('RL and RC Circuits: the charging curve, the coil and the Thévenin time constant', () => {
    const s = section('RL and RC Circuits');
    const [charge, coil, thevenin] = s.examples;
    const tau = 1000 * 1e-6;
    const v1 = 10 + (2 - 10) * Math.exp(-1e-3 / tau);
    expect(charge.answer).toContain(v1.toFixed(2));
    const [plot] = figures(s, 'plot');
    expect(plot.series[0].f(1)).toBeCloseTo(v1, 9);
    expect(plot.marks[0].label).toContain(v1.toFixed(2));
    const t = (0.5 / 10) * Math.log(10 / (10 - 9));
    expect(coil.answer).toContain(t.toFixed(3));
    const Rth = (3000 * 6000) / (3000 + 6000);
    expect(thevenin.answer).toContain(`${Rth * 2e-6 * 1000} ms`);
    expect(thevenin.answer).toContain(`${(12 * 6) / 9} V`);
    // The table of how much of the change is done after each multiple of τ.
    const table = s.body.find((b) => typeof b === 'string' && b.includes('Share of the change'));
    for (const n of [1, 2, 3, 5]) expect(table).toContain(`${(100 * (1 - Math.exp(-n))).toFixed(1)}%`);
    expect(s.check[0].a).toContain(Math.exp(-3).toFixed(4));
  });

  it('Phasors and Impedance: the RL load, its phasor diagram, and the checks', () => {
    const s = section('Phasors and Impedance');
    const [rms, load] = s.examples;
    expect(rms.answer).toContain((100 / Math.SQRT2).toFixed(1));
    const XL = 2 * Math.PI * 60 * 0.05;
    const Z = Math.hypot(10, XL);
    const theta = (Math.atan2(XL, 10) * 180) / Math.PI;
    const I = 100 / Z;
    expect(said(load)).toContain(`${XL.toFixed(2)}$ Ω`);
    expect(said(load)).toContain(`${Z.toFixed(2)}\\angle${theta.toFixed(2)}`);
    expect(said(load)).toContain(`${I.toFixed(3)}\\angle-${theta.toFixed(2)}`);
    // The steps multiply the rounded current, as on paper; it agrees with the exact one.
    expect(said(load)).toContain(`= ${(4.686 * 10).toFixed(2)}$ V`);
    expect(said(load)).toContain(`= ${(4.686 * 18.85).toFixed(2)}$ V`);
    expect(Math.abs(I * XL - 88.33)).toBeLessThan(0.01);
    // The diagram is drawn to scale: V_R then V_L tip to tail lands on V.
    const [diagram] = figures(s, 'phasor');
    const ends = phasorEnds(diagram.vectors);
    expect(ends[1].end[0]).toBeCloseTo(ends[2].end[0], 1);
    expect(ends[1].end[1]).toBeCloseTo(ends[2].end[1], 1);
    expect(diagram.vectors[2].angle).toBeCloseTo(theta, 2);
    const [xc, lead] = s.check;
    expect(xc.a).toContain((1 / (2 * Math.PI * 60 * 100e-6)).toFixed(1));
    expect(lead.a).toContain(((Math.atan2(4, 3) * 180) / Math.PI).toFixed(1));
  });
});

// Solves A x = b by Gaussian elimination: an independent check on hand reductions.
function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const k = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}
const par = (a, b) => (a * b) / (a + b);

describe('Electric Circuits 1, the rest of the topic, worked again', () => {
  it('DC and AC Sources and Components: wire, line drop, heater, checks and the table', () => {
    const s = section('DC and AC Sources and Components');
    const [wire, line, heater] = s.examples;
    const r20 = (1.724e-8 * 100) / 2e-6;
    expect(said(wire)).toContain(`= ${r20.toFixed(3)}$`);
    expect(said(wire)).toContain(`= ${(r20 * (234.5 + 75) / (234.5 + 20)).toFixed(3)}$`);
    const R = (0.02 * 230) / 40;
    const D = (R * 250 ** 2) / (2 * 10.37);
    expect(said(line)).toContain(`${R.toFixed(3)}$ Ω`);
    expect(said(line)).toContain(`= ${D.toFixed(1)}$ ft`);
    expect(Math.round(D * 0.3048)).toBe(106);
    const Q = 20 * 4.186 * 75;
    const input = Q / 0.85;
    expect(said(heater)).toContain(`= ${Math.round(Q)}$ kJ`);
    expect(said(heater)).toContain(`= ${Math.round(input)}$ kJ`);
    expect(said(heater)).toContain(`= ${(input / 3600).toFixed(3)}$ kWh`);
    expect(said(heater)).toContain(`= ${Math.round(input / 2)}$ s`);
    expect(said(heater)).toContain(`${(input / 2 / 60).toFixed(1)} min`);
    expect(heater.answer).toContain(((input / 3600) * 12).toFixed(2));
    expect(s.check[1].a).toContain((1.2 * 254.5 - 234.5).toFixed(1));
    // The resistivity table: Ω·m = Ω·CM/ft × (one circular mil in m²) / (one foot in m).
    const toOhmM = (cmft) => (cmft * (Math.PI / 4) * (2.54e-5) ** 2) / 0.3048;
    const table = s.body.find((b) => typeof b === 'string' && b.includes('Inferred zero'));
    expect(toOhmM(10.37)).toBeCloseTo(1.724e-8, 10);
    expect(toOhmM(10.65)).toBeCloseTo(1.77e-8, 10);
    expect(toOhmM(17.0)).toBeCloseTo(2.83e-8, 10);
    expect(table).toContain('10.37');
    // α at 20 °C for annealed copper.
    expect(s.body.join(' ')).toContain((1 / 254.5).toFixed(5));
    const [plot] = figures(s, 'plot');
    expect(plot.series[0].f(20)).toBeCloseTo(1, 12);
    expect(plot.series[0].f(-234.5)).toBeCloseTo(0, 12);
  });

  it('Mesh Analysis: two meshes and a supermesh, against a general solver', () => {
    const [two, superMesh] = section('Mesh Analysis').examples;
    const [i1, i2] = solve([[6, -4], [-4, 7]], [10, -5]);
    expect(said(two)).toContain(`i_1 = ${i1.toFixed(3)}$`);
    expect(said(two)).toContain(`i_2 = ${i2.toFixed(3)}$`);
    expect(two.answer).toContain(`${(i1 - i2).toFixed(3)} A`);
    // Supermesh: i2 − i1 = 2 and 4 i1 + 8 i2 = 20.
    const [s1, s2] = solve([[-1, 1], [4, 8]], [2, 20]);
    expect(superMesh.answer).toContain(`i_1 = ${s1.toFixed(3)}$`);
    expect(superMesh.answer).toContain(`i_2 = ${s2.toFixed(3)}$`);
  });

  it('Linearity and Superposition: each source alone adds up to the nodal answer', () => {
    const [split, power] = section('Linearity and Superposition').examples;
    const rth = par(2, 4);
    const vB1 = (12 * (4 / 6) * 6) / (rth + 3 + 6);
    const vB2 = 1 * par(6, 3 + rth);
    expect(said(split)).toContain(`= ${vB1.toFixed(3)}$ V`);
    expect(said(split)).toContain(`${vB2.toFixed(3)}$ V`);
    expect(vB1 + vB2).toBeCloseTo(222 / 31, 9);
    expect(said(split)).toContain(`= ${(vB1 + vB2).toFixed(3)}$ V`);
    expect(said(power)).toContain(`= ${(2 + 3) ** 2 * 10}$ W`);
    expect(said(power)).toContain(`${4 * 10 + 9 * 10} W`);
    expect((2 + 3) ** 2 * 10 - 130).toBe(2 * 2 * 3 * 10);
    expect(section('Linearity and Superposition').check[0].a).toContain(`${0.5 * 30 / 12}`);
  });

  it('Source Transformation: one checked, two batteries on one load', () => {
    const [one, two] = section('Source Transformation').examples;
    expect(said(one)).toContain(`${12 * 4 / 6} V`);
    expect(6 * par(2, 4)).toBeCloseTo(8, 12);
    const vMillman = (24 / 4 + 12 / 6) / (1 / 4 + 1 / 6 + 1 / 3);
    const I = vMillman / 3;
    expect(said(two)).toContain(`= ${I.toFixed(3)}$ A`);
    expect(two.answer).toContain(vMillman.toFixed(2));
    expect(8 * par(4, 6)).toBeCloseTo(19.2, 12);
  });

  it('Thévenin and Norton, and Maximum Power Transfer', () => {
    const [atB, tests] = section('Thevenin and Norton').examples;
    const vth = 8 + 1 * (3 + par(2, 4));
    const rth = 3 + par(2, 4);
    expect(said(atB)).toContain(`= ${vth.toFixed(3)}$ V`);
    expect(said(atB)).toContain(`= ${(vth * 6 / (rth + 6)).toFixed(3)}$ V`);
    // 5(R + 4) = 2(R + 16)
    const R = (2 * 16 - 5 * 4) / 3;
    expect(R).toBe(4);
    expect(said(tests)).toContain(`= ${5 * (R + 4)}$ V`);
    expect(tests.answer).toContain((40 / 12).toFixed(2));
    const mpt = section('Maximum Power Transfer');
    const [match, twoLoads, network] = mpt.examples;
    expect(said(match)).toContain(`= ${10 ** 2 / 16}$ W`);
    const R2 = 3 * 10 - 4 * 6; // 4(R + 6) = 3(R + 10)
    expect(R2).toBe(6);
    expect(said(twoLoads)).toContain(`= ${48 ** 2 / 24}$ W`);
    expect(said(network)).toContain(`= ${(vth ** 2 / (4 * rth)).toFixed(3)}$ W`);
    const [plot] = figures(mpt, 'plot');
    // The curve's peak is at the matched load, and nowhere higher.
    const peak = Array.from({ length: 2401 }, (_, i) => i / 100).reduce((best, rl) => (plot.series[0].f(rl) > plot.series[0].f(best) ? rl : best), 0);
    expect(peak).toBeCloseTo(4, 2);
    expect(plot.series[0].f(4)).toBeCloseTo(6.25, 12);
  });

  it('Delta-Wye Conversion: the conversion, and the unbalanced bridge by nodal analysis', () => {
    const [convert, bridge] = section('Delta-Wye Conversion').examples;
    expect(said(convert)).toContain(`${(10 * 20 / 60).toFixed(3)}$ Ω`);
    expect(par(10, 50)).toBeCloseTo(5 + 10 * 20 / 60, 9);
    // Nodal analysis on the bridge: a at 30 V, b at 0; unknowns v_c, v_d.
    const [R1, R2, R3, R4, R5] = [10, 20, 20, 10, 10];
    const [vc, vd] = solve(
      [[1 / R1 + 1 / R2 + 1 / R5, -1 / R5], [-1 / R5, 1 / R3 + 1 / R4 + 1 / R5]],
      [30 / R1, 30 / R3],
    );
    const I = (30 - vc) / R1 + (30 - vd) / R3;
    expect(I).toBeCloseTo(30 / 14, 9);
    expect(bridge.answer).toContain(I.toFixed(3));
    expect(10 * 30).toBe(20 * 15); // the balanced check
  });

  it('Controlled Sources and Ideal Op Amp', () => {
    const [inv, sum, dep] = section('Controlled Sources and Ideal Op Amp').examples;
    expect(inv.answer).toContain(`${(-(47 / 10) * 0.2).toFixed(2)}$`);
    expect(sum.answer).toContain(`${(-10e3 * (0.5 / 10e3 + 0.2 / 5e3)).toFixed(1)}$`);
    // Test source at a with the 10 V off: i_t = v/2 + 0.5 i_x, i_x = −v/2.
    const v = 1;
    const it = v / 2 + 0.5 * (-v / 2);
    expect(v / it).toBe(4);
    expect(said(dep)).toContain(`${10 / 2.5} Ω`);
  });

  it('Capacitors and Inductors', () => {
    const [series, share, plates] = section('Capacitors and Inductors').examples;
    expect(said(series)).toContain(`= ${par(2, 6)}$ µF`);
    const V = (10 * 200) / 40;
    expect(share.answer).toContain(`${V} V`);
    const lost = 0.5 * 10e-6 * 200 ** 2 - 0.5 * 40e-6 * V ** 2;
    expect(share.answer).toContain(`${+lost.toFixed(2)} J`);
    const C = (10 * 8.854e-12 * 6 * 0.01) / 0.0002;
    expect(plates.answer).toContain(`${(C * 1e9).toFixed(1)} nF`);
    expect(section('Capacitors and Inductors').check[0].a).toContain(`${0.5 * 0.5 * 16}$ J`);
  });

  it('RLC Circuits: classification, critical resistance, the transient and the plot', () => {
    const s = section('RLC Circuits');
    const [classify, critical, transient] = s.examples;
    const w0 = 1 / Math.sqrt(0.1 * 100e-6);
    expect(said(classify)).toContain(w0.toFixed(1));
    expect(classify.answer).toContain(Math.sqrt(w0 ** 2 - 50 ** 2).toFixed(1));
    const Rc = 2 * Math.sqrt(1 / 10e-6);
    expect(said(critical)).toContain(Rc.toFixed(1));
    expect(critical.answer).toContain((Rc - 150).toFixed(1));
    // 1 H, 6 Ω, 0.04 F on 50 V: α = 3, ω0 = 5, ωd = 4, i = 12.5 e^{-3t} sin 4t.
    const i = (t) => 12.5 * Math.exp(-3 * t) * Math.sin(4 * t);
    const h = 1e-5;
    // It satisfies i'' + 6 i' + 25 i = 0 with i(0) = 0, i'(0) = 50.
    for (const t of [0.1, 0.4, 0.9]) {
      const d1 = (i(t + h) - i(t - h)) / (2 * h);
      const d2 = (i(t + h) - 2 * i(t) + i(t - h)) / h ** 2;
      expect(d2 + 6 * d1 + 25 * i(t)).toBeCloseTo(0, 2);
    }
    expect((i(h) - i(0)) / h).toBeCloseTo(50, 1);
    expect(transient.answer).toContain('12.5e^{-3t}');
    expect(s.check[0].a).toContain(`${4 / 16}`);
    const [plot] = figures(s, 'plot');
    // Each curve starts at rest and rises at E/L = 1 A/s.
    for (const c of plot.series) {
      expect(c.f(0)).toBeCloseTo(0, 12);
      expect(c.f(1e-6) / 1e-6).toBeCloseTo(1, 4);
    }
  });

  it('Sinusoidal Steady-State Analysis', () => {
    const [time, parallel, twoFreq] = section('Sinusoidal Steady-State Analysis').examples;
    const XL = 2 * Math.PI * 60 * 0.05;
    const I = 100 / Math.hypot(10, XL);
    expect(said(time)).toContain(`= ${(I * Math.SQRT2).toFixed(2)}$ A`);
    // (j12)(−j6)/(j6) = −j12; Z = 8 − j12.
    const Z = Math.hypot(8, 12);
    const Is = 120 / Z;
    const ang = (Math.atan2(12, 8) * 180) / Math.PI;
    expect(said(parallel)).toContain(`${Z.toFixed(2)}\\angle-${ang.toFixed(2)}`);
    expect(said(parallel)).toContain(`${Is.toFixed(3)}\\angle${ang.toFixed(2)}`);
    const Vp = Is * 12;
    expect(said(parallel)).toContain(`${Vp.toFixed(2)}\\angle-${(90 - ang).toFixed(2)}`);
    expect(said(parallel)).toContain(`${(Vp / 6).toFixed(2)}\\angle${ang.toFixed(2)}`);
    expect(said(parallel)).toContain(`${(Vp / 12).toFixed(3)}\\angle-${(180 - ang).toFixed(2)}`);
    expect(Vp / 6 - Vp / 12).toBeCloseTo(Is, 9);
    const Iac = 100 / Math.hypot(10, 10);
    expect(said(twoFreq)).toContain(Iac.toFixed(3));
    expect(Math.sqrt(5 ** 2 + (Iac / Math.SQRT2) ** 2)).toBeCloseTo(7.071, 3);
    expect(section('Sinusoidal Steady-State Analysis').check[0].a).toContain((100 / 12).toFixed(2));
  });
});
