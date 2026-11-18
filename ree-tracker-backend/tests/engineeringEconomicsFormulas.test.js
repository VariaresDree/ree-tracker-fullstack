import { describe, it, expect } from 'vitest';

// ESAS › Engineering Economics formula cards, checked with numbers (Library
// round, 2026-11-18). Every closed-form factor is checked against a period-by-
// period cash-flow run: a loan paid down month by month, a fund that earns
// interest deposit by deposit, a perpetuity summed over 3000 years, a bond's
// coupons discounted one by one, an IRR found by bisection.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { log, exp } = Math;
const PF = (i, n) => (1 + i) ** -n;
const FP = (i, n) => (1 + i) ** n;
const PA = (i, n) => (1 - (1 + i) ** -n) / i;
const AP = (i, n) => i / (1 - (1 + i) ** -n);
const FA = (i, n) => ((1 + i) ** n - 1) / i;
const AF = (i, n) => i / ((1 + i) ** n - 1);
const pw = (flows, i) => flows.reduce((s, cf, t) => s + cf / (1 + i) ** t, 0); // flows[t] at end of period t
const range = (n, f) => Array.from({ length: n }, (_, t) => f(t));

describe('Interest and rates', () => {
    it('simple interest; present worth; time to double (rule of 72)', () => {
        close(10000 * 0.08 * 3, 2400); close(10000 * (1 + 0.08 * 3), 12400);
        close(12000 * PF(0.1, 5), 7451.06, 1e-6);
        close(log(2) / log(1.08), 9.006, 1e-3); expect(Math.abs(72 / 8 - log(2) / log(1.08))).toBeLessThan(0.01);
    });

    it('a 10% discount is an 11.1% interest rate: the borrower gets F(1 − d) and repays F', () => {
        const d = 0.1; const i = d / (1 - d); close(i, 0.1111, 1e-3); close(i / (1 + i), d);
        close(1000 * (1 - d) * (1 + i), 1000);
    });

    it('effective, nominal and continuous rates agree with compounding step by step', () => {
        let x = 1; for (let k = 0; k < 12; k += 1) x *= 1 + 0.12 / 12;
        close(x - 1, (1 + 0.12 / 12) ** 12 - 1); close(12 * ((1 + (x - 1)) ** (1 / 12) - 1), 0.12, 1e-12);
        close(exp(0.12) - 1, 0.1275, 1e-3); close((1 + 0.12 / 1e6) ** 1e6, exp(0.12), 1e-6);
    });

    it('factor identities: (A/P) = (A/F) + i, and reciprocals', () => {
        for (const [i, n] of [[0.05, 10], [0.12, 7], [0.01, 360]]) {
            close(AP(i, n), AF(i, n) + i, 1e-12); close(PA(i, n) * AP(i, n), 1, 1e-12); close(FP(i, n) * PF(i, n), 1, 1e-12);
            close(FA(i, n), PA(i, n) * FP(i, n), 1e-12);
        }
    });

    it('inflation: (1 + i_f) = (1 + i)(1 + f) keeps buying power growing at i', () => {
        const i = 0.06; const f = 0.04; const iff = (1 + i) * (1 + f) - 1; close(iff, i + f + i * f);
        const nominal = 1000 * (1 + iff) ** 5; const prices = (1 + f) ** 5; close(nominal / prices, 1000 * (1 + i) ** 5, 1e-12);
        close((iff - f) / (1 + f), i, 1e-12);
    });
});

describe('Annuities', () => {
    it('future worth and sinking fund by depositing period by period', () => {
        let bal = 0; for (let t = 1; t <= 10; t += 1) bal = bal * 1.06 + 500;
        close(bal, 500 * FA(0.06, 10), 1e-12); close(bal * AF(0.06, 10), 500, 1e-12);
    });

    it('present worth and capital recovery: a loan paid off exactly, the balance as the PW of payments left', () => {
        const P = 1e6; const i = 0.01; const n = 60; const A = P * AP(i, n);
        let B = P; const balances = [];
        for (let t = 1; t <= n; t += 1) { B = B * (1 + i) - A; balances.push(B); }
        close(B, 0, 1e-6); close(balances[23], A * PA(i, n - 24), 1e-9);
        close(A * PA(i, n), P, 1e-12);
    });

    it('annuity due and deferred annuity, by discounting each payment', () => {
        const A = 1000; const i = 0.08; const n = 6;
        close(range(n, (t) => A * PF(i, t)).reduce((a, b) => a + b), A * PA(i, n) * (1 + i), 1e-12);
        close(A * PA(i, n) * (1 + i), A + A * PA(i, n - 1), 1e-12);
        const k = 4; close(range(n, (t) => A * PF(i, k + 1 + t)).reduce((a, b) => a + b), A * PA(i, n) * PF(i, k), 1e-12);
    });
});

