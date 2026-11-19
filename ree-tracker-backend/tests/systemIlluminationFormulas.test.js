import { describe, it, expect } from 'vitest';

// EE › Electrical System & Illumination Design formula cards, checked with
// numbers (Library round, 2026-11-19): the cos³ law integrated over an
// infinite floor gives half the lamp's flux; a matte surface's luminance
// integrated over the hemisphere gives back ρE; the point-to-point multiplier
// equals an impedance solve; the MVA method equals ohms on a common base;
// the starting dip is an impedance divider; tapped loads by segments; the
// rest against hand-worked values.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, cos, sin, PI, atan, ceil } = Math;

describe('Loads, branch circuits and services', () => {
    it('small-appliance and laundry load, range demand, neutral', () => {
        close(1500 * (2 + 1), 4500);
        const range = (P) => (P <= 12 ? 8 : 8 * (1 + 0.05 * (ceil(P) - 12))); close(range(10), 8); close(range(16), 9.6);
        const neutral = (I) => (I <= 200 ? I : 200 + 0.7 * (I - 200)); close(neutral(350), 305);
    });

    it('branch circuits rounded up; transformer and service current', () => {
        close(ceil(24000 / (230 * 20)), 6); close(ceil((24000 * 1.25) / (230 * 20)), 7);
        close(400 / 0.85, 470.6, 1e-3); close(500e3 / (sqrt(3) * 400), 721.7, 1e-3);
    });
});

describe('Conductors, motors and voltage drop', () => {
    it('conductor size for a drop limit gives exactly that drop', () => {
        const K = 10.4; const I = 60; const L = 200; const VD = 0.03 * 230; const CM = (2 * K * I * L) / VD;
        close(2 * I * ((K * L) / CM), VD, 1e-12); close(CM, 36174, 1e-3);
    });

    it('locked-rotor current from code G; disconnect 115%; starting dip as an impedance divider', () => {
        close((6.29 * 50 * 1000) / (sqrt(3) * 460), 394.7, 1e-3); close(1.15 * 65, 74.75);
        const Ssc = 10000; const SLR = 2000; const Zs = 1 / Ssc; const Zm = 1 / SLR; close(Zm / (Zs + Zm), Ssc / (Ssc + SLR), 1e-12); close(1 - 10000 / 12000, 0.1667, 1e-3);
    });

    it('tapped loads: moments equal the sum of segment drops', () => {
        const loads = [[20, 30], [15, 60], [10, 100]]; const r = 0.005; const moments = 2 * r * loads.reduce((s, [I, L]) => s + I * L, 0);
        let segs = 0; let pos = 0; let I = loads.reduce((s, [i]) => s + i, 0); for (const [i, L] of loads) { segs += 2 * r * I * (L - pos); I -= i; pos = L; }
        close(moments, segs, 1e-12);
    });
});

describe('Short circuit and grounding', () => {
    it('point-to-point: 1/(1 + f) equals the impedance solve with f = Z_cable/Z_source', () => {
        const E = 480; const I1 = 30000; const Zs = E / sqrt(3) / I1; const Zc = 0.004; // ohms per phase of the run
        const f = (Zc * I1) / (E / sqrt(3)); close(I1 / (1 + f), E / sqrt(3) / (Zs + Zc), 1e-12);
        // With C = L/(n·Zc) the card's form gives the same f.
        const L = 100; const n = 1; const C = L / (n * Zc); close((sqrt(3) * L * I1) / (C * n * E), f, 1e-12);
    });

    it('MVA method equals ohms on a common base; motor contribution', () => {
        const util = 500; const xfmr = 2 / 0.06; const total = 1 / (1 / util + 1 / xfmr);
        const Zpu = 100 / util + (100 / 2) * 0.06; close(100 / Zpu, total, 1e-12); close(4 * 300, 1200);
    });

    it('rods in parallel and the 25 Ω rule', () => {
        close((40 / 2) * 1.2, 24); expect(40 > 25).toBe(true); expect((40 / 2) * 1.2 <= 25).toBe(true);
    });
});

describe('Lighting', () => {
    it('cos³ law integrated over an infinite floor collects 2πI, half the flux of an isotropic lamp', () => {
        const I = 1000; const h = 3; let total = 0; const n = 200000; const R = 3000;
        for (let k = 0; k < n; k += 1) { const rr = ((k + 0.5) * R) / n; const th = atan(rr / h); total += ((I * cos(th) ** 3) / (h * h)) * 2 * PI * rr * (R / n); }
        close(total, 2 * PI * I, 2e-3); close((4 * PI * I) / 2, 2 * PI * I);
        close((I * cos(PI / 4) ** 3) / 9, (I * cos(PI / 4)) / (h / cos(PI / 4)) ** 2, 1e-12);
        close((I * sin(PI / 6) * cos(PI / 6) ** 2) / 9, 41.67, 1e-3);
    });

    it('a matte surface\'s luminance over the hemisphere returns ρE', () => {
        const rho = 0.7; const E = 500; const L = (rho * E) / PI; let M = 0; const n = 100000;
        for (let k = 0; k < n; k += 1) { const th = ((k + 0.5) * (PI / 2)) / n; M += L * cos(th) * sin(th) * 2 * PI * ((PI / 2) / n); }
        close(M, rho * E, 1e-6);
    });

    it('room cavity ratio = 5 / room index; lumen method with the light loss factor', () => {
        const L = 20; const W = 10; const h = 2.5; const RCR = (5 * h * (L + W)) / (L * W); const K = (L * W) / (h * (L + W)); close(RCR, 5 / K, 1e-12); close(RCR, 1.875);
        const LLF = 0.9 * 0.85; const N = ceil((500 * L * W) / (4000 * 0.6 * LLF)); expect(N).toBe(55); close(1.25 * 2.5, 3.125);
    });

    it('energy cost, emergency battery, LPD and payback', () => {
        close((36 * 100 * 3000 * 10) / 1000, 108000); close((200 * 1.5) / (12 * 0.8), 31.25);
        close(1600 / 200, 8); close(60000 / (((40 - 18) * 100 * 3000 * 10) / 1000), 0.909, 1e-3);
    });
});
