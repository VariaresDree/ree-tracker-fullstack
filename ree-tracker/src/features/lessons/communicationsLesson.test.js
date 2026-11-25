// Fundamentals of Electronic Communications in the module format (2026-11-25):
// every number in the topic's worked examples, checks and figures, worked
// again, so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/fundamentals-of-electronic-communications.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s) => s.body.find((b) => typeof b !== 'string' && b.type === 'plot');
const log = Math.log10;
const crossing = (f, level, a, b, n = 200000) => { const s0 = Math.sign(f(a) - level); for (let k = 1; k <= n; k++) { const x = a + ((b - a) * k) / n; if (Math.sign(f(x) - level) !== s0) return x; } return NaN; };

describe('Fundamentals of Electronic Communications, worked again', () => {
  it('Signals, Spectrum and Decibels: chain, quickies, the sinc nulls', () => {
    const s = section('Signals, Spectrum and Decibels');
    const [chain, quick] = s.examples;
    expect(said(chain)).toContain(`= ${(10 * log(50)).toFixed(1)}$ dBm`);
    expect(said(chain)).toContain(`= ${(10 ** 3.4 / 1000).toFixed(1)}$ W`);
    expect(said(quick)).toContain(`= ${(20 * log(60)).toFixed(2)}$ dB`);
    expect(said(quick)).toContain(`= ${(10 * log(50 / 0.001)).toFixed(1)}$ dBm`);
    expect(said(quick)).toContain(`= ${(10 * 10 ** (-3 / 20)).toFixed(2)}$ V`);
    expect(s.check[0].a).toContain(`= ${10 * log(100 / 0.001)}$ dB`);
    const f = figure(s).series[0].f;
    for (const k of [1, 2, 3]) expect(f(k)).toBeCloseTo(0, 9);
  });

  it('Noise: Friis, temperature, floor, noise voltage', () => {
    const s = section('Noise');
    const [rx, vn] = s.examples;
    const F = 10 ** 0.2 + (10 - 1) / 100;
    expect(said(rx)).toContain(`= ${F.toFixed(3)}$`);
    expect(said(rx)).toContain(`= ${(10 * log(F)).toFixed(2)}$ dB`);
    expect(said(rx)).toContain(`= ${Math.round((F - 1) * 290)}$ K`);
    expect(said(rx)).toContain(`= ${(-174 + 60 + 10 * log(F)).toFixed(1)}$ dBm`);
    expect(said(vn)).toContain(`= ${(Math.sqrt(4 * 1.38e-23 * 290 * 1e4 * 2e4) * 1e6).toFixed(2)}$ µV`);
    expect(said(vn)).toContain(`= ${Math.round((10 ** 0.3 - 1) * 290)}$ K`);
    expect(figure(s).series[0].f(1000)).toBeCloseTo(-111.76, 2);
  });

  it('Amplitude Modulation: powers, current, index from current, the envelope', () => {
    const s = section('Amplitude Modulation');
    const [basic, current] = s.examples;
    expect(said(basic)).toContain(`= ${(10 * (1 + 0.32)).toFixed(1)}$ kW`);
    expect(said(basic)).toContain(`= ${(10 * 0.64) / 4}$ kW`);
    expect(said(basic)).toContain(`= ${((0.32 / 1.32) * 100).toFixed(1)}\\%$`);
    expect(said(basic)).toContain(`= ${(10 * Math.sqrt(1.32)).toFixed(1)}$ A`);
    const ratio = (8.93 / 8) ** 2;
    expect(said(current)).toContain(`= ${ratio.toFixed(3)}`);
    expect(said(current)).toContain(`= ${Math.sqrt(2 * (ratio - 1)).toFixed(2)}$`);
    const env = figure(s).series[1].f;
    expect((env(0) - env(0.5)) / (env(0) + env(0.5))).toBeCloseTo(0.8, 9);
  });

  it('Single Sideband: saving, PEP', () => {
    const [save, pep] = section('Single Sideband').examples;
    expect(said(save)).toContain(`= ${((1 - 1.6 / 13.2) * 100).toFixed(1)}\\%$`);
    expect(said(pep)).toContain(`= ${100 ** 2 / (2 * 50)}$ W`);
    expect(said(pep)).toContain(`= ${((1.25 / 1.5) * 100).toFixed(1)}\\%$`);
    expect(said(pep)).toContain(`= ${((1 / 1.5) * 100).toFixed(1)}\\%$`);
  });

  it('Frequency Modulation: β, Carson, Bessel values, the J0 zero', () => {
    const s = section('Frequency Modulation');
    const [basic, dev] = s.examples;
    expect(said(basic)).toContain(`= ${75 / 15}$`);
    expect(said(basic)).toContain(`= ${2 * (75 + 15)}$ kHz`);
    const [j0, j1, j2] = figure(s).series.map((x) => x.f);
    expect(said(basic)).toContain(`= ${j0(2).toFixed(3)}$`);
    expect(said(basic)).toContain(`= ${j1(2).toFixed(3)}$`);
    expect(said(basic)).toContain(`= ${j2(2).toFixed(3)}$`);
    expect(crossing(j0, 0, 0, 4)).toBeCloseTo(2.405, 3);
    expect(said(dev)).toContain(`= ${10 / 2.5}$`);
    expect(said(dev)).toContain(`= ${2 * (10 + 2.5)}$ kHz`);
  });

  it('Sampling and PCM: rates, step, SNR, bits, the quantizer', () => {
    const s = section('Sampling and PCM');
    const [tel, cd] = s.examples;
    expect(said(tel)).toContain(`= ${((2 / 256) * 1000).toFixed(2)}$ mV`);
    expect(said(tel)).toContain(`= ${(6.02 * 8 + 1.76).toFixed(1)}$ dB`);
    expect(said(cd)).toContain(`n \\ge ${((40 - 1.76) / 6.02).toFixed(2)}$`);
    expect(said(cd)).toContain(`= ${((44100 * 16 * 2) / 1e6).toFixed(3)}$ Mbit/s`);
    const [q, input] = figure(s).series;
    for (let x = 0; x <= 1; x += 0.01) expect(Math.abs(q.f(x) - input.f(x))).toBeLessThanOrEqual(1 / 16 + 1e-12);
  });

  it('Digital Modulation: Shannon, Nyquist, QPSK, the curve', () => {
    const s = section('Digital Modulation');
    const [phone, qpsk] = s.examples;
    expect(said(phone)).toContain(`= ${((3100 * Math.log2(1001)) / 1000).toFixed(1)}$ kbit/s`);
    expect(said(phone)).toContain(`= ${(2 * 3100 * 2) / 1000}$ kbit/s`);
    expect(said(qpsk)).toContain(`= ${10 * (1 + 0.25)}$ MHz`);
    expect(said(qpsk)).toContain(`= ${10 * (12.5 / 20)}$: ${(10 * log(6.25)).toFixed(2)} dB`);
    expect(figure(s).series[0].f(30)).toBeCloseTo(Math.log2(1001), 9);
  });

  it('Multiplexing: FDM, T1, WDM, the band plan', () => {
    const s = section('Multiplexing');
    const [fdm, t1] = s.examples;
    expect(said(fdm)).toContain(`= ${5 * 100 + 4 * 10}$ kHz`);
    expect(said(t1)).toContain(`= ${((24 * 8 + 1) * 8000) / 1e6}$ Mbit/s`);
    expect(said(t1)).toContain(`= ${((3e8 * 0.8e-9) / (1550e-9) ** 2 / 1e9).toFixed(1)}$ GHz`);
    const f = figure(s).series[0].f;
    let width = 0;
    for (let x = 0.05; x < 540; x += 0.1) width += f(x) * 0.1;
    expect(width).toBeCloseTo(500, 0);
  });

  it('Transmission Lines: mismatch, matching, the standing wave', () => {
    const s = section('Transmission Lines');
    const [mis, match] = s.examples;
    expect(said(mis)).toContain(`= ${(-20 * log(0.2)).toFixed(1)}$ dB`);
    expect(said(mis)).toContain(`= ${(-10 * log(0.96)).toFixed(2)}$ dB`);
    expect(said(mis)).toContain(`= ${Math.sqrt(75 * 50).toFixed(1)}$ Ω`);
    expect(said(mis)).toContain(`= ${((138 / 1.5) * log(3.5)).toFixed(1)}$ Ω`);
    expect(Math.sqrt(200 / 8)).toBe(5);
    expect(said(match)).toContain(`= ${((3e8 / 1e8) * 0.66).toFixed(2)}$ m; a quarter is ${((3 * 0.66) / 4).toFixed(3)} m`);
    const v = figure(s).series[0].f;
    expect(v(0)).toBeCloseTo(0.8, 9);
    expect(v(0.25)).toBeCloseTo(1.2, 9);
  });

  it('Antennas: dipole, dish, short dipole, the half-power beamwidth', () => {
    const s = section('Antennas');
    const [basic, short] = s.examples;
    const G = 0.55 * ((Math.PI * 3) / 0.075) ** 2;
    expect(said(basic)).toContain(`= ${Math.round(G)} = ${(10 * log(G)).toFixed(1)}$ dBi`);
    expect(said(basic)).toContain(`= ${((70 * 0.075) / 3).toFixed(2)}°$`);
    const Rr = 80 * Math.PI ** 2 * 0.01;
    expect(said(short)).toContain(`= ${Rr.toFixed(2)}$ Ω`);
    expect(said(short)).toContain(`= ${((Rr / (Rr + 2)) * 100).toFixed(1)}\\%$`);
    const E = figure(s).series[0].f;
    const lo = crossing(E, Math.SQRT1_2, 1, 90);
    expect(lo).toBeCloseTo(51, 0);
    expect(180 - 2 * lo).toBeCloseTo(78, 0);
  });

  it('Radio Wave Propagation: loss, horizon, MUF, wavelengths', () => {
    const s = section('Radio Wave Propagation');
    const [basic, wave] = s.examples;
    expect(said(basic)).toContain(`= ${(32.45 + 40 + 20).toFixed(2)}$ dB`);
    expect(said(basic)).toContain(`= ${(4.12 * 12).toFixed(1)}$ km`);
    expect(said(wave)).toContain(`= ${1.5e8 / 60e6}$ m`);
    expect(3e8 / 15 / 1e3).toBe(20000);
    expect(figure(s).series[0].f(10)).toBeCloseTo(92.45, 9);
  });

  it('Fiber Optics: aperture, dispersion, budget, V number, the budget curve', () => {
    const s = section('Fiber Optics');
    const [basic, mode] = s.examples;
    const NA = Math.sqrt(1.48 ** 2 - 1.46 ** 2);
    expect(said(basic)).toContain(`= ${NA.toFixed(4)}$`);
    expect(said(basic)).toContain(`= ${((Math.asin(NA) * 180) / Math.PI).toFixed(1)}°$`);
    const D = (1.48 - 1.46) / 1.48;
    expect(said(basic)).toContain(`= ${((1000 * 1.48 * D) / 3e8 * 1e9).toFixed(1)}$ ns/km`);
    const V = ((2 * Math.PI * 4.5) / 1.31) * 0.12;
    expect(said(mode)).toContain(`= ${V.toFixed(2)}$`);
    expect(said(mode)).toContain(`= ${((2 * Math.PI * 4.5 * 0.12) / 2.405).toFixed(2)}$ µm`);
    expect(figure(s).series[0].f(40)).toBeCloseTo(-16, 9);
  });

  it('Satellite and Cellular: C/N, D/R, delay, traffic', () => {
    const [down, delay] = section('Satellite and Cellular').examples;
    expect(said(down)).toContain(`= ${(50 - 206 + 20 + 228.6).toFixed(1)}$ dBHz`);
    expect(said(down)).toContain(`= ${(92.6 - 10 * log(36e6)).toFixed(1)}$ dB`);
    expect(said(down)).toContain(`= ${Math.sqrt(21).toFixed(2)}$`);
    expect(said(down)).toContain(`${(10 * log(21 ** 2 / 6)).toFixed(1)} dB`);
    expect(said(delay)).toContain(`= ${((2 * 35786) / 3e5).toFixed(3)}$ s`);
    expect(said(delay)).toContain(`= ${(200 * 3) / 60}$ erlangs`);
  });

  it('Data Communications: stop-and-wait, window, the curve', () => {
    const s = section('Data Communications');
    const [sw, win] = s.examples;
    expect(said(sw)).toContain(`= ${((1 / 21) * 100).toFixed(1)}\\%$`);
    expect(said(win)).toContain(`= ${((7 / 21) * 100).toFixed(1)}\\%$`);
    expect(figure(s).series[0].f(10)).toBeCloseTo(100 / 21, 9);
  });
});