describe('Perpetuities, capitalized cost and gradients', () => {
    it('A/i, and payments every k periods, summed over 3000 periods', () => {
        let s = 0; for (let t = 1; t <= 3000; t += 1) s += 500 * PF(0.08, t); close(s, 500 / 0.08, 1e-9);
        let s2 = 0; for (let j = 1; j <= 1000; j += 1) s2 += 20000 * PF(0.06, 10 * j); close(s2, 20000 / (1.06 ** 10 - 1), 1e-9);
        close(PA(0.1, 50), 9.915, 1e-3);
    });

    it('capitalized cost equals the PW of buying, running and replacing forever', () => {
        const [C0, CL, L, OM, i] = [500000, 50000, 20, 12000, 0.07];
        let s = C0; for (let t = 1; t <= 2000; t += 1) { s += OM * PF(i, t); if (t % L === 0) s += (C0 - CL) * PF(i, t); }
        close(s, C0 + OM / i + (C0 - CL) / ((1 + i) ** L - 1), 1e-9);
    });

    it('arithmetic gradient: P_G and A_G by summing 0, G, 2G, …; the perpetual gradient A/i + G/i²', () => {
        const [G, i, n] = [100, 0.1, 12];
        const brute = range(n, (t) => t * G * PF(i, t + 1)).reduce((a, b) => a + b);
        const PG = (G / i) * (PA(i, n) - n * PF(i, n)); close(brute, PG, 1e-12);
        close(PG * AP(i, n), G * (1 / i - n / ((1 + i) ** n - 1)), 1e-12);
        let s = 0; for (let t = 1; t <= 3000; t += 1) s += (1000 + (t - 1) * G) * PF(i, t); close(s, 1000 / i + G / (i * i), 1e-9);
    });

    it('geometric gradient, including i = g', () => {
        const [A1, g, i, n] = [1000, 0.05, 0.1, 15];
        close(range(n, (t) => A1 * (1 + g) ** t * PF(i, t + 1)).reduce((a, b) => a + b), A1 * (1 - ((1 + g) / (1 + i)) ** n) / (i - g), 1e-12);
        close(range(n, (t) => A1 * 1.1 ** t * PF(0.1, t + 1)).reduce((a, b) => a + b), (n * A1) / 1.1, 1e-12);
    });
});

describe('Depreciation', () => {
    const [C0, CL, L] = [100000, 10000, 5];

    it('sinking fund: the fund reaches C0 − CL; book value from the fund', () => {
        const i = 0.06; const d = (C0 - CL) * AF(i, L);
        let fund = 0; for (let t = 1; t <= L; t += 1) fund = fund * (1 + i) + d;
        close(fund, C0 - CL, 1e-9); close(C0 - d * FA(i, 3), C0 - ((d * (1.06 ** 3 - 1)) / 0.06), 1e-12);
    });

    it('Matheson ends at the salvage value; double declining uses 2/L', () => {
        const k = 1 - (CL / C0) ** (1 / L); let bv = C0; for (let t = 1; t <= L; t += 1) bv -= bv * k;
        close(bv, CL, 1e-9);
        const kd = 2 / L; let b2 = C0; const d = []; for (let t = 1; t <= 3; t += 1) { d.push(b2 * kd); b2 -= b2 * kd; }
        close(d[2], C0 * kd * (1 - kd) ** 2, 1e-12); close(b2, C0 * (1 - kd) ** 3, 1e-12);
    });

    it('SYD charges add up to C0 − CL, and the cumulative formula matches', () => {
        const SYD = (L * (L + 1)) / 2; const dn = (n) => ((C0 - CL) * (L - n + 1)) / SYD;
        close(range(L, (t) => dn(t + 1)).reduce((a, b) => a + b), C0 - CL, 1e-12);
        close(dn(1) + dn(2), ((C0 - CL) * 2 * (2 * L - 2 + 1)) / (L * (L + 1)), 1e-12);
        close(range(L, () => (C0 - CL) / L).reduce((a, b) => a + b), C0 - CL); // straight line too
    });

    it('units of production', () => { close(((C0 - CL) / 90000) * 18000, 18000); });
});

