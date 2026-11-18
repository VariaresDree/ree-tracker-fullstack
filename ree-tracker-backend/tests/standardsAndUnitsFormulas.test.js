import { describe, it, expect } from 'vitest';

// ESAS › Electrical Standards & Practices and Quantities/units/constants
// formula cards, checked with numbers (Library round, 2026-11-18). The PEC
// rules are worked through board-style cases and, where there is physics
// behind them, against it: voltage drop and fault current from phasors and
// per-unit ohms, the ground rod from the average-potential integral, sag from
// the catenary. Every conversion factor is rebuilt from its definition.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, log, cos, sin, PI, hypot, cosh, asinh } = Math;
const STD = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600];
const nextUp = (x) => STD.find((s) => s >= x);
const nextDown = (x) => [...STD].reverse().find((s) => s <= x);

describe('PEC: loads and currents', () => {
    it('continuous load: 16 A continuous + 4 A other needs 24 A, so a 25 A breaker', () => {
        close(1.25 * 16 + 4, 24); expect(nextUp(24)).toBe(25);
    });

    it('three-phase current: S/(√3 V_L), with √3 from the phasors', () => {
        const Vph = 230 / sqrt(3); const Va = [Vph, 0]; const Vb = [Vph * cos(-2 * PI / 3), Vph * sin(-2 * PI / 3)];
        close(hypot(Va[0] - Vb[0], Va[1] - Vb[1]), 230, 1e-12);
        const I = 50000 / (sqrt(3) * 230); close(3 * Vph * I, 50000, 1e-12); close(I, 125.5, 1e-3);
    });

    it('dwelling demand: 100% of 3000 VA, 35% to 120 kVA, 25% beyond', () => {
        const demand = (va) => Math.min(va, 3000) + 0.35 * Math.max(0, Math.min(va, 120000) - 3000) + 0.25 * Math.max(0, va - 120000);
        expect([demand(2000), demand(10000), demand(150000)]).toEqual([2000, 5450, 51450]);
        const lighting = 120 * 24 + 2 * 1500 + 1500; expect(lighting).toBe(7380); close(demand(lighting), 4533);
    });

    it('receptacles: 80 outlets at 180 VA, the part over 10 kVA at 50%', () => {
        const s = 80 * 180; expect(s).toBe(14400); expect(10000 + 0.5 * (s - 10000)).toBe(12200);
    });
});

describe('PEC: voltage drop and fault current', () => {
    it('single-phase: 2IR′L is the drop across both wires of the loop', () => {
        const I = 20; const R = 5.2; const L = 0.04; // Ω/km, km
        const out = I * R * L; const back = I * R * L; close(out + back, 2 * I * R * L);
        close((2 * I * R * L) / 230 * 100, 3.62, 1e-3); // over 3%: go up a size
        expect((2 * I * 3.3 * L) / 230 * 100).toBeLessThan(3); // 3.3 Ω/km gives 2.3%
    });

    it('three-phase: a phasor calculation of the line-to-line drop matches √3 I L (R′cosθ + X′sinθ) for small drops', () => {
        const V = 400; const Vph = V / sqrt(3); const I = 100; const R = 0.0524; const X = 0.0094; const th = Math.acos(0.85);
        const Ia = [I * cos(-th), I * sin(-th)]; // phase current, lagging
        const dropPh = [Ia[0] * R - Ia[1] * X, Ia[0] * X + Ia[1] * R]; // (R + jX)·I
        const recv = hypot(Vph - dropPh[0], -dropPh[1]);
        const exactLL = sqrt(3) * (Vph - recv); const approx = sqrt(3) * I * (R * cos(th) + X * sin(th));
        close(exactLL, approx, 2e-3);
    });

    it('fault current: 500 kVA, 5%, 230 V three-phase gives 25 kA, the same as in ohms', () => {
        const S = 500e3; const V = 230; const IFL = S / (sqrt(3) * V);
        const viaPu = IFL / 0.05; const Z = 0.05 * (V * V) / S; const viaOhms = V / sqrt(3) / Z;
        close(viaPu, viaOhms, 1e-12); close(viaPu, 25.1e3, 1e-2);
    });
});

