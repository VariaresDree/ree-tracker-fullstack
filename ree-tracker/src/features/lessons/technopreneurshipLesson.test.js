// Technopreneurship & Project Management in the module format (2026-11-25):
// every number in the topic's worked examples and figures worked again, so a
// slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson, {
  SUB, ltv, cumulative, paybackMonths, PLAN, breakEvenUnits, PV, EV, AC, BAC, pert,
} from './content/esas/technopreneurship-project-management.js';
import { phi } from './content/esas/research-methods.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s, type = 'plot') => s.body.find((b) => typeof b !== 'string' && b.type === type);
const pesos = (n) => n.toLocaleString('en-US').replace(/,/g, '\\,');

describe('Technopreneurship & Project Management, worked again', () => {
  it('Basics: the lean loop and a failed test', () => {
    const s = section('Technopreneurship Basics');
    expect(figure(s, 'blocks').blocks.map((b) => b.label)).toEqual(['Build', 'Measure', 'Learn']);
    expect(said(s.examples[1])).toContain(`= ${(30 / 1200) * 100}\\%$`);
  });

  it('Customers: LTV, channels, payback with and without churn', () => {
    const s = section('Customers and Value Proposition');
    const [basic, board] = s.examples;
    expect(ltv()).toBeCloseTo(7000, 9);
    expect(said(basic)).toContain(`= ${Math.round(ltv())}$ pesos`);
    expect(said(basic)).toContain(`= ${7000 / 2000} \\ge 3$`);
    expect(said(board)).toContain(`= ${(7000 / 1500).toFixed(2)}$`);
    expect(said(board)).toContain(`= ${7000 / 4000}$`);
    expect(said(board)).toContain(`= ${(1500 / 350).toFixed(1)}$ months`);
    expect(said(board)).toContain(`needs ${paybackMonths().toFixed(1)} months`);
    expect(said(board)).toContain(`= ${(2000 / 350).toFixed(1)}$`);
    expect(cumulative(paybackMonths())).toBeCloseTo(0, 9);
    expect(cumulative(0)).toBe(-SUB.cac);
    const f = figure(s);
    expect(f.marks[0].x).toBeCloseTo(paybackMonths(), 12);
    expect(f.marks[1].y).toBeCloseTo(ltv() - SUB.cac, 9);
    expect(f.caption).toContain(`${paybackMonths().toFixed(1)} months`);
  });

  it('Market: CAGR both ways, TAM, SAM and SOM', () => {
    const [basic, board] = section('Market Identification and Analysis').examples;
    expect(said(basic)).toContain(`= ${((1.5 ** 0.25 - 1) * 100).toFixed(1)}\\%$`);
    expect(said(basic)).toContain(`= ${((0.75 ** 0.5 - 1) * 100).toFixed(1)}\\%$`);
    expect((2e6 * 250000) / 1e9).toBe(500);
    expect(said(board)).toContain(`= ${pesos(0.15 * 2e6)}$ households, ${(0.15 * 2e6 * 250000) / 1e9} billion`);
    expect(said(board)).toContain(`= ${0.02 * 0.15 * 2e6}$ households, ${(0.02 * 0.15 * 2e6 * 250000) / 1e9} billion`);
  });

  it('Competition: the five forces point at rivalry', () => {
    const f = figure(section('Competitive Advantage'), 'blocks');
    expect(f.links.every(([, to]) => to === 'r')).toBe(true);
    expect(f.links).toHaveLength(4);
  });

  it('Business models: markup, margin, subscription, price for a margin', () => {
    const s = section('Business Models');
    const [basic, board] = s.examples;
    expect(said(basic)).toContain(`= ${((500 / 1500) * 100).toFixed(1)}\\%$`);
    expect(said(board)).toContain(`= ${300 * 30}$ pesos`);
    expect(said(board)).toContain(`= ${1200 / (1 - 0.4)}$ pesos`);
    expect(s.check[1].a).toContain(`= ${(0.25 / 1.25) * 100}\\%$`);
  });

  it('IP: the terms in the table and the examples', () => {
    const s = section('Intellectual Property');
    expect(s.body[0]).toMatch(/\| Patent \|.*\| 20 years from filing \|/);
    expect(s.body[0]).toMatch(/\| Utility model \|.*\| 7 years from filing/);
    expect(said(s.examples[0])).toContain(`= ${2026 + 20}$`);
    expect(said(s.examples[0])).toContain(`= ${2026 + 7}$`);
    expect(said(s.examples[1])).toContain(`= ${2026 + 30}$`);
  });

  it('Business plan: break-even, runway, a profit target, ROI, the chart', () => {
    const s = section('Business Plan and Financial Analysis');
    const [basic, board] = s.examples;
    expect(breakEvenUnits()).toBe(10000);
    expect(said(basic)).toContain(`= ${pesos(PLAN.fc / 0.4)}$ pesos`);
    expect(said(basic)).toContain(`= ${1.8e6 / 150000}$ months`);
    expect(said(board)).toContain(`= ${pesos((PLAN.fc + 100000) / (PLAN.p - PLAN.v))}$ units`);
    const profit = 12000 * (PLAN.p - PLAN.v) - PLAN.fc;
    expect(said(board)).toContain(`= ${pesos(profit)}$ pesos`);
    expect(said(board)).toContain(`= ${((12 * profit) / 2.4e6) * 100}\\%$`);
    const f = figure(s);
    const [rev, cost] = f.series;
    expect(rev.f(breakEvenUnits())).toBe(cost.f(breakEvenUnits()));
    expect(f.marks[0].x).toBe(10000);
  });

  it('Capital: dilution and a term sheet', () => {
    const [basic, board] = section('Raising Capital').examples;
    expect(said(basic)).toContain(`= ${Math.round(0.8 * 0.8 * 100)}\\%$`);
    expect(said(board)).toContain(`= ${10 / 0.25}$ M pesos; $V_{pre} = 40 - 10 = ${40 - 10}$`);
    expect(said(board)).toContain(`= ${75 / 2}\\%$`);
  });

  it('Management and WBS: foremen, crew size, the diagrams', () => {
    const mgmt = section('Management Functions');
    expect(figure(mgmt, 'blocks').blocks.map((b) => b.label)).toEqual(['Plan', 'Organize', 'Lead', 'Control']);
    expect(said(mgmt.examples[1])).toContain(`= ${(40 / 6).toFixed(1)}$: round up to ${Math.ceil(40 / 6)}`);
    const wbs = section('Work Breakdown and Gantt Charts');
    expect(said(wbs.examples[0])).toContain(`= ${60 / (4 * 0.75)}$ days`);
    const n = (90 + 60 + 30) / (30 * 0.8);
    expect(said(wbs.examples[1])).toContain(`= ${n}$: round up to ${Math.ceil(n)}`);
  });

  it('CPM and PERT: paths, float, the probability, the network', () => {
    const s = section('CPM and PERT');
    const [basic, board] = s.examples;
    const t = { A: 3, B: 5, C: 2, D: 3, E: 4 };
    const crit = Math.max(t.A + t.C, t.B + t.D) + t.E;
    expect(crit).toBe(12);
    expect(said(basic)).toContain(`= ${crit - t.E - t.C - t.A - 0}$ days.`);
    const acts = [[3, 5, 7], [2, 3, 4], [2, 4, 6]].map(pert);
    expect(acts.map((a) => a.te)).toEqual([5, 3, 4]);
    const sd = Math.sqrt(acts.reduce((v, a) => v + a.sd ** 2, 0));
    expect(sd).toBeCloseTo(1, 12);
    expect(said(board)).toContain(`probability $${phi((13 - 12) / sd).toFixed(3)}$`);
    expect(said(board)).toContain(`probability $${phi((14 - 12) / sd).toFixed(3)}$`);
    const labels = figure(s, 'blocks').blocks.map((b) => b.label);
    Object.entries(t).forEach(([k, d]) => expect(labels).toContain(`${k} · ${d} d`));
  });

  it('Risk: EMVs and the contingency', () => {
    const board = said(section('Project Cost and Risk').examples[1]);
    const threats = 0.2 * 500000 + 0.1 * 1200000 + 0.5 * 80000;
    expect(Math.round(threats)).toBe(260000);
    expect(board).toContain(`= ${pesos(Math.round(threats))}$ pesos`);
    expect(board).toContain(`\\approx 260\\,000 - 60\\,000 = ${pesos(Math.round(threats - 0.3 * 200000))}$`);
  });

  it('Control: the indices, both forecasts, the curves', () => {
    const s = section('Project Control');
    const [basic, board] = s.examples;
    const [ev, ac, pv] = [EV[4], AC[4], PV[4]];
    expect([pv, ev, ac]).toEqual([400, 350, 420]);
    const cpi = ev / ac;
    expect(said(basic)).toContain(`= ${cpi.toFixed(3)}$`);
    expect(said(basic)).toContain(`= ${(ev / pv).toFixed(3)}$`);
    const eac = BAC / cpi;
    expect(eac).toBeCloseTo(1200, 9);
    expect(said(board)).toContain(`= ${ev - ac}$; $SV = 350 - 400 = ${ev - pv}$`);
    expect(said(board)).toContain(`= ${Math.round(eac - ac)}$; overrun $1200 - 1000 = ${Math.round(eac - BAC)}$`);
    expect(said(board)).toContain(`= ${ac + (BAC - ev)}$`);
    const f = figure(s);
    expect(PV.at(-1)).toBe(BAC);
    expect(f.marks[1].y).toBeCloseTo(eac, 9);
  });
});
