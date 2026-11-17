import { describe, it, expect } from 'vitest';

// Probability & Statistics formula cards, checked with numbers (Library round,
// 2026-11-17): counting formulas against brute-force enumeration, probability
// rules against exact enumeration of dice and cards, distributions against
// their sums and integrals, and descriptive statistics against direct
// computation on a data set.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { exp, sqrt, PI, abs, floor, round, E } = Math;

const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
// Multiplicative, so C(500, 4) doesn't overflow through 500!.
const C = (n, r) => { if (r < 0 || r > n) return 0; let c = 1; for (let i = 1; i <= r; i += 1) c = (c * (n - r + i)) / i; return c; };
const P = (n, r) => fact(n) / fact(n - r);
function* perms(arr) {
    if (arr.length <= 1) { yield arr; return; }
    for (let i = 0; i < arr.length; i += 1) for (const p of perms([...arr.slice(0, i), ...arr.slice(i + 1)])) yield [arr[i], ...p];
}
const range = (n) => Array.from({ length: n }, (_, i) => i);
const simpson = (f, a, b, n = 2000) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i += 1) s += f(a + i * h) * (i % 2 ? 4 : 2); return (s * h) / 3; };
const normPdf = (x, mu = 0, s = 1) => exp(-((x - mu) ** 2) / (2 * s * s)) / (s * sqrt(2 * PI));
const Phi = (z) => 0.5 + simpson((t) => normPdf(t), 0, z);

describe('Counting', () => {
    it('multiplication and addition principles, arrangements with repetition', () => {
        // 3-digit numbers with distinct digits, first digit not 0: 9 × 9 × 8
        let count = 0;
        for (let n = 100; n < 1000; n += 1) if (new Set(String(n)).size === 3) count += 1;
        expect(count).toBe(9 * 9 * 8);
        expect(10 ** 4).toBe(10000);
        expect(P(10, 4)).toBe(5040);
        // Addition: a 1- or 2-letter code from 3 letters, repeats allowed: 3 + 9
        expect(3 ** 1 + 3 ** 2).toBe(12);
    });

    it('permutations, circular, repeated letters, kept together, derangements — by enumeration', () => {
        const all = [...perms(['a', 'b', 'c', 'd', 'e'])];
        expect(all.length).toBe(fact(5));
        // Circular: arrangements up to rotation (fix the first element).
        const circ = new Set(all.map((p) => { const i = p.indexOf('a'); return [...p.slice(i), ...p.slice(0, i)].join(''); }));
        expect(circ.size).toBe(fact(4));
        // Repeated: distinct arrangements of BANANA = 6!/(3!2!1!)
        expect(new Set([...perms([...'BANANA'])].map((p) => p.join(''))).size).toBe(fact(6) / (fact(3) * fact(2)));
        // a and b side by side: (5 − 2 + 1)! 2!
        expect(all.filter((p) => abs(p.indexOf('a') - p.indexOf('b')) === 1).length).toBe(fact(4) * fact(2));
        // Derangements of 1..n against n!Σ(−1)^k/k! and round(n!/e)
        for (const n of [1, 2, 3, 4, 5, 6]) {
            const d = [...perms(range(n))].filter((p) => p.every((x, i) => x !== i)).length;
            const formula = fact(n) * range(n + 1).reduce((s, k) => s + (-1) ** k / fact(k), 0);
            close(d, formula);
            expect(d).toBe(round(fact(n) / E));
        }
    });

    it('combinations, with repetition, at least one, groups, lines and triangles', () => {
        expect(C(10, 3)).toBe(120);
        // Multisets of size 3 from 5 kinds: enumerate non-decreasing triples
        let multi = 0;
        for (let a = 0; a < 5; a += 1) for (let b = a; b < 5; b += 1) for (let c = b; c < 5; c += 1) multi += 1;
        expect(multi).toBe(C(5 + 3 - 1, 3));
        expect(range(6).reduce((s, r) => s + C(5, r), 0) - 1).toBe(2 ** 5 - 1);
        // 6 people into 3 unnamed pairs = 15 (enumerate perfect matchings)
        const pairings = (xs) => (xs.length === 0 ? 1 : range(xs.length - 1).reduce((s, i) => s + pairings(xs.slice(1).filter((_, j) => j !== i)), 0));
        expect(pairings(range(6))).toBe(fact(6) / (fact(2) ** 3) / fact(3));
        // Named groups of 2, 1, 1 from 4: 4!/(2!1!1!) = 12
        expect(fact(4) / fact(2)).toBe(12);
        expect(C(8, 2)).toBe(28); expect(C(8, 3)).toBe(56);
    });
});

