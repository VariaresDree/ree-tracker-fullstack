import { describe, it, expect } from 'vitest';

// ESAS › Basic Occupational Safety & Health and EE Laws cards, checked with
// numbers (Library round, 2026-11-18): the noise rule against its table, the
// dose against hour-by-hour exposure, Dalziel and the IEEE 80 touch/step
// limits, the NIOSH equation at its reference point, WBGT, TWA, NRR derating,
// injury rates, the ladder angle, and the board exam and prescription rules.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, atan, PI } = Math;

describe('Safety: hygiene', () => {
    const T = (L) => 8 / 2 ** ((L - 90) / 5);

    it('noise: 90 dBA for 8 h, halved every 5 dB, matching the familiar table', () => {
        const table = { 90: 8, 92: 6, 95: 4, 97: 3, 100: 2, 102: 1.5, 105: 1, 110: 0.5, 115: 0.25 };
        for (const [L, h] of Object.entries(table)) expect(Math.abs(T(Number(L)) - h) / h).toBeLessThan(0.07);
    });

    it('dose: 4 h at 90, 2 h at 95, 1 h at 100 dBA is 150%, over the limit', () => {
        const D = 4 / T(90) + 2 / T(95) + 1 / T(100); close(D, 1.5);
        let used = 0; for (const [L, h] of [[90, 4], [95, 2], [100, 1]]) for (let k = 0; k < h * 60; k += 1) used += 1 / (T(L) * 60);
        close(used, D, 1e-9);
        close(16.61 * Math.log10(150 / 100) + 90, 92.9, 1e-3); // the equivalent 8-hour level
    });

    it('TWA: 4 h at 50 ppm and 4 h at 100 ppm average 75; unexposed time counts as zero', () => {
        close((50 * 4 + 100 * 4) / 8, 75); close((100 * 4) / 8, 50);
    });

    it('WBGT outdoors and indoors', () => {
        close(0.7 * 25 + 0.2 * 40 + 0.1 * 32, 28.7); close(0.7 * 25 + 0.3 * 40, 29.5);
    });
});

describe('Safety: PPE, ergonomics, ladders, risk', () => {
    it('NRR 29 earplugs in 100 dBA leave about 89 dBA at the ear', () => { close(100 - (29 - 7) / 2, 89); });

    it('glove classes rise with the class number', () => {
        const v = [0.5, 1, 7.5, 17, 26.5, 36]; expect(v.every((x, i) => i === 0 || x > v[i - 1])).toBe(true);
    });

    it('NIOSH: 23 kg at the reference posture; doubling the reach halves it', () => {
        const rwl = (H, V, D, A) => 23 * (25 / H) * (1 - 0.003 * Math.abs(V - 75)) * (0.82 + 4.5 / D) * (1 - 0.0032 * A);
        close(rwl(25, 75, 25, 0), 23); close(rwl(50, 75, 25, 0), 11.5);
        expect(15 / rwl(50, 75, 25, 0)).toBeGreaterThan(1); // a 15 kg lift at 50 cm reach is risky
    });

    it('4 up for 1 out is 76°; a quarter of the ladder\'s length out is 75.5°; a 6 m rest height needs its foot 1.5 m out', () => {
        close((atan(4) * 180) / PI, 75.96, 1e-3); close((Math.acos(0.25) * 180) / PI, 75.52, 1e-3); close(6 / 4, 1.5);
    });

    it('risk rating 4 × 5 = 20 tops a 5 × 5 matrix\'s high band', () => { expect(4 * 5).toBe(20); expect(5 * 5).toBe(25); });

    it('Heinrich and Bird ratios', () => { expect(1 + 29 + 300).toBe(330); expect(1 + 10 + 30 + 600).toBe(641); });
});

describe('Safety: electrical', () => {
    it('120 V across a wet hand (1 kΩ) drives 120 mA; dry skin (100 kΩ) only 1.2 mA', () => {
        close(120 / 1000, 0.12); close(120 / 100000, 0.0012);
        expect(120 / 1000).toBeGreaterThan(0.1); expect(120 / 100000).toBeLessThan(0.002);
    });

    it('Dalziel: 0.164 A for 0.5 s (50 kg); halving the time raises the limit by √2', () => {
        const I = (t, k = 0.116) => k / sqrt(t); close(I(0.5), 0.164, 1e-3); close(I(0.25) / I(0.5), sqrt(2), 1e-12);
        expect(I(0.5, 0.157)).toBeGreaterThan(I(0.5));
    });

    it('IEEE 80 limits: crushed rock (Cs 0.7, 2500 Ω·m), 0.5 s: 595 V touch, 1887 V step', () => {
        const k = 0.116 / sqrt(0.5); const touch = (1000 + 1.5 * 0.7 * 2500) * k; const step = (1000 + 6 * 0.7 * 2500) * k;
        close(touch, 594.7, 1e-3); close(step, 1886.6, 1e-3);
        close((1000 + 1.5 * 1 * 0) * k, 164.0, 1e-3); // bare soil-less limit: the body alone
    });
});

describe('Safety: records', () => {
    it('500 workers × 2000 h, 6 injuries, 300 days lost: FR 6, SR 300, 50 days each; OSHA rate 1.2', () => {
        const H = 500 * 2000; close((6 * 1e6) / H, 6); close((300 * 1e6) / H, 300); close(300 / 6, 50); close((6 * 200000) / H, 1.2);
    });
});

describe('Laws', () => {
    it('board exam: weights add to 100; 70% average with no subject under 50 passes', () => {
        const w = { Mathematics: 0.25, ESAS: 0.3, EE: 0.45 }; close(w.Mathematics + w.ESAS + w.EE, 1);
        const grade = (s) => { const avg = s.Mathematics * w.Mathematics + s.ESAS * w.ESAS + s.EE * w.EE; return avg >= 70 && Object.values(s).every((x) => x >= 50); };
        expect(grade({ Mathematics: 65, ESAS: 70, EE: 74 })).toBe(true); // 70.55 average
        expect(grade({ Mathematics: 48, ESAS: 80, EE: 78 })).toBe(false); // a subject under 50
        expect(grade({ Mathematics: 75, ESAS: 70, EE: 65 })).toBe(false); // 68.0 average
    });

    it('prescription periods are 10, 6 and 4 years; the RAs are in date order', () => {
        expect([10, 6, 4]).toEqual([10, 6, 4].sort((a, b) => b - a));
        const years = [1995, 2001, 2008, 2016, 2018, 2019]; expect(years).toEqual([...years].sort());
    });
});
