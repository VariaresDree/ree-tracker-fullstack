import { describe, it, expect } from 'vitest';

// Engineering Data Analytics formula cards, checked with numbers (Library
// round, 2026-11-17): sampling identities by enumerating every possible
// sample, distributions by numerical integration, the t and chi-square table
// values by integrating their densities, and each test statistic against an
// independent computation of the same quantity (F = t², a 2 × 2 shortcut,
// Pearson on ranks).

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { exp, log, sqrt, PI, abs, ceil, log10 } = Math;

const range = (n) => Array.from({ length: n }, (_, i) => i);
const sum = (a) => a.reduce((s, x) => s + x, 0);
const mean = (a) => sum(a) / a.length;
const svar = (a) => { const m = mean(a); return sum(a.map((x) => (x - m) ** 2)) / (a.length - 1); };
const pvar = (a) => { const m = mean(a); return sum(a.map((x) => (x - m) ** 2)) / a.length; };
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
const C = (n, r) => { let c = 1; for (let i = 1; i <= r; i += 1) c = (c * (n - r + i)) / i; return c; };
const simpson = (f, a, b, n = 4000) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i += 1) s += f(a + i * h) * (i % 2 ? 4 : 2); return (s * h) / 3; };
const normPdf = (x) => exp(-(x * x) / 2) / sqrt(2 * PI);
const Phi = (z) => 0.5 + simpson(normPdf, 0, z);
// Γ exactly, for whole and half-whole arguments (all these tests need).
const gammaFn = (x) => (Number.isInteger(x) ? fact(x - 1) : (() => { const k = x - 0.5; return (fact(2 * k) * sqrt(PI)) / (4 ** k * fact(k)); })());
const lgamma = (x) => log(gammaFn(x));
const tPdf = (t, nu) => exp(lgamma((nu + 1) / 2) - lgamma(nu / 2)) / sqrt(nu * PI) * (1 + (t * t) / nu) ** (-(nu + 1) / 2);
const chiPdf = (x, k) => (x <= 0 ? 0 : exp((k / 2 - 1) * log(x) - x / 2 - (k / 2) * log(2) - lgamma(k / 2)));
// All ordered samples of size n, drawn with replacement.
const withReplacement = (pop, n) => (n === 0 ? [[]] : withReplacement(pop, n - 1).flatMap((s) => pop.map((x) => [...s, x])));
const subsets = (arr, k) => (k === 0 ? [[]] : arr.flatMap((x, i) => subsets(arr.slice(i + 1), k - 1).map((s) => [x, ...s])));

describe('Sampling and descriptive tools', () => {
    it("Slovin's formula, random samples, systematic and stratified samples", () => {
        close(1000 / (1 + 1000 * 0.05 ** 2), 285.714, 1e-5);
        expect(ceil(1000 / (1 + 1000 * 0.05 ** 2))).toBe(286);
        expect(subsets(range(10), 3).length).toBe(C(10, 3));
        const N = 1200; const n = 60; const k = N / n;
        expect(range(n).map((i) => 7 + i * k).every((x) => x <= N)).toBe(true);
        const strata = [600, 400, 200];
        expect(sum(strata.map((Nh) => (n * Nh) / N))).toBe(n);
    });

    it("Sturges' rule, class width, relative and cumulative frequency, box-plot fences", () => {
        expect(Math.round(1 + 3.322 * log10(100))).toBe(8);
        const data = [12, 15, 11, 18, 15, 20, 15, 13, 17, 14, 41];
        // Range 30 over k = 6 divides exactly: c = 5 puts the largest value on
        // the last boundary, outside every class. One higher fits.
        const k = 6; const rangeW = Math.max(...data) - Math.min(...data);
        const fits = (c) => data.every((x) => Math.floor((x - 11) / c) < k);
        expect(fits(rangeW / k)).toBe(false);
        const c = rangeW % k === 0 ? rangeW / k + 1 : ceil(rangeW / k);
        expect(k * c).toBeGreaterThan(rangeW);
        expect(fits(c)).toBe(true);
        const f = [3, 5, 2]; const nn = sum(f);
        close(sum(f.map((x) => x / nn)), 1);
        expect(f.reduce((acc, x) => [...acc, (acc.at(-1) || 0) + x], []).at(-1)).toBe(nn);
        const sorted = [...data].sort((a, b) => a - b); // n = 11: Q1 3rd, Q3 9th
        const q1 = sorted[2]; const q3 = sorted[8]; const iqr = q3 - q1;
        expect(sorted.filter((x) => x < q1 - 1.5 * iqr || x > q3 + 1.5 * iqr)).toEqual([41]);
    });

    it('series and parallel reliability, by enumerating every up/down state', () => {
        const R = [0.9, 0.8, 0.95];
        let series = 0; let parallel = 0;
        for (let mask = 0; mask < 8; mask += 1) {
            const up = R.map((_, i) => (mask >> i) & 1);
            const p = R.reduce((acc, r, i) => acc * (up[i] ? r : 1 - r), 1);
            if (up.every(Boolean)) series += p;
            if (up.some(Boolean)) parallel += p;
        }
        close(series, 0.9 * 0.8 * 0.95);
        close(parallel, 1 - 0.1 * 0.2 * 0.05);
    });
});

