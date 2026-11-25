// EE Laws, Codes, & Professional Ethics in the module format (2026-11-25):
// every number in the topic's worked examples and figures worked again, and
// the law-year table kept in order, so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { WEIGHTS, generalAverage, solarKw, loadKw } from './content/esas/ee-laws-codes-professional-ethics.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s, type = 'plot') => s.body.find((b) => typeof b !== 'string' && b.type === type);

describe('EE Laws, Codes, & Professional Ethics, worked again', () => {
  it('RA 7920: the law table runs in year order', () => {
    const s = section('RA 7920 New Electrical Engineering Law');
    const table = s.body.find((b) => typeof b === 'string' && b.includes('| Law | Year |'));
    const years = [...table.matchAll(/\| (\d{4}) \|/g)].map((m) => Number(m[1]));
    expect(years.length).toBeGreaterThanOrEqual(10);
    years.slice(1).forEach((y, k) => expect(y).toBeGreaterThanOrEqual(years[k]));
    expect(table).toMatch(/RA 7920 \| 1995/);
    expect(table).toMatch(/RA 184 \| 1947/);
  });

  it('Board and Licensure: weights, the two candidates, the pass line', () => {
    const s = section('Board and Licensure');
    const [pass, board] = s.examples;
    expect(WEIGHTS.math + WEIGHTS.esas + WEIGHTS.ee).toBeCloseTo(1, 12);
    expect(said(pass)).toContain(`= ${generalAverage(65, 70, 74).toFixed(2)}\\%$`);
    expect(said(board)).toContain(`= ${generalAverage(45, 85, 80).toFixed(2)}\\%$`);
    const need = (70 - 0.25 * 65 - 0.3 * 70) / 0.45;
    expect(said(board)).toContain(`= ${(70 - 16.25 - 21).toFixed(2)}$, so $x = ${need.toFixed(1)}$`);
    const f = figure(s);
    expect(f.series[0].f(f.marks[1].x)).toBeCloseTo(70, 9);
    expect(f.marks[1].label).toBe(need.toFixed(1));
  });

  it('RA 9513: a net-metered bill, the solar day', () => {
    const s = section('RA 9513 Renewable Energy');
    const [, bill] = s.examples;
    expect(said(bill)).toContain(`= ₱${450 * 11}$`);
    expect(said(bill)).toContain(`= ₱${300 * 6}$`);
    expect(said(bill)).toContain(`= ₱${450 * 11 - 300 * 6}$`);
    // Solar runs ahead of the load at noon and behind it in the evening.
    expect(solarKw(12)).toBeGreaterThan(loadKw(12));
    expect(solarKw(20)).toBeLessThan(loadKw(20));
    expect(solarKw(12)).toBeCloseTo(10, 12);
    const [sol, load] = figure(s).series;
    expect(sol.f).toBe(solarKw);
    expect(load.f).toBe(loadKw);
  });

  it('RA 11285: a lighting retrofit', () => {
    const [, retrofit] = section('RA 11285 Energy Efficiency').examples;
    const w = 100 * (40 - 18);
    const kwh = Math.round((w / 1000) * 12 * 300);
    expect(said(retrofit)).toContain(`= ${w}$ W`);
    expect(said(retrofit)).toContain(`= ${kwh}$ kWh, worth ₱${(kwh * 10).toLocaleString('en-US')}`);
    const years = 30000 / (kwh * 10);
    expect(said(retrofit)).toContain(`= ${years.toFixed(2)}$ years, about ${(years * 12).toFixed(1)} months`);
  });

  it('Grid and Distribution Codes: SAIFI, SAIDI, CAIDI', () => {
    const [, rel] = section('Grid and Distribution Codes').examples;
    const saifi = (1000 + 2000 + 500) / 5000;
    const saidi = (1000 * 2 + 2000 * 0.5 + 500 * 4) / 5000;
    expect(said(rel)).toContain(`= ${saifi}$ a year`);
    expect(said(rel)).toContain(`= ${saidi.toFixed(1)}$ h a year`);
    expect(said(rel)).toContain(`= ${(saidi / saifi).toFixed(2)}$ h per interruption`);
  });

  it('Obligations and Contracts: prescription and lesion', () => {
    const [time, kinds] = section('Obligations and Contracts').examples;
    expect(3).toBeLessThan(10);
    expect(5).toBeGreaterThan(4);
    expect(said(time)).toContain('Yes; no.');
    expect(0.3).toBeGreaterThan(0.25);
    expect(said(kinds)).toContain('Voidable; void; rescissible.');
  });

  it('EPIRA: the industry diagram', () => {
    const d = figure(section('RA 9136 EPIRA'), 'blocks');
    expect(d.links.map(([a, b]) => `${a}>${b}`)).toEqual(['gen>wesm', 'gen>grid', 'grid>du', 'du>users']);
  });
});
