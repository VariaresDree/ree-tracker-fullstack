// Electrical Apparatus & Devices in the module format (2026-11-24): every number
// in the topic's worked examples, checks and figures, worked again, so a slip in
// the text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/electrical-apparatus-devices.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s, type = 'plot') => s.body.find((b) => typeof b !== 'string' && b.type === type);
// First x in [a, b] where f crosses level (f rising or falling through it).
const crossing = (f, level, a, b, n = 200000) => { const s0 = Math.sign(f(a) - level); for (let k = 1; k <= n; k++) { const x = a + ((b - a) * k) / n; if (Math.sign(f(x) - level) !== s0) return x; } return NaN; };

describe('Electrical Apparatus & Devices, worked again', () => {
  it('Fuses: melting times, cut-off, the curve', () => {
    const s = section('Fuses');
    const [melt, cut] = s.examples;
    expect(said(melt)).toContain(`= ${50000 / 1000 ** 2}$ s`);
    expect(said(melt)).toContain(`= ${50000 / 2000 ** 2}$ s`);
    const peak = 20 * Math.SQRT2;
    const iCut = peak * Math.sin(2 * Math.PI * 60 * 0.002);
    expect(said(cut)).toContain(`= ${peak.toFixed(1)}$ kA`);
    expect(said(cut)).toContain(`${(1000 / 240).toFixed(2)} ms`);
    expect(said(cut)).toContain(`= ${iCut.toFixed(1)}$ kA`);
    const [pros, fuse] = figure(s).series;
    expect(fuse.f(2)).toBeCloseTo(iCut, 9);
    expect(fuse.f(5)).toBeCloseTo(0, 9);
    expect(pros.f(1000 / 240)).toBeCloseTo(peak, 9);
    expect(figure(s).marks[0].x).toBe(2);
  });

  it('Circuit Breakers: MCB bands, restriking voltage', () => {
    const s = section('Circuit Breakers');
    const [mcb, trv] = s.examples;
    expect(said(mcb)).toContain(`= ${5 * 16}$`);
    expect(said(mcb)).toContain(`= ${10 * 16}$`);
    const wn = 1 / Math.sqrt(2e-3 * 0.02e-6);
    const Vm = (11 * Math.SQRT2) / Math.sqrt(3);
    expect(said(trv)).toContain(`= 158\\,${Math.round(wn) % 1000}$ rad/s`);
    expect(said(trv)).toContain(`= ${(wn / (2 * Math.PI) / 1000).toFixed(1)}$ kHz`);
    expect(said(trv)).toContain(`= ${Vm.toFixed(2)}$ kV`);
    expect(said(trv)).toContain(`= ${(2 * Vm).toFixed(1)}$ kV`);
    const tPeak = (Math.PI / wn) * 1e6;
    expect(said(trv)).toContain(`= ${tPeak.toFixed(1)}$ µs`);
    expect(said(trv)).toContain(`= ${((wn * Vm) / 1e6).toFixed(2)}$ kV/µs`);
    const f = figure(s).series[0].f;
    expect(f(tPeak)).toBeCloseTo(2 * Vm, 9);
    expect(figure(s).marks[0].x).toBeCloseTo(tPeak, 1);
  });

  it('Relays and Contactors: RC timer, pickup, the curve', () => {
    const s = section('Relays and Contactors');
    const [timer, pickup] = s.examples;
    const t = 100000 * 10e-6 * Math.log(12 / 4);
    expect(said(timer)).toContain(`= ${t.toFixed(2)}$ s`);
    expect(said(pickup)).toContain(`= ${1.5 * 5}$ A`);
    expect(said(pickup)).toContain(`= ${1.5 * 5 * (300 / 5)}$ A`);
    const f = figure(s).series[0].f;
    expect(crossing(f, 8, 0, 4)).toBeCloseTo(t, 4);
    expect(figure(s).marks[1].x).toBeCloseTo(t, 2);
  });

  it('Motor Starters: primary resistor, star-delta, autotransformer, the phasor', () => {
    const s = section('Motor Starters');
    const [res, compare] = s.examples;
    const Zm = Math.hypot(0.5, 2);
    const target = Zm / 0.6;
    const R = Math.sqrt(target ** 2 - 4) - 0.5;
    expect(said(res)).toContain(`= ${Zm.toFixed(2)}$ Ω`);
    expect(said(res)).toContain(`= ${target.toFixed(2)}$ Ω`);
    expect(said(res)).toContain(`= ${R.toFixed(2)}$ Ω`);
    expect(said(compare)).toContain(`= ${600 / 3}$ A`);
    expect(said(compare)).toContain(`= ${(2 / 3).toFixed(2)}$`);
    expect(said(compare)).toContain(`= ${(0.65 ** 2 * 600).toFixed(1)}$ A`);
    expect(said(compare)).toContain(`= ${(0.65 ** 2 * 2).toFixed(3)}$`);
    const v = figure(s, 'phasor').vectors;
    expect(v[3].mag).toBeCloseTo(Math.hypot(0.5 + R, 2), 2);
    expect(v[3].angle).toBeCloseTo((Math.atan2(2, 0.5 + R) * 180) / Math.PI, 1);
    expect(v[4].angle).toBeCloseTo((Math.atan2(2, 0.5) * 180) / Math.PI, 0);
  });

  it('Instrument Transformers: multiplier, wye-delta bank', () => {
    const [bill, bank] = section('Instrument Transformers').examples;
    expect(said(bill)).toContain(`= ${(200 / 5) * (14400 / 120)}$`);
    expect(said(bill)).toContain(`= ${Math.round(1.25 * 4800 * 1.002)}$ kWh`);
    expect(said(bank)).toContain(`= ${69000 / 115}$`);
    expect(110 * 600).toBe(66000);
    expect(said(bank)).toContain(`= ${(66 * Math.sqrt(3)).toFixed(1)}$ kV`);
  });

  it('Capacitors and Reactors: resonance, discharge, derating, the curve', () => {
    const s = section('Capacitors and Reactors');
    const [res, derate] = s.examples;
    expect(said(res)).toContain(`= ${Math.sqrt(20 / 1.2).toFixed(2)}$`);
    const V0 = 480 * Math.SQRT2;
    expect(said(res)).toContain(`= ${Math.round(V0)}$ V`);
    expect(said(res)).toContain(`= ${(60 / (300e-6 * Math.log(V0 / 50)) / 1000).toFixed(1)}$ kΩ`);
    expect(said(derate)).toContain(`= ${(50 * (400 / 480) ** 2 * (50 / 60)).toFixed(1)}$ kvar`);
    const f = figure(s).series[0].f;
    expect(crossing(f, 0, 1, 13)).toBeCloseTo(1 / Math.sqrt(0.07), 3);
    expect(figure(s).marks[0].x).toBeCloseTo(1 / Math.sqrt(0.07), 2);
    expect(s.check[1].a).toContain(`= ${(1 / Math.sqrt(0.07)).toFixed(2)}$`);
  });

  it('Surge Arresters: lead voltage and margins, the curve', () => {
    const s = section('Surge Arresters');
    const [leads, margin] = s.examples;
    const f = figure(s).series[0].f;
    expect(f(1)).toBe(1);
    expect(f(1.08)).toBeCloseTo(10, 0);
    expect(1 * 3 * 10).toBe(30);
    expect(said(leads)).toContain('= 30$ kV');
    expect(said(margin)).toContain(`= ${((95 / 80 - 1) * 100).toFixed(1)}\\%$`);
    expect(said(margin)).toContain(`= ${((95 / 60 - 1) * 100).toFixed(1)}\\%$`);
  });

  it('Switchgear and Panelboards: busbar force, short-time withstand', () => {
    const s = section('Switchgear and Panelboards');
    const [force, withstand] = s.examples;
    expect(said(force)).toContain(`= ${(0.2 * 50 ** 2) / 0.2}$ N/m`);
    expect(said(force)).toContain(`= ${0.866 * 2500}$ N/m`);
    expect(said(withstand)).toContain(`= ${(40 / Math.sqrt(3)).toFixed(1)}$ kA`);
    expect(figure(s).series[0].f(0.2)).toBeCloseTo(2500, 9);
  });

  it('Wires and Cables: fault withstand, stress, the best radius', () => {
    const s = section('Wires and Cables');
    const [basic, best] = s.examples;
    expect(said(basic)).toContain(`= ${Math.round((20000 * Math.sqrt(0.5)) / 115)}$ mm²`);
    expect(said(basic)).toContain(`= ${(11 / (0.6 * Math.log(1.6 / 0.6))).toFixed(1)}$ kV/cm`);
    const r0 = 1.6 / Math.E;
    expect(said(best)).toContain(`= ${r0.toFixed(3)}$ cm`);
    expect(said(best)).toContain(`= ${(11 / r0).toFixed(1)}$ kV/cm`);
    const f = figure(s).series[0].f;
    expect(f(0.6)).toBeCloseTo(11 / (0.6 * Math.log(1.6 / 0.6)), 9);
    expect(f(1.6).toFixed(1)).toBe('7.0');
    const area = (n) => (0.127 * 92 ** ((36 - n) / 39)) ** 2;
    expect(area(4) / area(10)).toBeCloseTo(4, 1);
  });

  it('Batteries and UPS: Peukert, runtime, UPS size, the curve', () => {
    const s = section('Batteries and UPS');
    const [basic, size] = s.examples;
    const t = 20 * (100 / 400) ** 1.2;
    expect(said(basic)).toContain(`= ${t.toFixed(1)}$ h`);
    expect(said(basic)).toContain(`= ${((100 * 48 * 0.9 * 0.8) / 2000).toFixed(2)}$ h`);
    expect(said(size)).toContain(`= ${2 / 0.8}$ kVA`);
    expect(said(size)).toContain(`= ${48 / 12}$`);
    const [delivered, rating] = figure(s).series;
    expect(delivered.f(20)).toBeCloseTo(20 * t, 9);
    expect(Math.round(delivered.f(20))).toBe(76);
    expect(delivered.f(5)).toBeCloseTo(100, 9);
    expect(rating.f(20)).toBe(100);
  });

  it('Lamps and Luminaires: light output ratio, L70, efficacy, the curve', () => {
    const s = section('Lamps and Luminaires');
    const [basic, compare] = s.examples;
    expect(said(basic)).toContain(`= ${(3400 / 4000) * 100}\\%$`);
    const L70 = Math.log(1 / 0.7) / (-Math.log(0.9) / 10000);
    expect(said(basic)).toContain(`= 33\\,${Math.round(L70) % 1000}$ h`);
    expect(said(compare)).toContain(`= ${(3400 / 38).toFixed(1)}$ lm/W`);
    expect(said(compare)).toContain(`= ${(3000 / 28).toFixed(1)}$ lm/W`);
    expect(figure(s).series[0].f(L70 / 1000)).toBeCloseTo(70, 9);
  });
});