describe('Discrete distributions', () => {
    it('Bernoulli and discrete uniform moments; the CDF gives interval probabilities', () => {
        const p = 0.3; close(p * 1, p); close(p * (1 - p) ** 2 + (1 - p) * p ** 2, p * (1 - p));
        const [a, b] = [3, 9]; const xs = range(b - a + 1).map((i) => a + i);
        close(mean(xs), (a + b) / 2);
        close(pvar(xs), ((b - a + 1) ** 2 - 1) / 12);
        close(pvar([1, 2, 3, 4, 5, 6]), 35 / 12);
        const n = 10; const q = 0.4; const pmf = (x) => C(n, x) * q ** x * (1 - q) ** (n - x);
        const F = (x) => sum(range(x + 1).map(pmf));
        close(F(6) - F(2), pmf(3) + pmf(4) + pmf(5) + pmf(6));
    });

    it('a Poisson process over 2 hours is the sum of two 1-hour counts', () => {
        const lam = 1.7; const pois = (m, k) => (m ** k * exp(-m)) / fact(k);
        for (const k of [0, 1, 3, 5]) close(sum(range(k + 1).map((j) => pois(lam, j) * pois(lam, k - j))), pois(lam * 2, k));
    });
});

describe('Continuous distributions', () => {
    it('densities integrate to 1 and F′ = f; uniform moments', () => {
        const lam = 0.5;
        close(simpson((x) => lam * exp(-lam * x), 0, 80), 1, 1e-8);
        const Fexp = (x) => 1 - exp(-lam * x); const h = 1e-5;
        close((Fexp(2 + h) - Fexp(2 - h)) / (2 * h), lam * exp(-lam * 2), 1e-6);
        const [a, b] = [2, 10];
        close(simpson((x) => x / (b - a), a, b), (a + b) / 2);
        close(simpson((x) => (x - (a + b) / 2) ** 2 / (b - a), a, b), (b - a) ** 2 / 12);
    });

    it('exponential mean and sd 1/λ, memoryless, reliability at the MTTF', () => {
        const lam = 0.25; const f = (x) => lam * exp(-lam * x); const S = (t) => exp(-lam * t);
        const mu = simpson((x) => x * f(x), 0, 200);
        close(mu, 1 / lam, 1e-7);
        close(sqrt(simpson((x) => (x - mu) ** 2 * f(x), 0, 200)), 1 / lam, 1e-6);
        close(S(3 + 5) / S(3), S(5));
        close(S(1 / lam), exp(-1));
    });

    it('gamma: area 1, mean r/λ, variance r/λ², and its CDF is a Poisson tail (Erlang)', () => {
        const lam = 2; const r = 3; const g = (x) => (lam ** r * x ** (r - 1) * exp(-lam * x)) / fact(r - 1);
        close(simpson(g, 0, 40), 1, 1e-8);
        close(simpson((x) => x * g(x), 0, 40), r / lam, 1e-8);
        close(simpson((x) => (x - r / lam) ** 2 * g(x), 0, 40), r / lam ** 2, 1e-8);
        const t = 1.3; const pois = (k) => ((lam * t) ** k * exp(-lam * t)) / fact(k);
        close(simpson(g, 0, t), 1 - sum(range(r).map(pois)), 1e-8);
    });

    it('Weibull mean δΓ(1 + 1/β), β = 1 is exponential; lognormal mean and CDF', () => {
        const d = 3; const be = 2;
        const F = (x) => 1 - exp(-((x / d) ** be));
        const f = (x) => (be / d) * (x / d) ** (be - 1) * exp(-((x / d) ** be));
        close(simpson((x) => x * f(x), 0, 40), d * (sqrt(PI) / 2), 1e-6); // Γ(1.5) = √π / 2
        const h = 1e-5; close((F(2 + h) - F(2 - h)) / (2 * h), f(2), 1e-6);
        close(1 - exp(-((4 / 5) ** 1)), 1 - exp(-4 / 5));
        const th = 0.5; const w = 0.4;
        const ln = (x) => normPdf((log(x) - th) / w) / (x * w);
        close(simpson((x) => x * ln(x), 1e-9, 60, 40000), exp(th + (w * w) / 2), 1e-6);
        close(simpson(ln, 1e-9, 2.5, 40000), Phi((log(2.5) - th) / w), 1e-6);
    });
});

