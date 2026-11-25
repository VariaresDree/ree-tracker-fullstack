// Basic Occupational Safety & Health in the module format (2026-11-25): every
// number in the topic's worked examples and figures worked again, so a slip
// in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { k50, touchLimit, permittedHours } from './content/esas/basic-occupational-safety-health.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s, type = 'plot') => s.body.find((b) => typeof b !== 'string' && b.type === type);

describe('Basic Occupational Safety & Health, worked again', () => {
  it('OSH law: the rule table runs in order and names electrical safety', () => {
    const s = section('OSH Law and Standards (RA 11058)');
    const table = s.body.find((b) => typeof b === 'string' && b.includes('| Rule |'));
    const rules = [...table.matchAll(/\| (\d{4})/g)].map((m) => Number(m[1]));
    rules.slice(1).forEach((x, k) => expect(x).toBeGreaterThan(rules[k]));
    expect(table).toMatch(/\| 1210 \| Electrical safety/);
    expect(said(s.examples[1])).toContain('1210; 1040; 1080; 1212');
  });

  it('Hazards: risk scores and ranking, the control hierarchy', () => {
    const s = section('Hazards and Risk Assessment');
    const [basic, board] = s.examples;
    expect(said(basic)).toContain(`= ${4 * 5}$`);
    const scores = { A: 2 * 5, B: 4 * 3, C: 5 * 1 };
    expect(Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([k]) => k)).toEqual(['B', 'A', 'C']);
    expect(said(board)).toContain('A: 10; B: 12; C: 5');
    expect(figure(s, 'blocks').blocks.map((b) => b.label)).toEqual(['Eliminate', 'Substitute', 'Engineer', 'Administer', 'PPE']);
  });

  it('Accidents: Heinrich and Bird scaled', () => {
    const [heinrich, bird] = section('Accident Causes and Investigation').examples;
    expect(said(heinrich)).toContain(`= ${3 * 29}$ minor`);
    expect([10, 30, 600].map((x) => 3 * x)).toEqual([30, 90, 1800]);
    expect(said(bird)).toContain('30; 90; 1800');
  });

  it('PPE: at-the-ear levels, glove class', () => {
    const [plugs, board] = section('Personal Protective Equipment').examples;
    expect(said(plugs)).toContain(`= ${100 - (29 - 7) / 2}$ dBA`);
    expect(said(board)).toContain(`= ${95 - (25 - 7) / 2}$ dBA`);
    const classes = [[0, 1], [1, 7.5], [2, 17]];
    expect(classes.find(([, kv]) => kv >= 13.8)[0]).toBe(2);
  });

  it('Electrical Safety: touch and step limits, body currents, the curves', () => {
    const s = section('Electrical Safety and Lockout/Tagout');
    const [touch, board] = s.examples;
    expect(said(touch)).toContain(`= ${k50(0.5).toFixed(3)}$ A`);
    expect(said(touch)).toContain(`= ${Math.round(touchLimit(1750)(0.5))}$ V`);
    const step = (1000 + 6 * 0.7 * 2500) * k50(0.5);
    expect(Math.round(step)).toBe(1887);
    expect(said(board)).toContain('= 1887$ V');
    expect(said(board)).toContain(`= ${(230 / 100000) * 1000}$ mA`);
    expect(said(board)).toContain(`= ${(230 / 1000) * 1000}$ mA`);
    const [rock, soil] = figure(s).series;
    expect(rock.f(0.1)).toBeCloseTo(1330, -1);
    expect(Math.round(soil.f(0.5) / 10) * 10).toBe(190);
  });

  it('Ergonomics: the limit, the index, how close, the curve', () => {
    const s = section('Ergonomics');
    const [lift, close] = s.examples;
    expect(said(lift)).toContain(`= ${(23 * 25) / 50}$ kg`);
    expect(said(lift)).toContain(`= ${(15 / 11.5).toFixed(1)}$`);
    expect(said(close)).toContain(`= ${((23 * 25) / 15).toFixed(1)}$ cm`);
    const [rwl, load] = figure(s).series;
    expect(rwl.f((23 * 25) / 15)).toBeCloseTo(load.f(0), 12);
  });

  it('Industrial Hygiene: dose, TWA, WBGT, permitted hours', () => {
    const s = section('Industrial Hygiene');
    const [dose, board] = s.examples;
    const D = 4 / permittedHours(90) + 2 / permittedHours(95) + 1 / permittedHours(100);
    expect(D).toBeCloseTo(1.5, 12);
    expect(said(dose)).toContain('= 1.5$');
    expect((90 + 16.61 * Math.log10(D)).toFixed(1)).toBe('92.9');
    expect(said(board)).toContain(`= ${(3 * 120 + 3 * 60) / 8}$ ppm`);
    expect(said(board)).toContain(`= ${(0.7 * 28 + 0.2 * 40 + 0.1 * 33).toFixed(1)}$ °C`);
    expect([85, 90, 95, 100, 105, 110].map(permittedHours)).toEqual([16, 8, 4, 2, 1, 0.5]);
  });

  it('Reporting: rates for one plant and two', () => {
    const [basic, board] = section('Reporting and Records').examples;
    expect(500 * 2000).toBe(1e6);
    expect(said(basic)).toContain(`= ${300 / 6}$ days`);
    const X = 300 * 2100;
    const Y = 800 * 2000;
    expect(said(board)).toContain(`FR $= ${((4 * 1e6) / X).toFixed(2)}$, SR $= ${((120 * 1e6) / X).toFixed(1)}$`);
    expect(said(board)).toContain(`FR $= ${((7 * 1e6) / Y).toFixed(2)}$, SR $= ${((420 * 1e6) / Y).toFixed(1)}$`);
  });
});
