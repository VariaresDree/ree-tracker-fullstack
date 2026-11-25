// Basic Thermodynamics in the module format (2026-11-25): every number in the
// topic's worked examples, checks and figures, worked again, so a slip in the
// text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/esas/basic-thermodynamics.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s) => s.body.find((b) => typeof b !== 'string' && b.type === 'plot');

// The steam example shared by three subtopics.
const x = (6.7428 - 0.6493) / 7.5009;
const h2 = 191.83 + x * 2392.8;
const wt = 3115.3 - h2;
const wp = 0.00101 * 2990;
const qin = 3115.3 - (191.83 + wp);

describe('Basic Thermodynamics, worked again', () => {
  it('Basic Principles: heat rate, calorimeter, the heating curve', () => {
    const s = section('Basic Principles, Concepts and Definitions');
    const [rate, cal] = s.examples;
    expect(said(rate)).toContain(`= 10\\,000$ kJ/kWh`);
    expect(3600 / 0.36).toBeCloseTo(10000, 9);
    const warm = 250 + 120 * 0.093;
    expect(said(cal)).toContain(`= ${warm.toFixed(2)}(45 - T)`);
    const T = (warm * 45 - 60 * 80) / (warm + 60);
    expect(said(cal)).toContain(`${(warm + 60).toFixed(2)}T$, so $T = ${T.toFixed(1)}$ °C`);
    const pts = figure(s).series[0].points;
    expect(pts.map(([q]) => Math.round(q * 10) / 10)).toEqual([0, 42, 376, 794.6, 3051.6, 3091.6]);
    expect(pts[2][0] - pts[1][0]).toBe(334);
    expect(pts[4][0] - pts[3][0]).toBeCloseTo(2257, 9);
  });

  it('First Law: turbine, alternator air, battery, the two paths', () => {
    const s = section('First Law of Thermodynamics');
    const [turbine, alt] = s.examples;
    expect(said(turbine)).toContain(`= ${(2 * (3115.3 - 2300)).toFixed(1)}$ kW`);
    const out = 25 * 0.85;
    const inp = out / 0.97;
    const loss = (inp - out) * 1000;
    expect(said(alt)).toContain(`= ${inp.toFixed(3)}$ MW; losses ${loss.toFixed(1)} kW`);
    const m = loss / (1.005 * 20);
    expect(said(alt)).toContain(`= ${m.toFixed(2)}$ kg/s`);
    expect(said(alt)).toContain(`= ${(m / 1.2).toFixed(2)}$ m³/s`);
    expect(s.check[0].a).toContain(`= +${-100 + 864}$`);
    // Work under each path: the area under its constant-pressure leg.
    const [A, B] = figure(s).series;
    const work = (pts) => pts.slice(1).reduce((w, [v, p], i) => w + p * (v - pts[i][0]), 0);
    expect(work(A.points)).toBeCloseTo(240, 9);
    expect(work(B.points)).toBeCloseTo(60, 9);
  });

  it('Ideal Gas Laws: volume, gas constant, tyre, the isotherms', () => {
    const s = section('Ideal Gas Laws');
    const [vol, tyre] = s.examples;
    expect(said(vol)).toContain(`= ${(0.287 * 300) / 100}$ m³`);
    expect(said(vol)).toContain(`= ${(8.314 / 44).toFixed(3)}$`);
    const p2 = (311.325 * 323.15) / 293.15;
    expect(said(tyre)).toContain(`= ${p2.toFixed(2)}$ kPa abs, or ${(p2 - 101.325).toFixed(1)} kPa gauge`);
    const ratio = (331.325 / 311.325) * (293.15 / 323.15);
    expect(said(tyre)).toContain(`= ${ratio.toFixed(4)}$`);
    expect(said(tyre)).toContain(`= ${(0.12 * (1 - ratio)).toFixed(5)}$ kg`);
    expect(0.287 / 0.4).toBeCloseTo(0.7175, 12);
    expect(s.check[1].a).toContain('= 0.718$'); // 0.7175, rounded half up
    const [t300, , t500] = figure(s).series;
    expect(t300.f(0.861)).toBeCloseTo(100, 1);
    expect(t500.f(0.2)).toBeCloseTo(717.5, 9);
  });

  it('Processes of Ideal Gases: isothermal, isentropic, polytropic, the curves', () => {
    const s = section('Processes of Ideal Gases');
    const [two, poly] = s.examples;
    expect(said(two)).toContain(`= ${(0.287 * 300 * Math.log(3)).toFixed(1)}$ kJ`);
    const T2 = 300 * 8 ** 0.4;
    expect(said(two)).toContain(`= ${T2.toFixed(1)}$ K`);
    expect(said(two)).toContain(`= ${(0.718 * (T2 - 300)).toFixed(1)}$ kJ/kg`);
    const Tp = 300 * 8 ** (0.3 / 1.3);
    const W = (0.5 * 0.287 * (Tp - 300)) / (1 - 1.3);
    const dU = 0.5 * 0.718 * (Tp - 300);
    expect(said(poly)).toContain(`= ${Tp.toFixed(1)}$ K`);
    expect(said(poly)).toContain(`= ${W.toFixed(1)}$ kJ`);
    expect(said(poly)).toContain(`= ${dU.toFixed(1)}$ kJ; $Q = ${W.toFixed(1)} + ${dU.toFixed(1)} = ${(W + dU).toFixed(1)}$ kJ`);
    const [, iso, isen] = figure(s).series;
    expect(iso.f(1)).toBeCloseTo(100, 9);
    expect(isen.f(1).toFixed(1)).toBe('52.5');
  });

  it('Properties of Pure Substances: quality, boiling, the dome', () => {
    const s = section('Properties of Pure Substances');
    const [q, boil] = s.examples;
    expect(said(q)).toContain(`= ${x.toFixed(3)}$`);
    expect(said(q)).toContain(`= ${h2.toFixed(1)}$ kJ/kg`);
    const warm = 3 * 4.186 * 30;
    expect(said(boil)).toContain(`= ${warm.toFixed(1)}$ kJ`);
    expect(said(boil)).toContain(`= ${((1200 - warm) / 2257).toFixed(3)}$ kg`);
    const [dome, line] = figure(s).series;
    const ts = dome.points.map(([, t]) => t);
    const top = ts.indexOf(Math.max(...ts));
    // Up the liquid side, down the vapour side, entropy rising throughout.
    dome.points.slice(1).forEach(([sv, t], i) => {
      expect(sv).toBeGreaterThan(dome.points[i][0]);
      expect(i + 1 <= top ? t > dome.points[i][1] : t < dome.points[i][1]).toBe(true);
    });
    expect(line.points[1][0] - line.points[0][0]).toBeCloseTo(7.5009, 9);
  });

  it('Processes of Pure Substances: calorimeter, drying at constant pressure', () => {
    const [calo, dry] = section('Processes of Pure Substances').examples;
    expect(said(calo)).toContain(`= ${((2716.6 - 762.81) / 2015.3).toFixed(3)}$`);
    expect(said(dry)).toContain(`= ${2 * 0.5 * 2201.6}$ kJ`);
    expect(said(dry)).toContain(`= ${(200 * 2 * 0.5 * (0.88578 - 0.001061)).toFixed(1)}$ kJ`);
  });

  it('Second Law and Entropy: refrigerator, ice, the claim, tons, the Carnot limit', () => {
    const s = section('Second Law and Entropy');
    const [fridge, claim] = s.examples;
    expect(said(fridge)).toContain(`= ${7 / 2}$`);
    expect(said(fridge)).toContain(`= ${(334 / 273.15).toFixed(2)}$ kJ/K`);
    expect(said(claim)).toContain(`= ${(1 - 300 / 500) * 100}\\%$, or ${5000 * (1 - 300 / 500)} J`);
    expect(said(claim)).toContain(`= ${(5 * 3.517).toFixed(3)}$ kW`);
    expect(said(claim)).toContain(`= ${((5 * 3.517) / 4).toFixed(2)}$ kW`);
    const f = figure(s);
    expect(f.series[0].f(1000)).toBeCloseTo(0.7, 12);
    expect(f.series[0].f(1500)).toBeCloseTo(0.8, 12);
  });

  it('Carnot Cycle: efficiency, COP, engine work, freezer, the rectangle', () => {
    const s = section('Carnot Cycle');
    const [best, board] = s.examples;
    expect(said(best)).toContain(`= ${(1 - 300 / 1000) * 100}\\%$`);
    expect(said(best)).toContain(`= ${270 / 30}$`);
    const eta = 1 - 400.15 / 600.15;
    expect(said(board)).toContain(`= ${eta.toFixed(4)}$; $W = ${(1000 * eta).toFixed(1)}$ kJ`);
    const TH = 255.15 * (1 + 1 / 5);
    expect(said(board)).toContain(`= ${TH.toFixed(1)}$ K, or ${(TH - 273.15).toFixed(1)} °C`);
    const [top, bottom] = figure(s).series;
    const ds = top.points[1][0] - top.points[0][0];
    expect((top.points[0][1] * ds - bottom.points[0][1] * ds) / (top.points[0][1] * ds)).toBeCloseTo(0.7, 12);
  });

  it('Gas Cycles: Otto, Brayton, Diesel, the efficiency curves', () => {
    const s = section('Gas Cycles (Otto, Diesel, Brayton)');
    const [ob, dsl] = s.examples;
    expect(said(ob)).toContain(`= ${((1 - 8 ** -0.4) * 100).toFixed(1)}\\%$`);
    expect(said(ob)).toContain(`= ${((1 - 10 ** (-0.4 / 1.4)) * 100).toFixed(1)}\\%$`);
    const a = 1 / 18 ** 0.4;
    const b = (2 ** 1.4 - 1) / 1.4;
    expect(said(dsl)).toContain(`= ${a.toFixed(4)}$; cutoff factor`);
    expect(said(dsl)).toContain(`= ${b.toFixed(4)}$`);
    expect(said(dsl)).toContain(`= ${((1 - a * b) * 100).toFixed(1)}\\%$`);
    const [otto, diesel] = figure(s).series;
    expect(otto.f(8)).toBeCloseTo(1 - 8 ** -0.4, 12);
    expect(diesel.f(18)).toBeCloseTo(1 - a * b, 12);
    for (const r of [4, 10, 16]) expect(diesel.f(r)).toBeLessThan(otto.f(r));
  });

  it('Vapor Cycles (Rankine): ideal and real, the cycle on the dome', () => {
    const s = section('Vapor Cycles (Rankine)');
    const [ideal, real] = s.examples;
    expect(said(ideal)).toContain(`= ${h2.toFixed(1)}$: turbine work ${wt.toFixed(1)} kJ/kg`);
    expect(said(ideal)).toContain(`= ${wp.toFixed(2)}$ kJ/kg, so $h_4 = ${(191.83 + wp).toFixed(2)}$`);
    expect(said(ideal)).toContain(`= ${(((wt - wp) / qin) * 100).toFixed(1)}\\%$`);
    const w = 0.85 * wt;
    expect(said(real)).toContain(`= ${w.toFixed(1)}$ kJ/kg; $h_2 = 3115.3 - ${w.toFixed(1)} = ${(3115.3 - w).toFixed(1)}$`);
    expect(said(real)).toContain(`= ${(w - wp).toFixed(1)}$ kJ/kg; steam rate`);
    expect(said(real)).toContain(`= ${(3600 / (w - wp)).toFixed(2)}$ kg/kWh`);
    expect(said(real)).toContain(`= ${(((w - wp) / qin) * 100).toFixed(1)}\\%$`);
    expect(said(real)).toContain(`{${qin.toFixed(2)}}`);
    const cycle = figure(s).series[1].points;
    expect(cycle[0]).toEqual(cycle.at(-1));
    // The turbine drops straight down at the example's entropy.
    expect(cycle.filter(([sv]) => sv === 6.7428).map(([, t]) => t)).toEqual([350, 45.81]);
  });
});
