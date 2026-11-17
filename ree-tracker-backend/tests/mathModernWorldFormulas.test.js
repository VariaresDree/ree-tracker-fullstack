import { describe, it, expect } from 'vitest';

// Math in the Modern World formula cards, checked with numbers (Library
// round, 2026-11-17): Fibonacci identities by listing the sequence, logic by
// full truth tables, check digits on real codes and every single-digit error,
// loans by simulating each payment, apportionment by running each method, and
// graph counts by enumeration and the matrix-tree theorem.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, log, exp, floor, round, ceil, PI } = Math;
const range = (n) => Array.from({ length: n }, (_, i) => i);
const sum = (a) => a.reduce((s, x) => s + x, 0);
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
const phi = (1 + sqrt(5)) / 2; const psi = (1 - sqrt(5)) / 2;
const fib = (n) => { let [a, b] = [1, 1]; for (let i = 2; i < n; i += 1) [a, b] = [b, a + b]; return n <= 2 ? 1 : b; };

describe('Patterns in nature', () => {
    it('Fibonacci, Binet, the ratio, and the sum and square-sum identities', () => {
        expect(fib(10)).toBe(55); expect(fib(20)).toBe(6765);
        for (let n = 1; n <= 40; n += 1) {
            expect(round((phi ** n - psi ** n) / sqrt(5))).toBe(fib(n));
            expect(round(phi ** n / sqrt(5))).toBe(fib(n));
        }
        close(fib(31) / fib(30), phi, 1e-12);
        for (const n of [1, 5, 12]) {
            expect(sum(range(n).map((i) => fib(i + 1)))).toBe(fib(n + 2) - 1);
            expect(sum(range(n).map((i) => fib(i + 1) ** 2))).toBe(fib(n) * fib(n + 1));
        }
    });

    it('the golden spiral grows by φ every quarter turn', () => {
        const b = log(phi) / (PI / 2); const rr = (t) => 2 * exp(b * t);
        close(rr(1.3 + PI / 2) / rr(1.3), phi);
        close(rr(2 * PI) / rr(0), phi ** 4);
    });
});

describe('Language, reasoning', () => {
    it('order of operations as the card states it, and the real-number properties', () => {
        expect(24 / 4 * 2).toBe(12); // left to right, not 24 / 8
        expect(-(3 ** 2)).toBe(-9);
        expect(2 ** 3 ** 2).toBe(512); // a^(b^c)
        const [a, b, c] = [3, -7, 2.5];
        close(a * (b + c), a * b + a * c); expect(a + b).toBe(b + a); close((a * b) * c, a * (b * c));
        expect(10 - (4 - 1)).not.toBe((10 - 4) - 1); expect(12 / (6 / 2)).not.toBe((12 / 6) / 2);
        const inInterval = (x) => x >= 2 && x < 5; // [2, 5)
        expect([2, 4.99, 5].map(inInterval)).toEqual([true, true, false]);
    });

    it('pigeonhole, induction on a sum, and constant second differences', () => {
        // Any 13 months: some month repeats; ⌈N/k⌉ is reached and not exceeded at best
        const N = 25; const k = 12; const best = range(N).map((i) => i % k);
        expect(Math.max(...range(k).map((m) => best.filter((x) => x === m).length))).toBe(ceil(N / k));
        // P(n): 1 + 2 + … + n = n(n + 1)/2; base case and step
        const P = (n) => sum(range(n).map((i) => i + 1)) === (n * (n + 1)) / 2;
        expect(P(1)).toBe(true);
        for (let kk = 1; kk < 50; kk += 1) expect((kk * (kk + 1)) / 2 + (kk + 1)).toBe(((kk + 1) * (kk + 2)) / 2);
        // 3, 8, 15, 24, 35: second differences 2 → A = 1; fit gives n² + 2n
        const seq = [3, 8, 15, 24, 35];
        const d1 = seq.slice(1).map((x, i) => x - seq[i]); const d2 = d1.slice(1).map((x, i) => x - d1[i]);
        expect(new Set(d2).size).toBe(1);
        const A = d2[0] / 2; const B = d1[0] - 3 * A; const C = seq[0] - A - B;
        expect(seq.every((x, i) => x === A * (i + 1) ** 2 + B * (i + 1) + C)).toBe(true);
    });
});

