// Environmental Science & Engineering in the module format (2026-11-25):
// every number in the topic's worked examples and figures worked again, so a
// slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { SAG, deficit, criticalTime, plume } from './content/esas/environmental-science-engineering.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s, type = 'plot') => s.body.find((b) => typeof b !== 'string' && b.type === type);

describe('Environmental Science & Engineering, worked again', () => {
  it('Ecology: energy up the chain, biomagnification', () => {
    const [basic, board] = section('Nature and Ecology').examples;
    expect(10000 * 0.1 ** 3).toBeCloseTo(10, 9);
    expect(said(basic)).toContain('= 10$ kcal');
    expect(0.02 * 10 ** 3).toBeCloseTo(20, 9);
    expect(said(board)).toContain('= 20$ ppm');
    expect(50 / 0.1 ** 2).toBeCloseTo(5000, 9);
    expect(said(board)).toContain('= 5000$ kcal');
  });

  it('Resources: reserves under growth, logistic rates, the curves', () => {
    const s = section('Natural Systems and Resources');
    const [reserves, logistic] = s.examples;
    expect(said(reserves)).toContain(`= ${Math.round(50 * Math.log(3))}$ years`);
    expect(said(logistic)).toContain(`= ${0.04 * 2000 * 0.8}$ a year`);
    expect(said(logistic)).toContain(`= ${0.04 * 5000 * 0.5}$ a year`);
    const [log, exp] = figure(s).series;
    expect(log.f(0)).toBeCloseTo(100, 9);
    expect(log.f(200)).toBeCloseTo(1000, 0);
    expect(exp.points.at(-1)).toEqual([Math.log(12) / 0.05, 1200]);
  });

  it('Concerns: I = PAT twice', () => {
    const [hold, country] = section('Environmental Concerns and Crises').examples;
    expect(1 / (1.5 * 2)).toBeCloseTo(1 / 3, 12);
    expect(said(hold)).toContain('two-thirds');
    expect((110e6 * 3500 * 0.5) / 1e9).toBeCloseTo(192.5, 9);
    expect(said(country)).toContain('192.5 million tonnes');
  });

  it('Air Pollution: the stack, a taller stack, a precipitator', () => {
    const s = section('Air Pollution');
    const [stack, board] = s.examples;
    expect(said(stack)).toContain(`about ${Math.round(plume(40))} µg/m³`);
    expect(said(board)).toContain(`= ${plume(60).toFixed(1)}$ µg/m³`);
    expect(said(board)).toContain(`= ${((1 - Math.exp(-2)) * 100).toFixed(1)}\\%$`);
    expect(figure(s).series[0].f).toBe(plume);
  });

  it('Water Pollution: the critical point, mixing, overflow, the sag curve', () => {
    const s = section('Water Pollution');
    const [crit, board] = s.examples;
    const tc = criticalTime();
    expect(said(crit)).toContain(`= ${tc.toFixed(2)}$ days`);
    expect(said(crit)).toContain(`= ${deficit(tc).toFixed(1)}$ mg/L, so DO $= 8.26 - 5.0 = ${(SAG.sat - deficit(tc)).toFixed(1)}$`);
    // The deficit is greatest at the critical time.
    expect(deficit(tc)).toBeGreaterThan(deficit(tc - 0.1));
    expect(deficit(tc)).toBeGreaterThan(deficit(tc + 0.1));
    expect(said(board)).toContain(`= ${((10 * 2 + 0.5 * 200) / 10.5).toFixed(1)}$ mg/L`);
    expect(said(board)).toContain(`= ${10000 / 400}$ m/day`);
    const f = figure(s);
    expect(f.series[0].f(0)).toBeCloseTo(SAG.sat - SAG.D0, 12);
    expect(f.marks[0].x).toBeCloseTo(tc, 12);
  });

  it('Solid Waste: landfill volume, diversion', () => {
    const [landfill, diversion] = section('Solid and Hazardous Waste').examples;
    const v = (100000 * 0.5 * 365) / 600;
    expect(said(landfill)).toContain(`= ${Math.round(v).toLocaleString('en-US').replace(',', '\\,')}$ m³`);
    expect(said(landfill)).toContain(`= ${(v * 1.2).toLocaleString('en-US').replace(',', '\\,')}$ m³`);
    expect(0.5 * 0.8 + 0.25 * 0.6).toBeCloseTo(0.55, 12);
    expect(said(diversion)).toContain('55% diverted');
  });

  it('Climate Change: doubling, today, methane, the forcing curve', () => {
    const s = section('Climate Change');
    const [dbl, board] = s.examples;
    expect(said(dbl)).toContain(`= ${(5.35 * Math.log(2)).toFixed(1)}$ W/m²`);
    const f = 5.35 * Math.log(420 / 280);
    expect(said(board)).toContain(`= ${f.toFixed(2)}$ W/m²; $0.8 \\times ${f.toFixed(2)} = ${(0.8 * f).toFixed(1)}$ °C`);
    expect(said(board)).toContain(`= ${10 * 28}$ t`);
    expect(figure(s).series[0].f(560)).toBeCloseTo(5.35 * Math.log(2), 12);
  });

  it('EIA and laws: the process, a diversion target, the law table in order', () => {
    const eia = figure(section('Environmental Impact Assessment'), 'blocks');
    expect(eia.blocks.map((b) => b.label)).toEqual(['Screening', 'Scoping', 'EIS study', 'Review', 'ECC', 'Monitoring']);
    const s = section('Environmental Laws (RA 8749, 9275, 9003, PD 1586)');
    expect(said(s.examples[0])).toContain(`= ${0.25 * 400}$ tonnes`);
    const table = s.body.find((b) => typeof b === 'string' && b.includes('| Law | Year |'));
    const years = [...table.matchAll(/\| (\d{4}) \|/g)].map((m) => Number(m[1]));
    years.slice(1).forEach((y, k) => expect(y).toBeGreaterThanOrEqual(years[k]));
  });
});