describe('Probability rules, by exact enumeration', () => {
    const dice = range(6).flatMap((a) => range(6).map((b) => [a + 1, b + 1]));
    const pr = (pred) => dice.filter(pred).length / dice.length;

    it('classical probability, complement, at least one', () => {
        close(pr(([a, b]) => a + b === 7), 1 / 6);
        close(1 - pr(([a, b]) => a + b === 7), pr(([a, b]) => a + b !== 7));
        // At least one six in two rolls
        close(pr(([a, b]) => a === 6 || b === 6), 1 - (5 / 6) ** 2);
    });

    it('addition rules for two and three events, and the multiplication rules', () => {
        const A = ([a]) => a % 2 === 0; const B = ([, b]) => b > 4; const Cc = ([a, b]) => a + b > 8;
        close(pr((d) => A(d) || B(d)), pr(A) + pr(B) - pr((d) => A(d) && B(d)));
        close(pr((d) => A(d) || B(d) || Cc(d)),
            pr(A) + pr(B) + pr(Cc) - pr((d) => A(d) && B(d)) - pr((d) => A(d) && Cc(d)) - pr((d) => B(d) && Cc(d)) + pr((d) => A(d) && B(d) && Cc(d)));
        close(pr((d) => A(d) && B(d)), pr(A) * pr(B)); // independent dice
        // Mutually exclusive: sums 2 and 12
        close(pr(([a, b]) => a + b === 2 || a + b === 12), 2 / 36);
        // Dependent: two aces without replacement = 4/52 × 3/51 (enumerate ordered pairs)
        const deck = range(52); const aces = new Set([0, 1, 2, 3]);
        let both = 0; let total = 0;
        for (const x of deck) for (const y of deck) if (x !== y) { total += 1; if (aces.has(x) && aces.has(y)) both += 1; }
        close(both / total, (4 / 52) * (3 / 51));
        // None of three independent shooters hits
        close((1 - 0.5) * (1 - 0.6) * (1 - 0.7), 0.06);
    });

    it('conditional probability, total probability and Bayes', () => {
        const A = ([a, b]) => a + b === 8; const B = ([a]) => a === 3;
        close(pr((d) => A(d) && B(d)) / pr(B), 1 / 6);
        // Machines: 50%, 30%, 20% of output; defect rates 1%, 2%, 3%
        const share = [0.5, 0.3, 0.2]; const bad = [0.01, 0.02, 0.03];
        const total = share.reduce((s, w, i) => s + w * bad[i], 0);
        close(total, 0.017);
        const post = share.map((w, i) => (w * bad[i]) / total);
        close(post.reduce((s, x) => s + x, 0), 1);
        close(post[2], 0.006 / 0.017);
        // Two-event Bayes agrees with the definition
        close((pr((d) => A(d) && B(d)) / pr(A)), ((pr((d) => A(d) && B(d)) / pr(B)) * pr(B)) / pr(A));
    });
});

