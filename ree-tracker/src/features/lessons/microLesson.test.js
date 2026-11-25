// Microprocessor Systems and Logic Circuits in the module format (2026-11-25):
// every number in the topic's worked examples worked again, and the timing
// diagrams checked bit by bit against the logic they draw.
import { describe, it, expect } from 'vitest';
import lesson, { trace, GATE_A, GATE_B, CLOCK, counterBit, D_IN, D_OUT, amdahl } from './content/esas/microprocessor-systems-and-logic-circuits.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s, type = 'plot') => s.body.find((b) => typeof b !== 'string' && b.type === type);
// Read a trace back into bits.
const bitsOf = (points, offset) => points.filter((_, i) => i % 2 === 0).map(([, y]) => y - offset);

describe('Microprocessor Systems and Logic Circuits, worked again', () => {
  it('Number Systems: bases, two’s complement, complements, base arithmetic, a fraction, the code table', () => {
    const s = section('Number Systems and Codes');
    const [bases, board] = s.examples;
    expect((156).toString(2)).toBe('10011100');
    expect((156).toString(8)).toBe('234');
    expect((156).toString(16).toUpperCase()).toBe('9C');
    expect((256 - 45).toString(2)).toBe('11010011');
    expect(said(bases)).toContain('11010011 = D3_{16}');
    expect(999 - 633).toBe(366);
    expect(1000 - 365).toBe(635);
    expect((0o7777 - 0o1234).toString(8)).toBe('6543');
    expect((0o3657 + 0o4126).toString(8)).toBe('10005');
    expect((0x6a9 + 0x3c8).toString(16).toUpperCase()).toBe('A71');
    expect((0.6875).toString(2)).toBe('0.1011');
    expect(said(board)).toContain('6543_8');
    expect(said(board)).toContain('10005_8');
    expect(said(board)).toContain('A71_{16}');
    // Every Gray code in the table is b XOR (b >> 1), and Excess-3 is BCD + 3.
    const table = s.body.find((b) => typeof b === 'string' && b.includes('| Digit |'));
    for (const [, d, bcd, , xs3, gray] of table.matchAll(/\| (\d) \| (\d{4}) \| (\d{4}) \| (\d{4}) \| (\d{4}) \|/g)) {
      const n = Number(d);
      expect(parseInt(bcd, 2)).toBe(n);
      expect(parseInt(xs3, 2)).toBe(n + 3);
      expect(parseInt(gray, 2)).toBe(n ^ (n >> 1));
    }
  });

  it('Boolean Algebra: identities hold for every input', () => {
    const [basic, board] = section('Boolean Algebra').examples;
    for (const A of [0, 1]) {
      for (const B of [0, 1]) {
        expect((A & B) | (A & (1 - B)) | ((1 - A) & B)).toBe(A | B);
        for (const C of [0, 1]) {
          expect((A | B) & (A | C)).toBe(A | (B & C));
          expect(1 - ((A & (1 - B)) | C)).toBe(((1 - A) | B) & (1 - C));
        }
      }
    }
    expect(said(basic)).toContain('F = A + B');
    expect(said(board)).toContain('A + BC');
  });

  it('Logic Gates: margins, fan-outs, the timing diagram', () => {
    const s = section('Logic Gates');
    const [ttl, board] = s.examples;
    expect(said(ttl)).toContain(`= ${16 / 1.6}$`);
    expect(said(board)).toContain(`= ${(4.4 - 3.5).toFixed(1)}$ V; $NM_L = 1.5 - 0.1 = ${(1.5 - 0.1).toFixed(1)}$ V`);
    expect(Math.min(8 / 0.4, 0.4 / 0.02)).toBeCloseTo(20, 9);
    const [a, b, and, or, xor] = figure(s).series;
    expect(bitsOf(a.points, 9)).toEqual(GATE_A);
    expect(bitsOf(b.points, 7)).toEqual(GATE_B);
    expect(bitsOf(and.points, 5)).toEqual(GATE_A.map((v, k) => v & GATE_B[k]));
    expect(bitsOf(or.points, 3)).toEqual(GATE_A.map((v, k) => v | GATE_B[k]));
    expect(bitsOf(xor.points, 1)).toEqual(GATE_A.map((v, k) => v ^ GATE_B[k]));
  });

  it("Karnaugh Maps: both answers match their functions, don't-cares aside", () => {
    const [basic, board] = section('Karnaugh Maps').examples;
    const bits = (m) => [(m >> 3) & 1, (m >> 2) & 1, (m >> 1) & 1, m & 1];
    for (let m = 0; m < 16; m += 1) {
      const [, B, , D] = bits(m);
      expect(B === D ? 1 : 0).toBe([0, 2, 5, 7, 8, 10, 13, 15].includes(m) ? 1 : 0);
    }
    for (let m = 0; m < 16; m += 1) {
      if ([0, 2].includes(m)) continue;
      const [A, B, C, D] = bits(m);
      expect((C & D) | ((1 - A) & (1 - B))).toBe([1, 3, 7, 11, 15].includes(m) ? 1 : 0);
    }
    expect(said(basic)).toContain('B \\odot D');
    expect(said(board)).toContain('F = CD + \\overline{A}\\,\\overline{B}');
  });

  it('Adders: ripple delay, select lines, subtraction by two’s complement', () => {
    const [basic, board] = section('Adders, Multiplexers and Decoders').examples;
    expect(said(basic)).toContain(`= ${4 * 10}$ ns`);
    const sum = (0b01001 + 0b11010).toString(2);
    expect(sum).toBe('100011');
    expect(sum.slice(1)).toBe('00011');
    expect(0b00011).toBe(9 - 6);
    expect(said(board)).toContain('1\\,00011');
  });

  it('Flip-Flops: JK toggle, f_max, a watch divider, the D timing', () => {
    const s = section('Flip-Flops');
    const [basic, watch] = s.examples;
    expect(said(basic)).toContain(`= ${(1 / 30e-9 / 1e6).toFixed(1)}$ MHz`);
    expect(Math.log2(32768)).toBe(15);
    expect(said(watch)).toContain('= 15$');
    const [clk, d, q] = figure(s).series;
    expect(bitsOf(clk.points, 5)).toEqual(CLOCK);
    expect(bitsOf(d.points, 3)).toEqual(D_IN);
    expect(bitsOf(q.points, 1)).toEqual(D_OUT);
    // Q changes only at rising clock edges.
    D_OUT.slice(1).forEach((v, k) => {
      if (v !== D_OUT[k]) expect(CLOCK[k + 1] === 1 && CLOCK[k] === 0).toBe(true);
    });
  });

  it('Counters: mod-10, a 4-bit divider, a ripple limit, the 3-bit count', () => {
    const s = section('Counters and Registers');
    const [basic, board] = s.examples;
    expect(Math.ceil(Math.log2(10))).toBe(4);
    expect(said(basic)).toContain(`= ${1e6 / 16 / 1000}$ kHz`);
    expect(said(board)).toContain(`= ${1 / (4 * 10e-9) / 1e6}$ MHz`);
    const [, q0, q1, q2] = figure(s).series;
    const value = (k) => bitsOf(q0.points, 5)[k] + 2 * bitsOf(q1.points, 3)[k] + 4 * bitsOf(q2.points, 1)[k];
    const counts = Array.from({ length: 16 }, (_, k) => value(k));
    expect(counts).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 0]);
    expect(counterBit(0)).toEqual(bitsOf(q0.points, 5));
  });

  it('Sequential Circuits: the 101 table detects overlapping matches', () => {
    const s = section('Sequential Circuits');
    const table = s.body.find((b) => typeof b === 'string' && b.includes('| State |'));
    const next = {};
    const out = {};
    for (const [, st, n0, n1, o] of table.matchAll(/\| (S\d) \| [^|]+ \| (S\d) \| (S\d) \| (\d) \|/g)) {
      next[st] = [n0, n1];
      out[st] = Number(o);
    }
    const run = (input) => {
      let st = 'S0';
      return [...input].map((c) => {
        st = next[st][Number(c)];
        return out[st];
      }).join('');
    };
    expect(run('10101')).toBe('00101');
    expect(run('1101101')).toBe('0001001');
    expect(Math.ceil(Math.log2(20))).toBe(5);
    expect(said(s.examples[1])).toContain('= 5$');
  });

  it('Memory: two layouts and their ranges', () => {
    const s = section('Memory');
    const [basic, board] = s.examples;
    expect(Math.log2(32 * 1024)).toBe(15);
    expect((2 * 8192).toString(16)).toBe('4000');
    expect((3 * 8192 - 1).toString(16)).toBe('5fff');
    expect(said(basic)).toContain('4000H–5FFFH');
    expect((64 / 16) * (8 / 4)).toBe(8);
    expect((2 * 16384).toString(16)).toBe('8000');
    expect((3 * 16384 - 1).toString(16)).toBe('bfff');
    expect(said(board)).toContain('8000H–BFFFH');
  });

  it('Architecture: addresses, run time, Amdahl', () => {
    const s = section('Microprocessor Architecture');
    const [basic, board] = s.examples;
    expect((0x1234 * 16 + 0x10).toString(16)).toBe('12350');
    expect(said(basic)).toContain('= 1$ s');
    expect(amdahl(0.8)(4)).toBeCloseTo(2.5, 12);
    expect(said(board)).toContain('= 2.5$; the limit is');
    expect((0x2000 * 16 + 0x3456).toString(16)).toBe('23456');
    const curves = figure(s).series;
    expect(curves.map((c) => c.f(1e9))).toEqual(curves.map((_, i) => expect.closeTo([2, 5, 20][i], 5)));
  });

  it('Instruction Sets: the delay loop, the count for 1 ms', () => {
    const [loop, count] = section('Instruction Sets and Assembly').examples;
    const t = (c) => 7 + 4 * c + 10 * (c - 1) + 7;
    expect(t(255)).toBe(3574);
    expect(said(loop)).toContain('= 3574$');
    expect(said(loop)).toContain(`= ${(3574 / 3e6 * 1000).toFixed(2)}$ ms`);
    expect(t(214)).toBe(3000);
    expect((214).toString(16).toUpperCase()).toBe('D6');
    expect(said(count)).toContain('C = 214 = D6');
  });

  it('Interfacing: an ADC, serial rates, a DAC', () => {
    const [adc, dac] = section('Interfacing and I/O').examples;
    expect(said(adc)).toContain(`= ${(5000 / 1024).toFixed(2)}$ mV`);
    expect(Math.floor((2.5 / 5) * 1024)).toBe(512);
    expect(said(dac)).toContain(`= ${(10000 / 256).toFixed(2)}$ mV`);
    expect(said(dac)).toContain(`= ${((10 * 0xb4) / 256).toFixed(2)}$ V`);
    expect(said(dac)).toContain(`= ${4800 / 10}$ characters`);
  });

  it('Interrupts: four vectors', () => {
    const [basic, board] = section('Interrupts').examples;
    expect((7.5 * 8).toString(16)).toBe('3c');
    expect((4 * 0x21).toString(16)).toBe('84');
    expect(said(basic)).toContain('003CH; 0084H');
    expect((5.5 * 8).toString(16)).toBe('2c');
    expect(said(board)).toContain('002CH; 0020H; 0008H');
  });

  it('Microcontrollers: a timer, a preload, PWM, an 8051 delay', () => {
    const s = section('Microcontrollers');
    const [basic, board] = s.examples;
    expect(said(basic)).toContain(`= ${((65536 * 8) / 1e6).toFixed(3)}$ s`);
    expect(65536 - 0.01e6 / 8).toBe(64286);
    expect((65536 - 50000).toString(16).toUpperCase()).toBe('3CB0');
    expect(said(board)).toContain('3\\text{CB}0');
    const [pwm, avg] = figure(s).series;
    const bits = bitsOf(pwm.points, 0);
    expect(bits.reduce((a, b) => a + b, 0) / bits.length).toBeCloseTo(avg.f(0), 12);
  });

  it('trace draws steps', () => {
    expect(trace([1, 0], 2)).toEqual([[0, 3], [1, 3], [1, 2], [2, 2]]);
  });
});
