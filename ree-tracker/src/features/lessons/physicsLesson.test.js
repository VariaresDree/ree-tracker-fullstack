// Physics for Engineers in the module format (2026-11-25): every number in the
// topic's worked examples, checks and figures, worked again, so a slip in the
// text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/esas/physics-for-engineers.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s) => s.body.find((b) => typeof b !== 'string' && b.type === 'plot');
const g = 9.81;
const rad = (d) => (d * Math.PI) / 180;
const argmax = (f, a, b, n = 100000) => { let best = a; for (let k = 0; k <= n; k++) { const x = a + ((b - a) * k) / n; if (f(x) > f(best)) best = x; } return best; };

describe('Physics for Engineers, worked again', () => {
  it('Kinematics: drop, throw, range, the two paths', () => {
    const s = section('Kinematics');
    const [basic, range] = s.examples;
    const t = Math.sqrt(90 / g);
    expect(said(basic)).toContain(`= ${t.toFixed(2)}$ s`);
    expect(said(basic)).toContain(`= ${(g * t).toFixed(1)}$ m/s`);
    expect(said(basic)).toContain(`= ${((60 * Math.sin(rad(40))) / g).toFixed(2)}$ s`);
    expect(said(basic)).toContain(`= ${((30 * Math.sin(rad(40))) ** 2 / (2 * g)).toFixed(2)}$ m`);
    const R = (900 * Math.sin(rad(80))) / g;
    expect(said(range)).toContain(`= ${R.toFixed(2)}$ m`);
    expect(said(range)).toContain(`= ${(900 / g).toFixed(2)}$ m`);
    const [p40, p50] = figure(s).series;
    expect(p40.f(R / 2)).toBeCloseTo(((30 * Math.sin(rad(40))) ** 2) / (2 * g), 6);
    expect(p50.f(R / 2)).toBeCloseTo(((30 * Math.sin(rad(50))) ** 2) / (2 * g), 6);
    expect(((30 * Math.sin(rad(50))) ** 2 / (2 * g)).toFixed(1)).toBe('26.9');
  });

  it('Dynamics: orbit, lift, g at height, escape', () => {
    const s = section('Dynamics');
    const [orbit, high] = s.examples;
    const r = 6.771e6;
    const v = Math.sqrt(3.986e14 / r);
    expect(said(orbit)).toContain(`= ${(v / 1000).toFixed(2)}$ km/s`);
    expect(said(orbit)).toContain(`= ${Math.round((2 * Math.PI * r) / v)}$ s $= ${((2 * Math.PI * r) / v / 60).toFixed(1)}$ min`);
    expect(said(orbit)).toContain(`= ${(60 * (g + 2)).toFixed(1)}$ N`);
    expect(said(high)).toContain(`= ${(g * (6371 / 6771) ** 2).toFixed(2)}$ m/s²`);
    expect(said(high)).toContain(`= ${(Math.sqrt((2 * 3.986e14) / 6.371e6) / 1000).toFixed(2)}$ km/s`);
    expect(figure(s).series[0].f(400)).toBeCloseTo(g * (6371 / 6771) ** 2, 9);
  });

  it('Work, Energy and Power: slide, spring, friction, hoist', () => {
    const s = section('Work, Energy and Power');
    const [basic, board] = s.examples;
    expect(said(basic)).toContain(`= ${Math.sqrt(2 * g * 5).toFixed(2)}$ m/s`);
    expect(said(basic)).toContain(`= ${0.5 * 400 * 0.15 ** 2}$ J`);
    expect(said(board)).toContain(`= ${(2 * g * 5 - 64).toFixed(1)}$ J`);
    const P = (500 * g * 10) / 20;
    expect(said(board)).toContain(`= ${Math.round(P)}$ W $= ${(P / 1000).toFixed(2)}$ kW $= ${(P / 746).toFixed(2)}$ hp`);
    const [pe, ke, total] = figure(s).series;
    for (const h of [0, 1.7, 5]) expect(pe.f(h) + ke.f(h)).toBeCloseTo(total.f(h), 9);
  });

  it('Impulse and Momentum: elastic, stuck, impulse, restitution, the pulse area', () => {
    const s = section('Impulse and Momentum');
    const [carts, bounce] = s.examples;
    const v1 = ((2 - 3) / 5) * 5 + ((2 * 3) / 5) * -1;
    const v2 = ((2 * 2) / 5) * 5 + ((3 - 2) / 5) * -1;
    expect(said(carts)).toContain(`= ${v1.toFixed(1)}$ m/s`);
    expect(said(carts)).toContain(`= ${v2.toFixed(1)}$ m/s`);
    expect(2 * v1 + 3 * v2).toBeCloseTo(7, 9);
    expect(said(carts)).toContain(`= ${(10 - 3) / 5}$ m/s`);
    expect(said(bounce)).toContain(`= ${0.2 * 50}$ N·s`);
    expect(said(bounce)).toContain(`= ${Math.sqrt(1.28 / 2)}$`);
    const F = figure(s).series[0].f;
    let J = 0;
    for (let k = 0; k < 12000; k++) J += F((k + 0.5) / 1000) * 1e-6;
    expect(J).toBeCloseTo(10, 3);
  });

  it('Rotation: rolling, flywheel', () => {
    const s = section('Rotation');
    const [roll, fly] = s.examples;
    expect(said(roll)).toContain(`= ${Math.sqrt(39.24 / 1.5).toFixed(2)}$ m/s`);
    expect(said(roll)).toContain(`= ${Math.sqrt(39.24 / 2).toFixed(2)}$ m/s`);
    const w = (1200 * 2 * Math.PI) / 60;
    expect(said(fly)).toContain(`= ${0.5 * 50 * 0.16}$ kg·m²; $\\omega`);
    expect(said(fly)).toContain(`= ${w.toFixed(1)}$ rad/s`);
    expect(said(fly)).toContain(`= ${((0.5 * 4 * w * w) / 1000).toFixed(1)}$ kJ`);
    expect(said(fly)).toContain(`= ${(4 * (w / 10)).toFixed(1)}$ N·m`);
    const [, disc, ring] = figure(s).series;
    expect(disc.f(2)).toBeCloseTo(Math.sqrt(39.24 / 1.5), 9);
    expect(ring.f(2)).toBeCloseTo(Math.sqrt(39.24 / 2), 9);
  });

  it('Elasticity: rod, shear modulus, springs', () => {
    const s = section('Elasticity');
    const [rod, board] = s.examples;
    expect(said(rod)).toContain(`= ${50000 / 2e-4 / 1e6}$ MPa`);
    expect(said(rod)).toContain(`= ${((50000 * 2) / (2e-4 * 200e9)) * 1000}$ mm`);
    expect(said(board)).toContain(`= ${(200 / 2.54).toFixed(2)}$ GPa`);
    expect(said(board)).toContain(`= ${(300 * 600) / 900}$ N/m`);
    expect(figure(s).series[0].f(figure(s).marks[0].x)).toBeCloseTo(250, 9);
  });

  it('Oscillations and Waves: spring, pendulum, harmonics, string', () => {
    const s = section('Oscillations and Waves');
    const [spring, board] = s.examples;
    expect(said(spring)).toContain(`= ${((2 * Math.PI) / 10).toFixed(3)}$ s`);
    expect(said(spring)).toContain(`= ${0.5 * 50 * 0.01}$ J`);
    expect(said(board)).toContain(`= ${(2 * Math.PI * Math.sqrt(2.5 / g)).toFixed(2)}$ s`);
    expect(said(board)).toContain(`= ${360 / 4}$ Hz`);
    expect(said(board)).toContain(`= ${Math.sqrt(800 / 0.008).toFixed(1)}$ m/s`);
    const [pe, ke, total] = figure(s).series;
    expect(pe.f(0.3) + ke.f(0.3)).toBeCloseTo(total.f(0.3), 9);
  });

  it('Sound: Doppler, crowd, receding listener, hot air', () => {
    const s = section('Sound');
    const [siren, board] = s.examples;
    expect(said(siren)).toContain(`= ${((500 * 343) / 313).toFixed(1)}$ Hz`);
    expect(said(siren)).toContain(`= ${((500 * 343) / 373).toFixed(1)}$ Hz`);
    expect(said(board)).toContain(`= ${(40 + 10 * Math.log10(20)).toFixed(1)}$ dB`);
    expect(said(board)).toContain(`= ${((600 * 318) / 343).toFixed(1)}$ Hz`);
    expect(said(board)).toContain(`= ${331 + 18}$ m/s`);
    expect(figure(s).series[0].f(30)).toBeCloseTo((500 * 343) / 313, 9);
  });

  it('Fluids: press, capillary, terminal velocity, absolute pressure', () => {
    const s = section('Fluids');
    const [basic, board] = s.examples;
    expect(said(basic)).toContain(`= ${((2 * 0.0728) / (1000 * g * 0.0005)).toFixed(4)}$ m`);
    const vt = (2 * 1e-6 * (7800 - 1260) * g) / (9 * 1.49);
    expect(said(board)).toContain(`= ${(vt * 1000).toFixed(2)}$ mm/s`);
    expect(said(board)).toContain(`= ${(101.3 + (1000 * g * 10) / 1000).toFixed(1)}$ kPa`);
    const h = figure(s).series[0].f;
    expect(h(0.5)).toBeCloseTo(((2 * 0.0728) / (1000 * g * 0.0005)) * 1000, 9);
    expect(Math.round(h(0.1))).toBe(148);
  });

  it('Heat Transfer: ice to steam, wall, rms speed, kinetic energy, radiation, the curve', () => {
    const s = section('Heat Transfer');
    const [basic, board] = s.examples;
    expect(said(basic)).toContain(`= ${Math.round(334 + 418.6 + 2257)}$ kJ`);
    expect(said(basic)).toContain(`= ${(0.8 * 10 * 25) / 0.2}$ W`);
    expect(said(board)).toContain(`= ${Math.round(Math.sqrt((3 * 8.314 * 293.15) / 0.028))}$ m/s`);
    expect(said(board)).toContain(`= ${(1.5 * 1.381e-23 * 300 * 1e21).toFixed(2)} \\times 10^{-21}$ J`);
    expect(said(board)).toContain(`= ${Math.round(5.67e-8 * (500 ** 4 - 300 ** 4))}$ W`);
    const T = figure(s).series[0].f;
    expect(T(334)).toBe(0);
    expect(T(334 + 418.6)).toBeCloseTo(100, 9);
    expect(T(3000)).toBe(100);
  });

  it('Electrostatics: Coulomb, capacitor, combinations', () => {
    const [basic, combo] = section('Electrostatics').examples;
    expect(said(basic)).toContain(`= ${((8.99e9 * 6e-12) / 0.09).toFixed(3)}$ N`);
    expect(said(basic)).toContain(`= ${Math.round(((8.854e-12 * 0.02) / 0.001) * 1e12)}$ pF`);
    expect(said(combo)).toContain(`= ${(2 * 3) / 5}$ µF`);
    expect(said(combo)).toContain(`= ${0.5 * 1.2e-6 * 1e4 * 1000}$ mJ`);
  });

  it('Electricity: wire, battery, maximum power, the curve', () => {
    const s = section('Electricity');
    const [basic, mp] = s.examples;
    expect(said(basic)).toContain(`= ${((1.72e-8 * 100) / 1e-6).toFixed(2)}$ Ω`);
    expect(said(basic)).toContain(`= ${12 / 2.5}$ A`);
    expect(said(basic)).toContain(`= ${12 - 4.8 * 0.5}$ V`);
    expect(said(mp)).toContain(`= ${12 ** 2 * 0.5}$ W`);
    expect(said(mp)).toContain(`= ${(4.8 ** 2 * 2).toFixed(1)}$ W`);
    const P = figure(s).series[0].f;
    expect(argmax(P, 0, 5)).toBeCloseTo(0.5, 3);
    expect(P(0.5)).toBeCloseTo(72, 9);
  });

  it('Magnetism: wire field, electron radius, two wires, solenoid', () => {
    const s = section('Magnetism');
    const [basic, board] = s.examples;
    expect(said(basic)).toContain(`= ${(((4e-7 * Math.PI * 10) / (2 * Math.PI * 0.05)) * 1e6).toFixed(0)}$ μT`);
    expect(said(basic)).toContain(`= ${(((9.109e-31 * 1e6) / (1.602e-19 * 1e-3)) * 1000).toFixed(2)}$ mm`);
    expect((2e-7 * 10 * 20) / 0.1).toBeCloseTo(4e-4, 12);
    expect(said(board)).toContain(`= ${(4e-7 * Math.PI * 1000 * 2 * 1000).toFixed(2)}$ mT`);
    expect(figure(s).series[0].f(5)).toBeCloseTo(40, 9);
  });

  it('Electromagnetic Induction: generator, transformer, rod', () => {
    const s = section('Electromagnetic Induction');
    const [gen, rod] = s.examples;
    const peak = 200 * 0.2 * 0.01 * 2 * Math.PI * 60;
    expect(said(gen)).toContain(`= ${peak.toFixed(1)}$ V, rms ${(peak / Math.SQRT2).toFixed(1)} V`);
    expect(said(gen)).toContain(`= ${(240 * 60) / 1200}$ V`);
    expect(said(rod)).toContain(`= ${(0.3 * 0.5 * 4).toFixed(1)}$ V`);
    expect(said(rod)).toContain(`= ${(0.3 * 0.3 * 0.5).toFixed(3)}$ N`);
    expect(figure(s).marks[0].y).toBeCloseTo(peak / Math.SQRT2, 9);
  });

  it('Optics: lens, critical angles, apparent depth, mirror, the refraction curve', () => {
    const s = section('Optics');
    const [lens, board] = s.examples;
    expect(said(lens)).toContain(`= ${((Math.asin(1 / 1.5) * 180) / Math.PI).toFixed(1)}°$`);
    expect(said(board)).toContain(`= ${(2 * 1.333).toFixed(2)}$ m`);
    expect(said(board)).toContain(`= ${((Math.asin(1 / 2.42) * 180) / Math.PI).toFixed(1)}°$`);
    expect(1 / (1 / 20 - 1 / 30)).toBeCloseTo(60, 9);
    const f = figure(s).series[0].f;
    expect(f(41.8)).toBeGreaterThan(85);
    expect(f(20)).toBeCloseTo((Math.asin(1.5 * Math.sin(rad(20))) * 180) / Math.PI, 9);
  });

  it('Atomic and Nuclear Physics: photoelectrons, decay, de Broglie, relativity', () => {
    const s = section('Atomic and Nuclear Physics');
    const [basic, board] = s.examples;
    expect(said(basic)).toContain(`= ${(1240 / 400).toFixed(2)}$ eV`);
    const lam = 6.626e-34 / (9.109e-31 * 2e5);
    expect(said(board)).toContain(`= ${(lam * 1e9).toFixed(2)} \\times 10^{-9}$ m $= ${(lam * 1e10).toFixed(1)}$ Å`);
    const gamma = 1 / Math.sqrt(1 - 0.64);
    expect(said(board)).toContain(`= ${gamma.toFixed(3)}$`);
    expect(said(board)).toContain(`= ${(1 / gamma).toFixed(1)}$ m`);
    expect(figure(s).series[0].f(3)).toBeCloseTo(12.5, 9);
  });
});
