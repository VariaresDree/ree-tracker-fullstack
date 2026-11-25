// Fundamentals of Deformable Bodies in the module format (2026-11-25): every
// number in the topic's worked examples, checks and figures, worked again, so a
// slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/esas/fundamentals-of-deformable-bodies.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s) => s.body.find((b) => typeof b !== 'string' && b.type === 'plot');
const area = (d) => (Math.PI * d * d) / 4;

describe('Fundamentals of Deformable Bodies, worked again', () => {
  it('Simple Stress: pin, bolt, punch, the inclined-plane curves', () => {
    const s = section('Simple Stress');
    const [pin, punch] = s.examples;
    expect(said(pin)).toContain(`= ${area(20).toFixed(1)}$ mm²`);
    expect(said(pin)).toContain(`= ${(30000 / (2 * area(20))).toFixed(1)}$ MPa`);
    expect(said(pin)).toContain(`= ${60000 / 240}$ MPa`);
    const P = Math.PI * 20 * 5 * 300;
    expect(said(punch)).toContain(`= ${(P / 1000).toFixed(1)}$ kN`);
    expect(said(punch)).toContain(`= ${(P * 0.0025).toFixed(1)}$ J`);
    const [sig, tau] = figure(s).series;
    expect(tau.f(45)).toBeCloseTo(50, 9);
    expect(sig.f(45)).toBeCloseTo(50, 9);
  });

  it("Strain and Hooke's Law: bar, compound load share", () => {
    const [bar, pair] = section("Strain and Hooke's Law").examples;
    expect((80000 * 2000) / (500 * 200000)).toBe(1.6);
    expect(said(bar)).toContain(`= ${0.5 * 80000 * 0.0016}$ J`);
    const steel = 100 * (1e8 / 1.7e8);
    expect(said(pair)).toContain(`= ${steel.toFixed(1)}$ kN`);
    expect(said(pair)).toContain(`= ${((steel * 1000) / 500).toFixed(1)}$ MPa`);
    expect((100 - steel).toFixed(1)).toBe('41.2');
  });

  it('Thermal Stress: rail with a gap, volume, restrained bar, the curve', () => {
    const s = section('Thermal Stress');
    const [rail, board] = s.examples;
    const free = 11.7e-6 * 10000 * 50;
    expect(said(rail)).toContain(`= ${free.toFixed(2)}$ mm`);
    expect(said(rail)).toContain(`= ${((200000 * (free - 2)) / 10000).toFixed(0)}$ MPa`);
    expect(said(board)).toContain(`= ${(3 * 23e-6 * 1000 * 80).toFixed(2)}$ cm³`);
    expect(said(board)).toContain(`= ${(200000 * 11.7e-6 * 30).toFixed(1)}$ MPa`);
    const f = figure(s).series[0].f;
    expect(f(17)).toBe(0);
    expect(f(50)).toBeCloseTo(77, 9);
  });

  it('Torsion: sizing, twist, coupling, the hollow-shaft curves', () => {
    const s = section('Torsion');
    const [size, coupling] = s.examples;
    const T = 75000 / (2 * Math.PI * 25);
    const d = Math.cbrt((16 * T) / (Math.PI * 60e6));
    const J = (Math.PI * d ** 4) / 32;
    expect(said(size)).toContain(`= ${T.toFixed(1)}$ N·m`);
    expect(said(size)).toContain(`= ${(d * 1000).toFixed(1)}$ mm`);
    expect(said(size)).toContain(`${(J * 1e7).toFixed(3)} \\times 10^{-7}`);
    expect(said(size)).toContain(`= ${(T / (80e9 * J)).toFixed(4)}$ rad $= ${((T / (80e9 * J)) * 180 / Math.PI).toFixed(2)}°$`);
    expect(said(coupling)).toContain(`= ${(area(20) * 60).toFixed(0).replace(/(\d)(\d{3})$/, '$1\\,$2')}$ N`);
    expect(said(coupling)).toContain(`= ${((6 * area(20) * 60 * 0.15) / 1000).toFixed(2)}$ kN·m`);
    const [torque, weight] = figure(s).series;
    expect(torque.f(0.5)).toBe(15 / 16);
    expect(weight.f(0.5)).toBe(0.75);
  });

  it('Shear and Moment Diagrams: simple beam, cantilever, the diagrams', () => {
    const s = section('Shear and Moment Diagrams');
    const [simple, cant] = s.examples;
    expect(said(simple)).toContain(`= ${(10 * 36) / 8}$ kN·m`);
    expect(said(simple)).toContain(`= ${((20 * 2 * 4) / 6).toFixed(1)}$ kN·m`);
    expect(said(cant)).toContain(`= ${4 * 3 + 10}$ kN`);
    expect(said(cant)).toContain(`= ${(4 * 9) / 2 + 30}$ kN·m`);
    const [V, M] = figure(s).series;
    expect(V.f(3)).toBe(0);
    expect(M.f(3)).toBe(45);
  });

  it('Flexural Stress: timber beam, round bar, the distribution', () => {
    const s = section('Flexural Stress');
    const [timber, round] = s.examples;
    expect(said(timber)).toContain(`= ${(40e6 / 1.5e6).toFixed(1)}$ MPa`);
    expect(said(round)).toContain(`= ${((32 * 5e6) / (Math.PI * 1e6)).toFixed(1)}$ MPa`);
    expect(figure(s).series[0].f(150)).toBeCloseTo(40e6 / 1.5e6, 9);
  });

  it('Shear Stress in Beams: rectangle, circle, the parabola', () => {
    const s = section('Shear Stress in Beams');
    const [rect, circle] = s.examples;
    expect(said(rect)).toContain(`= ${(3 * 50000) / (2 * 30000)}$ MPa`);
    expect(said(circle)).toContain(`= ${Math.round(area(100))}$ mm²`);
    expect(said(circle)).toContain(`= ${((4 * 40000) / (3 * area(100))).toFixed(2)}$ MPa`);
    const [tau, avg] = figure(s).series;
    expect(tau.f(0) / avg.f(0)).toBeCloseTo(1.5, 9);
  });

  it('Beam Deflection: uniform load, cantilever, the shape', () => {
    const s = section('Beam Deflection');
    const [udl, cant] = s.examples;
    const d = (5 * 5000 * 4 ** 4) / (384 * 1.6e6);
    expect(said(udl)).toContain(`= ${d.toFixed(4)}$ m $= ${(d * 1000).toFixed(1)}$ mm`);
    const dc = (5000 * 8) / (3 * 2e6);
    expect(said(cant)).toContain(`= ${dc.toFixed(5)}$ m $= ${(dc * 1000).toFixed(2)}$ mm`);
    expect(figure(s).series[0].f(2)).toBeCloseTo(d * 1000, 9);
  });

  it("Combined Stresses and Mohr's Circle: principal stresses, shaft, the circle", () => {
    const s = section("Combined Stresses and Mohr's Circle");
    const [basic, shaft] = s.examples;
    const R = Math.hypot(50, 30);
    expect(said(basic)).toContain(`= ${R.toFixed(1)}$ MPa`);
    expect(said(basic)).toContain(`= ${(30 + R).toFixed(1)}$`);
    expect(said(basic)).toContain(`= ${(30 - R).toFixed(1)}$ MPa`);
    expect(said(basic)).toContain(`= ${((Math.atan(0.6) * 180) / Math.PI / 2).toFixed(1)}°$`);
    const k = 16 / (Math.PI * 0.06 ** 3);
    expect(said(shaft)).toContain(`= 23\\,${Math.round(k) % 1000}$`);
    expect(said(shaft)).toContain(`= ${((k * 2500) / 1e6).toFixed(1)}$ MPa`);
    expect(said(shaft)).toContain(`= ${((k * 4000) / 1e6).toFixed(1)}$ MPa`);
    for (const [x, y] of figure(s).series[0].points) expect(Math.hypot(x - 30, y)).toBeCloseTo(R, 9);
    const [[x1, y1], [x2, y2]] = figure(s).series[1].points;
    expect(Math.hypot(x1 - 30, y1)).toBeCloseTo(R, 9);
    expect(Math.hypot(x2 - 30, y2)).toBeCloseTo(R, 9);
  });

  it('Columns: Euler load, flagpole, slenderness', () => {
    const s = section('Columns');
    const [basic, slender] = s.examples;
    const P = (Math.PI ** 2 * 200e9 * 2e-6) / 9;
    expect(said(basic)).toContain(`= ${(P / 1000).toFixed(1)}$ kN`);
    expect(said(basic)).toContain(`${(P / 4000).toFixed(1)} kN`);
    const sc = (Math.PI ** 2 * 200000) / 120 ** 2;
    expect(said(slender)).toContain(`= ${sc.toFixed(1)}$ MPa`);
    expect(said(slender)).toContain(`= ${((sc * 3000) / 1000).toFixed(1)}$ kN`);
    expect(figure(s).series[0].f(Math.PI * Math.sqrt(200000 / 250))).toBeCloseTo(250, 9);
  });

  it('Thin-Walled Pressure Vessels: cylinder, tank, ring, Lamé', () => {
    const s = section('Thin-Walled Pressure Vessels');
    const [cyl, tank] = s.examples;
    expect(said(cyl)).toContain(`= ${(2 * 1000) / 20}$ MPa`);
    expect(said(tank)).toContain(`= ${((98100 * 6) / (70e6) * 1000).toFixed(2)}$ mm`);
    expect(said(tank)).toContain(`= ${Math.sqrt(100e6 / 7850).toFixed(1)}$ m/s`);
    const [lame, thin] = figure(s).series;
    expect(lame.f(100)).toBeCloseTo(26, 9);
    expect(lame.f(150)).toBeCloseTo(16, 9);
    expect(thin.f(120)).toBe(20);
  });

  it('Riveted and Welded Joints: lap joint, fillet weld', () => {
    const [lap, weld] = section('Riveted and Welded Joints').examples;
    const shear = 4 * area(20) * 100;
    expect(said(lap)).toContain(`= ${(shear / 1000).toFixed(1)}$ kN`);
    expect(said(lap)).toContain(`= ${(4 * 20 * 12 * 200) / 1000}$ kN`);
    expect(said(lap)).toContain(`= ${(160 * 12 * 140) / 1000}$ kN`);
    expect(said(lap)).toContain(`= ${((shear / (200 * 12 * 140)) * 100).toFixed(1)}\\%$`);
    expect(said(weld)).toContain(`= ${((0.707 * 8 * 300 * 100) / 1000).toFixed(1)}$ kN`);
  });
});
