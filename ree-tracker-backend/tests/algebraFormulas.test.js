import { describe, it, expect } from 'vitest';

// Algebra's formula cards, checked with numbers (Library round, 2026-11-16):
// each formula on a card, live or new, against a direct computation. A wrong
// key, sign or condition on a card fails here before it reaches the review queue.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const range = (n, from = 1) => Array.from({ length: n }, (_, i) => i + from);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
const C = (n, k) => fact(n) / (fact(k) * fact(n - k));
const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));

describe('Algebraic Expressions', () => {
    it('logarithms: definition, 1 and the base, inverses, ln and log', () => {
        close(Math.log2(32), 5);
        close(Math.log(1) / Math.log(7), 0);
        close(Math.log(7) / Math.log(7), 1);
        close(Math.exp(Math.log(5)), 5);
        close(Math.log(100), 2.302585093 * Math.log10(100), 1e-9);
        close(Math.log(100), 4.605, 1e-3);
    });

    it('a binomial denominator is rationalized by its conjugate', () => {
        for (const [a, b] of [[2, 3], [5, 7], [10, 1]]) close(1 / (Math.sqrt(a) + Math.sqrt(b)), (Math.sqrt(a) - Math.sqrt(b)) / (a - b));
    });

    it('partial fractions by the cover-up rule', () => {
        const [p, q, a, b] = [3, -4, 2, -5];
        const A = (p * a + q) / (a - b);
        const B = (p * b + q) / (b - a);
        for (const x of [0, 1.5, 7, -3]) close((p * x + q) / ((x - a) * (x - b)), A / (x - a) + B / (x - b));
    });

    it('special products, including the sum and difference of cubes', () => {
        for (const [a, b] of [[2, 3], [-1.5, 4], [7, -2]]) {
            close(a ** 3 + b ** 3, (a + b) * (a * a - a * b + b * b));
            close(a ** 3 - b ** 3, (a - b) * (a * a + a * b + b * b));
            close((a - b) ** 3, a ** 3 - 3 * a * a * b + 3 * a * b * b - b ** 3);
        }
    });
});

describe('Functions', () => {
    // 2x² − 7x + 3 = 0 has roots 3 and 1/2.
    const [a, b, c] = [2, -7, 3];
    const [r1, r2] = [3, 0.5];

    it('roots, Vieta, and the sums built on them', () => {
        const d = Math.sqrt(b * b - 4 * a * c);
        close((-b + d) / (2 * a), r1);
        close((-b - d) / (2 * a), r2);
        close(r1 + r2, -b / a);
        close(r1 * r2, c / a);
        close(Math.abs(r1 - r2), Math.sqrt(b * b - 4 * a * c) / Math.abs(a));
        close(1 / r1 + 1 / r2, -b / c);
        close(r1 ** 2 + r2 ** 2, (-b / a) ** 2 - 2 * (c / a));
        close(r1 ** 3 + r2 ** 3, -(b * (b * b - 3 * a * c)) / a ** 3);
    });

    it('the vertex, and the quadratic built from its roots', () => {
        const f = (x) => a * x * x + b * x + c;
        const xv = -b / (2 * a);
        close(f(xv), c - (b * b) / (4 * a));
        for (const x of [xv - 1, xv + 1]) expect(f(x)).toBeGreaterThan(f(xv));
        for (const x of [r1, r2]) close(x * x - (r1 + r2) * x + r1 * r2, 0);
    });

    it("Vieta for a cubic, and for any degree: (x−1)(x−2)(x−3)", () => {
        const [ca, cb, cc, cd] = [1, -6, 11, -6];
        close(1 + 2 + 3, -cb / ca);
        close(1 * 2 + 2 * 3 + 1 * 3, cc / ca);
        close(1 * 2 * 3, -cd / ca);
        close(1 * 2 * 3, (-1) ** 3 * (cd / ca));
    });

    it('remainder by (x − a)²: f(a) + f′(a)(x − a)', () => {
        // f(x) = x³ − 2x + 5, a = 2: f(x) = (x−2)²(x+4) + 10x − 11.
        const [f2, df2] = [8 - 4 + 5, 3 * 4 - 2];
        for (const x of [0, 1, 5]) close(x ** 3 - 2 * x + 5 - (x - 2) ** 2 * (x + 4), f2 + df2 * (x - 2));
    });

    it('Cardano gives a real root of a depressed cubic', () => {
        const [p, q] = [6, -20]; // x³ + 6x − 20 = 0 has x = 2
        const s = Math.sqrt((q / 2) ** 2 + (p / 3) ** 3);
        close(Math.cbrt(-q / 2 + s) + Math.cbrt(-q / 2 - s), 2, 1e-9);
    });
});

