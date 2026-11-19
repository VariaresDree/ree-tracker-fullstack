import { describe, it, expect } from 'vitest';

// EE › Quantities/units/constants formula cards, checked with numbers
// (Library round, 2026-11-19): every unit identity by its base-unit
// dimensions; the CGS units from their force definitions; resistivity, wire
// and magnetic conversions from the inch, the circular mil and 4π; drawn
// wire and resistance-from-mass from constant volume; temperature
// coefficients from the inferred-zero line; series and parallel conductors
// from their resistances; AWG sizes from the AWG diameter rule; the rest
// from SI constants.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, PI } = Math;
const e = 1.602176634e-19; const h = 6.62607015e-34; const me = 9.1093837015e-31; const kC = 8.9875517923e9; const mu0 = 4e-7 * PI;
const IN = 0.0254; const FT = 0.3048; const CMIL = (PI / 4) * (1e-3 * IN) ** 2; const RHO_CU = 1.7241e-8;

describe('SI electrical units and prefixes', () => {
    // Dimensions as [kg, m, s, A].
    const dim = { V: [1, 2, -3, -1], ohm: [1, 2, -3, -2], F: [-1, -2, 4, 2], H: [1, 2, -2, -2], Wb: [1, 2, -2, -1], T: [1, 0, -2, -1], C: [0, 0, 1, 1], J: [1, 2, -2, 0], W: [1, 2, -3, 0], s: [0, 0, 1, 0], m2: [0, 2, 0, 0] };
    const mul = (...xs) => xs.reduce((a, b) => a.map((x, i) => x + b[i])); const inv = (a) => a.map((x) => -x); const half = (a) => a.map((x) => x / 2);

    it('Ω·F = H/Ω = √(H·F) = s; Wb = V·s; J = C·V = W·s; T = Wb/m²', () => {
        expect(mul(dim.ohm, dim.F)).toEqual(dim.s); expect(mul(dim.H, inv(dim.ohm))).toEqual(dim.s); expect(half(mul(dim.H, dim.F))).toEqual(dim.s);
        expect(mul(dim.V, dim.s)).toEqual(dim.Wb); expect(mul(dim.C, dim.V)).toEqual(dim.J); expect(mul(dim.W, dim.s)).toEqual(dim.J); expect(mul(dim.Wb, inv(dim.m2))).toEqual(dim.T);
        close(3600 * 1, 3600);
    });

    it('CGS units from their definitions: 2 dyn/cm between wires 1 cm apart is 1 abA; 1 dyn between 1 statC charges 1 cm apart', () => {
        const abA = sqrt((2e-5 / 1e-2) * 0.01 / 2e-7); close(abA, 10, 1e-12);
        const statC = sqrt((1e-5 * 0.01 ** 2) / kC); close(statC, 3.336e-10, 1e-3); close(1e-7 / statC, 299.79, 1e-4);
        close(1e-7 / (10 * 1), 1e-8); close(1e-8 / 10, 1e-9); close((10 / statC) / 100, 299792458, 1e-4); // abC/statC = c in cm/s
    });

    it('Josephson and von Klitzing constants from the exact e and h', () => {
        close((2 * e) / h / 1e9, 483597.848, 1e-9); close(h / e ** 2, 25812.807, 1e-7);
    });

    it('prefix products: exponents add', () => {
        const p = { k: 3, m: -3, M: 6, u: -6, n: -9 };
        expect(p.k + p.m).toBe(0); expect(p.k + p.u).toBe(-3); expect(p.M + p.u).toBe(0); expect(p.m - p.k).toBe(-6); expect(-p.u).toBe(6); expect(p.k + p.m).toBe(0);
        close(47e3 / 1e3, 47); close(0.00022 / 1e-6, 220, 1e-12);
    });
});

