// Electrical System & Illumination Design in the module format (2026-11-24):
// every number in the topic's worked examples, checks and figures, worked again,
// so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/electrical-system-illumination-design.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s) => s.body.find((b) => typeof b !== 'string' && b.type === 'plot');
const S3 = Math.sqrt(3);

describe('Electrical System & Illumination Design, worked again', () => {
  it('Load Computation: dwelling demand, range, area method, the curve', () => {
    const s = section('Load Computation');
    const [house, office] = s.examples;
    const light = 3000 + 0.35 * (4000 + 3 * 1500 - 3000);
    expect(light).toBeCloseTo(4925, 9);
    const range = 8 * (1 + 0.05 * (16 - 12));
    expect(range).toBeCloseTo(9.6, 9);
    const total = light + range * 1000;
    expect(said(house)).toContain(`$14\\,525$ VA`);
    expect(total).toBeCloseTo(14525, 9);
    expect(said(house)).toContain(`= ${(total / 230).toFixed(1)}$ A`);
    expect(28 * 300 + 8 * 300).toBe(10800);
    expect(said(office)).toContain('10 800 VA');
    expect(figure(s).series[0].f(figure(s).marks[0].x)).toBeCloseTo(4925, 9);
  });

  it('Branch Circuits: circuits up, outlets down', () => {
    const [circ, outlets] = section('Branch Circuits').examples;
    const N = (24000 * 1.25) / (230 * 20);
    expect(said(circ)).toContain(`= ${N.toFixed(2)}$, so ${Math.ceil(N)} circuits`);
    const cont = (230 * 20 * 0.8) / 180;
    const not = (230 * 20) / 180;
    expect(said(outlets)).toContain(`= ${cont.toFixed(1)}$, so ${Math.floor(cont)} outlets`);
    expect(said(outlets)).toContain(`= ${not.toFixed(1)}$, so ${Math.floor(not)}`);
  });

  it('Feeders and Services: transformer, service current, motor feeder', () => {
    const s = section('Feeders and Services');
    const [xf, feeder] = s.examples;
    expect(said(xf)).toContain(`= ${(400 / 0.85).toFixed(1)}$ kVA`);
    expect(said(xf)).toContain(`= ${Math.round(500000 / (S3 * 400))}$ A`);
    expect(1.25 * 65 + 28 + 40 + 50).toBe(199.25);
    expect(said(feeder)).toContain('= 199.25$ A');
    expect(280 / 0.8).toBeCloseTo(350, 9);
  });

  it('Conductor and Conduit Sizing: circular mils and fill', () => {
    const [drop, fill] = section('Conductor and Conduit Sizing').examples;
    const cm = (2 * 10.4 * 60 * 200) / (0.03 * 230);
    expect(said(drop)).toContain(`= 36\\,${Math.round(cm) % 1000}$ cmil`);
    expect(Math.round(cm)).toBe(36174);
    expect(cm).toBeLessThan(41740);
    expect((4 * 50) / 0.4).toBe(500);
    expect(said(fill)).toContain('= 500$ mm²');
  });

  it('Overcurrent Protection: transformer fault, trip times', () => {
    const s = section('Overcurrent Protection');
    const [ir, curve] = s.examples;
    const IFL = 500000 / (S3 * 400);
    expect(said(ir)).toContain(`${IFL.toFixed(1)} A`);
    expect(said(ir)).toContain(`= ${(IFL / 0.05 / 1000).toFixed(1)}$ kA`);
    const f = figure(s).series[0].f;
    expect(said(curve)).toContain(`= ${f(2).toFixed(0)}$ s`);
    expect(said(curve)).toContain(`= ${f(5).toFixed(1)}$ s`);
    expect(f(12)).toBeLessThan(0.1);
    expect(figure(s).marks[0].x).toBe(10);
  });

  it('Motor Circuits: locked rotor, disconnect, dip, sizing', () => {
    const [start, size] = section('Motor Circuits').examples;
    const ILR = (6.29 * 50 * 1000) / (S3 * 460);
    expect(said(start)).toContain(`= ${Math.round(ILR)}$ A`);
    expect(said(start)).toContain(`= ${(1.15 * 65).toFixed(1)}$ A`);
    expect(said(start)).toContain(`= ${((314.5 / 10314.5) * 100).toFixed(1)}\\%$`);
    expect(said(size)).toContain(`= ${1.25 * 32}$ A`);
    expect(said(size)).toContain(`= ${2.5 * 32}$ A`);
    expect(said(size)).toContain(`= ${3 * 32}$ A`);
    expect(said(size)).toContain(`= ${1.5 * 32}$ A`);
  });

  it('Voltage Drop: load moments, the curve, the conductor', () => {
    const s = section('Voltage Drop');
    const [moments, fix] = s.examples;
    const VD = 2 * 0.002 * (20 * 30 + 15 * 60 + 10 * 100);
    expect(VD).toBeCloseTo(10, 9);
    expect(said(moments)).toContain(`${((VD / 230) * 100).toFixed(2)}%`);
    expect(figure(s).series[0].f(100)).toBeCloseTo(VD, 9);
    expect(figure(s).marks[0].y).toBeCloseTo(0.03 * 230, 9);
    expect(said(fix)).toContain(`= ${(6.9 / (2 * 2500)).toFixed(5)}$`);
  });

  it('Short-Circuit Calculation: MVA method, point-to-point, infinite source', () => {
    const s = section('Short-Circuit Calculation');
    const [mva, inf] = s.examples;
    const total = 1 / (1 / 500 + 0.06 / 2);
    expect(said(mva)).toContain(`= ${total.toFixed(2)}$ MVA`);
    const I = (total * 1e6) / (S3 * 480) / 1000;
    expect(said(mva)).toContain(`= ${I.toFixed(1)}$ kA`);
    expect(said(mva)).toContain(`= ${(30 / 1.433).toFixed(1)}$ kA`);
    expect(figure(s).series[0].f(50)).toBeCloseTo(30 / 1.433, 9);
    const Iinf = ((2 / 0.06) * 1e6) / (S3 * 480) / 1000;
    expect(said(inf)).toContain(`= ${Iinf.toFixed(1)}$ kA`);
    expect(said(inf)).toContain(`${Math.round((Iinf / I - 1) * 100)}% higher`);
  });

  it('Grounding: rods in parallel and the curve', () => {
    const s = section('Grounding');
    const [two, three] = s.examples;
    expect(said(two)).toContain(`= ${(40 / 2) * 1.2}$ Ω`);
    expect(said(three)).toContain(`= ${((40 / 3) * 1.3).toFixed(1)}$ Ω`);
    const f = figure(s).series[0].f;
    expect(f(1)).toBe(40);
    expect(f(2)).toBeCloseTo(24, 9);
    expect(f(3)).toBeCloseTo(16, 9);
    expect(f(2)).toBeLessThan(figure(s).marks[0].y);
  });

  it('Plans and Specifications: phase unbalance', () => {
    const [before, after] = section('Plans and Specifications').examples;
    const unb = (ph) => { const avg = ph.reduce((a, b) => a + b) / ph.length; return ((Math.max(...ph) - avg) / avg) * 100; };
    expect(said(before)).toContain(`= ${unb([120, 100, 95]).toFixed(1)}\\%$`);
    expect(said(after)).toContain(`= ${unb([110, 110, 95]).toFixed(1)}\\%$`);
  });

  it('Lighting Fundamentals: flux, luminance, MSCP, efficacy, foot-candles', () => {
    const s = section('Lighting Fundamentals');
    const [flux, mscp] = s.examples;
    expect(said(flux)).toContain(`= 12\\,${Math.round(4 * Math.PI * 1000) % 1000}$ lm`);
    expect(said(flux)).toContain(`= ${Math.round((0.7 * 500) / Math.PI)}$ cd/m²`);
    expect(said(mscp)).toContain(`= ${(1200 / (4 * Math.PI)).toFixed(1)}$ cd`);
    expect(said(mscp)).toContain(`= ${Math.round(1200 / (2 * Math.PI))}$ cd`);
    expect(s.check[0].a).toContain(`= ${Math.round(50 * 10.76)}$ lx`);
    expect(Math.round(figure(s).series[0].f(3))).toBe(111);
  });

  it('Lumen Method: cavity ratios, number of luminaires, loss factor', () => {
    const [count, cavities] = section('Lumen Method').examples;
    const cr = (h) => (5 * h * (20 + 10)) / (20 * 10);
    expect(said(count)).toContain(`= ${cr(2.5)}$`);
    const N = (500 * 200) / (4000 * 0.6 * 0.765);
    expect(said(count)).toContain(`= ${N.toFixed(1)}$, so ${Math.ceil(N)}`);
    expect(said(cavities)).toContain(`= ${cr(0.5)}$`);
    expect(said(cavities)).toContain(`= ${cr(0.75)}$`);
    expect(said(cavities)).toContain(`= ${(0.9 * 0.85 * 0.95).toFixed(3)}$`);
  });

  it('Point-by-Point Method: below, at 45°, two lamps, the curves', () => {
    const s = section('Point-by-Point Method');
    const [one, two] = s.examples;
    const below = 1000 / 9;
    const at45 = below * Math.cos(Math.PI / 4) ** 3;
    expect(said(one)).toContain(`= ${Math.round(below)}$ lx`);
    expect(said(one)).toContain(`= ${at45.toFixed(1)}$ lx`);
    expect(said(two)).toContain(`= ${(2 * at45).toFixed(1)}$ lx`);
    const [h, v] = figure(s).series;
    expect(h.f(0)).toBeCloseTo(below, 9);
    expect(h.f(3)).toBeCloseTo(at45, 9);
    expect(v.f(0)).toBe(0);
  });

  it('Lamp Types: energy cost and an LED swap', () => {
    const [year, swap] = section('Lamp Types').examples;
    expect((36 * 100 * 3000 * 10) / 1000).toBe(108000);
    expect(said(year)).toContain('= ₱108\\,000$');
    expect(said(swap)).toContain(`= ${1500 / 120}$ W`);
    expect(said(swap)).toContain(`= ₱${((1500 / 15 - 1500 / 120) * 2000 * 10) / 1000}$`);
  });

  it('Emergency and Energy-Efficient Lighting: battery, payback, LPD', () => {
    const [battery, lpd] = section('Emergency and Energy-Efficient Lighting').examples;
    expect(said(battery)).toContain(`= ${((200 * 1.5 * 10) / (12 * 8)).toFixed(1)}$ Ah`);
    const save = (22 * 100 * 3000 * 10) / 1000;
    expect(save).toBe(66000);
    expect(said(battery)).toContain(`= ${(60000 / save).toFixed(2)}$ year`);
    expect(said(lpd)).toContain(`= ${(55 * 36) / 200}$ W/m²`);
  });
});