describe('Normal distribution', () => {
    it('a linear combination: the mean and variance rules, exactly on dice', () => {
        const die = [1, 2, 3, 4, 5, 6];
        const ys = die.flatMap((x1) => die.map((x2) => 2 * x1 - 3 * x2));
        close(mean(ys), 2 * 3.5 - 3 * 3.5);
        close(pvar(ys), 4 * (35 / 12) + 9 * (35 / 12));
    });

    it('percentiles back to values, and the normal approximation to a Poisson', () => {
        close(Phi(1.2816), 0.90, 1e-4);
        close(Phi(1.645), 0.95, 1e-3);
        const lam = 50; const pois = (k) => exp(k * log(lam) - lam - lgammaInt(k));
        const exact = sum(range(56).map(pois));
        expect(abs(exact - Phi((55 + 0.5 - lam) / sqrt(lam)))).toBeLessThan(0.01);
    });
});
function lgammaInt(k) { let s = 0; for (let i = 2; i <= k; i += 1) s += log(i); return s; }

describe('Sampling distributions, by every possible sample', () => {
    const pop = [2, 4, 6, 8, 10];
    const mu = mean(pop); const s2 = pvar(pop);

    it('with replacement: E(X̄) = μ, Var(X̄) = σ²/n, E(S²) = σ², E[(n−1)S²/σ²] = n − 1', () => {
        for (const n of [2, 3]) {
            const samples = withReplacement(pop, n);
            const means = samples.map(mean);
            close(mean(means), mu);
            close(pvar(means), s2 / n);
            close(mean(samples.map(svar)), s2);
            close(mean(samples.map((s) => ((n - 1) * svar(s)) / s2)), n - 1);
            expect(mean(samples.map(pvar))).toBeLessThan(s2); // dividing by n underestimates
        }
    });

    it('without replacement: the finite population correction is exact', () => {
        const n = 2; const N = pop.length;
        const means = subsets(pop, n).map(mean);
        close(pvar(means), (s2 / n) * ((N - n) / (N - 1)));
    });

    it('a sample proportion centres on p with variance p(1 − p)/n', () => {
        const n = 8; const p = 0.35;
        const pmf = range(n + 1).map((x) => C(n, x) * p ** x * (1 - p) ** (n - x));
        const m = sum(pmf.map((q, x) => q * (x / n)));
        close(m, p);
        close(sum(pmf.map((q, x) => q * (x / n - m) ** 2)), (p * (1 - p)) / n);
    });

    it('a difference of two independent means has variance σ₁²/n₁ + σ₂²/n₂', () => {
        const a = [1, 5, 9]; const b = [0, 2];
        const d = withReplacement(a, 2).flatMap((s) => withReplacement(b, 3).map((t) => mean(s) - mean(t)));
        close(pvar(d), pvar(a) / 2 + pvar(b) / 3);
    });
});

