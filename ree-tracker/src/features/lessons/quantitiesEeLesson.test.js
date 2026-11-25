// Quantities/units/constants (EE) in the module format (2026-11-25): every
// number in the topic's worked examples, checks and figures, worked again, so a
// slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/quantities-units-constants-ee.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s) => s.body.find((b) => typeof b !== 'string' && b.type === 'plot');
const crossing = (f, level, a, b, n = 200000) => { const s0 = Math.sign(f(a) - level); for (let k = 1; k <= n; k++) { const x = a * (b / a) ** (k / n); if (Math.sign(f(x) - level) !== s0) return x; } return NaN; };

describe('Quantities/units/constants (EE), worked again', () => {
  it('SI Electrical Units: time constant, charge, battery energy', () => {
    const [basic, battery] = section('SI Electrical Units').examples;
    expect(said(basic)).toContain(`= ${(0.05 / 10) * 1000}$ ms`);
    expect(said(basic)).toContain(`= ${2 * 3600}$ C`);
    expect(said(battery)).toContain(`= 360\\,000$ C`);
    expect(said(battery)).toContain(`= ${(1.2 * 3.6).toFixed(2)}$ MJ`);
  });

  it('Prefixes: kΩ × µF, MΩ × nF', () => {
    const [basic, board] = section('Prefixes').examples;
    expect(said(basic)).toContain(`= ${(4.7 * 2.2).toFixed(2)}$ ms`);
    expect(said(basic)).toContain(`= ${(12 / 4.7).toFixed(2)}$ mA`);
    expect((2.2e6 * 4.7e-9 * 1000).toFixed(2)).toBe('10.34');
    expect(said(board)).toContain(`= ${((5 / 2.2e6) * 1e6).toFixed(2)}$ µA`);
  });

  it('Resistivity and Conductivity: drawn wire, aluminium against copper, the curve', () => {
    const s = section('Resistivity and Conductivity');
    const [drawn, al] = s.examples;
    const R100 = 1.7241e-8 * 8890 * 100 ** 2;
    expect(said(drawn)).toContain(`= ${R100.toFixed(2)}$ Ω`);
    expect(said(drawn)).toContain(`${(9 * R100).toFixed(1)} Ω`);
    expect(said(al)).toContain(`= ${(2.83 / 1.72).toFixed(3)}$`);
    expect(said(al)).toContain(`= ${((2.83 / 1.72) * (2700 / 8890)).toFixed(3)}$`);
    const [d, fixed] = figure(s).series;
    expect(d.f(300)).toBeCloseTo(9 * R100, 9);
    expect(fixed.f(300)).toBeCloseTo(3 * R100, 9);
  });

  it('Temperature Coefficients: heat run, α at 75 °C, series α, the line', () => {
    const s = section('Temperature Coefficients');
    const [run, series] = s.examples;
    const t2 = (0.6 / 0.5) * 254.5 - 234.5;
    expect(said(run)).toContain(`= ${t2.toFixed(1)}$ °C`);
    expect(said(run)).toContain(`= ${(1 / 309.5).toFixed(5)}$/°C`);
    expect(said(series)).toContain(`= ${((0.00393 * 10 - 0.0005 * 20) / 30).toFixed(6)}$/°C`);
    const f = figure(s).series[0].f;
    expect(f(20)).toBeCloseTo(0.5, 9);
    expect(f(t2)).toBeCloseTo(0.6, 9);
    expect(f(-234.5)).toBeCloseTo(0, 9);
    expect((1 / 254.5).toFixed(5)).toBe('0.00393');
  });

  it('Permittivity and Permeability: capacitor, core, cable, the B–H curve', () => {
    const s = section('Permittivity and Permeability');
    const [basic, cable] = s.examples;
    expect(said(basic)).toContain(`= ${((8.854e-12 * 6 * 0.01) / 1e-4 * 1e9).toFixed(2)}$ nF`);
    expect(said(basic)).toContain(`(${((8.854e-12 * 0.01) / 1e-4 * 1e9).toFixed(3)} nF in air)`);
    expect(said(basic)).toContain(`= ${(4 * Math.PI * 1e-7 * 4000 * 100).toFixed(3)}$ T`);
    const C = (2 * Math.PI * 8.854e-12 * 2.3) / Math.log(2.5);
    expect(said(cable)).toContain(`= ${(C * 1e10).toFixed(2)} \\times 10^{-10}$ F/m`);
    expect(said(cable)).toContain(`${(C * 1e9).toFixed(3)} µF`);
    const [bh, lin] = figure(s).series;
    expect(bh.f(1000)).toBeLessThan(1.8);
    expect(bh.f(10) / lin.f(10)).toBeCloseTo(1, 2);
  });

  it('Magnetic Units (SI and CGS): a coil in CGS, lines per square inch', () => {
    const [coil, lines] = section('Magnetic Units (SI and CGS)').examples;
    const H = (0.4 * Math.PI * 1000) / 20;
    expect(said(coil)).toContain(`= ${H.toFixed(1)}$ Oe $= ${Math.round(H * 79.577)}$ A/m`);
    expect(said(coil)).toContain(`= ${(1.2 * 64.52).toFixed(1)}$ kilolines`);
    expect(said(lines)).toContain(`= ${(50 / 64.52).toFixed(3)}$ T`);
    expect((1e8 * 0.0254 ** 2) / 1000).toBeCloseTo(64.52, 2);
  });

  it('Wire Gauges: area ratio, kcmil, resistance, drop, the AWG curve', () => {
    const s = section('Wire Gauges');
    const [basic, drop] = s.examples;
    expect(said(basic)).toContain(`= ${Math.round(250 * 0.5067)}$ mm²`);
    expect(said(basic)).toContain(`= ${((17.24 / 5.26) * 0.2).toFixed(3)}$ Ω`);
    const R = (17.24 / 3.31) * 0.06;
    expect(said(drop)).toContain(`= ${R.toFixed(4)}$ Ω`);
    expect(said(drop)).toContain(`= ${(15 * R).toFixed(2)}$ V`);
    const A = figure(s).series[0].f;
    expect(A(10)).toBeCloseTo(5.26, 2);
    expect(A(4) / A(10)).toBeCloseTo(4, 1);
  });

  it('Power and Energy Conversions: motor, heater, tank, heat, the line', () => {
    const s = section('Power and Energy Conversions');
    const [basic, heat] = s.examples;
    expect(said(basic)).toContain(`= ${((50 * 746) / (Math.sqrt(3) * 460 * 0.9 * 0.85)).toFixed(1)}$ A`);
    const t = (50 * 4186 * 50) / (0.9 * 2000);
    expect(said(basic)).toContain(`= ${Math.round(t)}$ s $= ${(t / 3600).toFixed(2)}$ h`);
    expect(said(heat)).toContain(`= ${(15000 / 1055).toFixed(1)}$ BTU`);
    expect(0.24 * 25 * 10 * 60).toBe(3600);
    const f = figure(s).series[0].f;
    expect(f(t / 3600)).toBeCloseTo(75, 9);
  });

  it('Physical Constants: electron speed, thermal voltage, KJ, RK, the curves', () => {
    const s = section('Physical Constants');
    const [electron, quantum] = s.examples;
    expect(said(electron)).toContain(`= ${(Math.sqrt(2 * 1.7588e11 * 100) / 1e6).toFixed(2)} \\times 10^6$ m/s`);
    const e = 1.602176634e-19;
    const h = 6.62607015e-34;
    expect(said(quantum)).toContain(`= ${((1.380649e-23 * 298.15) / e * 1000).toFixed(2)}$ mV`);
    expect(said(quantum)).toContain(`= 483\\,${((2 * e) / h / 1e9 - 483000).toFixed(1)}$ GHz/V`);
    expect(said(quantum)).toContain(`= 25\\,${(h / e ** 2 - 25000).toFixed(3)}$ Ω`);
    const [rel, cls] = figure(s).series;
    expect(crossing(cls.f, 2.99792458, 0.01, 1000)).toBeCloseTo(255.5, -1);
    for (const kv of [0.01, 1, 100, 1000]) expect(rel.f(kv)).toBeLessThan(2.99792458);
    expect(rel.f(0.1) / cls.f(0.1)).toBeCloseTo(1, 3);
  });
});