describe('PEC: motors, transformers, capacitors', () => {
    const flc = [28, 17, 11];

    it('three motors: branch 35 A, feeder 63 A, breaker 70 A, feeder breaker 90 A', () => {
        close(1.25 * 28, 35); close(1.25 * Math.max(...flc) + 17 + 11, 63);
        const branch = nextUp(2.5 * 28); expect(branch).toBe(70);
        expect(nextDown(branch + 17 + 11)).toBe(90);
    });

    it('overloads 125% / 115%; the four short-circuit device limits', () => {
        close(1.25 * 20, 25); close(1.15 * 20, 23);
        expect([3, 1.75, 8, 2.5].map((k) => k * 20)).toEqual([60, 35, 160, 50]);
    });

    it('a 75 kVA, 480 V transformer: primary 90.2 A, primary-only fuse 125 A', () => {
        const Ip = 75000 / (sqrt(3) * 480); close(Ip, 90.21, 1e-3); expect(nextUp(1.25 * Ip)).toBe(125);
        close(2.5 * Ip, 225.5, 1e-3);
    });

    it('PV: 125% × 125% = 156% of Isc; welder multipliers are √(duty cycle) rounded', () => {
        close(1.25 * 1.25, 1.5625); close(1.5625 * 10, 15.625);
        const table = { 0.9: 0.95, 0.8: 0.89, 0.7: 0.84, 0.6: 0.78, 0.5: 0.71, 0.4: 0.63, 0.3: 0.55, 0.2: 0.45 };
        for (const [d, m] of Object.entries(table)) expect(Math.abs(sqrt(Number(d)) - m)).toBeLessThan(0.006);
        close(50 * 0.78, 39);
    });

    it('a 50 kvar, 400 V capacitor: 72.2 A, conductors for 97.4 A', () => {
        const Ic = 50000 / (sqrt(3) * 400); close(Ic, 72.17, 1e-3); close(1.35 * Ic, 97.43, 1e-3);
    });
});

describe('PEC: wiring methods, grounding, Part 2', () => {
    it('ampacity: 50 A × 0.91 × 0.80 = 36.4 A; conduit fill limits', () => {
        close(50 * 0.91 * 0.8, 36.4);
        expect((3 * 20) / 150).toBeLessThanOrEqual(0.4); expect((2 * 30) / 150).toBeGreaterThan(0.31);
    });

    it('ground rod: Dwight\'s formula against the average-potential integral of a line source and its image', () => {
        const rho = 100; const L = 3; const a = 0.008;
        const dwight = (rho / (2 * PI * L)) * (log((4 * L) / a) - 1); close(dwight, 33.5, 1e-2);
        // V(z) on the rod surface from a uniform line current I/L over [0, L] plus its image over [−L, 0].
        const segV = (z) => asinh((L - z) / a) + asinh((z + L) / a); // ∫_{-L}^{L} dz'/√(a² + (z − z')²)
        let avg = 0; const n = 4000; for (let k = 0; k < n; k += 1) avg += segV(((k + 0.5) / n) * L) / n;
        const R = (rho / (4 * PI * L)) * avg; // per unit current
        close(R, dwight, 3e-2);
        expect((rho / (2 * PI * 2 * L)) * (log((8 * L) / a) - 1)).toBeLessThan(0.6 * dwight); // doubling length
        expect((rho / (2 * PI * L)) * (log((4 * L) / (2 * a)) - 1)).toBeGreaterThan(0.85 * dwight); // doubling radius
    });

    it('sag: the parabola wL²/8T matches the catenary for a shallow span', () => {
        const w = 5; const L = 100; const T = 10000;
        const cat = (T / w) * (cosh((w * L) / (2 * T)) - 1); close((w * L * L) / (8 * T), cat, 1e-3); close(cat, 0.625, 1e-3);
    });

    it('insulation classes rise A < E < B < F < H; IP digits', () => {
        const cls = [105, 120, 130, 155, 180]; expect(cls.every((t, i) => i === 0 || t > cls[i - 1])).toBe(true);
        expect('IP65'.slice(2).split('').map(Number)).toEqual([6, 5]);
    });
});

