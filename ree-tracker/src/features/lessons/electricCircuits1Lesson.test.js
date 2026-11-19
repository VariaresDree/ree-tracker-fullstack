// Electric Circuits 1, the module-format pilot (2026-11-19): every number in the
// four rewritten subtopics' worked examples, checks, tables and figures, worked
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