describe('Table values, from the densities', () => {
    it('t: t(0.025, 9) = 2.262, wider than z = 1.96', () => {
        close(simpson((t) => tPdf(t, 9), 2.262, 200, 20000), 0.025, 2e-3);
        close(simpson((t) => tPdf(t, 9), -30, 30, 20000), 1, 1e-4);
        expect(2.262).toBeGreaterThan(1.96);
    });

    it('chi-square, 9 df: 19.023 and 2.700 leave 2.5% in each tail; its mean is 9', () => {
        close(simpson((x) => chiPdf(x, 9), 19.023, 200, 20000), 0.025, 2e-3);
        close(simpson((x) => chiPdf(x, 9), 1e-9, 2.700, 20000), 0.025, 2e-3);
        close(simpson((x) => x * chiPdf(x, 9), 1e-9, 200, 20000), 9, 1e-4);
    });
});

describe('Confidence intervals', () => {
    it('z intervals cover 95%; sample sizes deliver the margin asked', () => {
        close(Phi(1.96) - Phi(-1.96), 0.95, 1e-3);
        const sigma = 12; const E = 2; const n = ceil((1.96 * sigma / E) ** 2);
        expect(n).toBe(139);
        expect(1.96 * sigma / sqrt(n)).toBeLessThanOrEqual(E);
        expect(1.96 * sigma / sqrt(n - 1)).toBeGreaterThan(E);
        expect(ceil((1.96 ** 2 * 0.25) / 0.05 ** 2)).toBe(385);
        // p(1 − p) is largest at 0.5
        for (const p of [0.1, 0.3, 0.45]) expect(p * (1 - p)).toBeLessThan(0.25);
    });

    it('a proportion, a difference of means, and a variance interval that is not symmetric', () => {
        const ph = 0.42; const n = 400; const e = 1.96 * sqrt((ph * (1 - ph)) / n);
        close(e, 0.04837, 1e-3);
        const se = sqrt(16 / 40 + 25 / 50); close(se, sqrt(0.9));
        const s2 = 4.5; const lo = (9 * s2) / 19.023; const hi = (9 * s2) / 2.700;
        expect(lo).toBeLessThan(s2); expect(hi).toBeGreaterThan(s2);
        expect(hi - s2).toBeGreaterThan(s2 - lo);
    });
});