describe('Sets and logic', () => {
    const tf = [true, false];
    const rows = (n) => (n === 0 ? [[]] : rows(n - 1).flatMap((r) => tf.map((x) => [...r, x])));
    const imp = (p, q) => !p || q;
    const equiv = (f, g, n = 2) => rows(n).every((r) => f(...r) === g(...r));

    it("De Morgan for sets, the Cartesian product, truth table rows", () => {
        const U = range(12); const A = new Set([1, 2, 3, 5, 8]); const B = new Set([2, 4, 6, 8, 10]);
        const comp = (S) => new Set(U.filter((x) => !S.has(x)));
        const union = (S, T) => new Set([...S, ...T]); const inter = (S, T) => new Set([...S].filter((x) => T.has(x)));
        expect([...comp(union(A, B))].sort()).toEqual([...inter(comp(A), comp(B))].sort());
        expect([...comp(inter(A, B))].sort()).toEqual([...union(comp(A), comp(B))].sort());
        expect([...A].flatMap((a) => [...B].map((b) => [a, b])).length).toBe(A.size * B.size);
        expect(rows(3).length).toBe(2 ** 3);
    });

    it('conditional, contrapositive, converse, inverse, disjunction, De Morgan, biconditional', () => {
        expect(equiv((p, q) => imp(p, q), (p, q) => imp(!q, !p))).toBe(true);
        expect(equiv((p, q) => imp(q, p), (p, q) => imp(!p, !q))).toBe(true);
        expect(equiv((p, q) => imp(p, q), (p, q) => imp(q, p))).toBe(false);
        expect(equiv((p, q) => imp(p, q), (p, q) => !p || q)).toBe(true);
        expect(equiv((p, q) => !imp(p, q), (p, q) => p && !q)).toBe(true);
        expect(equiv((p, q) => p === q, (p, q) => imp(p, q) && imp(q, p))).toBe(true);
        expect(equiv((p, q) => !(p && q), (p, q) => !p || !q)).toBe(true);
        expect(equiv((p, q) => !(p || q), (p, q) => !p && !q)).toBe(true);
        expect(rows(2).filter(([p, q]) => !imp(p, q))).toEqual([[true, false]]);
    });

    it('modus ponens, modus tollens and syllogism are tautologies; affirming the consequent is not', () => {
        const taut = (f, n) => rows(n).every((r) => f(...r));
        expect(taut((p, q) => imp(imp(p, q) && p, q), 2)).toBe(true);
        expect(taut((p, q) => imp(imp(p, q) && !q, !p), 2)).toBe(true);
        expect(taut((p, q, r) => imp(imp(p, q) && imp(q, r), imp(p, r)), 3)).toBe(true);
        expect(taut((p, q) => imp(imp(p, q) && q, p), 2)).toBe(false);
    });
});

describe('Data management', () => {
    it('percentile rank, midrange, range rule of thumb', () => {
        const data = [55, 60, 62, 70, 70, 75, 80, 85, 90, 95];
        const pr = (x) => ((data.filter((d) => d < x).length + 0.5 * data.filter((d) => d === x).length) / data.length) * 100;
        expect(pr(70)).toBe(40); expect(pr(95)).toBe(95);
        expect((Math.max(...data) + Math.min(...data)) / 2).toBe(75);
        const m = sum(data) / data.length; const s = sqrt(sum(data.map((x) => (x - m) ** 2)) / (data.length - 1));
        const rule = (95 - 55) / 4;
        expect(Math.abs(rule - s) / s).toBeLessThan(0.25);
    });
});

describe('Geometric designs', () => {
    it('only triangles, squares and hexagons tile alone; semiregular vertices sum to 360°', () => {
        const angle = (n) => ((n - 2) * 180) / n;
        expect(range(18).map((i) => i + 3).filter((n) => Number.isInteger(360 / angle(n)))).toEqual([3, 4, 6]);
        for (const cfg of [[3, 6, 3, 6], [4, 8, 8], [3, 12, 12], [4, 6, 12], [3, 3, 3, 4, 4]]) close(sum(cfg.map(angle)), 360);
    });

    it('a regular n-gon has n rotations and n reflections mapping it to itself', () => {
        const n = 6; const pts = range(n).map((k) => [Math.cos((2 * PI * k) / n), Math.sin((2 * PI * k) / n)]);
        const key = (p) => p.map((x) => x.toFixed(6)).join(',');
        const same = (q) => new Set(q.map(key)).size === n && q.every((p) => pts.some((s) => key(s) === key(p)));
        const rot = (t) => pts.map(([x, y]) => [x * Math.cos(t) - y * Math.sin(t), x * Math.sin(t) + y * Math.cos(t)]).map(([x, y]) => [x + 0, y + 0]);
        const refl = (t) => pts.map(([x, y]) => [x * Math.cos(2 * t) + y * Math.sin(2 * t), x * Math.sin(2 * t) - y * Math.cos(2 * t)]);
        const norm = (q) => q.map(([x, y]) => [Math.abs(x) < 1e-9 ? 0 : x, Math.abs(y) < 1e-9 ? 0 : y]);
        expect(range(360).filter((d) => same(norm(rot((d * PI) / 180)))).length).toBe(n);
        expect(range(360).filter((d) => same(norm(refl(((d / 2) * PI) / 180)))).length).toBe(n);
    });
});

