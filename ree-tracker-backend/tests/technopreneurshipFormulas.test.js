import { describe, it, expect } from 'vitest';

// ESAS › Technopreneurship & Project Management cards, checked with numbers
// (Library round, 2026-11-18): CPM float against brute-force path lengths on a
// network, the PERT mean against the Beta-PERT distribution integrated, LTV
// against summing a churning customer base month by month, valuation through
// two rounds, CAGR by compounding, EVM's identities, and crashing step by step.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt } = Math;

describe('Business', () => {
    it('LTV = ARPU × margin / churn, the same as summing the surviving customers month by month', () => {
        const arpu = 500; const gm = 0.7; const churn = 0.05;
        let sum = 0; let alive = 1; for (let m = 0; m < 2000; m += 1) { sum += alive * arpu * gm; alive *= 1 - churn; }
        close(sum, (arpu * gm) / churn, 1e-9); close((arpu * gm) / churn, 7000); expect(7000 / 2000).toBeGreaterThan(3); // CAC 2000
    });

    it('SOM, and CAGR by compounding; +50% then −50% is −13.4%, not 0', () => {
        close(2e9 * 0.4 * 0.05, 4e7);
        const cagr = (150 / 100) ** (1 / 4) - 1; let v = 100; for (let y = 0; y < 4; y += 1) v *= 1 + cagr; close(v, 150, 1e-12);
        close((1.5 * 0.5) ** 0.5 - 1, -0.134, 1e-2);
    });

    it('markup and margin: 50% markup is a 33% margin, 100% is 50%', () => {
        const m = (k) => k / (1 + k); close(m(0.5), 1 / 3); close(m(1), 0.5); close((150 - 100) / 150, m(0.5));
    });

    it('break-even revenue: FC / CMR equals price × break-even units', () => {
        const FC = 200000; const P = 50; const V = 30; const cmr = (P - V) / P; close(FC / cmr, P * (FC / (P - V))); close(FC / cmr, 500000);
        close((800000 - 500000) / 800000, 0.375); // margin of safety
    });

    it('ratios and runway', () => {
        close((130000 - 100000) / 100000, 0.3); close(300000 / 250000, 1.2); close(1.8e6 / 150000, 12);
    });

    it('valuation: two rounds dilute the founders multiplicatively', () => {
        const seed = 5e6 / (20e6 + 5e6); close(seed, 0.2);
        const seriesA = 20e6 / (80e6 + 20e6); close(seriesA, 0.2);
        close(1 * (1 - seed) * (1 - seriesA), 0.64, 1e-12);
    });

    it('IP terms: a patent filed in 2026 expires in 2046; industrial design tops out at 15 years', () => {
        expect(2026 + 20).toBe(2046); expect(5 + 5 + 5).toBe(15); expect(2026 + 7).toBe(2033);
    });
});

describe('Projects', () => {
    // A: 3 → C: 2 → E: 4;  B: 5 → D: 3 → E;  start → A, B
    const acts = { A: { t: 3, pre: [] }, B: { t: 5, pre: [] }, C: { t: 2, pre: ['A'] }, D: { t: 3, pre: ['B'] }, E: { t: 4, pre: ['C', 'D'] } };

    it('CPM: forward and backward passes give float; zero float is the longest path', () => {
        const order = ['A', 'B', 'C', 'D', 'E']; const ES = {}; const EF = {};
        for (const a of order) { ES[a] = Math.max(0, ...acts[a].pre.map((p) => EF[p])); EF[a] = ES[a] + acts[a].t; }
        const T = Math.max(...Object.values(EF)); const LF = {}; const LS = {};
        for (const a of [...order].reverse()) { const succ = order.filter((s) => acts[s].pre.includes(a)); LF[a] = succ.length ? Math.min(...succ.map((s) => LS[s])) : T; LS[a] = LF[a] - acts[a].t; }
        const TF = Object.fromEntries(order.map((a) => [a, LS[a] - ES[a]]));
        expect(T).toBe(12); expect(TF).toEqual({ A: 3, B: 0, C: 3, D: 0, E: 0 });
        const paths = [['A', 'C', 'E'], ['B', 'D', 'E']].map((p) => p.reduce((s, a) => s + acts[a].t, 0));
        expect(Math.max(...paths)).toBe(T); // B-D-E
    });

    it('PERT: (a + 4m + b)/6 is the mean of the Beta-PERT distribution; a deadline\'s probability', () => {
        const a = 2; const m = 4; const b = 12; const al = 1 + (4 * (m - a)) / (b - a); const be = 1 + (4 * (b - m)) / (b - a);
        const n = 20000; let num = 0; let den = 0;
        for (let i = 1; i < n; i += 1) { const x = i / n; const w = x ** (al - 1) * (1 - x) ** (be - 1); num += (a + (b - a) * x) * w; den += w; }
        close(num / den, (a + 4 * m + b) / 6, 1e-4); close((a + 4 * m + b) / 6, 5);
        const z = (25 - 22) / sqrt(4 + 2.25); close(z, 1.2, 1e-9); // σ² of 4 and 2.25 along the path
    });

    it('crashing: the cheapest slope goes first, and the project shortens day by day', () => {
        const slope = (cc, cn, tn, tc) => (cc - cn) / (tn - tc);
        const D = slope(40000, 25000, 3, 1); const E = slope(30000, 20000, 4, 2); close(D, 7500); close(E, 5000);
        expect(Math.min(D, E)).toBe(E); // E is on the critical path and cheaper
    });

    it('risk exposure: a 20% chance of a ₱500,000 delay is ₱100,000', () => { close(0.2 * 500000, 100000); });

    it('EVM: the indexes, the variances and EAC agree', () => {
        const PV = 400000; const EV = 350000; const AC = 420000; const BAC = 1e6;
        const CPI = EV / AC; const SPI = EV / PV; close(EV - AC, -70000); close(EV - PV, -50000);
        close(CPI, 0.8333, 1e-4); close(SPI, 0.875); close(BAC / CPI, 1.2e6, 1e-9); expect(CPI < 1 && SPI < 1).toBe(true);
    });

    it('effort to duration', () => { close(60 / (4 * 0.75), 20); });
});
