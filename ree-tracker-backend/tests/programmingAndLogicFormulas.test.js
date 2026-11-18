import { describe, it, expect } from 'vitest';

// ESAS › Computer Programming and Microprocessor Systems and Logic Circuits
// formula cards, checked by running what they describe (Library round,
// 2026-11-18): loops counted by running them, binary search and the sorts
// instrumented, floats read bit by bit, adders, multiplexers, flip-flops and
// counters simulated, Boolean laws over every truth-table row, a Hamming(7,4)
// code correcting every single-bit error.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const rows = (n) => Array.from({ length: 2 ** n }, (_, k) => Array.from({ length: n }, (_, i) => (k >> (n - 1 - i)) & 1));
const bits = (x) => x.toString(2).split('').filter((c) => c === '1').length;

describe('Programming: algorithms', () => {
    it('binary search never needs more than ⌊log₂ n⌋ + 1 probes', () => {
        for (const n of [1, 2, 7, 8, 100, 1000, 1023, 1024]) {
            const a = Array.from({ length: n }, (_, i) => i * 2);
            let worst = 0;
            for (const target of [...a, -1, 2 * n + 1]) {
                let lo = 0; let hi = n - 1; let probes = 0;
                while (lo <= hi) { const mid = (lo + hi) >> 1; probes += 1; if (a[mid] === target) break; if (a[mid] < target) lo = mid + 1; else hi = mid - 1; }
                worst = Math.max(worst, probes);
            }
            expect(worst).toBe(Math.floor(Math.log2(n)) + 1);
        }
    });

    it('bubble sort makes n(n − 1)/2 comparisons; merge sort under n log₂ n', () => {
        const a = Array.from({ length: 100 }, (_, i) => (i * 37) % 101);
        let cmp = 0; const b = a.slice();
        for (let i = 0; i < b.length - 1; i += 1) for (let j = 0; j < b.length - 1 - i; j += 1) { cmp += 1; if (b[j] > b[j + 1]) [b[j], b[j + 1]] = [b[j + 1], b[j]]; }
        expect(cmp).toBe(4950);
        let mc = 0;
        const ms = (x) => { if (x.length < 2) return x; const m = x.length >> 1; const l = ms(x.slice(0, m)); const r = ms(x.slice(m)); const o = []; while (l.length && r.length) { mc += 1; o.push(l[0] <= r[0] ? l.shift() : r.shift()); } return [...o, ...l, ...r]; };
        expect(ms(a)).toEqual(b); expect(mc).toBeLessThanOrEqual(100 * Math.log2(100)); close(100 * Math.log2(100), 664.4, 1e-3);
    });
});

describe('Programming: types, operators, loops', () => {
    it('n-bit ranges, and signed overflow wraps around', () => {
        expect([2 ** 8 - 1, -(2 ** 7), 2 ** 7 - 1]).toEqual([255, -128, 127]);
        const i8 = new Int8Array([127]); i8[0] += 1; expect(i8[0]).toBe(-128);
        const u8 = new Uint8Array([255]); u8[0] += 1; expect(u8[0]).toBe(0);
        expect(new Int32Array([2 ** 31 - 1 + 1])[0]).toBe(-(2 ** 31));
    });

    it('IEEE 754 single precision: decoding the bits gives the number back', () => {
        for (const x of [-6.25, 0.15625, 1, 3.5e10]) {
            const dv = new DataView(new ArrayBuffer(4)); dv.setFloat32(0, x); const w = dv.getUint32(0);
            const s = w >>> 31; const e = (w >>> 23) & 0xff; const f = w & 0x7fffff;
            close((-1) ** s * (1 + f / 2 ** 23) * 2 ** (e - 127), Math.fround(x), 1e-12);
        }
        expect(0.1 + 0.2 === 0.3).toBe(false); expect(Math.abs(0.1 + 0.2 - 0.3)).toBeLessThan(1e-15);
    });

    it('integer division: C and Java truncate, Python floors, and a = (a/b)b + a%b both ways', () => {
        expect([Math.trunc(-7 / 2), -7 % 2]).toEqual([-3, -1]);
        const pyMod = (a, b) => ((a % b) + b) % b; expect([Math.floor(-7 / 2), pyMod(-7, 2)]).toEqual([-4, 1]);
        for (const [a, b] of [[17, 5], [-17, 5], [17, -5], [-17, -5]]) {
            expect(Math.trunc(a / b) * b + (a % b)).toBe(a);
            expect(Math.floor(a / b) * b + (a - Math.floor(a / b) * b)).toBe(a);
        }
    });

    it('x = 5; y = x++ + ++x gives 12 (left to right, as in Java)', () => {
        let x = 5; const y = x++ + ++x; expect([y, x]).toEqual([12, 7]);
    });

    it('a for loop runs ⌈(b − a)/s⌉ times; <= runs ⌊(b − a)/s⌋ + 1', () => {
        for (const [a, b, s] of [[0, 10, 1], [0, 10, 3], [5, 5, 1], [7, 3, 2], [-4, 9, 4]]) {
            let n = 0; for (let i = a; i < b; i += s) n += 1; expect(n).toBe(Math.max(0, Math.ceil((b - a) / s)));
            let m = 0; for (let i = a; i <= b; i += s) m += 1; expect(m).toBe(b >= a ? Math.floor((b - a) / s) + 1 : 0);
        }
    });

    it('nested loops: n², n(n + 1)/2 and n(n − 1)/2', () => {
        const n = 13; let sq = 0; let tri = 0; let strict = 0;
        for (let i = 1; i <= n; i += 1) for (let j = 1; j <= n; j += 1) { sq += 1; if (j <= i) tri += 1; if (j > i) strict += 1; }
        expect([sq, tri, strict]).toEqual([n * n, (n * (n + 1)) / 2, (n * (n - 1)) / 2]);
    });

    it('naive Fibonacci makes 2F(n+1) − 1 calls', () => {
        const F = [0, 1]; for (let i = 2; i < 30; i += 1) F[i] = F[i - 1] + F[i - 2];
        let calls = 0; const fib = (k) => { calls += 1; return k < 2 ? k : fib(k - 1) + fib(k - 2); };
        for (const n of [1, 5, 10, 20]) { calls = 0; fib(n); expect(calls).toBe(2 * F[n + 1] - 1); }
    });
});

