// Instrumentation & Control in the module format (2026-11-25): every number in
// the topic's worked examples, checks and figures, worked again, so a slip in
// the text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/instrumentation-control.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s, type = 'plot') => s.body.find((b) => typeof b !== 'string' && b.type === type);

describe('Instrumentation & Control, worked again', () => {
  it('Measurement and Errors: full-scale error, loading, insulation', () => {
    const s = section('Measurement and Errors');
    const [basic, insulation] = s.examples;
    expect(said(basic)).toContain(`= \\pm${(1 * 150) / 50}\\%$`);
    expect(said(basic)).toContain(`= ${((10 * 200) / 300).toFixed(2)}$ V`);
    expect(said(insulation)).toContain(`= ${((100000 * (500 - 4)) / 4 / 1e6).toFixed(1)}$ MΩ`);
    expect(figure(s).series[0].f(50)).toBe(3);
    expect(figure(s).series[0].f(15)).toBe(10);
  });

  it('Analog Meters: shunt, multiplier, voltmeters in series, square law, ohmmeter', () => {
    const s = section('Analog Meters');
    const [sm, series] = s.examples;
    expect(said(sm)).toContain(`= ${((0.001 * 100) / (10 - 0.001)).toFixed(4)}$ Ω`);
    expect(said(sm)).toContain(`= ${(50 / 0.001 - 100) / 1000}$ kΩ`);
    expect(said(series)).toContain(`= ${(300 * 90) / 60}$ V`);
    expect(said(series)).toContain(`${(450 * 30) / 90} V`);
    expect(s.check[0].a).toContain(`= ${(90 * (3 / 5) ** 2).toFixed(1)}°$`);
    const ohm = s.body.filter((b) => typeof b !== 'string' && b.type === 'plot')[0];
    expect(ohm.series[0].f(ohm.marks[0].x)).toBe(0.5);
  });

  it('Bridges: Maxwell and Schering', () => {
    const [maxwell, schering] = section('Bridges').examples;
    expect(said(maxwell)).toContain(`= ${+(1000 * 2000 * 1e-7).toFixed(3)}$ H`);
    expect(said(maxwell)).toContain(`= ${(1000 * 2000) / 5000}$ Ω`);
    expect(said(schering)).toContain(`= ${(100 * 3000) / 1000}$ pF`);
    expect(said(schering)).toContain(`= ${(2 * Math.PI * 1000 * 5e-9 * 3000).toFixed(3)}$`);
  });

  it('Potentiometers: unknown emf, calibrating a voltmeter', () => {
    const [emf, cal] = section('Potentiometers').examples;
    expect(said(emf)).toContain(`= ${((1.0183 * 60.2) / 54).toFixed(3)}$ V`);
    const truth = (1.0183 * 74) / 50.9;
    expect(said(cal)).toContain(`= ${truth.toFixed(4)}$ V`);
    expect(said(cal)).toContain(`= +${(((1.5 - truth) / truth) * 100).toFixed(2)}\\%$`);
  });

  it('Wattmeters and Energy Meters: constant, coil loss, meter test', () => {
    const [basic, test] = section('Wattmeters and Energy Meters').examples;
    expect(said(basic)).toContain(`= ${(3600 * 7.2 * 20) / 60}$ W`);
    expect(said(basic)).toContain(`= ${(1000 + 230 ** 2 / 10000).toFixed(1)}$ W`);
    const reg = 20 / 600;
    const truth = (2.3 * 50) / 3600;
    expect(said(test)).toContain(`= ${reg.toFixed(5)}$ kWh`);
    expect(said(test)).toContain(`= ${truth.toFixed(5)}$ kWh`);
    expect(said(test)).toContain(`= +${(((reg - truth) / truth) * 100).toFixed(2)}\\%$`);
  });

  it('Instrument Transformers: phase-angle error, RCF, the curve', () => {
    const s = section('Instrument Transformers');
    const [phase, ratio] = s.examples;
    const beta = (10 / 60) * (Math.PI / 180);
    expect(said(phase)).toContain(`= ${beta.toFixed(4)}$ rad`);
    expect(said(phase)).toContain(`= ${(beta * Math.tan(Math.PI / 3) * 100).toFixed(2)}\\%$`);
    expect(said(ratio)).toContain(`= ${(((40 - 40.2) / 40.2) * 100).toFixed(2)}\\%$`);
    expect(said(ratio)).toContain(`= ${+(40.2 / 40).toFixed(4)}$`);
    expect(figure(s).series[0].f(0.5)).toBeCloseTo(beta * Math.sqrt(3) * 100, 9);
    expect(figure(s).series[0].f(1)).toBeCloseTo(0, 9);
  });

  it('Oscilloscopes: reading, rise time, Lissajous, the curve', () => {
    const s = section('Oscilloscopes');
    const [read, liss] = s.examples;
    expect(said(read)).toContain(`= ${3.2 * 0.5 * 10}$ V`);
    expect(said(read)).toContain(`= ${+(0.35 / 100e6 / 1e-9).toFixed(2)}$ ns`);
    expect(said(read)).toContain(`= ${Math.hypot(5, 3.5).toFixed(1)}$ ns`);
    expect(said(liss)).toContain(`= ${(600 * 3) / 2}$ Hz`);
    expect((Math.asin(2 / 4) * 180) / Math.PI).toBeCloseTo(30, 9);
    expect(s.check[0].a).toContain(`= ${+(0.35 / 200e6 / 1e-9).toFixed(2)}$ ns`);
    expect(figure(s).series[0].f(figure(s).marks[0].x).toFixed(1)).toBe('6.1');
  });

  it('Transducers and Sensors: gauge, RTD, thermocouple, thermistor', () => {
    const s = section('Transducers and Sensors');
    const [basic, therm] = s.examples;
    expect(said(basic)).toContain(`= ${((5 * 2 * 500e-6) / 4) * 1000}$ mV`);
    expect(said(basic)).toContain(`= ${(100 * (1 + 0.00385 * 100)).toFixed(1)}$ Ω`);
    expect(said(basic)).toContain(`= ${((41 * 275) / 1000).toFixed(1)}$ mV`);
    const x = 3950 * (1 / 323.15 - 1 / 298.15);
    expect(said(therm)).toContain(`$${x.toFixed(3)}$`);
    expect(said(therm)).toContain(`= ${(10 * Math.exp(x)).toFixed(2)}$ kΩ`);
    const [rtd, ntc] = figure(s).series;
    expect(rtd.f(100)).toBeCloseTo(1.385, 9);
    expect(ntc.f(0)).toBeCloseTo(1, 9);
    expect(ntc.f(150)).toBeLessThan(0.01);
  });

  it('Data Acquisition: SNR, alias, loop, resolution, bits, the samples', () => {
    const s = section('Data Acquisition');
    const [basic, bits] = s.examples;
    expect(said(basic)).toContain(`= ${(6.02 * 12 + 1.76).toFixed(1)}$ dB`);
    expect(said(basic)).toContain(`= ${((12 - 4) / 16) * 200}$ °C`);
    expect(said(bits)).toContain(`= ${((10 / 4096) * 1000).toFixed(2)}$ mV`);
    expect(Math.ceil(Math.log2(200 / 0.1))).toBe(11);
    const fig = figure(s);
    const [signal, alias] = fig.series;
    for (let n = 0; n <= 10; n++) expect(signal.f(n)).toBeCloseTo(alias.f(n), 9);
    expect(Math.abs(signal.f(0.5) - alias.f(0.5))).toBeGreaterThan(0.1);
  });

  it('Process Control and PID: band, Ziegler–Nichols, offset, the curves', () => {
    const s = section('Process Control and PID');
    const [basic, offset] = s.examples;
    expect(said(basic)).toContain(`= ${100 / 2.5}\\%$`);
    expect(said(basic)).toContain(`= ${0.6 * 8}$`);
    expect(said(basic)).toContain(`= ${30 / 2}$ s`);
    expect(said(basic)).toContain(`= ${30 / 8}$ s`);
    expect(said(offset)).toContain(`= ${1 / (1 + 4)}$`);
    expect(1 / 0.05 - 1).toBe(19);
    const [pi, p] = figure(s).series;
    expect(p.f(60)).toBeCloseTo(4 / (1 + 4), 6);
    expect(pi.f(60)).toBeCloseTo(1, 6);
    expect(s.check[1].a).toBe(String(100 / 25) + '.');
  });

  it('PLCs: response, presets', () => {
    const [basic, pulse] = section('PLCs').examples;
    expect(said(basic)).toContain(`= ${2 * 15 + 10 + 5}$ ms`);
    expect(said(basic)).toContain(`= ${5 / 0.01}$`);
    expect(said(pulse)).toContain(`= ${120 / 0.1}$`);
  });

  it('SCADA: poll cycles', () => {
    const [slow, fast] = section('SCADA').examples;
    const per = (bps) => (8 * 11 + 40 * 11) / bps + 0.05;
    expect(said(slow)).toContain(`= ${per(9600).toFixed(3)}$ s`);
    expect(said(slow)).toContain(`= ${(20 * per(9600)).toFixed(1)}$ s`);
    expect(said(fast)).toContain(`= ${per(19200).toFixed(4)}$ s`);
    expect(said(fast)).toContain(`= ${(20 * per(19200)).toFixed(2)}$ s`);
  });

  it('Calibration: combined and expanded uncertainty', () => {
    const [basic, board] = section('Calibration').examples;
    expect(said(basic)).toContain(`= ${Math.hypot(0.3, 0.4).toFixed(1)}$`);
    expect(said(board)).toContain(`= ${Math.hypot(0.2, 0.3, 0.6).toFixed(1)}$`);
    expect(said(board)).toContain(`= ${(2 * Math.hypot(0.2, 0.3, 0.6)).toFixed(1)}$ tenths`);
  });
});