describe('System of Equations', () => {
    it("the 3×3 determinant by its first row, and Cramer's rule", () => {
        const [a, b, c, d, e, f, g, h, i] = [2, -1, 3, 0, 4, 1, 5, 2, -2];
        const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
        // The same by the rule of Sarrus.
        close(det, a * e * i + b * f * g + c * d * h - c * e * g - b * d * i - a * f * h);
        // 2x + 3y = 8, x − y = −1: x = 1, y = 2.
        const [a1, b1, c1, a2, b2, c2] = [2, 3, 8, 1, -1, -1];
        expect(a1 * b2 - a2 * b1).not.toBe(0);
        close((c1 * b2 - c2 * b1) / (a1 * b2 - a2 * b1), 1);
        close((a1 * c2 - a2 * c1) / (a1 * b2 - a2 * b1), 2);
    });
});

describe('Binomial Theorem', () => {
    it('coefficients: symmetry, Pascal, their sum and alternating sum', () => {
        for (const n of [5, 8]) {
            expect(sum(range(n + 1, 0).map((k) => C(n, k)))).toBe(2 ** n);
            expect(sum(range(n + 1, 0).map((k) => (-1) ** k * C(n, k)))).toBe(0);
            for (const k of range(n - 1)) {
                expect(C(n, k)).toBe(C(n, n - k));
                expect(C(n, k)).toBe(C(n - 1, k - 1) + C(n - 1, k));
            }
        }
    });

    it('the general term, the power of x in a term, the middle term and the sum of coefficients', () => {
        // (2x + 3)^5 at x = 1.3 equals the sum of its terms.
        const [n, x] = [5, 1.3];
        close((2 * x + 3) ** n, sum(range(n + 1, 0).map((r) => C(n, r) * (2 * x) ** (n - r) * 3 ** r)));
        // (x² + 1/x)^6: T_{r+1} holds x^{2(6−r) − r}; x³ is r = 3.
        expect(2 * (6 - 3) + -1 * 3).toBe(3);
        // (a+b)^10 has 11 terms; the middle is T_6.
        expect(10 / 2 + 1).toBe(6);
        // Sum of the coefficients of (2x − 3y)^5 is (2 − 3)^5.
        expect(sum(range(6, 0).map((r) => C(5, r) * 2 ** (5 - r) * (-3) ** r))).toBe((2 - 3) ** 5);
    });
});

describe('Progressions', () => {
    it('sums of integers, against adding them up', () => {
        for (const n of [1, 7, 20]) {
            const ks = range(n);
            expect(sum(ks)).toBe((n * (n + 1)) / 2);
            expect(sum(ks.map((k) => 2 * k))).toBe(n * (n + 1));
            expect(sum(ks.map((k) => 2 * k - 1))).toBe(n * n);
            expect(sum(ks.map((k) => k * k))).toBe((n * (n + 1) * (2 * n + 1)) / 6);
            expect(sum(ks.map((k) => k ** 3))).toBe(((n * (n + 1)) / 2) ** 2);
        }
    });

    it('arithmetic: nth term, number of terms, both sums, means', () => {
        const [a1, d] = [7, 4];
        const terms = range(24, 0).map((k) => a1 + k * d);
        expect(terms[23]).toBe(99);
        expect((99 - 7) / 4 + 1).toBe(24);
        expect(sum(terms)).toBe((24 / 2) * (2 * a1 + 23 * d));
        expect(sum(terms)).toBe((24 / 2) * (a1 + 99));
        // Three means between 2 and 14: d = 3 → 5, 8, 11.
        expect((14 - 2) / (3 + 1)).toBe(3);
    });

    it('geometric: nth term, finite and infinite sums (|r| < 1), means', () => {
        const [a1, r] = [3, 0.5];
        const terms = range(10, 0).map((k) => a1 * r ** k);
        close(sum(terms), (a1 * (1 - r ** 10)) / (1 - r));
        close(sum(range(200, 0).map((k) => a1 * r ** k)), a1 / (1 - r), 1e-12);
        // r = −2 does not converge: the partial sums grow without bound.
        expect(Math.abs(sum(range(30, 0).map((k) => (-2) ** k)))).toBeGreaterThan(1e6);
        close((32 / 2) ** (1 / (3 + 1)), 2);
        // G² = A·H for two positive numbers.
        const [x, y] = [4, 9];
        close(Math.sqrt(x * y) ** 2, ((x + y) / 2) * ((2 * x * y) / (x + y)));
    });

    it('harmonic: reciprocals in arithmetic progression', () => {
        const hs = [1 / 2, 1 / 4, 1 / 6, 1 / 8];
        const d = 1 / hs[1] - 1 / hs[0];
        hs.forEach((h, i) => close(1 / h, 1 / hs[0] + i * d));
    });
});

