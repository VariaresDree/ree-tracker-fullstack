// Complex Numbers in the module format (2026-11-27): every number in the
// topic's worked examples and figures worked again, so a slip in the text
// fails here.
import { describe, it, expect } from 'vitest';
import lesson from './content/mathematics/complex-numbers.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const phasor = (s) => s.body.find((b) => b.type === 'phasor');
const rad = (d) => (d * Math.PI) / 180;
const deg = (x) => (x * 180) / Math.PI;

// A tiny complex type: enough to work every example again.
const C = (re, im = 0) => ({ re, im });
const add = (a, b) => C(a.re + b.re, a.im + b.im);
const sub = (a, b) => C(a.re - b.re, a.im - b.im);
const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const div = (a, b) => {
  const m = b.re ** 2 + b.im ** 2;
  return C((a.re * b.re + a.im * b.im) / m, (a.im * b.re - a.re * b.im) / m);
};
const abs = (a) => Math.hypot(a.re, a.im);
const arg = (a) => deg(Math.atan2(a.im, a.re));
const pol = (r, t) => C(r * Math.cos(rad(t)), r * Math.sin(rad(t)));
const pow = (a, n) => pol(abs(a) ** n, arg(a) * n);
const f3 = (x) => x.toFixed(3);
const f4 = (x) => x.toFixed(4);