describe('Expectation and the discrete distributions', () => {
    it('expected value, variance and their properties on a die', () => {
        const xs = [1, 2, 3, 4, 5, 6];
        const Ex = xs.reduce((s, x) => s + x / 6, 0); const Ex2 = xs.reduce((s, x) => s + (x * x) / 6, 0);
        close(Ex, 3.5);
        close(Ex2 - Ex ** 2, xs.reduce((s, x) => s + ((x - Ex) ** 2) / 6, 0));
        const a = 3; const b = -2;
        close(xs.reduce((s, x) => s + (a * x + b) / 6, 0), a * Ex + b);
        close(xs.reduce((s, x) => s + ((a * x + b - (a * Ex + b)) ** 2) / 6, 0), a * a * (Ex2 - Ex ** 2));
        // Sum of two independent dice: variances add
        const dice = range(36).map((i) => floor(i / 6) + 1 + (i % 6) + 1);
        const m = dice.reduce((s, x) => s + x, 0) / 36;
        close(dice.reduce((s, x) => s + (x - m) ** 2, 0) / 36, 2 * (Ex2 - Ex ** 2));
        // A game: win 10 on a six, lose 2 otherwise → E = 10/6 − 10/6 = 0, fair
        close(10 * (1 / 6) - 2 * (5 / 6), 0);
    });

    it('binomial mean and variance from its probabilities', () => {
        const n = 12; const p = 0.3;
        const pmf = range(n + 1).map((x) => C(n, x) * p ** x * (1 - p) ** (n - x));
        close(pmf.reduce((s, q) => s + q, 0), 1);
        const mu = pmf.reduce((s, q, x) => s + x * q, 0);
        close(mu, n * p);
        close(pmf.reduce((s, q, x) => s + (x - mu) ** 2 * q, 0), n * p * (1 - p));
    });

    it('Poisson sums to 1 with mean = variance = λ, and approximates a binomial with small p', () => {
        const lam = 2.5; const pois = (x) => (lam ** x * exp(-lam)) / fact(x);
        const xs = range(60);
        close(xs.reduce((s, x) => s + pois(x), 0), 1);
        close(xs.reduce((s, x) => s + x * pois(x), 0), lam);
        close(xs.reduce((s, x) => s + (x - lam) ** 2 * pois(x), 0), lam);
        const n = 500; const p = 0.005;
        for (const x of [0, 1, 2, 4]) close(C(n, x) * p ** x * (1 - p) ** (n - x), ((n * p) ** x * exp(-n * p)) / fact(x), 0.01);
    });

    it('geometric, negative binomial, hypergeometric and multinomial', () => {
        const p = 0.2;
        const geo = (k) => (1 - p) ** (k - 1) * p;
        close(range(400).reduce((s, i) => s + geo(i + 1), 0), 1);
        close(range(400).reduce((s, i) => s + (i + 1) * geo(i + 1), 0), 1 / p);
        const r = 3; const nb = (k) => C(k - 1, r - 1) * p ** r * (1 - p) ** (k - r);
        close(range(600).reduce((s, i) => s + (i < r ? 0 : nb(i)), 0), 1, 1e-6);
        close(range(600).reduce((s, i) => s + (i < r ? 0 : i * nb(i)), 0), r / p, 1e-6);
        // Hypergeometric: 2 red in 4 drawn from 5 red + 7 blue, by enumeration of 4-subsets
        let hits = 0; let all = 0;
        const N = 12;
        for (let a = 0; a < N; a += 1) for (let b = a + 1; b < N; b += 1) for (let c = b + 1; c < N; c += 1) for (let d = c + 1; d < N; d += 1) {
            all += 1; if ([a, b, c, d].filter((x) => x < 5).length === 2) hits += 1;
        }
        close(hits / all, (C(5, 2) * C(7, 2)) / C(12, 4));
        // Multinomial: a die rolled 6 times, each face once
        close(fact(6) / 1 * (1 / 6) ** 6, 720 / 46656);
        // With two outcomes it is the binomial
        close((fact(5) / (fact(2) * fact(3))) * 0.4 ** 2 * 0.6 ** 3, C(5, 2) * 0.4 ** 2 * 0.6 ** 3);
    });
});

describe('The normal distribution', () => {
    it('the density has area 1, mean μ and spread σ', () => {
        const mu = 50; const s = 8;
        close(simpson((x) => normPdf(x, mu, s), mu - 10 * s, mu + 10 * s), 1, 1e-9);
        close(simpson((x) => x * normPdf(x, mu, s), mu - 10 * s, mu + 10 * s), mu, 1e-9);
        close(simpson((x) => (x - mu) ** 2 * normPdf(x, mu, s), mu - 10 * s, mu + 10 * s), s * s, 1e-8);
    });

    it('the empirical rule, the common z-values, and an interval by z-scores', () => {
        close(2 * (Phi(1) - 0.5), 0.6827, 1e-4);
        close(2 * (Phi(2) - 0.5), 0.9545, 1e-4);
        close(2 * (Phi(3) - 0.5), 0.9973, 1e-4);
        close(2 * (1 - Phi(1.645)), 0.10, 1e-3);
        close(2 * (1 - Phi(1.96)), 0.05, 1e-3);
        close(2 * (1 - Phi(2.576)), 0.01, 1e-3);
        const mu = 70; const s = 10;
        close(Phi((85 - mu) / s) - Phi((60 - mu) / s), simpson((x) => normPdf(x, mu, s), 60, 85), 1e-9);
        close(Phi(-0.7), 1 - Phi(0.7));
    });

    it('the normal curve, with the continuity correction, approximates the binomial', () => {
        const n = 100; const p = 0.4; const k = 45;
        const exact = range(k + 1).reduce((s, x) => s + C(n, x) * p ** x * (1 - p) ** (n - x), 0);
        const approx = Phi((k + 0.5 - n * p) / sqrt(n * p * (1 - p)));
        expect(abs(exact - approx)).toBeLessThan(0.005);
        expect(abs(exact - Phi((k - n * p) / sqrt(n * p * (1 - p))))).toBeGreaterThan(abs(exact - approx));
    });
});