describe('Bonds, break-even, worth', () => {
    it('a bond: coupons and redemption discounted one by one; par when the rates match', () => {
        const [Z, r, i, n] = [10000, 0.04, 0.05, 20];
        close(range(n, (t) => Z * r * PF(i, t + 1)).reduce((a, b) => a + b) + Z * PF(i, n), Z * r * PA(i, n) + Z * PF(i, n), 1e-12);
        close(Z * r * PA(r, n) + Z * PF(r, n), Z, 1e-9);
        expect(Z * r * PA(i, n) + Z * PF(i, n)).toBeLessThan(Z);
    });

    it('break-even quantity and the point where two options cost the same', () => {
        const Q = 200000 / (50 - 30); close(Q, 10000); close((50 - 30) * Q - 200000, 0);
        const x = (90000 - 40000) / (25 - 15); close(40000 + 25 * x, 90000 + 15 * x);
    });

    it('EUAC: the two forms agree, and equal the PW of all costs spread evenly', () => {
        const [C0, CL, OM, i, n] = [80000, 8000, 5000, 0.1, 8];
        const e1 = (C0 - CL) * AP(i, n) + CL * i + OM; const e2 = C0 * AP(i, n) - CL * AF(i, n) + OM;
        close(e1, e2, 1e-12);
        const flows = [C0, ...range(n, (t) => OM - (t === n - 1 ? CL : 0))];
        close(pw(flows, i) * AP(i, n), e1, 1e-12);
    });
});

describe('Rates of return, B/C, replacement, risk', () => {
    const flows = [-100000, 30000, 30000, 30000, 30000, 30000];

    it('IRR by bisection makes NPW zero; accept against a 10% MARR', () => {
        let lo = 0; let hi = 1; for (let k = 0; k < 100; k += 1) { const m = (lo + hi) / 2; if (pw(flows, m) > 0) lo = m; else hi = m; }
        close(pw(flows, lo), 0, 1e-6); close(lo, 0.1524, 1e-3); expect(pw(flows, 0.1)).toBeGreaterThan(0);
    });

    it('payback: 3.33 years simple, longer discounted', () => {
        close(100000 / 30000, 3.333, 1e-3);
        let cum = 0; let n = 0; while (cum < 100000) { n += 1; cum += 30000 * PF(0.1, n); }
        expect(n).toBe(5);
    });

    it('external rate of return: inflows forward and outflows back at 10%', () => {
        const eps = 0.1; const n = 5;
        const Fin = flows.reduce((s, cf, t) => s + (cf > 0 ? cf * (1 + eps) ** (n - t) : 0), 0);
        const Pout = flows.reduce((s, cf, t) => s + (cf < 0 ? -cf * PF(eps, t) : 0), 0);
        const err = (Fin / Pout) ** (1 / n) - 1; close(err, 0.1286, 1e-3);
        expect(err).toBeLessThan(0.1524); // between the MARR and the IRR
        expect(err).toBeGreaterThan(eps);
    });

    it('B/C and the incremental test pick the right project, not the highest ratio', () => {
        const A = { B: 300, C: 200 }; const Bp = { B: 420, C: 300 };
        expect(A.B / A.C).toBeGreaterThan(Bp.B / Bp.C);
        expect((Bp.B - A.B) / (Bp.C - A.C)).toBeGreaterThan(1); // the costlier one is worth it
        close((500 - 100) / 300, 1.333, 1e-3);
    });

    it('economic life minimises EUAC; brute-forced over every life', () => {
        const C0 = 50000; const i = 0.1; const mv = (n) => C0 * 0.8 ** n; const om = (t) => 2000 + 1500 * (t - 1);
        const euac = (n) => C0 * AP(i, n) - mv(n) * AF(i, n) + range(n, (t) => om(t + 1) * PF(i, t + 1)).reduce((a, b) => a + b) * AP(i, n);
        const costs = range(15, (t) => euac(t + 1)); const best = costs.indexOf(Math.min(...costs)) + 1;
        expect(best).toBeGreaterThan(1); expect(best).toBeLessThan(15);
        const flows2 = [C0, ...range(best, (t) => om(t + 1) - (t === best - 1 ? mv(best) : 0))];
        close(pw(flows2, i) * AP(i, best), euac(best), 1e-9);
    });

    it('expected value, and the uncertainty criteria on one payoff table', () => {
        close(0.3 * 50 + 0.5 * 20 + 0.2 * -10, 23);
        const table = { A: [50, 20, -10], B: [30, 25, 10], C: [15, 15, 15] };
        const pick = (score) => Object.keys(table).reduce((a, b) => (score(table[a]) >= score(table[b]) ? a : b));
        expect(pick((x) => Math.max(...x))).toBe('A'); expect(pick((x) => Math.min(...x))).toBe('C');
        expect(pick((x) => x.reduce((s, y) => s + y) / 3)).toBe('B');
        expect(pick((x) => 0.6 * Math.max(...x) + 0.4 * Math.min(...x))).toBe('A');
        const best = [0, 1, 2].map((j) => Math.max(...Object.values(table).map((r) => r[j])));
        const worstRegret = (x) => Math.max(...x.map((y, j) => best[j] - y));
        expect(pick((x) => -worstRegret(x))).toBe('B');
    });
});
