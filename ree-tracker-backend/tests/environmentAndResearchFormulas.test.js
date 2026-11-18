import { describe, it, expect } from 'vitest';

// ESAS › Environmental Science & Engineering and Research Methods cards,
// checked with numbers (Library round, 2026-11-18): the plume against mass
// conservation over the crosswind plane, Streeter-Phelps and logistic growth
// against stepped ODEs, the energy balance and forcing against known values;
// sample-size formulas against each other, Cronbach's alpha against the
// parallel-items theory by simulation, and the Type I error rate and power of
// a z-test by simulation.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { exp, log, sqrt, PI } = Math;
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const normal = (u) => () => sqrt(-2 * log(u() || 1e-12)) * Math.cos(2 * PI * u());
const Phi = (z) => { let s = 0; const n = 4000; const a = -8; const h = (z - a) / n; for (let i = 0; i <= n; i += 1) s += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * exp(-((a + i * h) ** 2) / 2); return (s * h) / 3 / sqrt(2 * PI); };

describe('Environment: ecology and resources', () => {
    it('10% rule: 10 000 kcal of plants feed 10 kcal at the fourth level', () => { close(10000 * 0.1 ** 3, 10); });

    it('exponential doubling by the rule of 70; logistic growth stepped toward K', () => {
        close(log(2) / 0.02, 34.66, 1e-3); expect(Math.abs(70 / 2 - log(2) / 0.02)).toBeLessThan(0.5);
        let N = 10; const r = 0.3; const K = 1000; for (let t = 0; t < 100; t += 0.001) N += r * N * (1 - N / K) * 0.001;
        close(N, K, 1e-3);
        const exact = (t) => K / (1 + ((K - 10) / 10) * exp(-r * t)); let M = 10; for (let t = 0; t < 10; t += 0.0001) M += r * M * (1 - M / K) * 0.0001; close(M, exact(10), 1e-3);
    });

    it('resource lifetime: 100 years of reserves at 2% growth last 55 years, by summing year by year', () => {
        const T = log(0.02 * 100 + 1) / 0.02; close(T, 54.93, 1e-3);
        let used = 0; let y = 0; while (used < 100) { used += exp(0.02 * (y + 0.005)) * 0.01; y += 0.01; } // C0 = 1
        close(y, T, 1e-3);
    });

    it('IPAT: halving T offsets doubling A', () => { close(2 * (2 * 3) * (0.5 * 4), 2 * 3 * 4); });
});

describe('Environment: air and water', () => {
    it('Gaussian plume: the reflected plume carries exactly Q through the crosswind plane', () => {
        const Q = 100; const u = 5; const sy = 30; const sz = 15; const H = 40;
        const C = (y, z) => (Q / (2 * PI * sy * sz * u)) * exp(-(y * y) / (2 * sy * sy)) * (exp(-((z - H) ** 2) / (2 * sz * sz)) + exp(-((z + H) ** 2) / (2 * sz * sz)));
        close(C(0, 0), (Q / (PI * sy * sz * u)) * exp(-(H * H) / (2 * sz * sz)), 1e-12);
        let flux = 0; const dy = 1; const dz = 0.5;
        for (let y = -200; y <= 200; y += dy) for (let z = 0; z <= 200; z += dz) flux += u * C(y, z) * dy * dz;
        close(flux, Q, 2e-2);
    });

    it('emissions: two 90% controls in series pass 1%', () => { close(1000 * 2 * (1 - 0.9) * (1 - 0.9), 20); });

    it('Streeter-Phelps matches the stepped BOD and oxygen equations, and the critical time is the sag\'s low point', () => {
        const k1 = 0.23; const k2 = 0.5; const L0 = 20; const D0 = 1;
        const Dt = (t) => ((k1 * L0) / (k2 - k1)) * (exp(-k1 * t) - exp(-k2 * t)) + D0 * exp(-k2 * t);
        let L = L0; let D = D0; let tMax = 0; let Dmax = D; const dt = 1e-4;
        for (let t = 0; t < 10; t += dt) { const dL = -k1 * L; const dD = k1 * L - k2 * D; L += dL * dt; D += dD * dt; if (D > Dmax) { Dmax = D; tMax = t + dt; } }
        close(D, Dt(10), 1e-3);
        const tc = log((k2 / k1) * (1 - (D0 * (k2 - k1)) / (k1 * L0))) / (k2 - k1); close(tMax, tc, 1e-2); close(Dmax, Dt(tc), 1e-3);
    });

    it('mixing, detention time and overflow rate', () => {
        close((10 * 2 + 1 * 200) / 11, 20, 1e-12); close(1000 / 5000, 0.2); close(5000 / 200, 25);
    });

    it('landfill: 100 000 people at 0.5 kg/day compacted to 600 kg/m³ need 30 400 m³ a year', () => {
        const M = 100000 * 0.5 * 365; close(M / 600, 30417, 1e-4); close((M / 600) * 1.2, 36500, 1e-4);
    });
});

describe('Environment: climate', () => {
    it('doubling CO2 forces 3.7 W/m², about 3 °C', () => { close(5.35 * log(2), 3.708, 1e-3); close(0.8 * 5.35 * log(2), 2.97, 2e-3); });

    it('energy balance: 255 K, 33 K below the real 288 K', () => {
        const Te = ((1361 * (1 - 0.3)) / (4 * 5.67e-8)) ** 0.25; close(Te, 254.6, 1e-3); close(288 - Te, 33.4, 1e-2);
    });

    it('CO2e: 2 t CH4 and 0.1 t N2O equal 82.5 t CO2', () => { close(2 * 28 + 0.1 * 265, 82.5); });
});