describe('Complex Numbers, worked again', () => {
  it('Forms: the QIII point, both conversions, the figure', () => {
    const s = section('Rectangular and Polar Forms');
    const z = C(-3, -4);
    expect(abs(z)).toBe(5);
    expect(f3(arg(z) + 360)).toBe('233.130');
    const board = said(s.examples[1]);
    const a = pol(5, -150);
    expect(board).toContain(`= ${f3(a.re)}$, $5\\sin(-150^\\circ) = ${a.im.toFixed(1)}$`);
    const b = C(-12, 5);
    expect(abs(b)).toBe(13);
    expect(board).toContain(`= ${arg(b).toFixed(2)}^\\circ = ${f4(rad(arg(b)))}$ rad`);
    expect(phasor(s).vectors[0].angle).toBeCloseTo(arg(z) + 360, 12);
  });

  it('Powers of j: the sums, the reciprocal, (1 + j)^8', () => {
    const J = [C(1), C(0, 1), C(-1), C(0, -1)];
    const jp = (n) => J[((n % 4) + 4) % 4];
    expect(add(add(jp(57), jp(58)), jp(60))).toEqual(C(0, 1));
    expect(add(jp(2027), jp(100))).toEqual(C(1, -1));
    const r = div(C(1), jp(3));
    expect([r.re, r.im]).toEqual([0, 1]);
    const p = pow(C(1, 1), 8);
    expect(p.re).toBeCloseTo(16, 9);
    expect(p.im).toBeCloseTo(0, 9);
  });

  it('Arithmetic: the quotient, the product, the polar chain, tip to tail', () => {
    const s = section('Complex Arithmetic');
    expect(div(C(3, -2), C(1, 1))).toEqual(C(0.5, -2.5));
    expect(mul(C(2, 3), C(4, -5))).toEqual(C(23, 2));
    const z = pol((6 * 2) / 3, 40 - 15 - 10);
    expect(said(s.examples[1])).toContain(`= ${f3(z.re)} + j${f3(z.im)}$`);
    const [a, b, sum] = phasor(s).vectors;
    const tip = add(pol(a.mag, a.angle), pol(b.mag, b.angle));
    expect(tip.re).toBeCloseTo(4, 12);
    expect(tip.im).toBeCloseTo(4, 12);
    expect(sum.mag).toBeCloseTo(abs(tip), 12);
  });

  it('Conjugate and modulus: the distance, |B|, z from z + z* and zz*', () => {
    expect(abs(mul(C(3, 4), C(5, -12)))).toBeCloseTo(65, 12);
    expect(abs(sub(C(5, 5), C(2, 1)))).toBe(5);
    expect(20 / abs(C(3, -4))).toBe(4);
    expect(3 ** 2 + 4 ** 2).toBe(25);
  });

  it("De Moivre: (1 + j)^10, (√3 + j)^6, (2∠20°)^5, the spiral", () => {
    const s = section("De Moivre's Theorem");
    const t = pow(C(1, 1), 10);
    expect(t.re).toBeCloseTo(0, 9);
    expect(t.im).toBeCloseTo(32, 9);
    const u = pow(C(Math.sqrt(3), 1), 6);
    expect(u.re).toBeCloseTo(-64, 9);
    const v = pol(32, 100);
    expect(said(s.examples[1])).toContain(`= ${f3(v.re)} + j${v.im.toFixed(2)}$`);
    phasor(s).vectors.forEach((vec, i) => {
      const p = pow(C(1, 1), i + 1);
      expect(vec.mag).toBeCloseTo(abs(p), 12);
      expect(vec.angle).toBeCloseTo(45 * (i + 1), 9);
    });
  });

  it('Roots: cube roots of −8, square roots of 5 + j12, fourth roots of −16', () => {
    const s = section('Roots of Complex Numbers');
    phasor(s).vectors.forEach((vec) => {
      const c = pow(pol(vec.mag, vec.angle), 3);
      expect(c.re).toBeCloseTo(-8, 9);
      expect(c.im).toBeCloseTo(0, 9);
    });
    expect(mul(C(3, 2), C(3, 2))).toEqual(C(5, 12));
    const board = said(s.examples[1]);
    expect(board).toContain(`= 13\\angle${(deg(Math.atan2(12, 5))).toFixed(2)}^\\circ$`);
    expect(board).toContain(`\\sqrt{13}\\angle${(deg(Math.atan2(12, 5)) / 2).toFixed(2)}^\\circ$`);
    const p = pol(2, 45);
    expect(board).toContain(`= ${f3(p.re)} + j${f3(p.im)}$`);
    const q = pow(p, 4);
    expect(q.re).toBeCloseTo(-16, 9);
  });

  it("Euler: the product, the cosine sum, the conversion", () => {
    const board = said(section("Euler's Formula").examples[1]);
    expect(board).toContain(`= ${f4(2 * Math.cos(2))}$`);
    const c = pol(4, -60);
    expect(board).toContain(`= 2 - j${f3(-c.im)}$`);
    expect(Math.exp(-Math.PI / 2)).toBeCloseTo(0.2079, 4);
  });

  it('Logarithms: ln and log of 3 + j4, the complex power', () => {
    const board = said(section('Logarithms of Complex Numbers').examples[1]);
    const th = Math.atan2(4, 3);
    expect(board).toContain(`$\\ln = ${f4(Math.log(5))} + j${f4(th)}$`);
    expect(board).toContain(`= ${f4(Math.log10(5))} + j${f4(Math.log10(Math.E) * th)}$`);
    const w = mul(C(1, -1), C(Math.log(Math.SQRT2), Math.PI / 4));
    expect(board).toContain(`$${f4(w.re)} + j${f4(w.im)}$`);
    const z = pol(Math.exp(w.re), deg(w.im));
    expect(board).toContain(`= ${f4(Math.exp(w.re))}$ at $${f4(w.im)}$ rad $= ${deg(w.im).toFixed(2)}^\\circ$: $${f4(z.re)} + j${f4(z.im)}$`);
  });

  it('Trig and hyperbolic: sin(1 + j2), cosh(2 + j1)', () => {
    const board = said(section('Trigonometric and Hyperbolic Functions').examples[1]);
    expect(board).toContain(`= ${f4(Math.sin(1) * Math.cosh(2))} + j${f4(Math.cos(1) * Math.sinh(2))}$`);
    expect(board).toContain(`= ${f4(Math.cosh(2) * Math.cos(1))} + j${f4(Math.sinh(2) * Math.sin(1))}$`);
  });

  it('Equations: equating parts, the quadratic, the cubic', () => {
    expect(div(C(5, 5), C(2, -1))).toEqual(C(1, 3));
    expect(div(C(1, 5), C(1, 1))).toEqual(C(3, 2));
    const q = (z) => add(sub(mul(z, z), mul(C(4), z)), C(13));
    [C(2, 3), C(2, -3)].forEach((z) => expect(q(z)).toEqual(C(0, 0)));
    const cubic = (z) => add(sub(add(mul(mul(z, z), z), mul(C(-4), mul(z, z))), C(0)), sub(mul(C(6), z), C(4)));
    [C(1, 1), C(1, -1), C(2)].forEach((z) => {
      const v = cubic(z);
      expect(abs(v)).toBeCloseTo(0, 12);
    });
  });

  it('Phasors: the series circuit, the parallel pair, the impedance triangle', () => {
    const s = section('Phasor Applications');
    const Z1 = pol(10, 30);
    const Z2 = pol(5, -60);
    const S = add(Z1, Z2);
    const Z = div(mul(Z1, Z2), S);
    const board = said(s.examples[1]);
    expect(board).toContain(`= ${f3(S.re)} + j${f3(S.im)} = ${abs(S).toFixed(2)}\\angle${arg(S).toFixed(2)}^\\circ$`);
    expect(board).toContain(`= ${f3(abs(Z))}\\angle{${arg(Z).toFixed(2)}^\\circ} = ${f3(Z.re)} - j${f3(-Z.im)}`);
    const I = div(C(120), Z);
    expect(board).toContain(`= ${abs(I).toFixed(2)}\\angle${arg(I).toFixed(2)}^\\circ$ A`);
    const P = mul(C(120), C(I.re, -I.im));
    expect(board).toContain(`= ${Math.round(P.re)} - j${Math.round(-P.im)}$ VA`);
    const [R, X, Zv] = phasor(s).vectors;
    expect(Math.hypot(R.mag, X.mag)).toBe(Zv.mag);
    expect(s.check[0].a).toContain((2 * Math.PI * 60 * 0.01).toFixed(2));
  });
});