describe('Codes', () => {
    const isbn10ok = (s) => sum([...s].map((c, i) => (10 - i) * (c === 'X' ? 10 : Number(c)))) % 11 === 0;
    const isbn13ok = (s) => sum([...s].map((c, i) => Number(c) * (i % 2 ? 3 : 1))) % 10 === 0;
    const upcOk = (s) => sum([...s].map((c, i) => Number(c) * (i % 2 ? 1 : 3))) % 10 === 0;

    it('real ISBN-10, ISBN-13 and UPC-A codes check out', () => {
        expect(isbn10ok('0306406152')).toBe(true);
        expect(isbn10ok('080442957X')).toBe(true);
        expect(isbn13ok('9780306406157')).toBe(true);
        expect(upcOk('036000291452')).toBe(true);
        const first11 = '03600029145';
        const check = (10 - (sum([...first11].map((c, i) => Number(c) * (i % 2 ? 1 : 3))) % 10)) % 10;
        expect(check).toBe(2);
    });

    it('ISBN-10 catches every single wrong digit and every neighbour swap; ISBN-13 misses some swaps', () => {
        const code = '0306406152';
        for (let i = 0; i < 9; i += 1) for (let d = 0; d < 10; d += 1) {
            if (String(d) !== code[i]) expect(isbn10ok(code.slice(0, i) + d + code.slice(i + 1))).toBe(false);
        }
        for (let i = 0; i < 9; i += 1) if (code[i] !== code[i + 1]) {
            expect(isbn10ok(code.slice(0, i) + code[i + 1] + code[i] + code.slice(i + 2))).toBe(false);
        }
        expect(isbn13ok('9780306406157')).toBe(true);
        expect(isbn13ok('9780306401657')).toBe(true); // 6 and 1 swapped (differ by 5): not caught
    });

    it('modular arithmetic; Caesar and affine ciphers decode what they encode', () => {
        expect(((100 % 7) + 7) % 7).toBe(2); // Monday + 2 = Wednesday
        expect((17 * 23) % 5).toBe(((17 % 5) * (23 % 5)) % 5);
        const enc = (P, a, b) => (a * P + b) % 26; const dec = (C, ainv, b) => (((ainv * (C - b)) % 26) + 26) % 26;
        expect((3 * 9) % 26).toBe(1);
        for (let P = 0; P < 26; P += 1) {
            expect(dec(enc(P, 3, 7), 9, 7)).toBe(P);
            expect((((P + 3) % 26) - 3 + 26) % 26).toBe(P);
        }
        const gcd = (x, y) => (y ? gcd(y, x % y) : x);
        // a must be odd and not 13: exactly the units mod 26
        expect(range(26).filter((a) => gcd(a, 26) === 1)).toEqual(range(26).filter((a) => a % 2 === 1 && a !== 13));
        // a = 13 is not one-to-one
        expect(new Set(range(26).map((P) => enc(P, 13, 0))).size).toBeLessThan(26);
    });

    it('parity catches one flipped bit, not two; a d = 3 code corrects one error', () => {
        const bits = [1, 0, 1, 1, 0, 1, 0]; const p = sum(bits) % 2; const word = [...bits, p];
        for (let i = 0; i < word.length; i += 1) { const w = [...word]; w[i] ^= 1; expect(sum(w) % 2).toBe(1); }
        const two = [...word]; two[0] ^= 1; two[3] ^= 1; expect(sum(two) % 2).toBe(0);
        const codewords = [[0, 0, 0], [1, 1, 1]];
        const dist = (a, b) => a.filter((x, i) => x !== b[i]).length;
        expect(dist(...codewords)).toBe(3);
        for (const cw of codewords) for (let i = 0; i < 3; i += 1) {
            const rcv = [...cw]; rcv[i] ^= 1;
            const nearest = codewords.reduce((best, c) => (dist(c, rcv) < dist(best, rcv) ? c : best));
            expect(nearest).toEqual(cw);
        }
        expect(floor((3 - 1) / 2)).toBe(1);
    });
});