describe('Resistivity, conductivity and temperature', () => {
    it('Ω·cmil/ft in Ω·m from the inch; copper 10.37, aluminium 17.0; %IACS', () => {
        close(CMIL / FT, 1.6624e-9, 1e-4); close(RHO_CU / (CMIL / FT), 10.37, 1e-3); close(2.83e-8 / (CMIL / FT), 17.02, 1e-3);
        close(1 * 1e6, 1e6); close(RHO_CU * 1e6, 0.0172, 3e-3); close((RHO_CU / 2.83e-8) * 100, 60.9, 1e-3); close((RHO_CU / 1.59e-8) * 100, 108.4, 1e-3);
    });

    it('conductance, drawn wire at constant volume, resistance from mass', () => {
        const sigma = 1 / RHO_CU; close((sigma * 2.5e-6) / 100, 1 / ((RHO_CU * 100) / 2.5e-6), 1e-12);
        const L1 = 10; const A1 = 1e-6; const R = (L, A) => (RHO_CU * L) / A; const L2 = 2 * L1; const A2 = (A1 * L1) / L2;
        close(R(L2, A2) / R(L1, A1), 4, 1e-12); const d1 = sqrt(A1); const d2 = sqrt(A2); close((d1 / d2) ** 4, 4, 1e-12);
        const dens = 8890; const m = 1; const L = 100; const A = m / (dens * L); close(R(L, A), (RHO_CU * dens * L ** 2) / m, 1e-12); close(R(L, A), 1.533, 1e-3);
        close((RHO_CU * 8890) / (2.83e-8 * 2700), 2.0, 1e-2);
    });

    it('α from the inferred zero; changing the reference; R at another temperature', () => {
        const T0 = 234.5; close(1 / (T0 + 20), 0.00393, 1e-3); close(1 / T0, 0.004264, 1e-3); close(1 / (228 + 20), 0.00403, 1e-3);
        const a0 = 1 / T0; close(a0 / (1 + a0 * 20), 1 / (T0 + 20), 1e-12); const a20 = 1 / (T0 + 20); close(a20 / (1 + a20 * 55), 1 / (T0 + 75), 1e-12);
        const R20 = 10; close(R20 * (1 + a20 * (75 - 20)), (R20 * (T0 + 75)) / (T0 + 20), 1e-12); close((T0 + 70) / (T0 + 20), 1.196, 1e-3);
    });

    it('series coefficient exact; parallel coefficient to first order', () => {
        const R1 = 10; const a1 = 0.00393; const R2 = 30; const a2 = -0.0005; const t = 1e-3;
        const Rs = (x) => R1 * (1 + a1 * x) + R2 * (1 + a2 * x); close((Rs(t) / Rs(0) - 1) / t, (a1 * R1 + a2 * R2) / (R1 + R2), 1e-9);
        const Rp = (x) => 1 / (1 / (R1 * (1 + a1 * x)) + 1 / (R2 * (1 + a2 * x))); close((Rp(t) / Rp(0) - 1) / t, (a1 * R2 + a2 * R1) / (R1 + R2), 1e-5);
    });
});

describe('Magnetic units and wire sizes', () => {
    it('oersted, gilbert, lines per square inch, and μ₀ in CGS and English units', () => {
        const Hsi = 1 / 0.01; close(Hsi / (0.4 * PI), 1000 / (4 * PI), 1e-12); close(1000 / (4 * PI), 79.58, 1e-4); close(1 / (0.4 * PI), 0.7958, 1e-4);
        close(1e8 * IN ** 2, 64516, 1e-9); close((mu0 * 1e8 * IN ** 2) / IN, 3.192, 1e-3);
        close(mu0 * (1000 / (4 * PI)) * 1e4, 1, 1e-12); // 1 Oe in air gives 1 G
    });

    it('AWG: three gauges double the area, ten about ×10; table areas and #10 copper at about 1 Ω/1000 ft', () => {
        const d = (n) => 0.127 * 92 ** ((36 - n) / 39); const A = (n) => (PI / 4) * d(n) ** 2;
        close(A(7) / A(10), 2, 1e-2); close(A(0) / A(10), 10, 2e-2); close(2 ** (1 / 3), 1.26, 1e-3);
        const table = [[14, 2.08], [12, 3.31], [10, 5.26], [8, 8.37], [6, 13.3], [4, 21.2], [2, 33.6], [0, 53.5], [-3, 107.2]];
        for (const [n, a] of table) close(A(n), a, 4e-3);
        close((d(-3) / 1e3 / (1e-3 * IN)) ** 2, 211600, 1e-3); close((RHO_CU * 1000 * FT) / (A(10) * 1e-6), 1.0, 2e-3);
    });

    it('kcmil and mm²; resistance per kilometre', () => {
        close(1000 * CMIL * 1e6, 0.5067, 1e-4); close(1e-6 / CMIL, 1973.5, 1e-4); close(500 * 0.5067, 253.4, 1e-3);
        close((RHO_CU * 1000) / 1e-6, 17.24, 1e-3); close((2.83e-8 * 1000) / 1e-6, 28.3, 1e-9);
    });
});

describe('Power, energy and constants', () => {
    it('motor current, energy cost, water heating, calories', () => {
        close((746 * 50) / (sqrt(3) * 460 * 0.9 * 0.85), 61.2, 1e-3); close(1.5 * 0.5, 0.75);
        close(3.6e6 / 4186, 860, 1e-3); close((50 * 4186 * 50) / (0.9 * 2000), 5814, 1e-3); close(1 / 4.186, 0.2389, 1e-3);
    });

    it('electron e/m and the speed after 1 V', () => {
        close(e / me, 1.75882e11, 1e-5); close(sqrt((2 * e * 1) / me), 5.931e5, 1e-3);
    });
});
