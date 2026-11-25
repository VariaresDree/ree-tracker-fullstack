// Engineering Mechanics in the module format (2026-11-25): every number in the
// topic's worked examples, checks and figures, worked again, so a slip in the
// text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/esas/engineering-mechanics.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s, type = 'plot') => s.body.find((b) => typeof b !== 'string' && b.type === type);
const g = 9.81;
const rad = (d) => (d * Math.PI) / 180;
const deg = (x) => (x * 180) / Math.PI;

describe('Engineering Mechanics, worked again', () => {
  it('Force Systems and Resultants: three forces, two equal forces, the polygon', () => {
    const s = section('Force Systems and Resultants');
    const [three, two] = s.examples;
    const fx = 100 * Math.cos(rad(30)) + 150 * Math.cos(rad(135)) + 80 * Math.cos(rad(250));
    const fy = 100 * Math.sin(rad(30)) + 150 * Math.sin(rad(135)) + 80 * Math.sin(rad(250));
    expect(said(three)).toContain(`= ${fx.toFixed(2)}$ N`);
    expect(said(three)).toContain(`= ${fy.toFixed(2)}$ N`);
    expect(said(three)).toContain(`= ${Math.hypot(fx, fy).toFixed(2)}$ N`);
    expect(said(three)).toContain(`= ${deg(Math.atan2(fy, fx)).toFixed(1)}°$`);
    expect(said(two)).toContain(`= ${deg(Math.acos(2500 / 20000 - 1)).toFixed(1)}°$`);
    const R = figure(s, 'phasor').vectors[3];
    expect(R.mag).toBeCloseTo(Math.hypot(fx, fy), 2);
    expect(R.angle).toBeCloseTo(deg(Math.atan2(fy, fx)), 2);
  });

  it('Equilibrium: two cables, the closing triangle, a weight pulled aside', () => {
    const s = section('Equilibrium');
    const [cables, aside] = s.examples;
    // T1 cos30 = T2 cos45, T1 sin30 + T2 sin45 = 1000.
    const T1 = 1000 / (Math.sin(rad(30)) + Math.cos(rad(30)) * Math.tan(rad(45)));
    const T2 = (T1 * Math.cos(rad(30))) / Math.cos(rad(45));
    expect(said(cables)).toContain(`= ${T1.toFixed(1)}$ N`);
    expect(said(cables)).toContain(`= ${T2.toFixed(1)}$ N`);
    const v = figure(s, 'phasor').vectors;
    const sum = v.reduce(([x, y], u) => [x + u.mag * Math.cos(rad(u.angle)), y + u.mag * Math.sin(rad(u.angle))], [0, 0]);
    expect(Math.hypot(...sum)).toBeLessThan(0.2);
    const W = 80 * g;
    const T = W / Math.sin(rad(65));
    expect(said(aside)).toContain(`= ${W.toFixed(1)}$ N`);
    expect(said(aside)).toContain(`= ${T.toFixed(1)}$ N`);
    expect(said(aside)).toContain(`= ${(T * Math.cos(rad(65))).toFixed(1)}$ N`);
  });

  it('Trusses: section and end joint', () => {
    const [sectionEx, joint] = section('Trusses').examples;
    expect((10 * 6 - 10 * 3) / 4).toBe(7.5);
    expect(said(sectionEx)).toContain('$F = 7.5$ kN');
    expect(10 / 0.8).toBe(12.5);
    expect(said(joint)).toContain('$F_d = 12.5$ kN');
    expect(0.6 * 12.5).toBe(7.5);
  });

  it('Cables: parabolic, catenary, the two shapes', () => {
    const s = section('Cables');
    const [para, cat] = s.examples;
    expect(said(para)).toContain(`= ${(2 * 100 ** 2) / 80}$ kN`);
    expect(said(para)).toContain(`= ${Math.hypot(250, 100).toFixed(1)}$ kN`);
    expect(said(para)).toContain(`= ${(100 + 800 / 300 - (32 * 1e4) / (5 * 1e6)).toFixed(2)}$ m`);
    const sLen = Math.sqrt(210 ** 2 - 200 ** 2);
    expect(said(cat)).toContain(`= ${sLen.toFixed(2)}$ m`);
    expect(said(cat)).toContain(`= ${(200 * Math.log((sLen + 210) / 200)).toFixed(2)}$ m`);
    const [p, c] = figure(s).series;
    for (const x of [0, 50, 100]) expect(Math.abs(p.f(x) - c.f(x))).toBeLessThan(1e-6);
    expect(c.f(0)).toBeCloseTo(10, 6);
    expect(Math.abs(p.f(25) - c.f(25))).toBeLessThan(0.1);
  });

  it('Friction: slope, post, rope turns, repose, the curves', () => {
    const s = section('Friction');
    const [basic, board] = s.examples;
    expect(said(basic)).toContain(`= ${(500 * (Math.sin(rad(25)) + 0.3 * Math.cos(rad(25)))).toFixed(1)}$ N`);
    expect(said(basic)).toContain(`= ${Math.exp(0.25 * Math.PI).toFixed(2)}$`);
    expect(said(board)).toContain(`= ${(Math.log(3000 / 40) / (3 * Math.PI)).toFixed(3)}$`);
    expect(said(board)).toContain(`= ${deg(Math.atan(0.7)).toFixed(1)}°$`);
    const hold = figure(s).series[1].f;
    expect(hold(16)).toBe(0);
    expect(hold(18)).toBeGreaterThan(0);
  });

  it('Centroids: plate with a hole, T-section', () => {
    const [plate, tee] = section('Centroids').examples;
    expect(said(plate)).toContain(`= ${((72 - 4 * Math.PI) / (24 - Math.PI)).toFixed(2)}$`);
    expect(said(tee)).toContain(`= ${((4000 * 190 + 3600 * 90) / 7600).toFixed(1)}$ mm`);
  });

  it('Moments of Inertia: rectangle, T-section, the parallel-axis curve', () => {
    const s = section('Moments of Inertia');
    const [rect, tee] = s.examples;
    expect((0.2 * 0.3 ** 3) / 12).toBeCloseTo(4.5e-4, 12);
    expect(4.5e-4 + 0.06 * 0.15 ** 2).toBeCloseTo(1.8e-3, 12);
    expect(said(rect)).toContain(`= ${((0.3 / Math.sqrt(12)) * 1000).toFixed(1)}$ mm`);
    const yb = (4000 * 190 + 3600 * 90) / 7600;
    const I = (200 * 20 ** 3) / 12 + 4000 * (190 - yb) ** 2 + (20 * 180 ** 3) / 12 + 3600 * (yb - 90) ** 2;
    expect(said(tee)).toContain(`= ${(I / 1e6).toFixed(2)} \\times 10^6$ mm⁴`);
    expect(said(tee)).toContain(`${(190 - yb).toFixed(2)}^2`);
    expect(figure(s).series[0].f(0.15)).toBeCloseTo(18, 9);
  });

  it('Rectilinear Motion: stopping, the elevator', () => {
    const s = section('Rectilinear Motion');
    const [stop, lift] = s.examples;
    expect(said(stop)).toContain(`= ${(625 / (2 * 0.7 * g)).toFixed(1)}$ m`);
    const d = 0.5 * 3.75 * 5 + 3.75 * 12 + 0.5 * 3.75 * 3;
    expect(d).toBe(60);
    expect(said(lift)).toContain(`= ${d / 3.75}$ floors`);
    const v = figure(s).series[0].f;
    let area = 0;
    for (let k = 0; k < 22000; k++) area += v((k + 0.5) / 1000) / 1000;
    expect(area).toBeCloseTo(60, 2);
  });

  it('Projectile Motion: from a cliff, the two angles', () => {
    const s = section('Projectile Motion');
    const [cliff, angles] = s.examples;
    const vy = 20 * Math.sin(rad(35));
    const t = (vy + Math.sqrt(vy * vy + 4 * 4.905 * 15)) / (2 * 4.905);
    expect(said(cliff)).toContain(`= ${t.toFixed(2)}$ s`);
    expect(said(cliff)).toContain(`= ${(20 * Math.cos(rad(35)) * t).toFixed(1)}$ m`);
    const s2 = (120 * g) / 1600;
    expect(said(angles)).toContain(`= ${s2.toFixed(3)}$`);
    expect(said(angles)).toContain(`$\\theta = ${(deg(Math.asin(s2)) / 2).toFixed(1)}°$ or $${(90 - deg(Math.asin(s2)) / 2).toFixed(1)}°$`);
    expect(figure(s).series[0].f(20 * Math.cos(rad(35)) * t)).toBeCloseTo(0, 6);
  });

  it('Curvilinear Motion: flat curve, bank, designing a bank', () => {
    const s = section('Curvilinear Motion');
    const [basic, bank] = s.examples;
    expect(said(basic)).toContain(`= ${Math.sqrt(0.6 * g * 50).toFixed(1)}$ m/s`);
    expect(said(basic)).toContain(`= ${Math.sqrt(g * 50 * Math.tan(rad(15))).toFixed(1)}$ m/s`);
    const th = Math.atan(400 / (g * 150));
    expect(said(bank)).toContain(`= ${(400 / (g * 150)).toFixed(3)}$, $\\theta = ${deg(th).toFixed(1)}°$`);
    const v = Math.sqrt(g * 150 * Math.tan(th + Math.atan(0.3)));
    expect(said(bank)).toContain(`= ${v.toFixed(1)}$ m/s (${Math.round(v * 3.6)} km/h)`);
  });

  it("Newton's Laws: Atwood, elevator package", () => {
    const s = section("Newton's Laws");
    const [atwood, pkg] = s.examples;
    expect(said(atwood)).toContain(`= ${((2 * g) / 8).toFixed(2)}$ m/s²`);
    expect(said(atwood)).toContain(`= ${((2 * 5 * 3 * g) / 8).toFixed(1)}$ N`);
    expect(said(pkg)).toContain(`$a = ${(2 * 1.5) / 0.25}$`);
    expect(said(pkg)).toContain(`= ${(4 * (g + 12)).toFixed(1)}$ N`);
    expect(figure(s).series[0].f(5)).toBeCloseTo((2 * g) / 8, 9);
  });

  it('Work and Energy: hoist, shaft, thrust, spring launch, the spring area', () => {
    const s = section('Work and Energy');
    const [basic, board] = s.examples;
    expect(said(basic)).toContain(`= ${((1000 * g * 0.5) / 0.8 / 1000).toFixed(2)}$ kW`);
    expect(said(basic)).toContain(`= ${((2 * Math.PI * 1750 * 40) / 60 / 1000).toFixed(2)}$ kW`);
    expect(said(board)).toContain(`= ${22e6 / 200 / 1000}$ kN`);
    expect(said(board)).toContain(`= ${0.08 * Math.sqrt(2000 / 0.05)}$ m/s`);
    const F = figure(s).series[0].f;
    expect(0.5 * 0.15 * F(0.15)).toBeCloseTo(4.5, 9);
  });

  it('Impulse and Momentum: plate, moving plate, rocket', () => {
    const s = section('Impulse and Momentum');
    const [jet, board] = s.examples;
    expect(said(jet)).toContain(`= ${1000 * 0.002 * 20}$ N`);
    expect(said(board)).toContain(`= ${1000 * 1e-4 * 15 ** 2}$ N`);
    expect(said(board)).toContain(`= ${1.2e6 / 3000}$ kg/s`);
    expect(figure(s).series[0].f(0)).toBeCloseTo(40, 9);
  });

  it('Rotation: rolling sphere, flywheel energy, spin-up', () => {
    const s = section('Rotation');
    const [basic, spin] = s.examples;
    expect(said(basic)).toContain(`= ${((5 / 7) * g * Math.sin(rad(20))).toFixed(2)}$ m/s²`);
    expect(0.5 * 20 * (105 ** 2 - 95 ** 2)).toBe(20000);
    expect(said(spin)).toContain(`= ${120 / 5}$ s`);
    expect(said(spin)).toContain(`= ${(1440 / (2 * Math.PI)).toFixed(1)}$ rev`);
    expect(figure(s).series[0].f(20)).toBeCloseTo((5 / 7) * g * Math.sin(rad(20)), 9);
  });
});
