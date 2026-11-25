// Research Methods in the module format (2026-11-25): every number in the
// topic's worked examples and figures worked again, so a slip in the text
// fails here.
import { describe, it, expect } from 'vitest';
import lesson, { phi, LAMP, se, shift, slovin, alphaOf, itemsFor, MONTHLY } from './content/esas/research-methods.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figures = (s, type = 'plot') => s.body.filter((b) => typeof b !== 'string' && b.type === type);

describe('Research Methods, worked again', () => {
  it('Problem and literature: the process, recent sources', () => {
    const process = figures(section('Research Problem'), 'blocks')[0];
    expect(process.blocks.map((b) => b.label)).toEqual(['Problem', 'Literature', 'Hypotheses', 'Design', 'Sampling', 'Data', 'Analysis', 'Report']);
    const lit = section('Review of Literature');
    expect(said(lit.examples[1])).toContain(`$${0.7 * 40} - 22 = ${0.7 * 40 - 22}$`);
    expect(figures(lit, 'blocks')[0].blocks.map((b) => b.label)).toEqual(['Input', 'Process', 'Output']);
  });

  it('Hypotheses: the lamp test, its p-value and power, the curves', () => {
    const s = section('Hypotheses and Variables');
    const board = said(s.examples[1]);
    const z = (LAMP.xbar - LAMP.mu0) / se();
    expect(se()).toBe(20);
    expect(board).toContain(`= ${z.toFixed(2)}$`);
    expect(board).toContain(`is $${(1 - phi(z)).toFixed(3)}$`);
    expect(phi(1.645)).toBeCloseTo(0.95, 3);
    expect(phi(1.96)).toBeCloseTo(0.975, 4);
    expect(shift()).toBe(2.5);
    const beta = phi(LAMP.zc - shift());
    expect(board).toContain(`P(z < ${(LAMP.zc - shift()).toFixed(3)}) = ${beta.toFixed(3)}$`);
    expect(board).toContain(`= ${(1 - beta).toFixed(3)}$`);
    const [plot] = figures(s);
    expect(plot.marks[0].x).toBe(LAMP.zc);
    expect(plot.series[1].f(2.5)).toBeCloseTo(plot.series[0].f(0), 12);
    expect(plot.caption).toContain(`β ≈ ${beta.toFixed(2)}`);
  });

  it('Design: the effect over the control group', () => {
    const board = said(section('Research Design').examples[1]);
    expect(board).toContain(`= ${78 - 62}$`);
    expect(board).toContain(`= ${66 - 60}$`);
    expect(board).toContain(`= ${78 - 62 - (66 - 60)}$ points`);
  });

  it('Sampling: Slovin, the proportion formula, strata, the margin, the curve', () => {
    const s = section('Sampling');
    const [basic, board] = s.examples;
    expect(said(basic)).toContain(`= ${slovin(0.05)(1000).toFixed(1)}$, so ${Math.ceil(slovin(0.05)(1000))}`);
    const n0 = (1.96 ** 2 * 0.25) / 0.05 ** 2;
    expect(said(basic)).toContain(`= ${n0.toFixed(1)}$`);
    const n = n0 / (1 + (n0 - 1) / 1000);
    expect(said(basic)).toContain(`= ${n.toFixed(1)}$, so ${Math.ceil(n)}`);
    [[450, 90], [350, 70], [200, 40]].forEach(([Nh, nh]) => {
      expect((200 * Nh) / 1000).toBe(nh);
      expect(said(board)).toContain(`= ${nh}$`);
    });
    expect(said(board)).toContain(`= ${(1.96 * Math.sqrt(0.25 / 400)).toFixed(3)}$`);
    const [plot] = figures(s);
    expect(plot.marks[0].label).toBe(String(Math.ceil(slovin(0.05)(1000))));
    expect(slovin(0.05)(1e9)).toBeCloseTo(400, 3);
    expect(Math.round(slovin(0.03)(1e9))).toBe(1111);
  });

  it('Data gathering: the weighted mean, the usable rate', () => {
    const [likert, board] = section('Data Gathering').examples;
    const sum = 10 * 5 + 20 * 4 + 5 * 3 + 3 * 2 + 2 * 1;
    expect(sum).toBe(153);
    expect(sum / 40).toBeCloseTo(3.825, 12);
    expect(said(likert)).toContain('= 3.83$');
    expect(said(board)).toContain(`= ${((312 - 12) / 400) * 100}\\%$`);
  });

  it('Validity and reliability: alpha, items needed, the curves', () => {
    const s = section('Validity and Reliability');
    const [basic, board] = s.examples;
    expect(said(basic)).toContain(`= ${((10 / 9) * (1 - 12 / 40)).toFixed(2)}$`);
    expect(said(board)).toContain(`= ${((0.7 * 0.8) / (0.2 * 0.3)).toFixed(2)}$`);
    expect(itemsFor(0.7, 0.2)).toBe(10);
    expect(itemsFor(0.7, 0.3)).toBe(6);
    expect(said(board)).toContain(`= ${alphaOf(0.2)(10).toFixed(3)}$`);
    const [hi, lo] = figures(s)[0].series;
    expect(hi.f(6)).toBeGreaterThanOrEqual(0.7);
    expect(hi.f(5)).toBeLessThan(0.7);
    expect(lo.f(10)).toBeGreaterThanOrEqual(0.7);
    expect(lo.f(9)).toBeLessThan(0.7);
  });

  it('Statistical treatment: chi-square, Pearson r and the line', () => {
    const [chi, board] = section('Statistical Treatment').examples;
    const O = [30, 20, 10, 40];
    const E = [20, 30, 20, 30];
    const x2 = O.reduce((a, o, i) => a + (o - E[i]) ** 2 / E[i], 0);
    expect(said(chi)).toContain(`= ${x2.toFixed(1)}$`);
    const xs = [2, 4, 6, 8, 10];
    const ys = [60, 65, 75, 80, 90];
    const mx = xs.reduce((a, b) => a + b) / 5;
    const my = ys.reduce((a, b) => a + b) / 5;
    const Sxy = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
    const Sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    const Syy = ys.reduce((a, y) => a + (y - my) ** 2, 0);
    expect([mx, my, Sxy, Sxx, Syy]).toEqual([6, 74, 150, 40, 570]);
    expect(said(board)).toContain(`= ${(Sxy / Math.sqrt(Sxx * Syy)).toFixed(3)}$`);
    const b = Sxy / Sxx;
    const a = my - b * mx;
    expect(said(board)).toContain(`\\hat y = ${a} + ${b}x`);
    expect(said(board)).toContain(`= ${a + b * 7}$`);
    expect(section('Statistical Treatment').traps.join(' ')).toContain(`impossible ${a + b * 20}`);
  });

  it('Presentation: the percent change, the full and truncated axes', () => {
    const s = section('Presentation of Results');
    expect(said(s.examples[1])).toContain(`${((3200 - 2720) / 3200) * 100}\\%`);
    const [full, cut] = figures(s);
    expect(full.y[0]).toBe(0);
    expect(cut.y[0]).toBeLessThanOrEqual(Math.min(...MONTHLY));
    expect(cut.y[1]).toBeGreaterThanOrEqual(Math.max(...MONTHLY));
    expect(cut.caption).toContain(`${Math.max(...MONTHLY) - Math.min(...MONTHLY)} kWh swing`);
  });
});