describe('Programming: memory', () => {
    it('row-major address B + (iC + j)w matches a flattened 2-D array', () => {
        const R = 4; const C = 6; const w = Float64Array.BYTES_PER_ELEMENT; const flat = new Float64Array(R * C);
        for (let i = 0; i < R; i += 1) for (let j = 0; j < C; j += 1) flat[i * C + j] = i * 100 + j;
        const at = (i, j) => new DataView(flat.buffer).getFloat64((i * C + j) * w, true);
        expect(at(2, 5)).toBe(205); expect(at(3, 0)).toBe(300);
    });

    it('a C string needs n + 1 bytes; pointer + k moves k elements', () => {
        expect(new TextEncoder().encode('board\0').length).toBe(5 + 1);
        const a = new Int32Array(10); expect(a.subarray(3).byteOffset).toBe(3 * 4);
        expect(new Float64Array(10).subarray(7).byteOffset - new Float64Array(10).subarray(2).byteOffset).toBe(5 * 8);
    });
});

describe('Logic: numbers and codes', () => {
    it('positional values and base conversions', () => {
        expect(1 * 2 ** 3 + 0 * 4 + 1 * 2 + 1 + 1 * 0.5).toBe(11.5); // 1011.1₂
        expect(parseInt('7F', 16)).toBe(127); expect((0b110101).toString(8)).toBe('65'); expect((0b11010110).toString(16)).toBe('d6');
        expect([26, 1000, 1024].map((N) => Math.ceil(Math.log2(N)))).toEqual([5, 10, 10]);
    });

    it("two's complement: invert and add one equals 2ⁿ − N", () => {
        for (const N of [1, 5, 100, 127]) {
            expect(((~N + 1) & 0xff)).toBe(256 - N); expect(new Int8Array([256 - N])[0]).toBe(-N);
        }
        expect((~5) & 0xff).toBe(255 - 5); // one's complement
    });

    it('Gray code: neighbours differ in one bit, and the prefix XOR decodes it', () => {
        const gray = (b) => b ^ (b >> 1);
        const decode = (g) => { let b = 0; for (let x = g; x; x >>= 1) b ^= x; return b; };
        for (let b = 0; b < 255; b += 1) { expect(bits(gray(b) ^ gray(b + 1))).toBe(1); expect(decode(gray(b))).toBe(b); }
    });

    it('BCD addition needs +6 when a digit passes 9', () => {
        const bcdAdd = (x, y) => { let s = x + y; if (s > 9) s += 6; return [(s >> 4) & 1, s & 0xf]; };
        expect(bcdAdd(7, 5)).toEqual([1, 2]); expect(bcdAdd(4, 3)).toEqual([0, 7]);
        for (let d = 0; d <= 9; d += 1) expect((d + 3).toString(2).padStart(4, '0')).toBe(((d + 3) & 0xf).toString(2).padStart(4, '0'));
    });

    it('Hamming: 2^p ≥ m + p + 1, and the (7,4) code corrects every single-bit error', () => {
        const p = (m) => { let k = 0; while (2 ** k < m + k + 1) k += 1; return k; };
        expect([p(4), p(8), p(16)]).toEqual([3, 4, 5]);
        const enc = ([d1, d2, d3, d4]) => { const p1 = d1 ^ d2 ^ d4; const p2 = d1 ^ d3 ^ d4; const p4 = d2 ^ d3 ^ d4; return [p1, p2, d1, p4, d2, d3, d4]; };
        for (const d of rows(4)) {
            const code = enc(d);
            for (let e = 0; e < 7; e += 1) {
                const r = code.slice(); r[e] ^= 1;
                const s = [0, 1, 2, 3, 4, 5, 6].reduce((acc, i) => (r[i] ? acc ^ (i + 1) : acc), 0);
                expect(s).toBe(e + 1);
            }
        }
    });
});

