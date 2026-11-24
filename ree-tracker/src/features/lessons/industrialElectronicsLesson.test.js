// Industrial Electronics in the module format (2026-11-25): every number in the
// topic's worked examples, checks and figures, worked again, so a slip in the
// text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/industrial-electronics.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s) => s.body.find((b) => typeof b !== 'string' && b.type === 'plot');
const rad = (d) => (d * Math.PI) / 180;

describe('Industrial Electronics, worked again', () => {
  it('Thyristors and SCRs: string, derating, UJT, di/dt, the sawtooth', () => {
    const s = section('Thyristors and SCRs');
    const [string, fire] = s.examples;
    expect(said(string)).toContain(`= ${((4 * 1100 - 4000) / (3 * 0.005) / 1000).toFixed(1)}$ kΩ`);
    expect(said(string)).toContain(`= ${((1 - 4000 / 4400) * 100).toFixed(1)}\\%$`);
    const f = 1 / (0.002 * Math.log(1 / 0.37));
    expect(said(fire)).toContain(`= ${Math.round(f)}$ Hz`);
    expect(said(fire)).toContain(`= ${400 / 50e6 / 1e-6}$ µH`);
    const saw = figure(s).series[0].f;
    const T = 1000 / f;
    expect(saw(T - 1e-9)).toBeCloseTo(0.63 * 12, 5);
    expect(saw(T + 1e-9)).toBeCloseTo(0, 5);
    expect(figure(s).marks[0].y).toBeCloseTo(7.56, 9);
  });

  it('Triacs and Diacs: 90°, bursts, 60°, the waveform', () => {
    const s = section('Triacs and Diacs');
    const [heater, sixty] = s.examples;
    const vo = (a) => 230 * Math.sqrt((Math.PI - a + Math.sin(2 * a) / 2) / Math.PI);
    expect(said(heater)).toContain(`= ${230 ** 2 / 20}$ W`);
    expect(said(heater)).toContain(`= ${vo(Math.PI / 2).toFixed(1)}$ V`);
    expect(said(heater)).toContain(`= ${(vo(Math.PI / 2) ** 2 / 20).toFixed(1)}$ W`);
    expect(said(heater)).toContain(`= ${Math.round((2645 * 3) / 8)}$ W`);
    expect(said(sixty)).toContain(`= ${vo(Math.PI / 3).toFixed(1)}$ V`);
    expect(said(sixty)).toContain(`= ${Math.round(vo(Math.PI / 3) ** 2 / 20)}$ W`);
    const [load] = figure(s).series;
    expect(load.f(60)).toBe(0);
    expect(load.f(120)).toBeCloseTo(Math.sin(rad(120)), 9);
  });

  it('Power Transistors and IGBTs: losses, saturation, the turn-on energy', () => {
    const s = section('Power Transistors and IGBTs');
    const [losses, bjt] = s.examples;
    expect(said(losses)).toContain(`= ${Math.round(0.5 * 400 * 20 * 0.8e-6 * 1e4)}$ W`);
    expect(said(losses)).toContain(`= ${1.2 * 10 + 0.02 * 200}$ W`);
    const ics = (200 - 1.5) / 10;
    expect(said(bjt)).toContain(`= ${ics}$ A`);
    expect(said(bjt)).toContain(`= ${(ics / 10).toFixed(3)}$ A`);
    expect(said(bjt)).toContain(`= ${((1.5 * ics) / 10).toFixed(2)}$ A`);
    // Area under p(t) (kW·µs = mJ) is ½·V·I·t_on.
    const p = figure(s).series[0].f;
    let E = 0;
    for (let k = 0; k < 50000; k++) E += p((k + 0.5) * 1e-5) * 1e-5;
    expect(E).toBeCloseTo(0.5 * 400 * 20 * 0.4e-6 * 1000, 3);
  });

  it('Controlled Rectifiers: three-phase with overlap, full and semi', () => {
    const s = section('Controlled Rectifiers');
    const [three, single] = s.examples;
    const v0 = 1.35 * 415 * Math.cos(rad(30));
    const drop = (3 * 2 * Math.PI * 50 * 0.002 * 100) / Math.PI;
    expect(said(three)).toContain(`= ${v0.toFixed(1)}$ V`);
    expect(said(three)).toContain(`= ${Math.round(drop)}$ V: ${(v0 - drop).toFixed(1)} V`);
    const k = (2 * 2 * Math.PI * 50 * 0.002 * 100) / (Math.SQRT2 * 415);
    expect(said(three)).toContain(`- ${k.toFixed(3)}$`);
    expect(said(three)).toContain(`= ${((Math.acos(Math.cos(rad(30)) - k) * 180) / Math.PI - 30).toFixed(1)}°$`);
    expect(said(three)).toContain(`= ${(0.955 * Math.cos(rad(30))).toFixed(3)}$`);
    const vm = 230 * Math.SQRT2;
    expect(said(single)).toContain(`= ${vm.toFixed(1)}$ V`);
    expect(said(single)).toContain(`= ${((2 * vm) / Math.PI / 2).toFixed(1)}$ V`);
    expect(said(single)).toContain(`= ${((vm / Math.PI) * 1.5).toFixed(1)}$ V`);
    expect(s.check[0].a).toContain(`${6 * 60} Hz`);
    const [full, semi] = figure(s).series;
    expect(full.f(90)).toBeCloseTo(0, 9);
    expect(semi.f(180)).toBeCloseTo(0, 9);
  });

  it('Inverters: harmonics, line voltages, dc link, the fundamental', () => {
    const s = section('Inverters');
    const [basic, link] = s.examples;
    expect(said(basic)).toContain(`= ${0.9 * 220}$ V`);
    expect(said(basic)).toContain(`= ${198 / 3}$ V`);
    expect(said(basic)).toContain(`= ${198 / 5}$ V`);
    expect(said(basic)).toContain(`= ${0.78 * 600}$ V`);
    expect(said(basic)).toContain(`= ${Math.round(0.612 * 0.8 * 600)}$ V`);
    expect(said(link)).toContain(`= ${(230 / 0.78).toFixed(1)}$ V`);
    expect(said(link)).toContain(`= ${(230 / 0.612).toFixed(1)}$ V`);
    // The square wave's fundamental, by Fourier, is the dashed curve.
    const [sq, fund] = figure(s).series;
    let b1 = 0;
    for (let k = 0; k < 36000; k++) { const th = (k + 0.5) / 100; b1 += sq.f(th) * Math.sin(rad(th)) * rad(0.01); }
    expect(b1 / Math.PI).toBeCloseTo(fund.f(90), 4);
    expect(((4 / Math.PI) / Math.SQRT2).toFixed(2)).toBe('0.90');
  });

  it('Choppers: buck ripple, boost and buck-boost', () => {
    const s = section('Choppers');
    const [buck, boost] = s.examples;
    expect(said(buck)).toContain(`= ${12 / 48}$`);
    expect(said(buck)).toContain(`= ${(48 * 0.25 * 0.75) / (1e-4 * 5e4)}$ A`);
    const rip = 0.75 / (8 * 1e-4 * 4.7e-5 * 2.5e9);
    expect(said(buck)).toContain(`= ${(rip * 100).toFixed(2)}\\%$: ${Math.round(rip * 12 * 1000)} mV`);
    expect(said(boost)).toContain(`D = ${1 - 12 / 48}$`);
    expect(said(boost)).toContain(`= ${(48 * 2) / 12}$ A`);
    expect(said(boost)).toContain(`= ${(2 / 3).toFixed(3)}$`);
    const [b, bo, bb] = figure(s).series;
    expect(b.f(0.5)).toBe(0.5);
    expect(bo.f(0.5)).toBe(2);
    expect(bb.f(0.5)).toBe(1);
  });

  it('Cycloconverters: frequency, voltage, N', () => {
    const s = section('Cycloconverters');
    const [basic, n] = s.examples;
    expect(said(basic)).toContain(`= ${(50 / 3).toFixed(1)}$ Hz`);
    expect(said(basic)).toContain(`= ${Math.round(0.8 * 240 * (6 / Math.PI) * 0.5)}$ V`);
    expect(said(n)).toContain(`= ${50 / 12.5}$`);
    expect(said(n)).toContain(`= ${60 / 3}$ Hz`);
    const f = figure(s).series[0].f;
    expect(f(15)).toBeCloseTo(Math.abs(Math.sin(2 * Math.PI * 0.05 * 15)), 9);
    expect(f(45)).toBeLessThan(0);
  });

  it('Motor Drives: converter-fed, chopper-fed, acceleration, the lines', () => {
    const s = section('Motor Drives');
    const [conv, chop] = s.examples;
    const w = (1.35 * 415 * Math.cos(rad(30)) - 25) / 2;
    expect(said(conv)).toContain(`= ${w.toFixed(1)}$ rad/s = ${Math.round((w * 60) / (2 * Math.PI))} rpm`);
    expect(said(conv)).toContain(`= ${(2 * 150) / 60}$ s`);
    const w2 = (0.6 * 220 - 10) / 1.2;
    expect(said(chop)).toContain(`= ${w2.toFixed(1)}$ rad/s = ${Math.round((w2 * 60) / (2 * Math.PI))} rpm`);
    expect(figure(s).series[1].f(100)).toBeCloseTo(w, 9);
  });

  it('UPS: sizing, end-of-discharge current, kW limit', () => {
    const [size, limit] = section('UPS').examples;
    expect(said(size)).toContain(`= ${1.25 * (8 / 0.8)}$ kVA`);
    expect(said(size)).toContain(`= ${Math.round(5000 / (0.9 * 42))}$ A`);
    expect(said(size)).toContain(`= ${24 * 2.25}$ V`);
    expect(said(limit)).toContain(`= ${+(3 * 0.8).toFixed(1)}$ kW`);
    expect(said(limit)).toContain(`= ${(2.7 / 0.95).toFixed(2)}$ kVA`);
  });

  it('Sensors: Hall, encoders, the quadrature channels', () => {
    const s = section('Sensors');
    const [hall, count] = s.examples;
    expect(said(hall)).toContain(`= ${((0.005 * 0.5) / (1e22 * 1.602e-19 * 0.001) * 1000).toFixed(2)}$ mV`);
    expect(said(hall)).toContain(`= ${(60 * 5000) / 1000}$ rpm`);
    expect(said(hall)).toContain(`= ${360 / 4000}°$`);
    expect(said(count)).toContain(`= ${400 / 0.1}$ Hz`);
    expect(said(count)).toContain(`= ${(60 * 4000) / 500}$ rpm`);
    const [A, B] = figure(s).series;
    expect(A.f(45)).toBe(1);
    expect(B.f(45)).toBe(1.5);
    expect(B.f(135)).toBe(2.5);
  });

  it('Optoelectronics: wavelength, responsivity, resistors, CTR', () => {
    const [basic, opto] = section('Optoelectronics').examples;
    expect(said(basic)).toContain(`= ${(1.24 / 1.43).toFixed(3)}$ µm`);
    expect(said(basic)).toContain(`= ${((0.8 * 0.85) / 1.24).toFixed(3)}$ A/W`);
    expect(said(basic)).toContain(`= ${(12 - 6) / 0.02}$ Ω`);
    expect(said(opto)).toContain(`= ${0.5 * 10}$ mA`);
    expect(said(opto)).toContain(`= ${0.25 * 10}$ mA`);
    expect(said(opto)).toContain(`= ${Math.round((5 - 0.2) / 0.0025)}$ Ω`);
  });

  it('Timers and PLCs: astable, monostable, the capacitor swing', () => {
    const s = section('Timers and PLCs');
    const [astable, mono] = s.examples;
    expect(said(astable)).toContain(`= ${(0.693 * 30000 * 1e-8 * 1000).toFixed(3)}$ ms`);
    expect(said(astable)).toContain(`= ${(0.693 * 20000 * 1e-8 * 1000).toFixed(3)}$ ms`);
    expect(said(astable)).toContain(`= ${(1.44 / (50000 * 1e-8) / 1000).toFixed(2)}$ kHz`);
    expect(said(mono)).toContain(`= ${(5 / (1.1 * 47e-6) / 1000).toFixed(1)}$ kΩ`);
    const v = figure(s).series[0].f;
    const th = 0.3 * Math.LN2;
    expect(v(0)).toBeCloseTo(1 / 3, 9);
    expect(v(th - 1e-9)).toBeCloseTo(2 / 3, 6);
    expect(v(th + 0.2 * Math.LN2 - 1e-9)).toBeCloseTo(1 / 3, 6);
  });
});
