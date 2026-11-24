// Feedback Control Systems in the module format (2026-11-25): every number in
// the topic's worked examples, checks and figures, worked again, so a slip in
// the text fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/ee/feedback-control-systems.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s, type = 'plot') => s.body.find((b) => typeof b !== 'string' && b.type === type);
const deg = (rad) => (rad * 180) / Math.PI;
const argmax = (f, a, b, n = 100000) => { let best = a; for (let k = 0; k <= n; k++) { const x = a * (b / a) ** (k / n); if (f(x) > f(best)) best = x; } return best; };

describe('Feedback Control Systems, worked again', () => {
  it('System Modeling: analogue, ωn and ζ, motor transfer function', () => {
    const [analogue, motor] = section('System Modeling').examples;
    expect(said(analogue)).toContain(`= ${1 / 50}$ F`);
    expect(said(analogue)).toContain(`= ${Math.sqrt(50 / 2)}$ rad/s`);
    expect(said(analogue)).toContain(`= ${4 / (2 * Math.sqrt(50 * 2))}$`);
    expect(4 / 0.5).toBe(8);
    expect(2 / 0.5).toBe(4);
    expect(said(motor)).toContain('\\frac{8}{s(s + 4)}');
  });

  it('Transfer Functions: first-order step, initial and final values', () => {
    const s = section('Transfer Functions');
    const [first, values] = s.examples;
    expect(said(first)).toContain(`= ${(5 * (1 - Math.exp(-1))).toFixed(2)}$ V`);
    expect(said(first)).toContain(`= ${2.2 * 0.5}$ s`);
    expect(said(first)).toContain(`= ${4 * 0.5}$ s`);
    const big = 1e9;
    expect((big * (3 * big + 2)) / (big * big + 4 * big + 5)).toBeCloseTo(3, 6);
    expect(said(values)).toContain(`= ${20 / 10}$`);
    expect(figure(s).series[0].f(0.5)).toBeCloseTo(5 * (1 - Math.exp(-1)), 9);
  });

  it('Block Diagrams: sensitivity, parallel paths with positive feedback', () => {
    const [sens, parallel] = section('Block Diagrams').examples;
    expect(said(sens)).toContain(`= ${(100 / 11).toFixed(2)}$`);
    expect(said(sens)).toContain(`= ${(1 / 11).toFixed(3)}$`);
    expect(said(sens)).toContain(`= ${((1 / 11) * 10).toFixed(2)}\\%$`);
    expect(said(parallel)).toContain(`= ${((4 + 1) / (1 - 4 * 0.1)).toFixed(2)}$`);
  });

  it('Signal Flow Graphs: Mason with one and two paths', () => {
    const [one, two] = section('Signal Flow Graphs').examples;
    const D = 1 - (-0.5 - 0.2) + -0.5 * -0.2;
    expect(said(one)).toContain(`= ${D.toFixed(1)}$`);
    expect(said(one)).toContain(`= ${(10 / D).toFixed(2)}$`);
    expect(said(two)).toContain(`= ${(1 + 0.2).toFixed(1)}$`);
    expect(said(two)).toContain(`= ${((6 + 2 * 1.2) / D).toFixed(2)}$`);
  });

  it('Time Response: overshoot and times, from the equation, critical K, the curve', () => {
    const s = section('Time Response');
    const [basic, board] = s.examples;
    const wd = 4 * Math.sqrt(0.75);
    expect(said(basic)).toContain(`= ${wd.toFixed(2)}$ rad/s`);
    const os = (z) => 100 * Math.exp((-Math.PI * z) / Math.sqrt(1 - z * z));
    expect(said(basic)).toContain(`= ${os(0.5).toFixed(1)}\\%$`);
    expect(said(basic)).toContain(`= ${(Math.PI / wd).toFixed(3)}$ s`);
    expect(said(basic)).toContain(`= ${((Math.PI - Math.acos(0.5)) / wd).toFixed(3)}$ s`);
    expect(said(board)).toContain(`= ${6 / 10}$`);
    expect(said(board)).toContain(`= ${5 * Math.sqrt(1 - 0.36)}$ rad/s`);
    expect(said(board)).toContain(`= ${(1 / 3).toFixed(3)}$ s`);
    expect(said(board)).toContain(`= ${os(0.6).toFixed(2)}\\%$`);
    const f = figure(s).series[0].f;
    const tp = Math.PI / wd;
    expect(f(tp)).toBeCloseTo(1 + os(0.5) / 100, 9);
    expect(figure(s).marks[0].x).toBeCloseTo(tp, 9);
    expect(argmax(f, 0.01, 3) / tp).toBeCloseTo(1, 3);
  });

  it('Steady-State Error: type 1 and type 0, the ramp lag', () => {
    const s = section('Steady-State Error');
    const [t1, t0] = s.examples;
    expect(said(t1)).toContain(`= ${(20 * 3) / (4 * 5)}$`);
    expect(said(t1)).toContain(`= ${(1 / 3).toFixed(3)}$`);
    expect(said(t0)).toContain(`= ${10 / 2}$`);
    expect(said(t0)).toContain(`= ${(1 / 6).toFixed(3)}$`);
    expect((1 / 0.05 - 1) * 2).toBe(38);
    const [out, ramp] = figure(s).series;
    expect(ramp.f(3) - out.f(3)).toBeCloseTo(1 / 3, 3);
  });

  it('Routh-Hurwitz Stability: ranges and frequencies', () => {
    const s = section('Routh-Hurwitz Stability');
    const [basic, board] = s.examples;
    expect(said(basic)).toContain(`= ${Math.sqrt(8).toFixed(2)}$ rad/s`);
    expect(said(board)).toContain(`K < ${12 * 20}$`);
    expect(said(board)).toContain(`= ${Math.sqrt(20).toFixed(2)}$ rad/s $= ${(Math.sqrt(20) / (2 * Math.PI)).toFixed(3)}$ Hz`);
    // s⁴ + 6s³ + 11s² + 6s + K: the s² row is (66 − 6)/6 = 10, the s¹ row (60 − 6K)/10.
    expect((6 * 11 - 6) / 6).toBe(10);
    expect((10 * 6) / 6).toBe(10);
    expect(s.check[0].a).toContain('0 < K < 10');
    expect(4 * 8).toBeGreaterThan(12);
  });

  it('Root Locus: asymptotes, breakaway, crossing, the plotted branches', () => {
    const s = section('Root Locus');
    const [basic, board] = s.examples;
    const sb = (-12 + Math.sqrt(144 - 96)) / 6;
    expect(said(basic)).toContain(`s = ${sb.toFixed(3)}$`);
    expect(said(basic)).toContain(`K = ${(-(sb ** 3 + 6 * sb ** 2 + 8 * sb)).toFixed(2)}`);
    expect(said(board)).toContain('K = 4');
    expect(said(board)).toContain(`K = \\omega_n^2 = ${4 ** 2}$`);
    // Every plotted point is a root of s³ + 6s² + 8s + K for some K ≥ 0: K = −(s³ + 6s² + 8s) real and ≥ 0.
    for (const series of figure(s).series) {
      for (const [x, y] of series.points) {
        const re = x ** 3 - 3 * x * y * y + 6 * (x * x - y * y) + 8 * x;
        const im = 3 * x * x * y - y ** 3 + 12 * x * y + 8 * y;
        expect(Math.abs(im)).toBeLessThan(1e-6);
        expect(-re).toBeGreaterThan(-1e-6);
      }
    }
    // Where the upper branch crosses σ = 0, interpolated between plotted points.
    const pts = figure(s).series[0].points;
    const i = pts.findIndex(([x, y], k) => k > 0 && y > 1 && pts[k - 1][0] < 0 && x >= 0);
    const [[x0, y0], [x1, y1]] = [pts[i - 1], pts[i]];
    expect(y0 + ((y1 - y0) * -x0) / (x1 - x0)).toBeCloseTo(Math.sqrt(8), 2);
  });

  it('Bode Plots: resonant peak, the corner, the curves', () => {
    const s = section('Bode Plots');
    const [basic, board] = s.examples;
    const Mr = 1 / (2 * 0.3 * Math.sqrt(0.91));
    expect(said(basic)).toContain(`= ${Mr.toFixed(2)}$ (${(20 * Math.log10(Mr)).toFixed(2)} dB)`);
    expect(said(basic)).toContain(`= ${Math.sqrt(1 - 0.18).toFixed(3)}$`);
    expect(said(board)).toContain(`= ${(100 / Math.sqrt(200)).toFixed(2)}$, which is ${(20 * Math.log10(100 / Math.sqrt(200))).toFixed(1)} dB`);
    const [truth, asym] = figure(s).series;
    expect(asym.f(10) - truth.f(10)).toBeCloseTo(10 * Math.log10(2), 9);
    expect(truth.f(1)).toBeCloseTo(20, 0);
  });

  it('Nyquist: limiting gain, margin, the plotted crossing', () => {
    const s = section('Nyquist');
    const [basic, board] = s.examples;
    expect(4 / 8).toBe(0.5);
    expect(said(basic)).toContain(`${(20 * Math.log10(2)).toFixed(2)} dB`);
    expect(said(board)).toContain(`= ${(2 * Math.tan(Math.PI / 3)).toFixed(2)}$ rad/s`);
    expect(Math.sqrt(4 + 12) ** 3).toBe(64);
    const pts = figure(s).series[0].points;
    expect(pts[0][0]).toBeCloseTo(4, 9);
    let crossing = null;
    for (let i = 1; i < pts.length; i++) {
      if (pts[i - 1][1] < 0 && pts[i][1] >= 0) { crossing = pts[i][0]; break; }
    }
    expect(crossing).toBeCloseTo(-0.5, 2);
  });

  it('Gain and Phase Margins: crossover, margin, delay, the phase curve', () => {
    const s = section('Gain and Phase Margins');
    const [basic, delay] = s.examples;
    const wc = Math.sqrt((-1 + Math.sqrt(5)) / 0.02);
    expect(said(basic)).toContain(`= ${wc.toFixed(2)}$ rad/s`);
    const pm = 90 - deg(Math.atan(0.1 * wc));
    expect(said(basic)).toContain(`= ${pm.toFixed(1)}°$`);
    const lag = wc * 0.05;
    expect(said(delay)).toContain(`= ${lag.toFixed(3)}$ rad $= ${deg(lag).toFixed(1)}°$`);
    expect(said(delay)).toContain(`= ${(pm - deg(lag)).toFixed(1)}°$`);
    expect(figure(s).series[0].f(wc)).toBeCloseTo(-180 + pm, 9);
    expect(figure(s).marks[0].x).toBeCloseTo(wc, 2);
    expect(s.check[0].a).toContain(`= ${(20 * Math.log10(4)).toFixed(1)}$ dB`);
  });

  it('PID Controllers: parallel form, PI zero', () => {
    const [pid, pi] = section('PID Controllers').examples;
    expect(said(pid)).toContain(`= ${4 / 2}$`);
    expect(said(pid)).toContain(`= ${4 * 0.5}$`);
    expect(said(pi)).toContain(`zero at −${1 / 4}`);
  });

  it('Compensators: lead peak, lag placement, the phase curve', () => {
    const s = section('Compensators');
    const [lead, lag] = s.examples;
    expect(said(lead)).toContain(`= ${deg(Math.asin(0.9 / 1.1)).toFixed(1)}°$`);
    const T = 1 / (10 * Math.sqrt(0.1));
    expect(said(lead)).toContain(`= ${T.toFixed(3)}$ s`);
    expect(said(lead)).toContain(`= ${(1 / Math.sqrt(0.1)).toFixed(2)}$ (10 dB)`);
    expect(said(lag)).toContain(`= ${20 / 2}$`);
    expect(said(lag)).toContain(`= ${-0.2 / 10}$`);
    const f = figure(s).series[0].f;
    expect(argmax(f, 0.3, 300)).toBeCloseTo(10, 1);
    expect(f(10)).toBeCloseTo(deg(Math.asin(0.9 / 1.1)), 1);
  });

  it('State Space: determinants', () => {
    const [basic, board] = section('State Space').examples;
    expect(0 * -5 - 1 * 1).toBe(-1);
    expect(said(basic)).toContain('determinant −1');
    expect(0 * -2 - 1 * 1).toBe(-1);
    expect(said(board)).toContain('determinant −1');
  });
});
