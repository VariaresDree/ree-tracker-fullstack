// Computer Programming in the module format (2026-11-25): every number and
// printed output in the topic's worked examples, run again here (the C and
// Java snippets traced in JavaScript, with integer arithmetic where they use
// it), so a slip in the text fails here.
import { describe, it, expect } from 'vitest';
import lesson, { naiveCalls, int8 } from './content/esas/computer-programming.js';
import { sectionFor } from './lessonContent';

const section = (name) => {
  const s = sectionFor(lesson, name);
  if (!s) throw new Error(`no section ${name}`);
  return s;
};
const said = (ex) => [ex.problem, ...ex.steps, ex.answer].join(' ');
const figure = (s, type = 'plot') => s.body.find((b) => typeof b !== 'string' && b.type === type);
const idiv = (a, b) => Math.trunc(a / b); // C and Java integer division
const int32 = (x) => x | 0;
const int16 = (x) => ((x + 32768) % 65536) - 32768;

describe('Computer Programming, run again', () => {
  it('Algorithms: search, sort, a traced loop, a nested count, the flowchart', () => {
    const s = section('Algorithms and Flowcharts');
    const [search, board] = s.examples;
    expect(Math.floor(Math.log2(1000)) + 1).toBe(10);
    expect((100 * 99) / 2).toBe(4950);
    expect(Math.round(100 * Math.log2(100))).toBe(664);
    expect(said(search)).toContain('= 4950$');
    let j = 0;
    const trace = [];
    for (let i = 1; i <= 4; i += 1) {
      j = 2 * j + i;
      trace.push(j);
    }
    expect(trace).toEqual([1, 4, 11, 26]);
    expect(said(board)).toContain('j = 26');
    let count = 0;
    for (let i = 0; i < 10; i += 1) for (let k = 0; k < i; k += 1) count += 1;
    expect(said(board)).toContain(`= ${count}$`);
    // The flowchart's loop sums 1 to n.
    const chart = figure(s, 'blocks');
    expect(chart.links.map(([a, b]) => `${a}>${b}`)).toEqual(['begin>init', 'init>test', 'test>add', 'add>step', 'step>test', 'test>out']);
  });

  it('Variables and Data Types: a short overflows, unsigned limit, characters, the wrap', () => {
    const s = section('Variables and Data Types');
    const [short, board] = s.examples;
    expect(int16(32767 + 1)).toBe(-32768);
    expect(said(short)).toContain('-32\\,768');
    expect(2 ** 32 - 1).toBe(4294967295);
    expect(said(board)).toContain('4\\,294\\,967\\,295');
    expect(String.fromCharCode('A'.charCodeAt(0) + 2)).toBe('C');
    expect('a'.charCodeAt(0) - 'A'.charCodeAt(0)).toBe(32);
    expect(said(board)).toContain('C 32');
    const pts = figure(s).series[0].points;
    for (const [k, v] of pts) expect(v).toBe(int8(k));
    expect(int8(127)).toBe(127);
    expect(int8(128)).toBe(-128);
  });

  it('Operators: increments, division, a short circuit', () => {
    const [inc, board] = section('Operators and Expressions').examples;
    let x = 5;
    const left = x++;
    const right = ++x * 2;
    expect([x, left + right]).toEqual([7, 19]);
    expect(said(inc)).toContain('x = 7, y = 19');
    const [a, b] = [7, 2];
    expect(idiv(a, b) * b + (a % b)).toBe(7);
    expect(a / b).toBe(3.5);
    let x2 = 10;
    const y = x2 > 5 || ++x2 > 0 ? 1 : 0;
    expect([x2, y]).toEqual([10, 1]);
    expect(said(board)).toContain('x = 10, y = 1');
  });

  it('Control Structures: counting passes, a switch that falls through', () => {
    const [passes, sw] = section('Control Structures').examples;
    let n1 = 0;
    for (let i = 0; i < 12; i += 3) n1 += 1;
    let n2 = 0;
    for (let i = 0; i <= 12; i += 3) n2 += 1;
    expect([n1, n2]).toEqual([4, 5]);
    expect(said(passes)).toContain('4; 5');
    let s = 0;
    const n = 2;
    /* eslint-disable no-fallthrough */
    switch (n) {
      case 1:
        s += 1;
      case 2:
        s += 2;
      case 3:
        s += 3;
        break;
      default:
        s += 10;
    }
    /* eslint-enable no-fallthrough */
    expect(s).toBe(5);
    expect(said(sw)).toContain('s = 5');
  });

  it('Functions: naive Fibonacci, a skipping recursion, the call counts', () => {
    const s = section('Functions');
    const [fib, board] = s.examples;
    let calls = 0;
    const naive = (k) => {
      calls += 1;
      return k < 2 ? k : naive(k - 1) + naive(k - 2);
    };
    expect(naive(5)).toBe(5);
    expect(calls).toBe(15);
    expect(naiveCalls(5)).toBe(15);
    expect(said(fib)).toContain('= 15$');
    let fCalls = 0;
    const f = (k) => {
      fCalls += 1;
      return k <= 1 ? 1 : k * f(k - 2);
    };
    expect(f(7)).toBe(105);
    expect(fCalls).toBe(4);
    expect(said(board)).toContain('105; 4 calls');
    const pts = figure(s).series[0].points;
    for (const [k, c] of pts) {
      calls = 0;
      naive(k);
      expect(c).toBe(calls);
    }
    expect(naiveCalls(15)).toBe(1973);
  });

  it('Arrays and Strings: row-major, column-major, a string', () => {
    const [row, board] = section('Arrays and Strings').examples;
    expect(1000 + (2 * 4 + 1) * 4).toBe(1036);
    expect(said(row)).toContain('= 1036$');
    const offset = (4 - 1) * 5 + (3 - 1);
    expect(offset).toBe(17);
    expect(said(board)).toContain(`= ${500 + offset * 8}$`);
    expect('REE 2026'.length + 1).toBe(9);
    expect(said(board)).toContain('9 bytes');
  });

  it('Pointers: stepping ints and doubles, a dereference, a character', () => {
    const [ints, board] = section('Pointers').examples;
    expect(said(ints)).toContain(`= ${2000 + 3 * 4}$`);
    expect(said(board)).toContain(`= ${3000 + 5 * 8}$`);
    expect('board'[2]).toBe('a');
    expect(said(board)).toContain("3040; 15; 'a'");
  });

  it('OOP: dynamic dispatch, constructors in a chain, the hierarchy', () => {
    const s = section('Object-Oriented Programming');
    const [dispatch, chain] = s.examples;
    const printed = [];
    class Animal {
      constructor() {
        printed.push('A');
      }
      speak() {
        return 'animal';
      }
    }
    class Dog extends Animal {
      constructor() {
        super();
        printed.push('D');
      }
      speak() {
        return 'dog';
      }
    }
    class Puppy extends Dog {
      constructor() {
        super();
        printed.push('P');
      }
    }
    const a = new Dog();
    expect(a.speak()).toBe('dog');
    expect(said(dispatch)).toContain("Dog's speak()");
    printed.length = 0;
    new Puppy();
    expect(printed.join(' ')).toBe('A D P');
    expect(said(chain)).toContain('A D P');
    expect(figure(s, 'blocks').links.every(([, to]) => to === 'animal')).toBe(true);
  });

  it('Exceptions: with and without an error, a return inside catch', () => {
    const [basic, board] = section('Exception Handling').examples;
    const run = (fail) => {
      const out = [];
      try {
        out.push('A');
        if (fail) throw new Error('divide by zero');
      } catch {
        out.push('B');
      } finally {
        out.push('C');
      }
      return out.join(' ');
    };
    expect([run(true), run(false)]).toEqual(['A B C', 'A C']);
    expect(said(basic)).toContain('A B C; A C');
    const out = [];
    const method = () => {
      try {
        out.push('A');
        throw new Error('runtime');
      } catch {
        out.push('C');
        return;
      } finally {
        out.push('D');
      }
    };
    method();
    expect(out.join(' ')).toBe('A C D');
    expect(said(board)).toContain('A C D');
  });

  it('File Handling: a record offset, a data logger, fseek', () => {
    const [rec, logger] = section('File Handling').examples;
    expect(said(rec)).toContain(`= ${24 * 100}$`);
    const secs = (2 * 1048576 * 8) / 9600;
    expect(said(logger)).toContain(`= ${Math.round(secs)}$ s, about ${(secs / 60).toFixed(1)} minutes`);
    expect((30 * 64) / 64 + 1).toBe(31);
  });

  it('GUI: a listener added twice, the MVC loop', () => {
    const s = section('Graphical User Interfaces');
    const [, twice] = s.examples;
    let counter = 0;
    const listeners = [];
    const onClick = () => {
      counter += 1;
    };
    listeners.push(onClick, onClick);
    for (let k = 0; k < 3; k += 1) listeners.forEach((fn) => fn());
    expect(counter).toBe(6);
    expect(said(twice)).toContain('= 6$');
    const mvc = figure(s, 'blocks').links.map(([a, b]) => `${a}>${b}`);
    expect(mvc).toEqual(['ctrl>model', 'model>view', 'view>ctrl']);
  });

  it('int32 wraps like Java', () => {
    expect(int32(2147483647 + 1)).toBe(-2147483648);
  });
});