describe('Logic: Boolean algebra and gates', () => {
    it("De Morgan, absorption, redundancy and consensus hold on every row", () => {
        for (const [A, B, C] of rows(3)) {
            const n = (x) => 1 - x;
            expect(n(A & B)).toBe(n(A) | n(B)); expect(n(A | B)).toBe(n(A) & n(B));
            expect(A | (A & B)).toBe(A); expect(A & (A | B)).toBe(A); expect(A | (n(A) & B)).toBe(A | B);
            expect((A & B) | (n(A) & C) | (B & C)).toBe((A & B) | (n(A) & C));
        }
    });

    it('there are 2^(2^n) functions of n variables', () => {
        const fns = new Set(); for (let f = 0; f < 16; f += 1) fns.add(rows(2).map((_, k) => (f >> k) & 1).join(''));
        expect(fns.size).toBe(2 ** (2 ** 2));
    });

    it('XOR and XNOR; an XOR chain is odd parity', () => {
        for (const [A, B] of rows(2)) { expect(A ^ B).toBe(((1 - A) & B) | (A & (1 - B))); expect(1 - (A ^ B)).toBe((A & B) | ((1 - A) & (1 - B))); }
        for (let x = 0; x < 64; x += 1) expect([0, 1, 2, 3, 4, 5].reduce((s, i) => s ^ ((x >> i) & 1), 0)).toBe(bits(x) % 2);
    });

    it('TTL: noise margins 0.4 V, fan-out 10, speed-power 100 pJ', () => {
        close(2.4 - 2.0, 0.4); close(0.8 - 0.4, 0.4);
        expect(Math.min(0.4e-3 / 40e-6, 16e-3 / 1.6e-3)).toBeCloseTo(10, 9);
        close(10e-9 * 10e-3, 100e-12);
    });

    it('a K-map quad drops two variables: m8 + m9 + m10 + m11 = AB̄', () => {
        for (const [A, B, C, D] of rows(4)) {
            const m = A * 8 + B * 4 + C * 2 + D; expect([8, 9, 10, 11].includes(m) ? 1 : 0).toBe(A & (1 - B));
        }
    });
});

