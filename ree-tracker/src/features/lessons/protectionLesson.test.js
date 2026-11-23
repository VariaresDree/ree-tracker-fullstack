// Power System Protection in the module format (2026-11-24): every number in the
// topic's worked examples, checks and figures, worked again from the relay
// equations, so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/power-system-protection.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figures = (s, type) => s.body.filter((b) => typeof b !== 'string' && b.type === type);
const deg = Math.PI / 180;
const SI = (M, tms) => (tms * 0.14) / (M ** 0.02 - 1);

describe('Power System Protection, worked again', () => {
  it('Protection Fundamentals: clearing time, and with a stuck breaker', () => {
    const [basic, bf] = section('Protection Fundamentals').examples;
    expect(said(basic)).toContain(`= ${(5 / 60).toFixed(3)}$ s, so $0.25 + ${(5 / 60).toFixed(3)} = ${(0.25 + 5 / 60).toFixed(3)}$ s`);
    expect(said(bf)).toContain(`= ${(0.25 + 0.15 + 5 / 60).toFixed(3)}$ s`);
  });

  it('Instrument Transformers: saturation check and burden', () => {
    const s = section('Instrument Transformers for Relaying');
    const [ct, burden] = s.examples;
    const Is = 20000 / 120;
    expect(said(ct)).toContain(`= ${Is.toFixed(1)}$ A`);
    expect(said(ct)).toContain(`= ${(Is * 0.8).toFixed(1)}$ V`);
    expect(said(burden)).toContain(`= ${25 * 0.5}$ VA`);
    expect(said(burden)).toContain(`= ${25 * 2}$ VA`);
  });

  it('Overcurrent Relays: pickup and time on three curves, and the curve figure', () => {
    const s = section('Overcurrent Relays');
    const [basic, curves] = s.examples;
    expect(said(basic)).toContain(`= ${SI(10, 0.2).toFixed(3)}$ s`);
    expect(said(curves)).toContain(`= ${((0.2 * 13.5) / 9).toFixed(3)}$ s`);
    expect(said(curves)).toContain(`= ${((0.2 * 80) / 99).toFixed(3)}$ s`);
    const [plot] = figures(s, 'plot');
    expect(plot.series[0].f(10)).toBeCloseTo(SI(10, 0.1), 12);
    // Extremely inverse is slowest at low multiples, fastest at high ones.
    expect(plot.series[2].f(2)).toBeGreaterThan(plot.series[0].f(2));
    expect(plot.series[2].f(20)).toBeLessThan(plot.series[0].f(20));
  });

  it('Relay Coordination: TMS, rounding up, the margin on the figure', () => {
    const s = section('Relay Coordination');
    const [tms, round] = s.examples;
    const td = SI(10, 0.1);
    const need = td + 0.3;
    const t1 = SI(4000 / 600, 1);
    expect(said(tms)).toContain(`= ${td.toFixed(3)}$ s`);
    expect(said(tms)).toContain(`${need.toFixed(3)}$ s`);
    expect(said(tms)).toContain(`${t1.toFixed(3)} s`);
    expect(said(tms)).toContain(`= ${(need / t1).toFixed(3)}$`);
    expect(said(round)).toContain(`= ${(0.2 * t1).toFixed(3)}$ s`);
    expect(said(round)).toContain(`= ${(0.2 * t1 - td).toFixed(3)}$ s`);
    const [plot] = figures(s, 'plot');
    expect(plot.series[0].f(4000) - plot.series[1].f(4000)).toBeGreaterThanOrEqual(0.3);
  });

  it('Directional Relays: inside, the band, and the phasor figure', () => {
    const s = section('Directional Relays');
    const [inside, band] = s.examples;
    expect(said(inside)).toContain(`= ${Math.cos(75 * deg).toFixed(3)}$`);
    expect(said(band)).toContain(`= ${Math.cos(45 * deg).toFixed(3)}$`);
    expect(said(band)).toContain(`= -${(-Math.cos(105 * deg)).toFixed(3)}$`);
    const [diagram] = figures(s, 'phasor');
    const [, mta, b1, b2, i] = diagram.vectors;
    expect(b1.angle - mta.angle).toBe(90);
    expect(mta.angle - b2.angle).toBe(90);
    expect(Math.cos((i.angle - mta.angle) * deg)).toBeGreaterThan(0);
  });

  it('Distance Relays: secondary reaches, a mho reach, the zone steps', () => {
    const s = section('Distance Relays');
    const [reach, mho] = s.examples;
    const Zs = (10 * 240) / (138000 / 115);
    expect(Zs).toBeCloseTo(2, 12);
    expect(said(reach)).toContain(`Zone 1 = ${(0.8 * Zs).toFixed(1)} Ω; Zone 2 = ${(1.2 * Zs).toFixed(1)} Ω`);
    expect(said(mho)).toContain(`= ${(1.6 * Math.cos(20 * deg)).toFixed(2)}$ Ω`);
    const [plot] = figures(s, 'plot');
    expect(plot.series[0].f(79)).toBeLessThan(plot.series[0].f(81));
    expect(plot.series[0].f(119)).toBe(0.3);
    expect(plot.series[0].f(150)).toBe(1);
  });

  it('Differential Relays: through and internal, the error limit, the figure', () => {
    const s = section('Differential Relays');
    const [both, limit] = s.examples;
    const trips = (a, b) => Math.abs(a - b) > (0.25 * (Math.abs(a) + Math.abs(b))) / 2;
    expect(trips(40, 36.8)).toBe(false);
    expect(trips(30, 0)).toBe(true);
    expect(said(both)).toContain(`= ${0.25 * 38.4}$`);
    const I2 = 35 / 1.125;
    expect(said(limit)).toContain(`= ${I2.toFixed(1)}$ A`);
    expect(said(limit)).toContain(`${((1 - I2 / 40) * 100).toFixed(1)}%`);
    const [plot] = figures(s, 'plot');
    const [through, internal] = plot.marks;
    expect(through.at[1]).toBeLessThan(plot.series[0].f(through.at[0]));
    expect(internal.at[1]).toBeGreaterThan(plot.series[0].f(internal.at[0]));
  });

  it('Transformer Protection: currents, V/Hz, CT matching', () => {
    const [basic, match] = section('Transformer Protection').examples;
    const IL = 30e6 / (Math.sqrt(3) * 13800);
    const IH = 30e6 / (Math.sqrt(3) * 69000);
    expect(said(basic)).toContain(`= ${Math.round(IL)}$ A`);
    expect(said(basic)).toContain(`= ${(IL / 0.08 / 1000).toFixed(1)}$ kA`);
    expect(said(basic)).toContain(`= ${(60 / 57).toFixed(2)}$ pu`);
    expect(said(match)).toContain(`= ${IH.toFixed(1)}$ A, so $\\frac{${IH.toFixed(1)}}{60} = ${(IH / 60).toFixed(2)}$ A`);
    expect(said(match)).toContain(`= ${((IL / 300) * Math.sqrt(3)).toFixed(2)}$ A`);
    expect(said(match)).toContain(`= ${((IL / 500) * Math.sqrt(3)).toFixed(2)}$ A`);
  });

  it('Generator Protection: neutral resistor, coverage, negative sequence', () => {
    const s = section('Generator Protection');
    const [rn, k] = s.examples;
    const R = 1 / (3 * 377 * 0.25e-6);
    expect(said(rn)).toContain(`= ${Math.round(R)}$ Ω`);
    expect(said(rn)).toContain(`= ${(R / (13800 / 240) ** 2).toFixed(2)}$ Ω`);
    expect(said(k)).toContain(`= ${10 / 0.04}$ s`);
    const [plot] = figures(s, 'plot');
    expect(plot.series[0].f(5)).toBeCloseTo(plot.marks[0].y, 12);
  });

  it('Motor Protection: cold and hot trip times, unbalance, the curves', () => {
    const s = section('Motor Protection');
    const [times, unbalance] = s.examples;
    expect(said(times)).toContain(`= ${Math.round(600 * Math.log(2.25 / (2.25 - 1.1025)))}$ s`);
    expect(said(times)).toContain(`= ${Math.round(600 * Math.log((2.25 - 0.81) / (2.25 - 1.1025)))}$ s`);
    expect(said(unbalance)).toContain(`= ${Math.sqrt(1.06).toFixed(3)}$ pu`);
    const [plot] = figures(s, 'plot');
    expect(plot.series[0].f(1.5)).toBeCloseTo(600 * Math.log(2.25 / 1.1475), 9);
    expect(plot.series[1].f(2)).toBeLessThan(plot.series[0].f(2));
  });

  it('Bus and Line Protection: high-impedance setting, the reclose timing', () => {
    const s = section('Bus and Line Protection');
    const [bus, reclose] = s.examples;
    expect(said(bus)).toContain(`= ${(40000 / 400) * 4}$ V`);
    expect(said(reclose)).toContain(`= ${(0.18 + 0.5).toFixed(2)}$ s`);
    const [plot] = figures(s, 'plot');
    expect(plot.marks[1].x - plot.marks[0].x).toBeCloseTo(0.5, 12);
    expect(plot.series[0].f(0.4)).toBe(0);
  });

  it('Circuit Breaker Ratings: symmetrical, asymmetrical, peak, duties, the factor curve', () => {
    const s = section('Circuit Breaker Ratings');
    const [three, duty] = s.examples;
    const Is = 500 / (Math.sqrt(3) * 13.8);
    const tau = 15 / 377;
    const k = Math.sqrt(1 + 2 * Math.exp((-2 * 0.05) / tau));
    expect(said(three)).toContain(`= ${Is.toFixed(1)}$ kA`);
    expect(said(three)).toContain(`= ${k.toFixed(2)}$, so ${(Is * k).toFixed(1)} kA`);
    expect(said(three)).toContain(`= ${(2.6 * Is).toFixed(1)}$ kA`);
    expect(said(duty)).toContain(`= ${(1.3 * 20.9).toFixed(1)}$ kA`);
    expect(said(duty)).toContain(`= ${(1.6 * 20.9).toFixed(1)}$ kA`);
    const [plot] = figures(s, 'plot');
    expect(plot.series[0].f(plot.marks[0].x)).toBeCloseTo(k, 3);
  });

  it('System Grounding: rod, grid, touch and step, the rod curve', () => {
    const s = section('System Grounding');
    const [basic, step] = s.examples;
    const rod = (100 / (2 * Math.PI * 3)) * (Math.log(1500) - 1);
    expect(said(basic)).toContain(`= ${rod.toFixed(1)}$ Ω`);
    expect(said(basic)).toContain(`= ${(25 * Math.sqrt(Math.PI / 3600) + 100 / 1500).toFixed(2)}$ Ω`);
    expect(said(basic)).toContain(`= ${Math.round((4150 * 0.116) / Math.sqrt(0.5))}$ V`);
    expect(said(step)).toContain(`= ${Math.round((13600 * 0.116) / Math.sqrt(0.5))}$ V`);
    const [plot] = figures(s, 'plot');
    expect(plot.series[0].f(3)).toBeCloseTo(rod, 9);
    expect(plot.marks[0].label).toContain(rod.toFixed(1));
  });

  it('Lightning Protection: rating, margin, separation, the distance limit', () => {
    const s = section('Lightning Protection');
    const [basic, dist] = s.examples;
    expect(said(basic)).toContain(`= ${0.8 * 72.5}$ kV`);
    expect(said(basic)).toContain(`= ${Math.round((350 / 250 - 1) * 100)}\\%$`);
    const d = (350 / 1.2 - 250) / (2000 / 300);
    expect(said(dist)).toContain(`= ${(350 / 1.2).toFixed(1)}$ kV`);
    expect(said(dist)).toContain(`= ${d.toFixed(2)}$ m`);
    const [plot] = figures(s, 'plot');
    expect(plot.series[0].f(d)).toBeCloseTo(plot.marks[1].y, 9);
    expect(plot.series[0].f(15)).toBeCloseTo(plot.marks[0].y, 9);
    expect(s.check[1].a).toContain(`= ${(10 * 10 ** 0.65).toFixed(1)}$ m`);
  });

  it('Arc Flash: energy, boundary, faster clearing, the energy curve', () => {
    const s = section('Arc Flash');
    const [basic, fast] = s.examples;
    const E = (2.142e6 * 0.48 * 30 * 0.1) / 455 ** 2;
    const D = Math.sqrt((2.142e6 * 0.48 * 30 * 0.1) / 5);
    expect(said(basic)).toContain(`= ${E.toFixed(1)}$ J/cm² $= ${(E / 4.184).toFixed(1)}$ cal/cm²`);
    expect(said(basic)).toContain(`= ${Math.round(D)}$ mm`);
    expect(said(fast)).toContain(`= ${(E / 2).toFixed(2)}$ J/cm², ${(E / 2 / 4.184).toFixed(2)} cal/cm²`);
    const [plot] = figures(s, 'plot');
    expect(plot.series[0].f(plot.marks[1].x)).toBeCloseTo(plot.marks[0].y, 2);
    expect(s.check[1].a).toContain(`= ${(8 * 4.184).toFixed(1)}$ J/cm²`);
  });
});