describe('Linear programming', () => {
    it('slack is zero on the binding constraints at the optimum; the isoprofit line has slope −c₁/c₂', () => {
        // max 3x + 5y: x ≤ 4, 2y ≤ 12, 3x + 2y ≤ 18 → (2, 6)
        const [x, y] = [2, 6];
        const slack = [4 - x, 12 - 2 * y, 18 - 3 * x - 2 * y];
        expect(slack).toEqual([2, 0, 0]);
        // Along the isoprofit line, z stays fixed
        const z = 3 * x + 5 * y; const slope = -3 / 5;
        close(3 * (x + 1) + 5 * (y + slope), z);
    });
});

describe('Mathematics of finance', () => {
    it('simple discount, effective rate, present value, doubling time', () => {
        const F = 50000; const d = 0.08; const t = 0.5;
        expect(F * d * t).toBe(2000); expect(F * (1 - d * t)).toBe(48000);
        close((1 + 0.12 / 12) ** 12 - 1, 0.126825, 1e-6);
        close(10000 * 1.05 ** -10 * 1.05 ** 10, 10000);
        close(log(2) / log(1.06), 11.896, 1e-4);
        expect(Math.abs(72 / 6 - log(2) / log(1.06))).toBeLessThan(0.2);
    });

    it('annuities equal the sum of their payments, moved in time', () => {
        const A = 1000; const i = 0.01; const n = 24;
        close(A * (((1 + i) ** n - 1) / i), sum(range(n).map((k) => A * (1 + i) ** (n - 1 - k))));
        close(A * ((1 - (1 + i) ** -n) / i), sum(range(n).map((k) => A * (1 + i) ** -(k + 1))));
        close(A * (((1 + i) ** n - 1) / i) * (1 + i), sum(range(n).map((k) => A * (1 + i) ** (n - k))));
        // perpetuity: the annuity's limit
        close(A * ((1 - (1 + i) ** -5000) / i), A / i, 1e-9);
        expect(50000 / 0.05).toBe(1000000);
    });

    it('an amortized loan, simulated payment by payment, ends at zero and matches the balance formula', () => {
        const P = 500000; const i = 0.08 / 12; const n = 60;
        const A = (P * i) / (1 - (1 + i) ** -n);
        let bal = P; const balances = [];
        for (let k = 1; k <= n; k += 1) { bal = bal * (1 + i) - A; balances.push(bal); }
        close(bal, 0, 1e-6);
        for (const k of [1, 12, 30, 59]) close(balances[k - 1], A * ((1 - (1 + i) ** -(n - k)) / i), 1e-9);
        // the interest part shrinks every payment…
        const interest = [P, ...balances.slice(0, -1)].map((b) => b * i);
        expect(interest.every((x, k) => k === 0 || x < interest[k - 1])).toBe(true);
        // …a 5-year loan starts only a third interest, a 30-year loan over 90%
        expect(P * i / A).toBeLessThan(0.5);
        const A30 = (P * i) / (1 - (1 + i) ** -360);
        expect(P * i / A30).toBeGreaterThan(0.9);
    });
});