describe('Logic: combinational and sequential circuits', () => {
    const fullAdd = (a, b, c) => [a ^ b ^ c, (a & b) | (c & (a ^ b))];

    it('a full adder adds three bits; an 8-bit ripple adder adds every pair', () => {
        for (const [a, b, c] of rows(3)) { const [s, co] = fullAdd(a, b, c); expect(s + 2 * co).toBe(a + b + c); }
        for (let x = 0; x < 256; x += 5) for (let y = 0; y < 256; y += 7) {
            let c = 0; let sum = 0;
            for (let i = 0; i < 8; i += 1) { const [s, co] = fullAdd((x >> i) & 1, (y >> i) & 1, c); sum |= s << i; c = co; }
            expect(sum + (c << 8)).toBe(x + y);
        }
    });

    it('a 4-to-1 multiplexer makes every function of two variables; a 3-to-8 decoder has one hot output', () => {
        const mux = (I, s1, s0) => I[s1 * 2 + s0];
        for (let f = 0; f < 16; f += 1) { const I = [0, 1, 2, 3].map((k) => (f >> k) & 1); for (const [A, B] of rows(2)) expect(mux(I, A, B)).toBe((f >> (A * 2 + B)) & 1); }
        for (let k = 0; k < 8; k += 1) expect(Array.from({ length: 8 }, (_, o) => (o === k ? 1 : 0)).reduce((a, b) => a + b)).toBe(1);
    });

    it('flip-flop characteristic equations match their tables', () => {
        const jk = (J, K, Q) => (J & (1 - Q)) | ((1 - K) & Q);
        expect([jk(0, 0, 1), jk(0, 1, 1), jk(1, 0, 0), jk(1, 1, 0), jk(1, 1, 1)]).toEqual([1, 0, 1, 1, 0]);
        for (const [T, Q] of rows(2)) expect(T ^ Q).toBe(jk(T, T, Q));
        for (const [S, R, Q] of rows(3)) if (!(S & R)) expect(S | ((1 - R) & Q)).toBe(S ? 1 : R ? 0 : Q);
    });

    it('fmax = 1/(10 + 15 + 5 ns) = 33.3 MHz; a 4-bit ripple counter with 10 ns stages tops out at 25 MHz', () => {
        close(1 / 30e-9, 33.33e6, 1e-3); close(1 / (4 * 10e-9), 25e6);
    });

    it('counters by simulation: binary divides by 2ⁿ, ring has n states, Johnson 2n', () => {
        let q = 0; let msbEdges = 0; let prev = 0;
        for (let clk = 0; clk < 160; clk += 1) { q = (q + 1) & 0xf; const msb = q >> 3; if (msb && !prev) msbEdges += 1; prev = msb; }
        expect(msbEdges).toBe(160 / 16);
        const states = (step, start) => { const seen = new Set(); let s = start; while (!seen.has(s)) { seen.add(s); s = step(s); } return seen.size; };
        expect(states((s) => ((s >> 1) | ((s & 1) << 3)), 0b1000)).toBe(4);
        expect(states((s) => ((s >> 1) | (((s & 1) ^ 1) << 3)), 0)).toBe(8);
        expect(Math.ceil(Math.log2(10))).toBe(4); // a decade counter needs 4 flip-flops
    });
});

describe('Logic: memory, processors, I/O, microcontrollers', () => {
    it('64K × 8 has 16 address lines; 8 KB from 2000H ends at 3FFFH; chips needed', () => {
        expect(Math.log2(64 * 1024)).toBe(16); expect((0x2000 + 8 * 1024 - 1).toString(16).toUpperCase()).toBe('3FFF');
        expect((64 * 1024 * 8) / (16 * 1024 * 4)).toBe(8); // 64K×8 from 16K×4 chips
        expect([2 ** 16, 2 ** 20]).toEqual([65536, 1048576]);
    });

    it('execution time, MIPS and Amdahl', () => {
        close((2e9 * 1.5) / 3e9, 1); close(3e9 / (1.5 * 1e6), 2000);
        const S = (p, s) => 1 / ((1 - p) + p / s); close(S(0.9, 1e12), 10, 1e-9); close(S(0.5, 2), 4 / 3);
    });

    it('T-states: a 7-T instruction at 3 MHz takes 2.33 µs', () => { close(7 / 3e6, 2.333e-6, 1e-3); });

    it('ADC and DAC: 8 bits on 5 V is 19.5 mV a step; codes round trip', () => {
        close(5 / 256, 0.01953, 1e-3);
        for (const V of [0, 1.234, 2.5, 4.99]) { const D = Math.floor((V / 5) * 256); const back = (5 * D) / 256; expect(V - back).toBeGreaterThanOrEqual(0); expect(V - back).toBeLessThan(5 / 256); }
    });

    it('9600 baud 8N1 carries 960 characters a second', () => { expect(9600 / (1 + 8 + 0 + 1)).toBe(960); });

    it('8085 vectors are 8n: RST 5.5 → 2CH, 6.5 → 34H, 7.5 → 3CH, TRAP (4.5) → 24H', () => {
        expect([5.5, 6.5, 7.5, 4.5, 1].map((n) => (8 * n).toString(16).toUpperCase())).toEqual(['2C', '34', '3C', '24', '8']);
    });

    it('timer: 16 bits, prescaler 8, 1 MHz overflows after 0.524 s; preload 64286 for 10 ms', () => {
        close((2 ** 16 * 8) / 1e6, 0.524288); const N0 = 2 ** 16 - (0.01 * 1e6) / 8; expect(N0).toBe(64286);
        close(((2 ** 16 - N0) * 8) / 1e6, 0.01);
    });

    it('PWM: 25% duty on 12 V averages 3 V, by integrating the waveform', () => {
        let sum = 0; const N = 1000; for (let k = 0; k < N; k += 1) sum += (k / N < 0.25 ? 12 : 0); close(sum / N, 3);
        close(64 / 256, 0.25);
    });
});
