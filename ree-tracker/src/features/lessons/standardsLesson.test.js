// Electrical Standards & Practices in the module format (2026-11-25): every
// number in the topic's worked examples and figures worked again, so a slip
// in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { dropPercent, adjustment, rodOhms, dwellingDemand } from './content/esas/electrical-standards-practices.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s, type = 'plot') => s.body.find((b) => typeof b !== 'string' && b.type === type);
const STANDARD = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400];
const up = (a) => STANDARD.find((s) => s >= a);
const down = (a) => [...STANDARD].reverse().find((s) => s <= a);

describe('Electrical Standards & Practices, worked again', () => {
  it('General: a continuous load, the service chain', () => {
    const s = section('PEC General and Definitions');
    const [cont] = s.examples;
    expect(1.25 * 16 + 4).toBe(24);
    expect(up(24)).toBe(25);
    expect(said(cont)).toContain('= 24$ A');
    expect(figure(s, 'blocks').links.map(([a, b]) => `${a}>${b}`)).toEqual(['utility>main', 'main>panel', 'panel>outlets']);
  });

  it('Wiring and Protection: voltage drop, fault current, the drop curves', () => {
    const s = section('Wiring and Protection');
    const [vd, board] = s.examples;
    expect(said(vd)).toContain(`= ${(2 * 20 * 5.2 * 0.04).toFixed(2)}$ V, ${dropPercent(5.2)(40).toFixed(1)}%`);
    expect(said(vd)).toContain(`$${(2 * 20 * 3.3 * 0.04).toFixed(2)}$ V, ${dropPercent(3.3)(40).toFixed(1)}%`);
    const ifl = 750000 / (Math.sqrt(3) * 400);
    expect(said(board)).toContain(`= ${ifl.toFixed(1)}$ A`);
    expect(said(board)).toContain(`= ${Math.round(ifl * 20).toLocaleString('en-US').replace(',', '\\,')}$ A`);
    // The captions' crossing lengths.
    expect((3 / dropPercent(5.2)(1)).toFixed(0)).toBe('33');
    expect((3 / dropPercent(3.3)(1)).toFixed(0)).toBe('52');
  });

  it('Wiring Methods: two ampacities, the adjustment steps', () => {
    const s = section('Wiring Methods and Materials');
    const [five, eight] = s.examples;
    expect(said(five)).toContain(`= ${(50 * 0.91 * adjustment(5)).toFixed(1)}$ A`);
    expect(adjustment(8)).toBe(0.7);
    expect(said(eight)).toContain(`= ${(65 * 0.94 * adjustment(8)).toFixed(1)}$ A`);
    expect([3, 4, 6, 7, 9, 10, 20, 21].map(adjustment)).toEqual([1, 0.8, 0.8, 0.7, 0.7, 0.5, 0.5, 0.45]);
    const pts = figure(s).series[0].points;
    // Each count n is a flat step from n − 0.5 to n + 0.5.
    pts.forEach(([x, f], i) => expect(f).toBe(adjustment(i % 2 ? x - 0.5 : x + 0.5)));
  });

  it('Equipment: three motors, a compressor, a generator', () => {
    const [motors, board] = section('Equipment for General Use').examples;
    expect(1.25 * 28).toBe(35);
    expect(2.5 * 28).toBe(70);
    expect(35 + 17 + 11).toBe(63);
    expect(down(70 + 17 + 11)).toBe(90);
    expect(said(motors)).toContain('35 A and 70 A; 63 A and 90 A');
    expect(said(board)).toContain(`= ${1.25 * 22}$ A; disconnect $1.15 \\times 22 = ${(1.15 * 22).toFixed(1)}$ A`);
    expect(said(board)).toContain(`= ${1.15 * 40}$ A`);
  });

  it('Special Equipment: PV, a welder, an array', () => {
    const [pv, array] = section('Special Equipment').examples;
    expect(said(pv)).toContain(`= ${(1.56 * 10).toFixed(1)}$ A`);
    expect(said(pv)).toContain(`= ${50 * 0.78}$ A`);
    const comb = 12 * 9.5;
    expect(said(array)).toContain(`= ${comb}$ A; maximum $1.25 \\times ${comb} = ${1.25 * comb}$ A`);
    expect(said(array)).toContain(`= ${(1.25 * 1.25 * comb).toFixed(1)}$ A`);
  });

  it('PEC Tables: conduit fill', () => {
    const [three, board] = section('PEC Tables').examples;
    expect(60 / 150).toBe(0.4);
    expect(said(three)).toContain('= 53\\%$');
    expect(said(board)).toContain(`= ${((5 * 35.3) / 491 * 100).toFixed(1)}\\%$`);
    expect(said(board)).toContain(`= ${((6 * 35.3) / 0.4).toFixed(1)}$ mm²`);
  });

  it('PEC Part 2: sag, a longer span, the curve', () => {
    const s = section('PEC Part 2');
    const [span, road] = s.examples;
    const sag = (L) => (5 * L * L) / (8 * 10000);
    expect(said(span)).toContain(`= ${sag(100)}$ m`);
    expect(said(road)).toContain(`= ${sag(150).toFixed(3)}$ m`);
    expect(said(road)).toContain(`= ${(10 - sag(150)).toFixed(2)}$ m`);
    expect(figure(s).series[0].f(200)).toBeCloseTo(4 * sag(100), 12);
  });

  it('Grounding: one rod, the soil it needs, the curve', () => {
    const s = section('Grounding and Bonding');
    const [rod, soil] = s.examples;
    const R = rodOhms(100, 3);
    expect(said(rod)).toContain(`= ${R.toFixed(1)}$ Ω`);
    expect((100 / (2 * Math.PI * 3)).toFixed(2)).toBe('5.31');
    expect(said(soil)).toContain(`= ${((100 * 25) / R).toFixed(1)}$ Ω·m`);
    let lo = 1;
    let hi = 6;
    for (let k = 0; k < 60; k += 1) {
      const m = (lo + hi) / 2;
      if (rodOhms(100, m) > 25) lo = m;
      else hi = m;
    }
    expect(lo.toFixed(1)).toBe('4.2');
    expect(Math.round(rodOhms(100, 1))).toBe(83);
  });

  it('Load Computation: a house, a reduced neutral, the demand curve', () => {
    const s = section('Load Computation');
    const [house, neutral] = s.examples;
    const total = 120 * 24 + 2 * 1500 + 1500;
    expect(said(house)).toContain(`= ${total}$ VA`);
    expect(said(house)).toContain(`= ${Math.round(dwellingDemand(total))}$ VA`);
    expect(said(house)).toContain(`= ${(dwellingDemand(total) / 230).toFixed(1)}$ A`);
    expect(said(neutral)).toContain(`= ${120 + 200 + 0.7 * 100}$ A`);
    expect(dwellingDemand(3000)).toBe(3000);
    expect(dwellingDemand(130000)).toBeCloseTo(3000 + 0.35 * 117000 + 0.25 * 10000, 9);
  });

  it('Conductor and Overcurrent Sizing: transformer, capacitors, a service', () => {
    const [basic, svc] = section('Conductor and Overcurrent Sizing').examples;
    const ip = 75000 / (Math.sqrt(3) * 480);
    expect(said(basic)).toContain(`= ${ip.toFixed(1)}$ A; $1.25 \\times ${ip.toFixed(1)} = ${(1.25 * ip).toFixed(1)}$`);
    expect(up(1.25 * ip)).toBe(125);
    const ic = 50000 / (Math.sqrt(3) * 400);
    expect(said(basic)).toContain(`= ${(1.35 * ic).toFixed(1)}$ A`);
    const I = 180000 / (Math.sqrt(3) * 400);
    expect(said(svc)).toContain(`= ${I.toFixed(1)}$ A`);
    expect(up(I)).toBe(300);
    const vd = Math.sqrt(3) * I * 0.1 * 0.06;
    expect(said(svc)).toContain(`= ${vd.toFixed(2)}$ V, ${((vd / 400) * 100).toFixed(3)}%`);
  });

  it('Standards: insulation life', () => {
    const s = section('IEC, IEEE and NEMA Standards');
    const [, hot] = s.examples;
    const life = figure(s).series[0].f;
    expect(life(165)).toBeCloseTo(0.5, 12);
    expect(life(175)).toBeCloseTo(0.25, 12);
    expect(said(hot)).toContain('2^{-2} = \\frac14');
  });
});