describe('Units: conversions rebuilt from definitions', () => {
    it('length, area, volume', () => {
        close(12 * 2.54, 30.48); close(5280 * 0.3048, 1609.344, 1e-12); close(43560 * 0.3048 ** 2, 4046.86, 1e-6);
        close(231 * 2.54 ** 3 / 1000, 3.78541, 1e-6); close((1e-2) ** 2, 1e-4);
    });

    it('force and pressure: lbf, psi, atm, mmHg', () => {
        const lbf = 0.45359237 * 9.80665; close(lbf, 4.44822, 1e-6);
        const psi = lbf / 0.0254 ** 2; close(psi, 6894.76, 1e-6); close(101325 / psi, 14.696, 1e-4);
        close(13595.1 * 9.80665 * 0.76, 101325, 1e-5);
    });

    it('power: hp = 550 ft·lbf/s = 745.7 W; PS = 75 kgf·m/s; boiler hp', () => {
        close(550 * 0.3048 * 4.4482216, 745.7, 1e-4); close(75 * 9.80665, 735.5, 1e-4); close(1 / 0.7457, 1.341, 1e-3);
        close(33475 * 1055.06 / 3600, 9810, 1e-3);
    });

    it('energy: BTU from the pound and the IT calorie; kWh in BTU; eV', () => {
        close(453.59237 * 4.1868 * (5 / 9), 1055.06, 1e-5); close(3.6e6 / 1055.06, 3412.1, 1e-4);
    });

    it('torque and speed: 9549 = 60000/2π, 5252 = 33000/2π; 100 N·m at 1800 rpm is 18.85 kW', () => {
        close(60000 / (2 * PI), 9549.3, 1e-5); close(33000 / (2 * PI), 5252.1, 1e-5);
        close((100 * 2 * PI * 1800) / 60, 18850, 1e-4); close((100 * 1800) / 9549.3, 18.85, 1e-3);
    });

    it('temperature differences carry no offset', () => {
        const C2F = (c) => 1.8 * c + 32; close(C2F(30) - C2F(20), 18); close((30 + 273.15) - (20 + 273.15), 10, 1e-12);
    });

    it('binary prefixes: a 10¹² byte drive is 0.909 TiB', () => { close(1e12 / 2 ** 40, 0.9095, 1e-4); });
});

describe('Units: constants and dimensions', () => {
    it('mp/me = 1836.15; g from G·M/R²; the molar volumes; water and air', () => {
        close(1.67262e-27 / 9.10938e-31, 1836.15, 1e-5);
        close((6.674e-11 * 5.972e24) / 6.371e6 ** 2, 9.82, 1e-3);
        close((8.314462 * 273.15) / 101325 * 1000, 22.414, 1e-4); close((8.314462 * 273.15) / 1e5 * 1000, 22.711, 1e-4);
        close((8.314462 * 298.15) / 1e5 * 1000, 24.79, 1e-3);
        close(2 * 1.008 + 15.999, 18.015, 1e-4);
        close(0.78084 * 28.014 + 0.20946 * 31.998 + 0.00934 * 39.948 + 0.0004 * 44.01, 28.96, 1e-3);
    });

    it('dimensions as exponent vectors [M, L, T, I]: the volt and the ohm', () => {
        const mul = (a, b, s = 1) => a.map((x, i) => x + s * b[i]);
        const N = [1, 1, -2, 0]; const J = mul(N, [0, 1, 0, 0]); const W = mul(J, [0, 0, 1, 0], -1);
        const V = mul(W, [0, 0, 0, 1], -1); const Ohm = mul(V, [0, 0, 0, 1], -1);
        expect(V).toEqual([1, 2, -3, -1]); expect(Ohm).toEqual([1, 2, -3, -2]);
    });

    it('Buckingham: a pendulum has 4 variables, 3 dimensions, one group T√(g/L), and mass drops out', () => {
        // [M, L, T] exponents of period T, length L, gravity g, mass m
        const dims = { T: [0, 0, 1], L: [0, 1, 0], g: [0, 1, -2], m: [1, 0, 0] };
        const group = { T: 2, g: 1, L: -1, m: 0 }; // T²g/L
        const total = [0, 1, 2].map((k) => Object.keys(group).reduce((s, q) => s + group[q] * dims[q][k], 0));
        expect(total).toEqual([0, 0, 0]); expect(4 - 3).toBe(1);
    });
});
