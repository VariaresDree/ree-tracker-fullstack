// Electromagnetism in the module format (2026-11-20): every number in the
// topic's worked examples, checks and figures, worked again from the physics,
// so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/electromagnetism.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figures = (s, type) => s.body.filter((b) => typeof b !== 'string' && b.type === type);
const series = (fig, label) => fig.series.find((x) => x.label === label).f;
// 17976 -> 17\,976, the thin-space grouping the text uses.
const thin = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');

const K = 8.988e9;
const e0 = 8.854e-12;
const mu0 = 4 * Math.PI * 1e-7;
const qe = 1.602e-19;

describe('Electromagnetism, worked again', () => {
  it('the constants agree', () => {
    expect(1 / (4 * Math.PI * e0)).toBeCloseTo(K, -6);
    expect(1 / Math.sqrt(mu0 * e0)).toBeCloseTo(3e8, -6);
  });

  it("Coulomb's Law: two charges, forces at right angles, the curve and the check", () => {
    const s = section("Coulomb's Law");
    const [two, right] = s.examples;
    const F = (K * 2e-6 * 3e-6) / 0.3 ** 2;
    expect(said(two)).toContain(`= ${F.toFixed(3)}$ N`);
    const F1 = (K * 2e-12) / 0.09;
    const F2 = (K * 3e-12) / 0.16;
    const R = Math.hypot(F1, F2);
    const th = (Math.atan2(F2, F1) * 180) / Math.PI;
    expect(said(right)).toContain(`= ${F1.toFixed(4)}$ N`);
    expect(said(right)).toContain(`= ${F2.toFixed(4)}$ N`);
    expect(said(right)).toContain(`= ${R.toFixed(4)}$ N`);
    expect(said(right)).toContain(`= ${th.toFixed(2)}^\\circ$`);
    expect(right.answer).toContain(`${R.toFixed(3)} N, at ${th.toFixed(1)}°`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(0.3)).toBeCloseTo(F, 9);
    expect(curve.marks[0].label).toContain(`${F.toFixed(3)} N`);
    const [tri] = figures(s, 'phasor');
    expect(tri.vectors[0].mag).toBeCloseTo(F1, 4);
    expect(tri.vectors[1].mag).toBeCloseTo(F2, 4);
    expect(tri.vectors[2].mag).toBeCloseTo(R, 4);
    expect(tri.vectors[2].angle).toBeCloseTo(th, 2);
    expect(s.check[1].a).toContain(`= ${(Math.sqrt(9 / K) * 1e6).toFixed(1)}$ µC`);
  });

  it('Electric Field: a point charge, a pair, and a line', () => {
    const s = section('Electric Field');
    const [point, pair] = s.examples;
    const E = (K * 1e-6) / 0.5 ** 2;
    expect(said(point)).toContain(`= ${(E / 1e4).toFixed(3)} \\times 10^4$ N/C`);
    const E1 = (K * 4e-6) / 0.1 ** 2;
    expect(said(pair)).toContain(`= ${(E1 / 1e6).toFixed(3)} \\times 10^6$ N/C`);
    expect(pair.answer).toContain(`${((2 * E1) / 1e6).toFixed(2)} \\times 10^6`);
    expect(s.check[0].a).toContain(`${(qe * 1000 * 1e16).toFixed(3)} \\times 10^{-16}`);
    const line = 2e-6 / (2 * Math.PI * e0 * 0.5);
    expect(s.check[1].a).toContain(`= ${(line / 1e4).toFixed(2)} \\times 10^4$ N/C`);
    // The three shapes are scaled to meet at r = 1.
    const [reach] = figures(s, 'plot');
    for (const c of reach.series) expect(c.f(1)).toBeCloseTo(1, 9);
  });

  it("Gauss's Law: the conducting sphere, its curve, and a line charge", () => {
    const s = section("Gauss's Law");
    const [sphere, wire] = s.examples;
    const E = (K * 1e-6) / 0.2 ** 2;
    expect(said(sphere)).toContain(`= ${(E / 1e5).toFixed(3)} \\times 10^5$ N/C`);
    const [curve] = figures(s, 'plot');
    const ball = series(curve, 'charged ball');
    const shell = series(curve, 'conductor');
    expect(shell(0.05)).toBe(0);
    expect(ball(0.05)).toBeCloseTo(ball(0.1) / 2, 9);
    expect(ball(0.1) * 1e6).toBeCloseTo((K * 1e-6) / 0.1 ** 2, 0);
    expect(shell(0.2) * 1e6).toBeCloseTo(E, 0);
    const D = 5e-9 / (2 * Math.PI * 0.02);
    expect(said(wire)).toContain(`= ${(D / 1e-8).toFixed(3)} \\times 10^{-8}$ C/m²`);
    expect(said(wire)).toContain(`= ${Math.round(D / e0)}$ V/m`);
  });

  it('Electric Potential: potential and work, a scalar sum, and the checks', () => {
    const s = section('Electric Potential');
    const [one, sum] = s.examples;
    const V = (K * 1e-6) / 0.5;
    expect(said(one)).toContain(`= ${thin(Math.round(V))}$ V`);
    expect(said(one)).toContain(`= ${(2e-6 * V).toFixed(4)}$ J`);
    expect(Math.hypot(0.4, 0.3)).toBeCloseTo(0.5, 12);
    const Vp = K * (3e-6 / 0.3 - 2e-6 / 0.5);
    expect(said(sum)).toContain(`= ${thin(Number(Vp.toPrecision(4)))}$ V`);
    expect(sum.answer).toContain(`${(Vp / 1000).toFixed(1)} kV`);
    const v = Math.sqrt((2 * qe * 1000) / 9.109e-31);
    expect(s.check[0].a).toContain(`= ${(v / 1e7).toFixed(2)} \\times 10^7$ m/s`);
    const [curve] = figures(s, 'plot');
    expect(series(curve, 'V')(2)).toBeCloseTo(0.5, 9);
    expect(series(curve, 'E')(2)).toBeCloseTo(0.25, 9);
  });

  it('Capacitance and Dielectrics: plates, a cable, a layered gap', () => {
    const s = section('Capacitance and Dielectrics');
    const [plates, gap] = s.examples;
    const Cp = (4 * e0 * 0.01) / 0.001;
    const Cc = (2 * Math.PI * 2.3 * e0 * 1000) / Math.log(4);
    expect(said(plates)).toContain(`= ${(Cp * 1e12).toFixed(1)}$ pF`);
    expect(said(plates)).toContain(`= ${(Cc * 1e9).toFixed(1)}$ nF`);
    const Eair = 10000 / (0.002 + 0.008 / 6);
    expect(said(gap)).toContain(`0.002 + ${(0.008 / 6).toFixed(6)}} = ${(Eair / 1e6).toFixed(1)}$ MV/m`);
    expect(said(gap)).toContain(`= ${(Eair / 6 / 1e6).toFixed(1)}$ MV/m`);
    expect(Eair * 0.002 + (Eair / 6) * 0.008).toBeCloseTo(10000, 6);
    // The figure's field over the gap adds back to the 10 kV (MV/m × mm = kV).
    const [field] = figures(s, 'plot');
    const E = field.series[0].f;
    expect(E(1) * 2 + E(5) * 8).toBeCloseTo(10, 9);
    expect(E(1)).toBeCloseTo(Eair / 1e6, 9);
    expect(s.check[0].a).toContain(`= ${(4 * Math.PI * e0 * 1e12).toFixed(1)}$ pF`);
    expect(s.check[1].a).toContain(`= ${(0.5 * e0 * 9e12).toFixed(1)}$ J/m³`);
  });

  it('Current and Resistivity: drift velocity and insulation resistance', () => {
    const s = section('Current and Resistivity');
    const [drift, ins] = s.examples;
    const v = 10 / (8.5e28 * qe * 2.5e-6);
    expect(said(drift)).toContain(`= ${(v / 1e-4).toFixed(2)} \\times 10^{-4}$ m/s`);
    expect(drift.answer).toContain(`${(v * 1000).toFixed(2)} mm/s`);
    const k = 5e12 / (2 * Math.PI * 1000);
    const R = k * Math.log(2);
    expect(said(ins)).toContain(`= ${(k / 1e8).toFixed(3)} \\times 10^8 \\times ${Math.log(2).toFixed(4)} = ${(R / 1e8).toFixed(2)} \\times 10^8$ Ω`);
    expect(ins.answer).toContain(`${Math.round(R / 1e6)} MΩ`);
    expect(s.check[0].a).toContain(`${Math.round(R / 4 / 1e6)} MΩ`);
    expect(20 / 4e-6).toBe(5e6);
  });

  it('Biot-Savart Law: a coil at its centre, on its axis, and the axis curve', () => {
    const s = section('Biot-Savart Law');
    const [centre, axis] = s.examples;
    const B0 = (mu0 * 20 * 5) / (2 * 0.1);
    expect(said(centre)).toContain(`= ${(B0 / 1e-4).toFixed(3)} \\times 10^{-4}$ T`);
    const den = 2 * 0.02 ** 1.5;
    const B = (mu0 * 20 * 5 * 0.01) / den;
    expect(said(axis)).toContain(`${den.toFixed(6)}$`);
    expect(said(axis)).toContain(`= ${(B / 1e-4).toFixed(3)} \\times 10^{-4}$ T`);
    expect(B / B0).toBeCloseTo(1 / (2 * Math.SQRT2), 12);
    const [curve] = figures(s, 'plot');
    const f = curve.series[0].f;
    expect(f(0)).toBeCloseTo(B0 * 1000, 9);
    expect(f(0.1)).toBeCloseTo(B * 1000, 9);
    expect(curve.marks[0].at[1]).toBeCloseTo(B0 * 1000, 4);
  });

  it("Ampère's Law: a toroid, a solenoid, a wire, and the wire's curve", () => {
    const s = section("Ampère's Law");
    const [toroid, sol] = s.examples;
    expect((mu0 * 1000) / (2 * Math.PI * 0.1)).toBeCloseTo(2e-3, 12);
    expect(said(toroid)).toContain('= 2 \\times 10^{-3}$ T');
    const B = (mu0 * 1000 * 2) / 0.5;
    expect(said(sol)).toContain(`= ${(B / 1e-3).toFixed(3)} \\times 10^{-3}$ T`);
    expect(said(sol)).toContain(`${(300 * B).toFixed(3)} T`);
    expect((mu0 * 50) / (2 * Math.PI * 0.02)).toBeCloseTo(0.5e-3, 12);
    // 100 A in a 5 mm wire: 4 mT at the surface, linear inside, 1/r outside.
    const surface = (mu0 * 100) / (2 * Math.PI * 0.005);
    const [curve] = figures(s, 'plot');
    const f = curve.series[0].f;
    expect(f(5)).toBeCloseTo(surface * 1000, 9);
    expect(f(2.5)).toBeCloseTo((surface * 1000) / 2, 9);
    expect(f(10)).toBeCloseTo((surface * 1000) / 2, 9);
  });

  it('Magnetic Materials and Hysteresis: B from H, Steinmetz, and the loop', () => {
    const s = section('Magnetic Materials and Hysteresis');
    const [scale, stein] = s.examples;
    expect(said(scale)).toContain(`= ${(mu0 * 2000 * 400).toFixed(3)}$ T`);
    const P60 = 250 * 1.2 ** 1.6 * 60 * 0.01;
    const B50 = (1.2 * 60) / 50;
    const P50 = 250 * B50 ** 1.6 * 50 * 0.01;
    expect(said(stein)).toContain(`250 \\times ${(1.2 ** 1.6).toFixed(3)} \\times 0.6 = ${P60.toFixed(1)}$ W`);
    expect(said(stein)).toContain(`= ${B50.toFixed(2)}$ T`);
    expect(said(stein)).toContain(`= ${P50.toFixed(1)}$ W`);
    expect(stein.answer).toContain(`about ${Math.round((P50 / P60 - 1) * 100)}% more`);
    // The loop's marks sit where its falling branch crosses the axes.
    const [loop] = figures(s, 'plot');
    const falling = series(loop, 'falling H');
    expect(loop.marks[0].y).toBeCloseTo(falling(0), 12);
    expect(falling(loop.marks[1].x)).toBeCloseTo(0, 12);
    expect(series(loop, 'rising H')(-loop.marks[1].x)).toBeCloseTo(0, 12);
  });

  it('Magnetic Circuits: reluctance, then a gapped core', () => {
    const s = section('Magnetic Circuits');
    const [rel, gapped] = s.examples;
    const R = 0.4 / (1000 * mu0 * 5e-4);
    expect(said(rel)).toContain(`= ${(R / 1e5).toFixed(3)} \\times 10^5$ A·t/Wb`);
    expect(said(rel)).toContain(`= ${(400 / R / 1e-4).toFixed(3)} \\times 10^{-4}$ Wb`);
    const gap = 0.001 / mu0;
    const core = 0.5 / (2000 * mu0);
    const total = gap + core;
    expect(said(gapped)).toContain(`= ${gap.toFixed(1)}$ A·t`);
    expect(said(gapped)).toContain(`= ${core.toFixed(1)}$ A·t`);
    expect(said(gapped)).toContain(`Total ${total.toFixed(1)} A·t`);
    expect(said(gapped)).toContain(`= ${(total / 500).toFixed(3)}$ A`);
    expect(gapped.answer).toContain(`takes ${Math.round((gap / total) * 100)}%`);
    expect(Math.round(gap / core)).toBe(4);
  });

  it("Faraday's Law: a turning coil, a transformer's flux, and the curve", () => {
    const s = section("Faraday's Law");
    const [coil, xfmr] = s.examples;
    const Em = 100 * 0.5 * 0.02 * 2 * Math.PI * 60;
    expect(said(coil)).toContain(`= ${Math.round(Em)}$ V`);
    expect(said(coil)).toContain(`= ${(Em / Math.SQRT2).toFixed(1)}$ V`);
    const phi = 230 / (4.44 * 60 * 200);
    expect(said(xfmr)).toContain(`= ${(phi / 1e-3).toFixed(3)} \\times 10^{-3}$ Wb`);
    expect(said(xfmr)).toContain(`= ${(phi / 30e-4).toFixed(3)}$ T`);
    expect((2 * Math.PI) / Math.SQRT2).toBeCloseTo(4.44, 2);
    // The plotted EMF is minus the rate of change of the plotted flux.
    const [curve] = figures(s, 'plot');
    const e = series(curve, 'e');
    const flux = series(curve, 'Φ');
    const h = 0.01;
    for (const x of [0, 45, 90, 200, 300]) {
      const dPhi = (flux(x + h) - flux(x - h)) / ((2 * h * Math.PI) / 180);
      expect(e(x)).toBeCloseTo(-dPhi, 5);
    }
  });

  it('Inductance: the gapped core and an air-core solenoid', () => {
    const s = section('Inductance');
    const [core, sol] = s.examples;
    const I = (0.001 / mu0 + 0.5 / (2000 * mu0)) / 500;
    expect(said(core)).toContain(`{${I.toFixed(3)}} = ${((500 * 4e-4) / I).toFixed(3)}$ H`);
    const A = Math.PI * 0.01 ** 2;
    const L = (mu0 * 400 ** 2 * A) / 0.2;
    expect(said(sol)).toContain(`= ${(A / 1e-4).toFixed(3)} \\times 10^{-4}$ m²`);
    expect(said(sol)).toContain(`= ${(L / 1e-4).toFixed(3)} \\times 10^{-4}$ H`);
    expect(said(sol)).toContain(`= ${((0.5 * L * 4) / 1e-4).toFixed(2)} \\times 10^{-4}$ J`);
    expect(s.check[1].a).toContain(`= ${0.5 * 0.2 * 9}$ J`);
  });

  it('Force on Conductors: wires, an electromagnet, a coil, a proton', () => {
    const s = section('Force on Conductors');
    const [pull, torque] = s.examples;
    expect((mu0 * 100 * 100) / (2 * Math.PI)).toBeCloseTo(2e-3, 12);
    const Fm = 2e-3 / (2 * mu0);
    expect(said(pull)).toContain(`= ${Fm.toFixed(1)}$ N`);
    expect(pull.answer).toContain(`${Math.round(Fm)} N`);
    expect(said(torque)).toContain(`= ${50 * 0.4 * 3 * 0.1 * 0.08}$ N·m`);
    const r = (1.673e-27 * 2e6) / (qe * 0.5);
    expect(s.check[1].a).toContain(`= ${(r * 100).toFixed(2)}$ cm`);
    const [curve] = figures(s, 'plot');
    expect(curve.series[0].f(90)).toBeCloseTo(1, 12);
  });

  it("Maxwell's Equations: displacement current, two ways", () => {
    const s = section("Maxwell's Equations");
    const [, density] = s.examples;
    const Jd = e0 * (1e6 / 0.001);
    const C = (e0 * 0.01) / 0.001;
    expect(said(density)).toContain(`= ${(Jd / 1e-3).toFixed(3)} \\times 10^{-3}$ A/m²`);
    expect(said(density)).toContain(`= ${(Jd * 0.01 / 1e-5).toFixed(3)} \\times 10^{-5}$ A`);
    expect(said(density)).toContain(`= ${(C * 1e12).toFixed(2)}$ pF`);
    expect(C * 1e6).toBeCloseTo(Jd * 0.01, 15);
    expect(density.answer).toContain(`${(Jd * 0.01 * 1e6).toFixed(1)} µA`);
  });

  it('Electromagnetic Waves: wavelengths, fields and power, skin depth', () => {
    const s = section('Electromagnetic Waves');
    const [, wave, skin] = s.examples;
    const eta = Math.sqrt(mu0 / e0);
    expect(said(wave)).toContain(`= ${eta.toFixed(1)}$ Ω`);
    expect(said(wave)).toContain(`= ${(100 / eta).toFixed(4)}$ A/m`);
    expect(said(wave)).toContain(`= ${(1e4 / (2 * eta)).toFixed(2)}$ W/m²`);
    const d60 = 1 / Math.sqrt(Math.PI * 60 * mu0 * 5.8e7);
    const d6k = 1 / Math.sqrt(Math.PI * 6000 * mu0 * 5.8e7);
    expect(said(skin)).toContain(`= ${(d60 * 1000).toFixed(2)}$ mm`);
    expect(skin.answer).toContain(`${(d6k * 1000).toFixed(3)} mm at 6 kHz`);
    const [curve] = figures(s, 'plot');
    expect(curve.marks[0].at[0]).toBeCloseTo(d60 * 1000, 2);
    expect(curve.series[0].f(d60 * 1000)).toBeCloseTo(Math.exp(-1), 3);
    expect(s.check[0].a).toContain(`= ${3e8 / Math.sqrt(2.25) / 1e8} \\times 10^8$ m/s`);
    expect(3e8 / 60 / 1000).toBe(5000);
  });
});