describe('Research: sampling', () => {
    it('Slovin is the proportion formula with p = 0.5, z = 2', () => {
        for (const N of [200, 1000, 50000]) {
            const slovin = N / (1 + N * 0.05 ** 2); const n0 = (4 * 0.25) / 0.05 ** 2; const fin = n0 / (1 + (n0 - 1) / N);
            expect(Math.abs(slovin - fin) / slovin).toBeLessThan(0.004);
        }
        expect(Math.ceil(1000 / (1 + 1000 * 0.0025))).toBe(286);
    });

    it('proportion: 385 for a large population, 278 for N = 1000; the mean formula quadruples when E halves', () => {
        const n0 = (1.96 ** 2 * 0.25) / 0.05 ** 2; expect(Math.ceil(n0)).toBe(385); expect(Math.ceil(n0 / (1 + (n0 - 1) / 1000))).toBe(278);
        close(((1.96 * 10) / 1) ** 2 / ((1.96 * 10) / 2) ** 2, 4);
    });

    it('stratified allocation adds back to n; systematic interval', () => {
        const Nh = [600, 300, 100]; const n = 200; expect(Nh.map((x) => (n * x) / 1000)).toEqual([120, 60, 20]); expect(1000 / 200).toBe(5);
    });
});

describe('Research: instruments and statistics', () => {
    it('Likert weighted mean: 10 SA, 20 A, 5 N, 3 D, 2 SD gives 153/40 = 3.825 (agree)', () => {
        const f = [10, 20, 5, 3, 2]; const w = [5, 4, 3, 2, 1];
        const m = f.reduce((s, x, i) => s + x * w[i], 0) / f.reduce((a, b) => a + b); close(m, 3.825); expect(m > 3.40 && m <= 4.20).toBe(true);
    });

    it("Cronbach's alpha matches the parallel-items theory kρ/(1 + (k − 1)ρ) by simulation", () => {
        const g = normal(rng(42)); const k = 5; const n = 20000; const rho = 0.5; // equal true and error variance
        const items = Array.from({ length: k }, () => new Float64Array(n)); const tot = new Float64Array(n);
        for (let i = 0; i < n; i += 1) { const t = g(); for (let j = 0; j < k; j += 1) { items[j][i] = t + g(); tot[i] += items[j][i]; } }
        const varOf = (a) => { const m = a.reduce((s, x) => s + x, 0) / a.length; return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1); };
        const alpha = (k / (k - 1)) * (1 - items.reduce((s, a) => s + varOf(a), 0) / varOf(tot));
        close(alpha, (k * rho) / (1 + (k - 1) * rho), 2e-2);
    });

    it('content validity: 5 of 6 experts is 0.83, above 0.78', () => { close(5 / 6, 0.833, 1e-3); expect(5 / 6).toBeGreaterThan(0.78); });

    it('Pearson r equals covariance over the product of standard deviations; its t', () => {
        const x = [2, 4, 5, 7, 9]; const y = [3, 5, 4, 8, 10]; const mx = 5.4; const my = 6;
        const sxy = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0); const sxx = x.reduce((s, xi) => s + (xi - mx) ** 2, 0); const syy = y.reduce((s, yi) => s + (yi - my) ** 2, 0);
        const r = sxy / sqrt(sxx * syy); const cov = sxy / 4; const sd = (v) => sqrt(v / 4);
        close(r, cov / (sd(sxx) * sd(syy)), 1e-12); close(r, 0.9521, 1e-3); close(r * sqrt(3 / (1 - r * r)), 5.39, 1e-2);
    });

    it('chi-square on a 2 × 2 table, with expected counts from the margins', () => {
        const O = [[30, 20], [10, 40]]; const R = [50, 50]; const Cc = [40, 60]; const T = 100;
        let chi = 0; for (let i = 0; i < 2; i += 1) for (let j = 0; j < 2; j += 1) { const E = (R[i] * Cc[j]) / T; chi += (O[i][j] - E) ** 2 / E; }
        close(chi, 16.667, 1e-4); expect((2 - 1) * (2 - 1)).toBe(1); expect(chi).toBeGreaterThan(3.841);
    });

    it('pooled t: with equal sizes s_p² is the average of the variances', () => {
        const sp2 = (9 * 16 + 9 * 25) / 18; close(sp2, (16 + 25) / 2); close((80 - 75) / sqrt(sp2 * (2 / 10)), 2.469, 1e-3);
    });

    it('Type I error is α, and power matches Φ(δ√n/σ − z_α), by simulation', () => {
        const g = normal(rng(7)); const n = 25; const reps = 20000; const z = 1.645;
        let rej0 = 0; let rej1 = 0;
        for (let k = 0; k < reps; k += 1) {
            let s0 = 0; let s1 = 0; for (let i = 0; i < n; i += 1) { s0 += g(); s1 += g() + 0.4; }
            if ((s0 / n) * sqrt(n) > z) rej0 += 1; if ((s1 / n) * sqrt(n) > z) rej1 += 1;
        }
        close(rej0 / reps, 0.05, 0.15); close(rej1 / reps, Phi(0.4 * sqrt(n) - z), 0.05); close(Phi(0.4 * 5 - 1.645), 0.639, 1e-2);
    });
});