describe('Tests of hypothesis', () => {
    it('α, power, and the P-value rule agree with the critical-value rule', () => {
        close(2 * (1 - Phi(1.96)), 0.05, 1e-3);
        const power = (n) => { const se = 5 / sqrt(n); const hi = 50 + 1.96 * se; const lo = 50 - 1.96 * se; return 1 - Phi((hi - 52) / se) + Phi((lo - 52) / se); };
        expect(power(100)).toBeGreaterThan(power(25));
        for (const z of [1.5, 1.9, 2.1, 3]) expect(2 * (1 - Phi(z)) <= 0.05).toBe(z > 1.96);
    });

    it('a pooled t test with two groups squared is the one-way ANOVA F', () => {
        const g1 = [12, 15, 14, 10, 13]; const g2 = [16, 18, 15, 17, 19, 20];
        const n1 = g1.length; const n2 = g2.length;
        const sp2 = ((n1 - 1) * svar(g1) + (n2 - 1) * svar(g2)) / (n1 + n2 - 2);
        const t = (mean(g1) - mean(g2)) / sqrt(sp2 * (1 / n1 + 1 / n2));
        const all = [...g1, ...g2]; const gm = mean(all);
        const sstr = n1 * (mean(g1) - gm) ** 2 + n2 * (mean(g2) - gm) ** 2;
        const sse = sum(g1.map((x) => (x - mean(g1)) ** 2)) + sum(g2.map((x) => (x - mean(g2)) ** 2));
        close(sum(all.map((x) => (x - gm) ** 2)), sstr + sse);
        close(t * t, (sstr / 1) / (sse / (n1 + n2 - 2)));
        // LSD for these two: the gap exceeds it exactly when |t| > t-crit
        const tcrit = 2.262; // 9 df
        const lsd = tcrit * sqrt((sse / 9) * (1 / n1 + 1 / n2));
        expect(abs(mean(g1) - mean(g2)) > lsd).toBe(abs(t) > tcrit);
    });

    it('a paired t test is the one-sample t on the differences', () => {
        const before = [72, 80, 65, 90, 78, 84]; const after = [70, 76, 66, 85, 74, 80];
        const d = before.map((x, i) => x - after[i]);
        const t = mean(d) / sqrt(svar(d) / d.length);
        close(t, 3 / sqrt(4.8 / 6), 1e-12); // d = 2, 4, −1, 5, 4, 4: mean 3, variance 24/5
        // Pairing removes unit-to-unit spread: the unpaired t is far smaller
        const sp2 = (svar(before) + svar(after)) / 2;
        expect(abs((mean(before) - mean(after)) / sqrt(sp2 * (2 / 6)))).toBeLessThan(t);
    });

    it('z test for a proportion; chi-square goodness of fit and its Σ O²/E − n shortcut', () => {
        close((0.56 - 0.5) / sqrt(0.25 / 400), 2.4);
        const O = [8, 12, 9, 11, 6, 14]; const n = sum(O); const Ex = n / 6;
        close(sum(O.map((o) => (o - Ex) ** 2 / Ex)), sum(O.map((o) => (o * o) / Ex)) - n);
    });

    it('independence: expected counts keep the margins; a 2 × 2 χ² matches n(ad − bc)²/(margins)', () => {
        const [a, b, c, d] = [30, 20, 15, 35]; const n = a + b + c + d;
        const rows = [a + b, c + d]; const cols = [a + c, b + d];
        const E = rows.map((r) => cols.map((col) => (r * col) / n));
        close(E[0][0] + E[0][1], rows[0]); close(E[0][0] + E[1][0], cols[0]);
        const O = [[a, b], [c, d]];
        const chi = sum([0, 1].flatMap((i) => [0, 1].map((j) => (O[i][j] - E[i][j]) ** 2 / E[i][j])));
        close(chi, (n * (a * d - b * c) ** 2) / (rows[0] * rows[1] * cols[0] * cols[1]));
    });
});

