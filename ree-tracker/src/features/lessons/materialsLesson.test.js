// Material Science in the module format (2026-11-25): every number in the
// topic's worked examples, checks and figures, worked again, so a slip in the
// text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { erf, CARB_T } from './content/esas/material-science.js';
import { sectionFor } from './lessonContent';

const NA = 6.022e23;
const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s) => s.body.find((b) => typeof b !== 'string' && b.type === 'plot');
const ionic = (dx) => 1 - Math.exp(-0.25 * dx * dx);

describe('Material Science, worked again', () => {
  it('erf matches known values', () => {
    expect(erf(0)).toBeCloseTo(0, 6);
    expect(erf(0.392)).toBeCloseTo(0.4210, 3);
    expect(erf(1)).toBeCloseTo(0.8427, 4);
  });

  it('Bonding: NaCl, the K–Cl well, two oxides, the energy curve', () => {
    const s = section('Atomic Structure and Bonding');
    const [nacl, oxides] = s.examples;
    expect(said(nacl)).toContain(`= ${Math.round(ionic(2.23) * 100)}\\%$`);
    const r0 = ((9 * 5.86e-6) / 1.436) ** (1 / 8);
    const E = (r) => -1.436 / r + 5.86e-6 / r ** 9;
    expect(said(nacl)).toContain(`= ${r0.toFixed(3)}$ nm`);
    expect(said(nacl)).toContain(`= ${E(r0).toFixed(2)}$ eV`);
    expect(said(oxides)).toContain(`= ${(ionic(2.13) * 100).toFixed(1)}\\%$`);
    expect(said(oxides)).toContain(`= ${(ionic(1.54) * 100).toFixed(1)}\\%$`);
    const net = figure(s).series[0].f;
    expect(net(0.279)).toBeLessThan(net(0.27));
    expect(net(0.279)).toBeLessThan(net(0.29));
  });

  it('Crystal Structures: copper density, iron X-ray peak, Miller indices, BCC radius', () => {
    const [cu, board] = section('Crystal Structures').examples;
    const a = 2 * 0.128 * Math.SQRT2;
    expect(said(cu)).toContain(`= ${a.toFixed(3)}$ nm`);
    expect(said(cu)).toContain(`= ${((4 * 63.5) / ((a * 1e-7) ** 3 * NA)).toFixed(2)}$ g/cm³`);
    const d = 0.2866 / Math.sqrt(8);
    const sin = 0.179 / (2 * d);
    const th = (Math.asin(sin) * 180) / Math.PI;
    expect(said(cu)).toContain(`= ${d.toFixed(5)}$ nm`);
    expect(said(cu)).toContain(`= ${sin.toFixed(4)}$, $\\theta = ${th.toFixed(1)}^\\circ$, so $2\\theta = ${(2 * th).toFixed(1)}^\\circ$`);
    // Miller indices: reciprocals of the intercepts, cleared of fractions.
    expect([1, 1 / 3, 1 / 2].map((x) => Math.round(x * 6))).toEqual([6, 2, 3]);
    expect([2, 1, 0]).toEqual([1 / 0.5, 1 / 1, 1 / Infinity]);
    expect(said(board)).toContain(`= ${((Math.sqrt(3) * 0.2866) / 4).toFixed(4)}$ nm`);
  });

  it('Imperfections: copper and aluminium vacancies, grain size, the curve', () => {
    const s = section('Imperfections in Solids');
    const [cu, al] = s.examples;
    const fCu = Math.exp(-0.9 / (8.62e-5 * 1273));
    expect((8e28 * fCu / 1e25).toFixed(1)).toBe('2.2');
    expect(Math.round(1 / fCu / 100) * 100).toBe(3600);
    expect(said(cu)).toContain('2.2 \\times 10^{25}');
    const N = (NA * 2.7e6) / 26.98;
    const f = Math.exp(-0.75 / (8.62e-5 * 773.15));
    expect(said(al)).toContain(`= ${(N / 1e28).toFixed(2)} \\times 10^{28}$`);
    expect(said(al)).toContain(`= ${(f * 1e5).toFixed(2)} \\times 10^{-5}$`);
    expect(said(al)).toContain(`= ${((N * f) / 1e23).toFixed(1)} \\times 10^{23}$`);
    expect(said(al)).toContain(`= ${2 ** 5}$ grains`);
    const curve = figure(s).series[0].f;
    expect(curve(1000)).toBeCloseTo(Math.log10(Math.exp(-0.9 / (8.62e-5 * 1273.15))), 12);
  });

  it('Diffusion: carburizing time, D at 950 °C, a deeper case, the profiles', () => {
    const s = section('Diffusion');
    const [carb, board] = s.examples;
    expect(said(carb)).toContain(`= ${((0.8 - 0.25) / 0.95).toFixed(3)}$`);
    expect(erf(0.392)).toBeCloseTo(0.421, 3);
    expect(said(carb)).toContain(`= ${(Math.round(CARB_T / 100) * 100).toString().replace(/(\d)(\d{3})$/, '$1\\,$2')}$ s, about ${(CARB_T / 3600).toFixed(1)} h`);
    const D = 2.3e-5 * Math.exp(-148000 / (8.314 * 1223.15));
    expect(said(board)).toContain(`= ${(D * 1e11).toFixed(2)} \\times 10^{-11}$`);
    expect(said(board)).toContain(`= ${4 * 3}$ h`);
    const profile = figure(s).series[1].f;
    expect(profile(0)).toBeCloseTo(1.2, 6);
    expect(profile(0.5)).toBeCloseTo(0.8, 2);
    expect(figure(s).series[0].f(0.5)).toBeLessThan(profile(0.5));
  });

  it('Mechanical Properties: Brinell, crack, G, true stress, the curve', () => {
    const s = section('Mechanical Properties of Metals');
    const [hb, board] = s.examples;
    const HB = 6000 / (Math.PI * 10 * (10 - Math.sqrt(84)));
    expect(said(hb)).toContain(`= ${Math.round(HB)}$`);
    expect(said(hb)).toContain(`= ${Math.round(3.45 * HB)}$ MPa`);
    expect(said(hb)).toContain(`= ${Math.round(26 / Math.sqrt(Math.PI * 0.002))}$ MPa`);
    expect(said(board)).toContain(`= ${(207 / 2.6).toFixed(1)}$ GPa`);
    expect(said(board)).toContain(`= ${400 * 1.2}$ MPa`);
    expect(said(board)).toContain(`= ${Math.log(1.2).toFixed(3)}$`);
    const f = figure(s);
    const st = f.series[0].f;
    expect(st(0.00125)).toBeCloseTo(250, 9);
    expect(st(0.0013)).toBeGreaterThan(250);
    // Highest at the marked tensile strength.
    for (const e of [0.1, 0.15, 0.2, 0.25]) expect(st(e)).toBeLessThan(st(f.marks[0].x));
    expect(Math.round(st(0.18))).toBe(444);
  });

  it('Phase Diagrams: lever rule, pearlite, hypereutectoid, the Cu–Ni lens', () => {
    const s = section('Alloys and Phase Diagrams');
    const [lever, hyper] = s.examples;
    expect(said(lever)).toContain(`= ${((42.5 - 35) / 11).toFixed(2)}$`);
    expect(said(lever)).toContain(`= ${((0.4 - 0.022) / (0.76 - 0.022)).toFixed(2)}$`);
    const cem = (1.0 - 0.76) / (6.7 - 0.76);
    expect(said(hyper)).toContain(`= ${cem.toFixed(3)}$`);
    expect(said(hyper)).toContain(`= ${(1 - cem).toFixed(3)}$`);
    const [liq, sol, tie] = figure(s).series;
    expect(liq.f(31.5)).toBeCloseTo(1250, 2);
    expect(sol.f(42.5)).toBeCloseTo(1250, 2);
    expect(liq.f(0)).toBe(1085);
    expect(liq.f(100)).toBeCloseTo(1455, 9);
    for (const c of [20, 50, 80]) expect(liq.f(c)).toBeGreaterThan(sol.f(c));
    expect(tie.points).toEqual([[31.5, 1250], [42.5, 1250]]);
  });

  it('Ceramics: rock salt, a bend test, magnesia', () => {
    const [salt, board] = section('Ceramics').examples;
    expect(said(salt)).toContain(`= ${(0.102 / 0.181).toFixed(2)}$`);
    expect(said(salt)).toContain(`= ${((4 * (22.99 + 35.45)) / ((5.66e-8) ** 3 * NA)).toFixed(2)}$ g/cm³`);
    expect(said(board)).toContain(`= ${(3 * 800 * 40) / (2 * 10 * 25)}$ MPa`);
    expect(said(board)).toContain(`= ${(0.072 / 0.14).toFixed(2)}$`);
  });

  it('Polymers: crystallinity, PVC chains, relaxation, the curve', () => {
    const s = section('Polymers');
    const [pe, board] = s.examples;
    const cr = (rho) => (0.998 * (rho - 0.87)) / (rho * (0.998 - 0.87));
    expect(said(pe)).toContain(`= ${(cr(0.925) * 100).toFixed(1)}\\%$`);
    expect(said(board)).toContain(`= ${Math.round(105000 / 62.49)}$`);
    expect(said(board)).toContain(`= ${(5 * Math.exp(-0.6)).toFixed(2)}$ MPa`);
    const f = figure(s).series[0].f;
    expect(f(0.87)).toBeCloseTo(0, 12);
    expect(f(0.998)).toBeCloseTo(1, 12);
    expect(f(0.925)).toBeCloseTo(cr(0.925), 12);
  });

  it('Composites: moduli, load share, critical length, strength, the curves', () => {
    const s = section('Composites');
    const [glass, carbon] = s.examples;
    const Ecl = 3.4 * 0.6 + 69 * 0.4;
    const Ect = (3.4 * 69) / (0.6 * 69 + 0.4 * 3.4);
    expect(said(glass)).toContain(`= ${Ecl.toFixed(1)}$ GPa`);
    expect(said(glass)).toContain(`= ${Ect.toFixed(1)}$ GPa`);
    expect(said(glass)).toContain(`= ${(27.6 / 2.04).toFixed(1)}$, so fibres carry ${Math.round((27.6 / Ecl) * 100)}%`);
    expect(said(carbon)).toContain(`= ${(3500 * 0.01) / (2 * 50)}$ mm`);
    expect(said(carbon)).toContain(`= ${30 * 0.6 + 3500 * 0.4}$ MPa`);
    const [along, across] = figure(s).series;
    expect(along.f(0.4)).toBeCloseTo(Ecl, 12);
    expect(across.f(0.4)).toBeCloseTo(Ect, 12);
  });

  it('Electrical Properties: silicon, copper mobility and Hall coefficient, the curve', () => {
    const s = section('Electrical Properties');
    const [si, cu] = s.examples;
    expect(((1e16 * 1.602e-19 * 0.19) * 1e4).toFixed(1)).toBe('3.0');
    expect(said(si)).toContain(`= ${Math.round(1e22 * 1.602e-19 * 0.14)}$`);
    const ne = 8.49e28 * 1.602e-19;
    expect(said(cu)).toContain(`= ${((5.96e7 / ne) * 1e3).toFixed(2)} \\times 10^{-3}$`);
    expect(said(cu)).toContain(`= -${((1 / ne) * 1e11).toFixed(2)} \\times 10^{-11}$`);
    const f = figure(s).series[0].f;
    expect(10 ** f(300)).toBeCloseTo(3.04e-4, 9);
    expect(10 ** f(500) / 10 ** f(300)).toBeGreaterThan(1e4);
  });

  it('Dielectric and Magnetic: nickel, a capacitor, the loops', () => {
    const s = section('Dielectric and Magnetic Properties');
    const [ni, cap] = s.examples;
    const N = (8.9e6 * NA) / 58.69;
    const Ms = 0.6 * N * 9.27e-24;
    expect(said(ni)).toContain(`= ${(N / 1e28).toFixed(2)} \\times 10^{28}$`);
    expect(said(ni)).toContain(`= ${(Ms / 1e5).toFixed(1)} \\times 10^5$`);
    expect(said(ni)).toContain(`= ${(4e-7 * Math.PI * Ms).toFixed(2)}$ T`);
    const C0 = (8.85e-12 * 6.45e-4) / 0.002;
    expect(said(cap)).toContain(`= ${(C0 * 1e12).toFixed(2)} \\times 10^{-12}$ F; with the dielectric, $${(6 * C0 * 1e11).toFixed(2)} \\times 10^{-11}$`);
    expect(said(cap)).toContain(`= ${(8.85e-12 * 5 * 5000 * 1e7).toFixed(2)} \\times 10^{-7}$`);
    // The hard loop is wider: it keeps more flux at zero field.
    const [soft, hard] = figure(s).series;
    const atZero = (pts) => Math.max(...pts.filter(([h]) => Math.abs(h) < 1e-9).map(([, b]) => b));
    expect(atZero(hard.points)).toBeGreaterThan(atZero(soft.points));
  });

  it('Optical and Thermal: glass, copper, a heated rod, heat capacity', () => {
    const s = section('Optical and Thermal Properties');
    const [glass, rod] = s.examples;
    expect(said(glass)).toContain(`= ${(0.96 ** 2 * Math.exp(-0.1) * 100).toFixed(1)}\\%$`);
    expect(said(glass)).toContain(`= ${Math.round(2.44e-8 * 5.96e7 * 300)}$ W`);
    expect(said(rod)).toContain(`= ${(23.6e-6 * 350 * 70).toFixed(3)}$ mm`);
    expect(said(rod)).toContain(`= ${Math.round(69000 * 23.6e-6 * 70)}$ MPa`);
    const [c, threeR] = figure(s).series;
    expect(c.f(0)).toBe(0);
    expect(c.f(1.5)).toBeLessThan(threeR.f(0));
    expect(c.f(1.5)).toBeGreaterThan(0.95 * threeR.f(0));
  });

  it('Corrosion: penetration rate, the Tafel crossing', () => {
    const s = section('Corrosion');
    const [cpr, tafel] = s.examples;
    expect(said(cpr)).toContain(`= ${(((1 * 0.05585) / (2 * 96485 * 7870)) * 3.156e10).toFixed(2)}$ mm/yr`);
    const L = -0.58 / 0.16;
    expect(said(tafel)).toContain(`L = ${L.toFixed(3)}$`);
    expect(said(tafel)).toContain(`= ${(10 ** L * 1e4).toFixed(1)} \\times 10^{-4}$`);
    expect(said(tafel)).toContain(`= ${(-0.1 * (L + 6)).toFixed(2)}$ V`);
    const f = figure(s);
    const [iron, hyd] = f.series;
    expect(iron.f(f.marks[0].x)).toBeCloseTo(hyd.f(f.marks[0].x), 12);
  });

  it('Economics: tie masses and costs', () => {
    const [mass, cost] = section('Economic, Environmental and Societal Issues').examples;
    const steel = (2 * 50000 * 7850) / 250e6;
    const al = (2 * 50000 * 2700) / 255e6;
    expect(said(mass)).toContain(`= ${steel.toFixed(2)}$ kg`);
    expect(said(mass)).toContain(`= ${al.toFixed(2)}$ kg`);
    expect(said(cost)).toContain(`= ${(1.06 * 3.5).toFixed(2)}$`);
  });
});