describe('Descriptive statistics', () => {
    const xs = [12, 15, 11, 18, 15, 20, 15, 13, 17, 14];
    const n = xs.length;
    const mean = xs.reduce((s, x) => s + x, 0) / n;

    it('the weighted mean, frequency-table mean and combined groups agree with the raw mean', () => {
        const freq = new Map(); xs.forEach((x) => freq.set(x, (freq.get(x) || 0) + 1));
        const fm = [...freq].reduce((s, [x, f]) => s + f * x, 0) / [...freq].reduce((s, [, f]) => s + f, 0);
        close(fm, mean);
        close((3 * 90 + 2 * 85 + 1 * 70) / 6, (90 + 90 + 90 + 85 + 85 + 70) / 6);
        const g1 = xs.slice(0, 4); const g2 = xs.slice(4);
        const m = (a) => a.reduce((s, x) => s + x, 0) / a.length;
        close((g1.length * m(g1) + g2.length * m(g2)) / n, mean);
    });

    it('median and mode, ungrouped and grouped', () => {
        const sorted = [...xs].sort((a, b) => a - b);
        expect((sorted[(n + 1) / 2 - 1.5] + sorted[(n + 1) / 2 - 0.5]) / 2).toBe(15); // 5th and 6th of 10
        // Grouped: classes 10–19, 20–29, 30–39, 40–49 with f 5, 12, 8, 5 (n = 30), width 10
        const f = [5, 12, 8, 5]; const L = [9.5, 19.5, 29.5, 39.5];
        const med = L[1] + ((30 / 2 - 5) / 12) * 10;
        close(med, 19.5 + 10 * (10 / 12));
        // The interpolated median splits the histogram's area in half
        const areaLeft = 5 + 12 * ((med - 19.5) / 10);
        close(areaLeft, 15);
        const d1 = 12 - 5; const d2 = 12 - 8;
        const mode = L[1] + (d1 / (d1 + d2)) * 10;
        // The vertex of the parabola through the three class heights lies in the same class
        expect(mode).toBeGreaterThan(19.5); expect(mode).toBeLessThan(29.5);
        close(mode, 19.5 + 70 / 11);
        expect(f.reduce((s, x) => s + x, 0)).toBe(30);
    });

    it('variance: definition, computational formula, population vs sample; MAD, CV', () => {
        const ss = xs.reduce((s, x) => s + (x - mean) ** 2, 0);
        const sumX = xs.reduce((s, x) => s + x, 0); const sumX2 = xs.reduce((s, x) => s + x * x, 0);
        close(ss / (n - 1), (sumX2 - sumX ** 2 / n) / (n - 1));
        const s = sqrt(ss / (n - 1)); const sigma = sqrt(ss / n);
        expect(s).toBeGreaterThan(sigma);
        close(xs.reduce((a, x) => a + abs(x - mean), 0) / n, 2); // |deviations| 3,0,4,3,0,5,0,2,2,1 from 15
        close((s / mean) * 100, (sqrt(ss / 9) / 15) * 100);
    });

    it('quartiles by position, IQR, and Chebyshev holds for this data and a skewed one', () => {
        const sorted = [...xs].sort((a, b) => a - b);
        const at = (pos) => { const i = floor(pos) - 1; return sorted[i] + (pos - floor(pos)) * (sorted[i + 1] - sorted[i]); };
        const q1 = at((1 * (n + 1)) / 4); const q3 = at((3 * (n + 1)) / 4);
        close(q1, 12.75); close(q3, 17.25); close(q3 - q1, 4.5);
        const skewed = [1, 1, 1, 2, 2, 3, 4, 7, 12, 30];
        for (const data of [xs, skewed]) {
            const m = data.reduce((a, x) => a + x, 0) / data.length;
            const sd = sqrt(data.reduce((a, x) => a + (x - m) ** 2, 0) / data.length);
            for (const k of [1.5, 2, 3]) expect(data.filter((x) => abs(x - m) < k * sd).length / data.length).toBeGreaterThanOrEqual(1 - 1 / k ** 2);
        }
        // Pearson skewness: positive for the right-skewed set
        const m = skewed.reduce((a, x) => a + x, 0) / 10; const med = 2.5;
        const sd = sqrt(skewed.reduce((a, x) => a + (x - m) ** 2, 0) / 9);
        expect((3 * (m - med)) / sd).toBeGreaterThan(0);
    });
});

describe('Odds', () => {
    it('odds and probability convert both ways', () => {
        const p = 0.25;
        close(p / (1 - p), 1 / 3); close((1 - p) / p, 3);
        const [a, b] = [1, 3]; close(a / (a + b), p);
        // 2 : 3 against → P = 3/5
        close(3 / (2 + 3), 0.6);
        close((1 - 0.6) / 0.6, 2 / 3);
    });
});