describe('Regression and correlation', () => {
    const x = [1, 2, 3, 4, 5, 6, 7]; const y = [2.3, 2.9, 4.1, 4.8, 6.2, 6.6, 8.1];
    const n = x.length;
    const Sxx = sum(x.map((v) => v * v)) - sum(x) ** 2 / n;
    const Sxy = sum(x.map((v, i) => v * y[i])) - (sum(x) * sum(y)) / n;
    const Syy = sum(y.map((v) => v * v)) - sum(y) ** 2 / n;
    const b1 = Sxy / Sxx; const b0 = mean(y) - b1 * mean(x);

    it('the shortcut sums equal the definitions; the line matches the n Σxy form', () => {
        close(Sxx, sum(x.map((v) => (v - mean(x)) ** 2)));
        close(Sxy, sum(x.map((v, i) => (v - mean(x)) * (y[i] - mean(y)))));
        close(b1, (n * sum(x.map((v, i) => v * y[i])) - sum(x) * sum(y)) / (n * sum(x.map((v) => v * v)) - sum(x) ** 2));
    });

    it('SST = SSR + SSE, R² = r², and t² for the slope = F', () => {
        const yhat = x.map((v) => b0 + b1 * v);
        const sse = sum(y.map((v, i) => (v - yhat[i]) ** 2)); const ssr = b1 * Sxy;
        close(Syy, ssr + sse);
        const r = Sxy / sqrt(Sxx * Syy);
        close(ssr / Syy, r * r);
        const s = sqrt(sse / (n - 2));
        close((b1 / (s / sqrt(Sxx))) ** 2, ssr / (sse / (n - 2)));
    });

    it('Spearman equals Pearson on the ranks (no ties)', () => {
        const u = [10, 30, 20, 50, 40, 70, 60]; const w = [3, 1, 4, 2, 7, 5, 6];
        const rank = (a) => a.map((v) => [...a].sort((p, q) => p - q).indexOf(v) + 1);
        const ru = rank(u); const rw = rank(w);
        const d2 = sum(ru.map((v, i) => (v - rw[i]) ** 2));
        const rs = 1 - (6 * d2) / (n * (n * n - 1));
        const pear = (p, q) => { const mp = mean(p); const mq = mean(q); return sum(p.map((v, i) => (v - mp) * (q[i] - mq))) / sqrt(sum(p.map((v) => (v - mp) ** 2)) * sum(q.map((v) => (v - mq) ** 2))); };
        close(rs, pear(ru, rw));
    });
});

describe('ANOVA and designed experiments', () => {
    it('one-way ANOVA with three treatments: the split and F', () => {
        const g = [[18, 21, 20, 19], [24, 26, 23, 25], [20, 22, 21, 23]];
        const all = g.flat(); const gm = mean(all); const N = all.length; const k = g.length;
        const sstr = sum(g.map((t) => t.length * (mean(t) - gm) ** 2));
        const sse = sum(g.map((t) => sum(t.map((v) => (v - mean(t)) ** 2))));
        close(sum(all.map((v) => (v - gm) ** 2)), sstr + sse);
        const F = (sstr / (k - 1)) / (sse / (N - k));
        close(F, 15.2, 1e-9); // SSTr = 50.67 on 2 df, SSE = 15 on 9 df
    });

    it('a 2² design: main effects are differences of means; the interaction is half the change in A', () => {
        // totals with n = 2 replicates: (1), a, b, ab
        const n = 2; const runs = { one: [20, 22], a: [30, 32], b: [24, 26], ab: [44, 46] };
        const T = Object.fromEntries(Object.entries(runs).map(([k, v]) => [k, sum(v)]));
        const A = (T.a + T.ab - T.b - T.one) / (2 * n);
        close(A, mean([...runs.a, ...runs.ab]) - mean([...runs.one, ...runs.b]));
        const AB = (T.ab + T.one - T.a - T.b) / (2 * n);
        const aAtBHigh = mean(runs.ab) - mean(runs.b); const aAtBLow = mean(runs.a) - mean(runs.one);
        close(AB, (aAtBHigh - aAtBLow) / 2);
        expect(2 * 2 ** 3).toBe(16); expect(2 ** (5 - 1)).toBe(16);
    });

    it('a randomized complete block design: SST = SSTr + SSB + SSE and the df split', () => {
        const y = [[12, 14, 13, 15], [16, 18, 15, 19], [11, 12, 12, 14]]; // 3 treatments × 4 blocks
        const a = y.length; const b = y[0].length; const all = y.flat(); const gm = mean(all);
        const tm = y.map(mean); const bm = range(b).map((j) => mean(y.map((row) => row[j])));
        const sst = sum(all.map((v) => (v - gm) ** 2));
        const sstr = b * sum(tm.map((m) => (m - gm) ** 2));
        const ssb = a * sum(bm.map((m) => (m - gm) ** 2));
        const sse = sum(y.flatMap((row, i) => row.map((v, j) => (v - tm[i] - bm[j] + gm) ** 2)));
        close(sst, sstr + ssb + sse);
        expect(a * b - 1).toBe((a - 1) + (b - 1) + (a - 1) * (b - 1));
    });
});