describe('Apportionment and voting', () => {
    const pops = [5300, 2650, 1830, 220]; const seats = 20;
    const total = sum(pops); const d = total / seats; const q = pops.map((p) => p / d);
    const byDivisor = (rounder) => {
        let lo = d / 3; let hi = d * 3;
        for (let it = 0; it < 200; it += 1) {
            const mid = (lo + hi) / 2; const s = sum(pops.map((p) => rounder(p / mid)));
            if (s === seats) return pops.map((p) => rounder(p / mid));
            if (s > seats) lo = mid; else hi = mid;
        }
        return null;
    };
    const hh = (x) => (x >= sqrt(floor(x) * (floor(x) + 1)) ? floor(x) + 1 : floor(x));

    it('quotas add to the seats; Hamilton by largest remainders', () => {
        close(sum(q), seats);
        const lower = q.map(floor); let left = seats - sum(lower);
        const order = q.map((x, i) => [x - floor(x), i]).sort((a, b) => b[0] - a[0]);
        const ham = [...lower]; for (const [, i] of order) { if (left === 0) break; ham[i] += 1; left -= 1; }
        expect(sum(ham)).toBe(seats);
        ham.forEach((s, i) => { expect(s).toBeGreaterThanOrEqual(floor(q[i])); expect(s).toBeLessThanOrEqual(ceil(q[i])); });
    });

    it("Jefferson, Webster and Huntington-Hill each find a divisor that fills the seats; Jefferson favours the large state", () => {
        const jef = byDivisor(floor); const web = byDivisor(round); const h = byDivisor(hh);
        [jef, web, h].forEach((a) => expect(sum(a)).toBe(seats));
        expect(jef[0]).toBeGreaterThanOrEqual(web[0]);
        expect(hh(2.45)).toBe(3); expect(round(2.45)).toBe(2);
    });

    it('Borda, pairwise comparisons, majority', () => {
        // 3 candidates; ballots (count: ranking)
        const ballots = [[5, ['A', 'B', 'C']], [4, ['B', 'C', 'A']], [2, ['C', 'B', 'A']]];
        const pts = {}; for (const [k, rk] of ballots) rk.forEach((c, i) => { pts[c] = (pts[c] || 0) + k * (rk.length - 1 - i); });
        expect(pts).toEqual({ A: 10, B: 15, C: 8 });
        // A has the plurality (5 of 11) but not a majority (6), and loses the Borda count
        expect(floor(11 / 2) + 1).toBe(6);
        expect(fact(5) / (fact(2) * fact(3))).toBe(10);
    });
});

describe('Graph theory', () => {
    // Two triangles and a third sharing vertices 0 and 2: every degree even.
    const edges = [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 2], [0, 5], [5, 6], [6, 0]];
    const nV = 7;
    const deg = range(nV).map((v) => edges.filter((e) => e.includes(v)).length);

    it('the handshaking lemma; an Euler circuit exists when every degree is even (found by Hierholzer)', () => {
        expect(sum(deg)).toBe(2 * edges.length);
        expect(deg.filter((x) => x % 2).length % 2).toBe(0);
        expect(deg.every((x) => x % 2 === 0)).toBe(true);
        const adj = range(nV).map(() => []); edges.forEach(([a, b], i) => { adj[a].push([b, i]); adj[b].push([a, i]); });
        const used = new Set(); const stack = [0]; const path = [];
        while (stack.length) {
            const v = stack.at(-1); const nxt = adj[v].find(([, i]) => !used.has(i));
            if (nxt) { used.add(nxt[1]); stack.push(nxt[0]); } else path.push(stack.pop());
        }
        expect(path.length).toBe(edges.length + 1);
        expect(path[0]).toBe(path.at(-1));
    });

    it('complete graphs: edges, and Hamilton circuits counted by enumeration', () => {
        expect((7 * 6) / 2).toBe(21);
        const n = 5; const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
        const circuits = perms(range(n - 1).map((i) => i + 1)).map((p) => [0, ...p]);
        expect(circuits.length).toBe(fact(n - 1));
        const undirected = new Set(circuits.map((c) => { const r = [0, ...c.slice(1).reverse()]; return [c.join(), r.join()].sort()[0]; }));
        expect(undirected.size).toBe(fact(n - 1) / 2);
    });

    it("trees have n − 1 edges; V − E + F = 2 for the cube; K₅ breaks E ≤ 3V − 6; Cayley by the matrix-tree theorem", () => {
        const tree = [[0, 1], [0, 2], [2, 3], [2, 4]]; expect(tree.length).toBe(5 - 1);
        expect(8 - 12 + 6).toBe(2);
        expect(10).toBeGreaterThan(3 * 5 - 6);
        const det = (M) => { const m = M.map((r) => [...r]); const k = m.length; let dt = 1; for (let c = 0; c < k; c += 1) { let p = c; while (p < k && Math.abs(m[p][c]) < 1e-12) p += 1; if (p === k) return 0; if (p !== c) { [m[p], m[c]] = [m[c], m[p]]; dt = -dt; } dt *= m[c][c]; for (let r2 = c + 1; r2 < k; r2 += 1) { const f = m[r2][c] / m[c][c]; for (let j = c; j < k; j += 1) m[r2][j] -= f * m[c][j]; } } return dt; };
        for (const n of [3, 4, 5, 6]) {
            const L = range(n).map((i) => range(n).map((j) => (i === j ? n - 1 : -1)));
            const minor = L.slice(1).map((row) => row.slice(1));
            close(det(minor), n ** (n - 2), 1e-9);
        }
    });
});
