// Fluid Mechanics in the module format (2026-11-25): every number in the
// topic's worked examples, checks and figures, worked again, so a slip in the
// text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/esas/fluid-mechanics.js';
import { sectionFor } from './lessonContent';

const G = 9.81;
const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s) => s.body.find((b) => typeof b !== 'string' && b.type === 'plot');
const area = (d) => (Math.PI * d * d) / 4;
const v1 = 0.1 / area(0.3);
const v2 = 0.1 / area(0.15);

describe('Fluid Mechanics, worked again', () => {
  it('Fluid Properties: oil, film, air density, squeezed water, the curves', () => {
    const s = section('Fluid Properties');
    const [oil, air] = s.examples;
    expect(said(oil)).toContain(`= ${(0.85 * G).toFixed(2)}$ kN/m³`);
    expect(said(oil)).toContain(`= ${(0.4 * 2) / 0.001}$ Pa`);
    expect(said(air)).toContain(`= ${(101300 / (287 * 303.15)).toFixed(3)}$ kg/m³`);
    expect(said(air)).toContain(`= ${((10 / 2200) * 100).toFixed(3)}\\%`);
    const [n, thin, thick] = figure(s).series;
    expect(n.f(1)).toBe(1);
    expect(thin.f(1)).toBeGreaterThan(1);
    expect(thick.f(1)).toBeLessThan(1);
  });

  it('Pressure and Manometers: U-tube, hill, the pressure line', () => {
    const s = section('Pressure and Manometers');
    const [mano, hill] = s.examples;
    expect(said(mano)).toContain(`${(13.6 * G * 0.25).toFixed(2)} - ${(G * 0.3).toFixed(2)} = ${(13.6 * G * 0.25 - G * 0.3).toFixed(1)}$ kPa`);
    const dp = 13.6 * 9810 * 0.08;
    expect(said(hill)).toContain(`= ${Math.round(dp).toString().replace(/(\d)(\d{3})$/, '$1\\,$2')}$ Pa`);
    expect(said(hill)).toContain(`= ${Math.round(dp / 12)}$ m`);
    const f = figure(s);
    expect(f.series[0].f(101.3 / G)).toBeCloseTo(202.6, 9);
    expect(f.marks[0].label).toBe(`${(101.3 / G).toFixed(2)} m`);
  });

  it('Hydrostatic Forces: rectangular and circular gates, the trapezoid', () => {
    const s = section('Hydrostatic Forces');
    const [rect, circ] = s.examples;
    expect(said(rect)).toContain(`= ${(G * 2.5 * 6).toFixed(1)}$ kN`);
    expect(2.5 + (2 * 27) / 12 / (2.5 * 6)).toBeCloseTo(2.8, 12);
    expect(said(circ)).toContain(`= ${(G * Math.PI).toFixed(1)}$ kN`);
    expect(1 + Math.PI / 4 / Math.PI).toBe(1.25);
    const [gate, line] = figure(s).series;
    expect(gate.f(0.5)).toBe(0);
    expect(gate.f(4)).toBeCloseTo(39.24, 9);
    expect(line.f(2.5)).toBeCloseTo(24.525, 9);
  });

  it('Buoyancy: barge, iceberg, weighing, the GM line', () => {
    const s = section('Buoyancy');
    const [barge, ice] = s.examples;
    const BM = (10 * 4 ** 3) / 12 / (10 * 4 * 1.5);
    expect(said(barge)).toContain(`= ${BM.toFixed(3)}$ m`);
    expect(said(barge)).toContain(`= ${(0.75 + BM - 1.2).toFixed(2)}$ m`);
    expect(said(barge)).toContain(`= ${(0.75 + BM - 2).toFixed(2)}$ m`);
    expect(said(ice)).toContain(`= ${(917 / 1025).toFixed(3)}$, so ${((1 - 917 / 1025) * 100).toFixed(1)}%`);
    expect(said(ice)).toContain(`= ${2000 / (2000 - 1750)}$`);
    expect(said(ice)).toContain(`= ${(2000 - 1800) / (2000 - 1750)}$`);
    const f = figure(s);
    expect(f.series[0].f(f.marks[0].x)).toBeCloseTo(0, 12);
    expect(f.marks[0].x.toFixed(2)).toBe('1.64');
  });

  it('Relative Equilibrium: paraboloid, tilt, lift, the surface', () => {
    const s = section('Relative Equilibrium');
    const [spin, lift] = s.examples;
    expect(said(spin)).toContain(`= ${((100 * 0.09) / (2 * G)).toFixed(3)}$ m`);
    expect(said(spin)).toContain(`= ${((Math.atan(3 / G) * 180) / Math.PI).toFixed(1)}°`);
    expect(said(lift)).toContain(`= ${(G * 2 * (1 + 4.9 / G)).toFixed(2)}$ kPa`);
    expect(said(lift)).toContain(`${(G * 2).toFixed(2)} at rest`);
    const [surface, still] = figure(s).series;
    expect(still.f(0)).toBeCloseTo(surface.f(0.3) / 2, 12);
  });

  it('Continuity Equation: reducer, branch, the velocity curve', () => {
    const s = section('Continuity Equation');
    const [reducer, branch] = s.examples;
    expect(said(reducer)).toContain(`= ${v1.toFixed(2)}$ m/s`);
    expect(said(reducer)).toContain(`= ${v2.toFixed(2)}$ m/s`);
    const q1 = area(0.15) * 4;
    expect(said(branch)).toContain(`= ${q1.toFixed(4)}$ m³/s`);
    expect(said(branch)).toContain(`= ${(0.2 - q1).toFixed(4)}$ m³/s`);
    expect(said(branch)).toContain(`= ${((0.2 - q1) / area(0.2)).toFixed(2)}$ m/s`);
    expect(figure(s).series[0].f(0.3)).toBeCloseTo(v1, 12);
  });

  it('Bernoulli and Energy Equations: venturi, pump, pitot, jet, the grade lines', () => {
    const s = section('Bernoulli and Energy Equations');
    const [venturi, pitot] = s.examples;
    expect(said(venturi)).toContain(`= ${((v2 ** 2 - v1 ** 2) / (2 * G)).toFixed(2)}$ m`);
    expect(said(venturi)).toContain(`= ${(9810 * 0.05 * 46 / 1000).toFixed(1)}$ kW`);
    expect(said(pitot)).toContain(`= ${Math.sqrt(2 * G * 0.5).toFixed(2)}$ m/s`);
    const Q = area(0.05) * 20;
    expect(said(pitot)).toContain(`= ${Q.toFixed(4)}$ m³/s`);
    expect(said(pitot)).toContain(`= ${((9810 * Q * 400) / (2 * G) / 1000).toFixed(2)}$ kW`);
    const [hgl, egl] = figure(s).series;
    expect(egl.f(2) - hgl.f(2)).toBeCloseTo(v1 ** 2 / (2 * G), 4);
    expect(hgl.f(2) - hgl.f(8)).toBeCloseTo((v2 ** 2 - v1 ** 2) / (2 * G), 4);
  });

  it('Momentum: bend, jet reaction, the vane-power curve', () => {
    const s = section('Momentum');
    const [bend, jet] = s.examples;
    const A = area(0.2);
    const v = 0.1 / A;
    const each = 150000 * A + 1000 * 0.1 * v;
    expect(said(bend)).toContain(`= ${Math.round(150000 * A)} + ${Math.round(100 * v)} = ${Math.round(each)}$ N`);
    expect(said(bend)).toContain(`= ${((Math.SQRT2 * each) / 1000).toFixed(2)}$ kN`);
    expect(said(jet)).toContain(`= ${2 * 9810 * 5 * 0.01}$ N`);
    expect(figure(s).series[0].f(0.5)).toBe(1);
  });

  it('Pipe Flow and Head Losses: friction, laminar oil, the friction factor', () => {
    const s = section('Pipe Flow and Head Losses');
    const [pipe, oil] = s.examples;
    expect(said(pipe)).toContain(`= ${((0.02 * 500) / 0.3 * v1 ** 2 / (2 * G)).toFixed(2)}$ m`);
    const f = 64 / 1500;
    expect(said(oil)).toContain(`= ${Math.round((1.5 * 0.1) / 1e-4)}$`);
    expect(said(oil)).toContain(`= ${f.toFixed(4)}$`);
    expect(said(oil)).toContain(`= ${((f * 1000 * 2.25) / (2 * G)).toFixed(2)}$ m`);
    const [lam, turb] = figure(s).series;
    for (const [re, f] of lam.points) expect(f).toBeCloseTo(64 / re, 12);
    for (const [re, f] of turb.points) expect(f).toBeCloseTo(0.316 / re ** 0.25, 12);
    expect(lam.points.at(-1)[0]).toBeCloseTo(2000, 9);
    expect(turb.points[0][0]).toBeCloseTo(4000, 9);
  });

  it('Pipes in Series and Parallel: the split, equivalent length', () => {
    const [par, eq] = section('Pipes in Series and Parallel').examples;
    const k1 = Math.sqrt(0.3 ** 5 / 500);
    const k2 = Math.sqrt(0.2 ** 5 / 800);
    const q1 = (0.2 * k1) / (k1 + k2);
    expect(said(par)).toContain(`${q1.toFixed(3)} and ${(0.2 - q1).toFixed(3)} m³/s`);
    const loss = (L, D, q) => (8 * 0.02 * L * q * q) / (G * Math.PI ** 2 * D ** 5);
    expect(said(par)).toContain(`= ${loss(500, 0.3, q1).toFixed(1)}$ m`);
    expect(loss(800, 0.2, 0.2 - q1)).toBeCloseTo(loss(500, 0.3, q1), 9);
    expect(said(eq)).toContain(`= ${Math.round(300 * 1.5 ** 5)}$ m`);
  });

  it('Orifices and Weirs: draining time, two weirs, the draining curve', () => {
    const s = section('Orifices and Weirs');
    const [drain, weirs] = s.examples;
    const t = (2 * 2 * (2 - 1)) / (0.61 * 0.002 * Math.sqrt(2 * G));
    expect(said(drain)).toContain(`= ${Math.round(t)}$ s`);
    expect(said(weirs)).toContain(`= ${(1.38 * 0.3 ** 2.5).toFixed(4)}$ m³/s`);
    expect(said(weirs)).toContain(`= ${(1.84 * (2 - 0.1 * 2 * 0.4) * 0.4 ** 1.5).toFixed(3)}$ m³/s`);
    const h = figure(s).series[0].f;
    expect(h(0)).toBeCloseTo(4, 12);
    expect(h(t)).toBeCloseTo(1, 9);
    expect(h(2 * t)).toBeCloseTo(0, 9);
  });

  it('Open Channels: Manning, critical depth, the jump, specific energy', () => {
    const s = section('Open Channels');
    const [channel, jump] = s.examples;
    const v = (1 / 0.013) * 0.75 ** (2 / 3) * Math.sqrt(0.001);
    expect(said(channel)).toContain(`= ${v.toFixed(2)}$ m/s; $Q = ${(4.5 * v).toFixed(2)}$`);
    const yc = Math.cbrt(9 / G);
    expect(said(channel)).toContain(`= ${yc.toFixed(2)}$ m`);
    const Fr = 6 / Math.sqrt(G * 0.4);
    expect(said(jump)).toContain(`= ${Fr.toFixed(2)}$`);
    expect(said(jump)).toContain(`= ${(0.2 * (Math.sqrt(1 + 8 * Fr * Fr) - 1)).toFixed(2)}$ m`);
    const f = figure(s);
    expect(f.series[0].f(yc)).toBeCloseTo(1.5 * yc, 12);
    expect((1.5 * yc).toFixed(2)).toBe('1.46');
    expect(s.check[1].a).toContain(`${(4 / 6).toFixed(3)}`);
  });

  it('Pumps and Turbines: affinity, shaft power, NPSH, the curves', () => {
    const s = section('Pumps and Turbines');
    const [aff, shaft] = s.examples;
    const k = 1450 / 1750;
    expect(said(aff)).toContain(`= ${(0.05 * k).toFixed(4)}$ m³/s`);
    expect(said(aff)).toContain(`= ${(30 * k * k).toFixed(1)}$ m`);
    expect(said(aff)).toContain(`= ${Math.round(k ** 3 * 100)}\\%`);
    expect(said(shaft)).toContain(`= ${((9810 * 0.05 * 30) / 0.75 / 1000).toFixed(2)}$ kW`);
    expect(said(shaft)).toContain(`= ${(10.33 - 4 - 1 - 0.24).toFixed(2)}$ m`);
    const [fast, slow] = figure(s).series;
    expect(fast.f(0.05)).toBeCloseTo(30, 9);
    // The slowed curve is the affinity image of the first: the scaled duty point lies on it.
    expect(slow.f(0.05 * k)).toBeCloseTo(30 * k * k, 9);
  });
});
