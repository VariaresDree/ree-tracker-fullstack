import { describe, it, expect } from 'vitest';

// EE › Electrical Apparatus & Devices formula cards, checked with numbers
// (Library round, 2026-11-19): the RC timer and capacitor discharge by
// simulating the capacitor; the primary resistor by complex impedance; a
// capacitor bank's kvar from its capacitance; resonance from the LC
// frequency; cable stress by integrating the field back to V and r = R/e by
// search; the adiabatic withstand by heating a conductor; AWG against known
// sizes; Peukert and LED decay; the rest against hand-worked values.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, log, exp, PI, hypot, E } = Math;

describe('Fuses, breakers, relays and starters', () => {
    it('adiabatic fuse: I²t constant; selectivity compares melting and clearing I²t', () => {
        const K = 50000; close(K / 1000 ** 2, 0.05); close((K / 2000 ** 2) / (K / 1000 ** 2), 0.25); expect(14000 > 5800).toBe(true);
    });

    it('MCB curves and contactor coil limits', () => {
        const trips = (curve, I, In) => ({ B: [3, 5], C: [5, 10], D: [10, 20] })[curve][1] * In <= I;
        expect(trips('C', 200, 16)).toBe(true); expect(trips('D', 200, 16)).toBe(false); close(0.85 * 230, 195.5);
    });

    it('RC timer: simulated charging reaches the threshold at RC ln(V/(V − Vth))', () => {
        const R = 100e3; const C = 10e-6; const V = 12; const Vth = 8; let vc = 0; let t = 0; const dt = 1e-5;
        while (vc < Vth) { vc += ((V - vc) / (R * C)) * dt; t += dt; }
        close(t, R * C * log(V / (V - Vth)), 1e-3); close(R * C * log(1 / (1 - 0.632)), R * C, 1e-3);
    });

    it('primary resistor limits the starting current to x of DOL (complex impedance)', () => {
        const Rm = 0.5; const Xm = 2.0; const x = 0.6; const Zm = hypot(Rm, Xm); const R = sqrt((Zm / x) ** 2 - Xm ** 2) - Rm;
        close(hypot(Rm + R, Xm), Zm / x, 1e-12); close((1 / hypot(Rm + R, Xm)) / (1 / Zm), x, 1e-12);
        close(7.2 * 20, 144);
    });
});

describe('Instrument transformers and capacitors', () => {
    it('billing multiplier and ratio correction', () => {
        close((200 / 5) * (14400 / 120), 4800); close(1.25 * 4800 * 1.002, 6012, 1e-9);
    });

    it('capacitor kvar scales with V² and f; a bank\'s capacitance gives back its kvar', () => {
        close(100 * (400 / 480) ** 2, 69.44, 1e-3); close(100 * (60 / 50), 120);
        const Q = 300e3; const VL = 480; const w = 2 * PI * 60;
        const CY = Q / (w * VL * VL); close(3 * w * CY * (VL / sqrt(3)) ** 2, Q, 1e-12);
        const CD = Q / (3 * w * VL * VL); close(3 * w * CD * VL * VL, Q, 1e-12); close(CY / CD, 3, 1e-12);
    });

    it('discharge resistor: simulated decay reaches 50 V in 60 s', () => {
        const C = 300e-6; const V0 = 480 * sqrt(2); const R = 60 / (C * log(V0 / 50)); let v = V0; const dt = 1e-3;
        for (let t = 0; t < 60; t += dt) v -= (v / (R * C)) * dt; close(v, 50, 2e-3);
    });

    it('resonance harmonic from the LC frequency; 7% detuning gives 3.78', () => {
        const Ssc = 20; const Qc = 1.2; const hr = sqrt(Ssc / Qc); const XL = 1 / Ssc; const XC = 1 / Qc; close(sqrt(XC / XL), hr, 1e-12); close(hr, 4.08, 1e-3);
        close(1 / sqrt(0.07), 3.78, 1e-3); close(1 / (1 - 0.07), 1.0753, 1e-4);
    });
});

describe('Arresters, busbars and cables', () => {
    it('lead-length voltage and busbar force', () => {
        close(1e-6 * 3 * 10e9 / 1e3, 30); close(0.2 * 50 ** 2 / 0.2, 2500); close(2e-7 * 50e3 ** 2 / 0.2, 2500, 1e-12);
    });

    it('AWG: #10 ≈ 2.59 mm, #4/0 ≈ 11.68 mm, 3 gauges double the area', () => {
        const d = (n) => 0.127 * 92 ** ((36 - n) / 39); close(d(10), 2.588, 1e-3); close(d(-3), 11.68, 1e-3); close((d(7) / d(10)) ** 2, 2, 2e-2);
    });

    it('cable withstand: heating a copper conductor adiabatically from 70 °C to 160 °C needs k ≈ 115', () => {
        // k² = Qc(B + 20)/ρ20 · ln((B + θf)/(B + θi)) with copper's constants (IEC 60949).
        const Qc = 3.45e-3; const B = 234.5; const rho20 = 17.241e-6; const k = sqrt((Qc * (B + 20) / rho20) * log((B + 160) / (B + 70)));
        close(k, 115, 1e-2); close((20000 * sqrt(0.5)) / 115, 123.0, 1e-3);
    });

    it('cable stress: integrating V/(x ln(R/r)) from r to R gives V; r = R/e minimizes the peak (searched)', () => {
        const V = 11; const r = 0.6; const R = 1.6; let sum = 0; const n = 100000;
        for (let i = 0; i < n; i += 1) { const x = r + ((i + 0.5) * (R - r)) / n; sum += (V / (x * log(R / r))) * ((R - r) / n); } close(sum, V, 1e-6);
        let best = Infinity; let at = 0; for (let rr = 0.05; rr < R; rr += 0.0001) { const g = V / (rr * log(R / rr)); if (g < best) { best = g; at = rr; } }
        close(at, R / E, 1e-3);
    });
});

describe('Batteries, UPS and lamps', () => {
    it('Peukert: faster discharge gives less time than C/I; UPS runtime', () => {
        const t = (I, k) => 20 * (100 / (I * 20)) ** k; close(t(5, 1.2), 20); expect(t(20, 1.2)).toBeLessThan(100 / 20); close(t(20, 1), 5);
        close((100 * 48 * 0.9 * 0.8) / 2000, 1.728, 1e-9); close(2000 / 0.8, 2500);
    });

    it('luminaire efficiency and LED L70 from an exponential decay', () => {
        close(3400 / 4000, 0.85); const a = -log(0.9) / 10000; close(log(1 / 0.7) / a, 33852, 1e-4); close(exp(-a * (log(1 / 0.7) / a)), 0.7, 1e-12);
    });
});