describe('Word problems', () => {
    it('digits: a two-digit number minus its reverse is 9(t − u)', () => {
        for (const [t, u] of [[7, 2], [3, 8]]) expect((10 * t + u) - (10 * u + t)).toBe(9 * (t - u));
    });

    it('motion: average speed over equal distances, boats, relative speed', () => {
        const [d, v1, v2] = [120, 40, 60];
        close((2 * d) / (d / v1 + d / v2), (2 * v1 * v2) / (v1 + v2));
        const [b, c] = [18, 3];
        close(((b + c) + (b - c)) / 2, b);
        close((300) / (70 + 80), 2);
    });

    it('clocks: the angle at H:M, and the minutes for a given angle', () => {
        const angle = (H, M) => Math.abs(30 * H - 5.5 * M);
        // The hands overlap a little after 3:16.
        const M = (2 / 11) * (30 * 3 + 0);
        close(angle(3, M), 0);
        // A right angle at 3:00 and again near 3:32.7.
        close(angle(3, (2 / 11) * (90 - 90)), 90);
        close(angle(3, (2 / 11) * (90 + 90)), 90);
    });

    it('work: combined rates, workers and days, part done', () => {
        // A alone in 6 h, B alone in 3 h: together 2 h.
        close(1 / (1 / 6 + 1 / 3), 2);
        expect((6 * 10) / 4).toBe(15);
        // Fills of 4 h and 6 h with a 12 h drain: 1/4 + 1/6 − 1/12 = 1/3, so 3 h.
        close(1 / (1 / 4 + 1 / 6 - 1 / 12), 3);
    });

    it('mixtures: alligation and dilution', () => {
        const [c1, c2, c] = [0.2, 0.5, 0.3];
        const ratio = (c2 - c) / (c - c1);
        close((c1 * ratio + c2 * 1) / (ratio + 1), c);
        // 10 L of 30% diluted to 20% needs 15 L in all.
        close((0.3 * 10) / 0.2, 15);
    });

    it('money: interest, profit and discounts', () => {
        close(1000 * 0.06 * 0.5, 30);
        close(1000 * (1 + 0.01) ** 12, 1126.825030131969, 1e-12);
        close(((260 - 200) / 200) * 100, 30);
        close(325 * (1 - 0.2), 260);
        close(0.8 * 0.9, 0.72);
    });

    it('a linear Diophantine equation: every solution from one', () => {
        // 6x + 9y = 30: g = 3 divides 30; (x0, y0) = (5, 0).
        const [a, b, cc, x0, y0] = [6, 9, 30, 5, 0];
        const g = gcd(a, b);
        expect(cc % g).toBe(0);
        for (const t of [-2, -1, 1, 3]) expect(a * (x0 + (b / g) * t) + b * (y0 - (a / g) * t)).toBe(cc);
    });

    it('sets: inclusion-exclusion for two and three, and subsets', () => {
        const A = new Set([1, 2, 3, 4, 5]);
        const B = new Set([4, 5, 6, 7]);
        const D = new Set([1, 5, 7, 8, 9]);
        const n = (s) => s.size;
        const and = (x, y) => new Set([...x].filter((e) => y.has(e)));
        const or = (...xs) => new Set(xs.flatMap((x) => [...x]));
        expect(n(or(A, B))).toBe(n(A) + n(B) - n(and(A, B)));
        expect(n(or(A, B, D))).toBe(n(A) + n(B) + n(D) - n(and(A, B)) - n(and(B, D)) - n(and(A, D)) + n(and(and(A, B), D)));
        // Every subset of a 4-element set, counted.
        expect(sum(range(5, 0).map((k) => C(4, k)))).toBe(2 ** 4);
    });
});
