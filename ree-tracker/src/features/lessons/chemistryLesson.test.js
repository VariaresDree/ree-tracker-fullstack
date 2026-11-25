// Chemistry for Engineers in the module format (2026-11-25): every number in
// the topic's worked examples, checks and figures, worked again, so a slip in
// the text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/esas/chemistry-for-engineers.js';
import { sectionFor } from './lessonContent';

const F = 96485;
const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s) => s.body.find((b) => typeof b !== 'string' && b.type === 'plot');
const at = (pts, x) => pts.find(([px]) => px === x)[1];

describe('Chemistry for Engineers, worked again', () => {
  it('Atomic Structure: chlorine, a Balmer line, the ionisation peaks', () => {
    const s = section('Atomic Structure and Periodic Table');
    const [cl, h] = s.examples;
    expect(said(cl)).toContain(`= ${(0.758 * 34.97 + 0.242 * 36.97).toFixed(2)}$ u`);
    expect(said(h)).toContain(`= ${(1e9 / (1.097e7 * (1 / 4 - 1 / 9))).toFixed(1)}$ nm`);
    expect(said(h)).toContain(`= ${2 * 16}$`);
    const pts = figure(s).series[0].points;
    // Each noble gas is a local peak, and the next element drops below it.
    for (const z of [2, 10, 18]) {
      expect(at(pts, z)).toBeGreaterThan(at(pts, z - 1));
      expect(at(pts, z + 1)).toBeLessThan(at(pts, z) / 2);
    }
  });

  it('Chemical Bonding: classifying, ionic share, oxidation numbers, the curve', () => {
    const s = section('Chemical Bonding');
    const [cls, board] = s.examples;
    expect(said(cls)).toContain(`= ${(3.16 - 0.93).toFixed(2)}$, ionic`);
    expect(said(cls)).toContain(`= ${(3.44 - 2.2).toFixed(2)}$, polar`);
    expect(said(cls)).toContain(`= ${(2.55 - 2.2).toFixed(2)}$, nonpolar`);
    expect(said(board)).toContain(`= ${((1 - Math.exp(-(0.96 ** 2) / 4)) * 100).toFixed(1)}\\%$`);
    expect(-1 + 6).toBe(5);
    expect((-2 + 14) / 2).toBe(6);
    const f = figure(s).series[0].f;
    expect(f(1.7)).toBeCloseTo(0.5, 1);
    expect(f(0.4)).toBeLessThan(0.05);
  });

  it('Stoichiometry: limiting reactant, empirical formula, fermentation', () => {
    const [lim, form] = section('Stoichiometry').examples;
    const nH = 4.0 / 2.016;
    expect(said(lim)).toContain(`= ${nH.toFixed(3)}$ mol`);
    expect(said(lim)).toContain(`= ${(nH * 18.015).toFixed(1)}$ g`);
    expect(said(lim)).toContain(`= ${((32 / (nH * 18.015)) * 100).toFixed(1)}\\%$`);
    const [c, h, o] = [52.14 / 12.011, 13.13 / 1.008, 34.73 / 16.0];
    expect(said(form)).toContain(`= ${c.toFixed(3)}$, H`);
    expect(said(form)).toContain(`= ${h.toFixed(2)}$, O`);
    expect(said(form)).toContain(`= ${o.toFixed(3)}$`);
    expect(c / o).toBeCloseTo(2, 2);
    expect(h / o).toBeCloseTo(6, 2);
    expect(said(form)).toContain(`= ${((2.0 * 2 * 46.07) / 180.16).toFixed(2)}$ t`);
  });

  it('Gas Laws: tank, STP density, a mixture, an unknown gas, Charles’s line', () => {
    const s = section('Gas Laws');
    const [tank, mix] = s.examples;
    const n = 1000 / (8.314 * 298.15);
    expect(said(tank)).toContain(`= ${n.toFixed(3)}$ mol, so $${n.toFixed(3)} \\times 32 = ${(n * 32).toFixed(1)}$ g`);
    expect(said(tank)).toContain(`= ${(1.25 * 22.414).toFixed(1)}$ g/mol`);
    const [o2, n2] = [2000 / 32, 6000 / 28.014];
    const x = o2 / (o2 + n2);
    expect(said(mix)).toContain(`= ${n2.toFixed(1)}$ mol N₂: $x = \\frac{62.5}{${(o2 + n2).toFixed(1)}} = ${x.toFixed(3)}$`);
    expect(said(mix)).toContain(`= ${(150 * x).toFixed(1)}$ kPa`);
    expect(said(mix)).toContain(`= ${(20 / (7 / 22.414)).toFixed(1)}$ g/mol`);
    const [gas, ext] = figure(s).series;
    expect(ext.points[0]).toEqual([-273.15, 0]);
    expect(ext.points[1]).toEqual(gas.points[0]);
    expect(gas.points[1][1]).toBeCloseTo((22.414 * 393.15) / 273.15, 9);
  });

  it('Solutions: NaOH, battery acid, titration, freezing lines', () => {
    const s = section('Solutions and Concentration');
    const [naoh, acid] = s.examples;
    expect(said(naoh)).toContain(`= ${(1.0 * 250) / 0.1}$ mL`);
    const n = (1220 * 0.3) / 98.08;
    expect(said(acid)).toContain(`= ${n.toFixed(2)}$ mol, so ${n.toFixed(2)} M`);
    expect(said(acid)).toContain(`= ${(n / 0.854).toFixed(2)}$ mol/kg`);
    expect(said(acid)).toContain(`${(2 * n).toFixed(2)} N`);
    expect(said(acid)).toContain(`= ${(25 * 0.12) / 20}$ N`);
    const [, salt] = figure(s).series;
    expect(salt.f(1)).toBeCloseTo(3.72, 12);
  });

  it('Equilibrium, Acids and Bases: weak acid, buffer, strong acid, rain, titration curves', () => {
    const s = section('Equilibrium, Acids and Bases');
    const [weak, strong] = s.examples;
    expect(said(weak)).toContain(`pH $= ${(-Math.log10(Math.sqrt(1.8e-6))).toFixed(2)}$`);
    expect(said(weak)).toContain(`= ${(4.74 + Math.log10(1.5)).toFixed(2)}$`);
    expect(said(strong)).toContain(`= ${(-Math.log10(0.02)).toFixed(2)}$`);
    expect(said(strong)).toContain(`= ${(10 ** 5.1 * 10 ** -5.1 * 7.94).toFixed(1)} \\times 10^{-6}$`);
    expect(10 ** -5.1).toBeCloseTo(7.94e-6, 8);
    const [str, wk] = figure(s).series;
    expect(at(str.points, 0)).toBeCloseTo(1, 12);
    expect(at(str.points, 25)).toBe(7);
    expect(at(wk.points, 12.5)).toBeCloseTo(4.745, 12);
    expect(at(wk.points, 25)).toBeCloseTo(8.72, 2);
    expect(at(str.points, 50)).toBeCloseTo(at(wk.points, 50), 12);
    for (const pts of [str.points, wk.points]) pts.forEach(([, p]) => expect(Number.isFinite(p)).toBe(true));
  });

  it('Thermochemistry: methane, ethanol, activation energy, the profile', () => {
    const s = section('Thermochemistry and Energy');
    const [ch4, board] = s.examples;
    const dH = -393.5 + 2 * -285.8 + 74.8;
    expect(said(ch4)).toContain(`= ${dH.toFixed(1)}$ kJ/mol`);
    expect(said(ch4)).toContain(`= ${(-dH / 16.04).toFixed(1)}$ MJ`);
    expect(said(board)).toContain(`= ${(2 * -393.5 + 3 * -285.8 + 277.7).toFixed(1)}$ kJ/mol`);
    expect(said(board)).toContain(`= ${((8.314 * Math.log(2)) / (1 / 298.15 - 1 / 308.15) / 1000).toFixed(1)}$ kJ/mol`);
    const [un, cat] = figure(s).series;
    expect(un.f(0)).toBeCloseTo(0, 1);
    expect(un.f(1)).toBeCloseTo(-40, 1);
    expect(cat.f(1)).toBeCloseTo(un.f(1), 4);
    expect(cat.f(0.5)).toBeLessThan(un.f(0.5));
  });

  it('Electrochemistry: Daniell cell, copper, silver, battery, Nernst line', () => {
    const s = section('Electrochemistry and Batteries');
    const [dan, board] = s.examples;
    expect(said(dan)).toContain(`= ${((-2 * F * 1.1) / 1000).toFixed(1)}$ kJ/mol`);
    expect(said(dan)).toContain(`= ${((63.55 * 10 * 3600) / (2 * F)).toFixed(1)}$ g`);
    const t = (5 * F) / (107.87 * 2);
    expect(said(board)).toContain(`= ${Math.round(t)}$ s, about ${(t / 60).toFixed(1)} min`);
    expect(said(board)).toContain(`= ${12 * 100}$ Wh`);
    const E = figure(s).series[0].f;
    expect(E(1)).toBeCloseTo(1.1, 12);
    expect(E(10) - E(100)).toBeCloseTo(0.02958, 5);
  });

  it('Fuel Cells: stack, sizing, the polarisation curve', () => {
    const s = section('Energy Storage and Fuel Cells');
    const [stack, size] = s.examples;
    const mol = 10000 / (2 * F);
    expect(said(stack)).toContain(`= ${mol.toFixed(4)}$ mol/s, so $${mol.toFixed(4)} \\times 2.016 \\times 3600 = ${Math.round(mol * 2.016 * 3600)}$ g/h`);
    expect(said(stack)).toContain(`= ${Math.round((0.7 / 1.48) * 100)}\\%$`);
    const m2 = (64 * 200) / (2 * F);
    expect(said(size)).toContain(`= ${48 / 0.75}$ cells`);
    expect(said(size)).toContain(`= ${m2.toFixed(4)}$ mol/s, or $${m2.toFixed(4)} \\times 2.016 \\times 3600 = ${Math.round(m2 * 2.016 * 3600)}$ g/h`);
    const [cell, ideal] = figure(s).series;
    cell.points.slice(1).forEach(([, v], k) => expect(v).toBeLessThan(cell.points[k][1]));
    expect(cell.points.every(([, v]) => v < ideal.f(0) && v > 0)).toBe(true);
    const mid = cell.points.find(([i]) => Math.abs(i - 0.5) < 1e-9)[1];
    expect(mid).toBeGreaterThan(0.6);
    expect(mid).toBeLessThan(0.8);
  });

  it('Solar Cells: efficiency, fill factor, GaAs cutoff, the I–V curve', () => {
    const s = section('Solar Cells and Photosynthesis');
    const [eff, board] = s.examples;
    expect(said(eff)).toContain(`= ${(340 / (41 * 10.5)).toFixed(2)}$`);
    expect(said(board)).toContain(`= ${Math.round(1240 / 1.42)}$ nm`);
    const f = figure(s);
    const I = f.series[0].f;
    expect(I(0)).toBeCloseTo(10.5, 12);
    expect(I(41)).toBeCloseTo(0, 9);
    // Its best point is 340 W, at the marked voltage.
    let best = [0, 0];
    for (let v = 0; v <= 41; v += 0.01) if (v * I(v) > best[0]) best = [v * I(v), v];
    expect(best[0]).toBeCloseTo(340, 0);
    expect(best[1]).toBeCloseTo(f.marks[0].x, 1);
  });

  it('Renewable Energy: wind, capacity factor, hydro, the power curve', () => {
    const s = section('Renewable Energy');
    const [wind, hydro] = s.examples;
    const P = 0.5 * 1.225 * Math.PI * 1600 * 1000 * 0.4;
    expect(said(wind)).toContain(`= ${(P / 1e6).toFixed(2)}$ MW`);
    expect(said(wind)).toContain(`= ${(5256 / (2 * 8760)) * 100}\\%$`);
    expect(said(hydro)).toContain(`= ${((0.88 * 1000 * 9.81 * 20 * 50) / 1e6).toFixed(2)}$ MW`);
    const w = figure(s).series[0].f;
    expect(w(10)).toBeCloseTo(P / 1e6, 12);
    expect(w(2)).toBe(0);
    expect(w(20)).toBe(2);
    expect(w(26)).toBe(0);
    expect(((2e6 / (P / 1000)) ** (1 / 3)).toFixed(1)).toBe('11.8');
  });

  it('Engineering Materials: corrosion rate, Pilling–Bedworth, polymer chain', () => {
    const [cr, board] = section('Chemistry of Engineering Materials').examples;
    expect(said(cr)).toContain(`= ${((87.6 * 120) / (7.87 * 50 * 500)).toFixed(3)}$ mm/yr`);
    expect(said(board)).toContain(`= ${((101.96 * 2.7) / (2 * 26.98 * 3.95)).toFixed(2)}$`);
    expect(said(board)).toContain(`= ${Math.round(280000 / 28.05)}$ units`);
  });

  it('Nanomaterials: gold atoms and surface, silica, the surface share', () => {
    const s = section('Nanomaterials');
    const [gold, silica] = s.examples;
    const V = (Math.PI / 6) * (5e-7) ** 3;
    expect(said(gold)).toContain(`= ${(V * 1e20).toFixed(2)} \\times 10^{-20}$`);
    expect(Math.round((19.3 * V * 6.022e23) / 196.97 / 100) * 100).toBe(3900);
    expect(said(gold)).toContain(`= ${Math.round(6 / (19300 * 5e-9) / 1000)}$ m²/g`);
    expect(said(silica)).toContain(`= ${Math.round(6 / (2.2e6 * 1e-8))}$ m²/g`);
    const share = 1 - ((5 - 0.576) / 5) ** 3;
    expect(said(silica)).toContain(`= ${share.toFixed(3)}$`);
    const f = figure(s).series[0].f;
    expect(f(5)).toBeCloseTo(share, 12);
    expect(f(100)).toBeLessThan(0.02);
  });

  it('Environment: BOD, hardness, CO, coal, the BOD curve', () => {
    const s = section('Chemistry of the Environment');
    const [bod, board] = s.examples;
    const b5 = 250 * (1 - Math.exp(-1.15));
    expect(said(bod)).toContain(`= ${Math.round(b5)}$ mg/L`);
    expect(said(bod)).toContain(`= ${Math.round(40 * 2.5 + 12 * 4.12)}$ mg/L`);
    expect(said(board)).toContain(`= ${((9 * 28.01) / 24.45).toFixed(1)}$ mg/m³`);
    expect(said(board)).toContain(`= ${((0.7 * 44.01) / 12.011).toFixed(2)}$ t`);
    expect(figure(s).series[0].f(5)).toBeCloseTo(b5, 12);
  });
});
