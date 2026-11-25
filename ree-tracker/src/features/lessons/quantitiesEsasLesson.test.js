// Quantities/units/constants (ESAS) in the module format (2026-11-25): every
// number in the topic's worked examples and figures worked again, so a slip
// in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { GM, R_EARTH, G0 } from './content/esas/quantities-units-constants-esas.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s, type = 'plot') => s.body.find((b) => typeof b !== 'string' && b.type === type);

describe('Quantities/units/constants (ESAS), worked again', () => {
  it('SI units: the derived chain', () => {
    const d = figure(section('SI Base and Derived Units'), 'blocks');
    expect(d.links.map(([, , o]) => o.label)).toEqual(['× m', '÷ s', '÷ A', '÷ A']);
  });

  it('Prefixes: Ohm’s law, areas, capacitors', () => {
    const [basic, board] = section('Prefixes').examples;
    expect(2.5e6 * 4e-6).toBeCloseTo(10, 12);
    expect(said(basic)).toContain('= 10$ V');
    expect(470 + 330).toBe(800);
    expect(said(board)).toContain('= 800$ nF');
    expect((1e-3) ** 3).toBeCloseTo(1e-9, 20);
  });

  it('Unit Conversion: pressure, speed, airflow, density, sound', () => {
    const [basic, board] = section('Unit Conversion').examples;
    expect(said(basic)).toContain(`= ${(100 * 6.895).toFixed(1)}$ kPa`);
    expect(said(basic)).toContain(`= ${((60 * 1609.344) / 3600).toFixed(1)}$ m/s`);
    expect(said(board)).toContain(`= ${(25 * 35.3147).toFixed(1)}$ cfm`);
    expect(said(board)).toContain(`= ${(1500 * 0.062428).toFixed(2)}$ lb/ft³`);
    expect(said(board)).toContain(`= ${(343 / 0.3048).toFixed(1)}$ ft/s`);
  });

  it('Mechanical Quantities: a motor, a hoist, the power lines', () => {
    const s = section('Mechanical Quantities');
    const [motor, hoist] = s.examples;
    const kw = (100 * 1800) / 9549;
    expect(said(motor)).toContain(`= ${kw.toFixed(2)}$ kW`);
    expect(said(motor)).toContain(`= ${(18850 / 745.7).toFixed(1)}$ hp`);
    const P = 2000 * G0 * 0.5;
    expect(said(hoist)).toContain(`= ${Math.round(P)}$ W, ${(P / 1000).toFixed(2)} kW`);
    expect(said(hoist)).toContain(`= ${(Math.round(P) / 745.7).toFixed(2)}$ hp`);
    expect(said(hoist)).toContain(`= ${((9549 * 9.807) / 1450).toFixed(1)}$ N·m`);
    expect((60 * 1000) / (2 * Math.PI)).toBeCloseTo(9549, 0);
    expect(figure(s).series[1].f(1800)).toBeCloseTo(kw, 12);
  });

  it('Thermal Quantities: BTU, a rise, twice the reading, an air conditioner, the −40 crossing', () => {
    const s = section('Thermal Quantities');
    const [btu, board] = s.examples;
    expect(said(btu)).toContain(`= ${Math.round(3.6e6 / 1055.06)}$ BTU`);
    const C = 32 / (2 - 1.8);
    expect(C).toBeCloseTo(160, 9);
    expect(said(board)).toContain(`$C = ${Math.round(C)}$ °C, ${Math.round(1.8 * C + 32)} °F, ${(C + 273.15).toFixed(2)} K`);
    expect(said(board)).toContain(`= ${((100000 * 1055.06) / 3600 / 1000).toFixed(1)}$ kW`);
    expect(said(board)).toContain(`= ${(100000 / 12000).toFixed(2)}$ TR`);
    const [f, eq] = figure(s).series;
    expect(f.f(-40)).toBeCloseTo(eq.f(-40), 12);
  });

  it('Physical Constants: g at the surface and at 400 km, a satellite delay', () => {
    const s = section('Physical Constants');
    const [g, board] = s.examples;
    expect(said(g)).toContain(`= ${(GM / R_EARTH ** 2).toFixed(2)}$ m/s²`);
    expect(said(board)).toContain(`= ${(GM / (R_EARTH + 4e5) ** 2).toFixed(2)}$ m/s²`);
    expect(said(board)).toContain(`= ${(35786e3 / 299792458).toFixed(3)}$ s`);
    expect(figure(s).series[0].f(400)).toBeCloseTo(GM / (R_EARTH + 4e5) ** 2, 12);
  });

  it('Chemical Constants: water, a cubic metre of gas, copper', () => {
    const [water, board] = section('Chemical Constants').examples;
    expect(said(water)).toContain(`= ${(1000 / 18.015).toFixed(1)}$ mol`);
    expect(said(water)).toContain(`${((1000 / 18.015) * 6.022e23 / 1e25).toFixed(2)} \\times 10^{25}`);
    expect(said(board)).toContain(`= ${((1000 / 22.414) * 6.022e23 / 1e25).toFixed(2)} \\times 10^{25}$`);
    expect(said(board)).toContain(`= ${(2 * 96485).toLocaleString('en-US').replace(',', '\\,')}$ C`);
  });

  it('Dimensional Analysis: groups, the pendulum curve', () => {
    const s = section('Dimensional Analysis');
    const [, drag] = s.examples;
    expect(5 - 3).toBe(2);
    expect(said(drag)).toContain('= 2$ groups');
    const T = figure(s).series[0].f;
    expect(T(1)).toBeCloseTo(2.006, 3);
    expect(T(4)).toBeCloseTo(2 * T(1), 12);
  });
});
