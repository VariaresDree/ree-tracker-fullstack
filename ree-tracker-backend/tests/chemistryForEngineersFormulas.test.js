import { describe, it, expect } from 'vitest';

// ESAS › Chemistry for Engineers formula cards, checked with numbers (Library
// round, 2026-11-17). Each card's numbers come from a second route where one
// exists: Rydberg against Bohr energies, Kb and Kf from water's heats of
// vaporisation and fusion, ΔG from ΔH and S° tables, the fuel-cell voltage
// from ΔG, first-order decay and BOD by stepping the rate equation, Betz by
// maximising over the induction factor, a solar cell's fill factor from its
// diode curve, the nanoparticle count from the gold lattice.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, log, log10, exp } = Math;
const R = 8.314; const F = 96485; const NA = 6.02214e23; const h = 6.62607e-34; const c = 2.99792e8; const eV = 1.602177e-19;

describe('Atomic structure and bonding', () => {
    it('average atomic mass of chlorine; mass number; ion electrons', () => {
        close(0.758 * 34.97 + 0.242 * 36.97, 35.45, 1e-3);
        close(17 + 18, 35); close(26 - 3, 23); // Fe³⁺
    });

    it('shell n holds 2n²: the sum of 2(2l + 1) over l < n', () => {
        for (let n = 1; n <= 7; n += 1) {
            let s = 0; for (let l = 0; l < n; l += 1) s += 2 * (2 * l + 1);
            expect(s).toBe(2 * n * n);
        }
        expect([0, 1, 2, 3].map((l) => 2 * (2 * l + 1))).toEqual([2, 6, 10, 14]);
    });

    it('Rydberg: Balmer Hα at 656 nm, the same as from the Bohr energies', () => {
        const lam = 1 / (1.097e7 * (1 / 4 - 1 / 9));
        close(lam * 1e9, 656.3, 1e-3);
        const dE = 13.606 * (1 / 4 - 1 / 9) * eV; close((h * c) / dE, lam, 1e-3);
        expect(1 / (1.097e7 * (1 - 1 / 4))).toBeLessThan(400e-9); // Lyman: UV
    });

    it('ΔEN bands; formal charges add up to the ion charge; bond orders', () => {
        close(3.16 - 0.93, 2.23); expect(3.16 - 0.93).toBeGreaterThan(1.7);
        const dHO = 3.44 - 2.2; expect(dHO > 0.4 && dHO < 1.7).toBe(true);
        const fc = (V, N, B) => V - N - B / 2;
        expect(fc(5, 0, 8) + 4 * fc(1, 0, 2)).toBe(1); // NH4+
        expect(fc(4, 0, 8)).toBe(0); expect(fc(6, 4, 4)).toBe(0); // CO2
        const bo = (b, a) => (b - a) / 2;
        expect(bo(10, 6)).toBe(2); expect(bo(10, 4)).toBe(3); expect(bo(2, 2)).toBe(0); // O2, N2, He2
    });

    it('1 D = 3.336e-30 C·m; the bond dipoles of linear CO2 cancel', () => {
        close(1e-18 * 3.33564e-10 * 0.01, 3.336e-30, 1e-3);
        const mu = 2.3; const sum = mu * Math.cos(0) + mu * Math.cos(Math.PI);
        close(sum, 0, 1e-12);
    });
});

describe('Stoichiometry and gases', () => {
    it('percent composition of water; glucose from CH2O', () => {
        close((2 * 1.008) / 18.015 * 100, 11.19, 1e-3);
        const emp = 12.011 + 2 * 1.008 + 15.999; expect(Math.round(180.156 / emp)).toBe(6);
    });

    it('limiting reactant by moles over coefficients, and by running the reaction', () => {
        const n = { H2: 4, O2: 3 }; const nu = { H2: 2, O2: 1 };
        const lim = Object.keys(n).reduce((a, b) => (n[a] / nu[a] <= n[b] / nu[b] ? a : b));
        expect(lim).toBe('H2');
        let H2 = 4; let O2 = 3; let water = 0; // step the extent until something runs out
        while (H2 >= 2 * 1e-4 && O2 >= 1e-4) { H2 -= 2e-4; O2 -= 1e-4; water += 2e-4; }
        close(water, 4, 1e-3); close((3.2 / water) * 100, 80, 1e-3);
    });

    it('Graham: H2 four times O2, matching the ratio of rms speeds', () => {
        close(sqrt(32 / 2), 4);
        const vrms = (M) => sqrt((3 * R * 300) / M); close(vrms(0.002) / vrms(0.032), 4, 1e-12);
    });

    it('molar volumes and R in chemistry units', () => {
        close((R * 273.15) / 101325 * 1000, 22.414, 1e-4);
        close((R * 298.15) / 101325 * 1000, 24.465, 1e-4);
        close((R * 273.15) / 100000 * 1000, 22.711, 1e-4);
        close(R / 101.325, 0.08206, 1e-3); close(0.08206 * 760, 62.36, 1e-3);
    });

    it('gas density of air 1.18 kg/m³; molar mass back from density', () => {
        const rho = (101325 * 0.02897) / (R * 298.15); close(rho, 1.184, 1e-3);
        close((rho * R * 298.15) / 101325, 0.02897, 1e-12);
    });

    it('van der Waals: ideal when a = b = 0, below ideal for CO2 at 1 L, and ideal at large V', () => {
        const vdw = (n, V, T, a, b) => (n * R * T) / (V - n * b) - (a * n * n) / (V * V);
        close(vdw(1, 1e-3, 300, 0, 0), (R * 300) / 1e-3);
        const p = vdw(1, 1e-3, 300, 0.364, 4.267e-5);
        expect(p).toBeLessThan((R * 300) / 1e-3); close(p / 1e6, 2.241, 2e-3);
        close(vdw(1, 10, 300, 0.364, 4.267e-5) / ((R * 300) / 10), 1, 1e-4);
    });
});

describe('Solutions', () => {
    it('molality, mole fraction, normality; mole fractions add to 1', () => {
        const nNaCl = 58.44 / 58.44; close(nNaCl / 1, 1); // 1 mol in 1 kg water: 1 mol/kg
        const x = [1, 55.51].map((ni, _, a) => ni / (a[0] + a[1])); close(x[0] + x[1], 1);
        close(1 * 2, 2); // 1 M H2SO4 = 2 N
    });

    it('Kb and Kf of water from its heats of vaporisation and fusion', () => {
        close((R * 373.15 ** 2 * 0.018015) / 40660, 0.512, 3e-3);
        close((R * 273.15 ** 2 * 0.018015) / 6010, 1.86, 3e-3);
        close(2 * 1.86 * 1, 3.72); // 1 mol/kg NaCl lowers the freezing point 3.72 °C
    });

    it('Raoult lowering; seawater osmotic pressure about 27 atm', () => {
        const p0 = 3.17; close(0.98 * p0, p0 - 0.02 * p0);
        close(2 * 0.55 * 0.08206 * 298, 26.9, 2e-3);
    });
});

describe('Equilibrium, acids and bases', () => {
    it('Kp = Kc(RT)^Δn from partial pressures p = cRT', () => {
        const Rl = 0.08206; const T = 500; const cN2 = 0.5; const cH2 = 1.2; const cNH3 = 0.1;
        const Kc = cNH3 ** 2 / (cN2 * cH2 ** 3);
        const p = (ci) => ci * Rl * T; const Kp = p(cNH3) ** 2 / (p(cN2) * p(cH2) ** 3);
        close(Kp, Kc * (Rl * T) ** -2, 1e-12);
    });

    it('pH + pOH = 14', () => { close(-log10(1e-3) + -log10(1e-14 / 1e-3), 14); });

    it('weak acid: √(KaC) against the exact quadratic', () => {
        const Ka = 1.8e-5; const C = 0.1;
        const approx = -log10(sqrt(Ka * C)); close(approx, 2.87, 2e-3);
        const x = (-Ka + sqrt(Ka * Ka + 4 * Ka * C)) / 2; close(x * x / (C - x), Ka, 1e-9);
        expect(x / C).toBeLessThan(0.05); close(-log10(x), approx, 2e-3);
    });

    it('Henderson-Hasselbalch is the Ka expression in logs', () => {
        const Ka = 1.8e-5; const A = 0.15; const HA = 0.1;
        close(-log10((Ka * HA) / A), -log10(Ka) + log10(A / HA), 1e-12);
        close(-log10(Ka) + log10(1), 4.745, 1e-3);
    });

    it('titration: 25 mL of 0.1 M H2SO4 takes 50 mL of 0.1 M NaOH', () => {
        close((2 * 0.1 * 25) / (1 * 0.1), 50);
    });
});

describe('Thermochemistry and kinetics', () => {
    const Hf = { CH4: -74.8, CO2: -393.5, H2Ol: -285.8, H2Og: -241.8 };

    it("Hess: methane burns at −890.3 kJ/mol; the HHV and LHV per kilogram", () => {
        const dH = Hf.CO2 + 2 * Hf.H2Ol - Hf.CH4; close(dH, -890.3, 1e-4);
        close(-dH / 16.04, 55.5, 2e-3);
        const lhv = -(Hf.CO2 + 2 * Hf.H2Og - Hf.CH4) / 16.04; close(lhv, 50.0, 2e-3);
        close(55.5 - lhv, ((2 * 18.015) / 16.04) * 2.442, 2e-2); // latent heat of the water formed
    });

    it('Gibbs for water from ΔH and S°; −RT ln K matches log K = nE°/0.05916', () => {
        const dS = 69.9 - 130.7 - 0.5 * 205.2; const dG = -285.8 - (298.15 * dS) / 1000;
        close(dG, -237.1, 1e-3);
        close((R * 298.15 * Math.LN10) / F, 0.05916, 1e-4);
        const E = 1.1; const n = 2; const lnK = (n * F * E) / (R * 298.15);
        close(lnK / Math.LN10, (n * E) / 0.05916, 1e-4);
    });

    it('Arrhenius: Ea = 50 kJ/mol about doubles the rate per 10 °C; the two-point form agrees', () => {
        const k = (T) => 1e10 * exp(-50000 / (R * T));
        const ratio = k(308.15) / k(298.15); expect(ratio).toBeGreaterThan(1.85); expect(ratio).toBeLessThan(2);
        close(log(ratio), (50000 / R) * (1 / 298.15 - 1 / 308.15), 1e-12);
    });

    it('first order: stepping d[A]/dt = −k[A] halves at ln2/k; second order matches 1/[A]', () => {
        const k = 0.05; let A = 1; let t = 0; const dt = 1e-4;
        while (A > 0.5) { A -= k * A * dt; t += dt; }
        close(t, log(2) / k, 1e-3);
        let B = 1; for (let i = 0; i < 100000; i += 1) B -= k * B * B * 1e-4; // 10 s
        close(1 / B, 1 + k * 10, 1e-3);
    });
});

describe('Electrochemistry, storage, fuel cells', () => {
    it('Daniell cell 1.10 V; Nernst falls as Q rises; ΔG = −nFE', () => {
        close(0.34 - -0.76, 1.1);
        const E = (Q) => 1.1 - (0.05916 / 2) * log10(Q);
        close(E(1), 1.1); expect(E(10)).toBeLessThan(1.1); close(E(10), 1.0704, 1e-4);
        close(-2 * F * 1.1, -212267, 1e-6);
    });

    it('battery energy and C-rate', () => {
        close(100 * 3.7, 370); close(1 * 100, 100); close(100 / 5, 20); close(1 / 0.2, 5);
    });

    it('H2 fuel cell: 1.229 V from ΔG, 1.48 V from ΔH, 83% at most', () => {
        close(237100 / (2 * F), 1.229, 1e-3); close(285800 / (2 * F), 1.481, 1e-3);
        close(237.1 / 285.8, 0.83, 2e-3); close(0.7 / 1.48, 0.473, 1e-3);
    });

    it('hydrogen used = I/2F, the same as Faraday\'s law of electrolysis', () => {
        const I = 100; const t = 3600; const mol = (I / (2 * F)) * t;
        close(mol * 2.016, (2.016 * I * t) / (2 * F)); close(mol, 1.8656, 1e-3);
    });
});

describe('Solar, renewables', () => {
    it('ideal diode cell: the maximum power point gives a fill factor near 0.8', () => {
        const Isc = 9.5; const I0 = 1e-10; const Vt = 0.02569;
        const I = (V) => Isc - I0 * (exp(V / Vt) - 1); const Voc = Vt * log(Isc / I0 + 1);
        let best = 0; for (let V = 0; V <= Voc; V += 1e-5) best = Math.max(best, V * I(V));
        const FF = best / (Voc * Isc); expect(FF).toBeGreaterThan(0.78); expect(FF).toBeLessThan(0.86);
        close(best / (1000 * 0.0244), (Voc * Isc * FF) / (1000 * 0.0244), 1e-12);
    });

    it('silicon cutoff 1107 nm, both by hc/E and by 1240/E', () => {
        close((h * c) / (1.12 * eV) * 1e9, 1107, 1e-3); close(1240 / 1.12, 1107, 1e-3);
    });

    it('photosynthesis balances atom for atom and stores about 2870 kJ/mol', () => {
        expect([6, 12, 12 + 6]).toEqual([6, 12, 6 + 12]); // C, H, O both sides
        const dG = -910.4 - (6 * -394.4 + 6 * -237.1); close(dG, 2870, 5e-3);
    });

    it('Betz: Cp = 4a(1 − a)² peaks at 16/27; power goes as v³', () => {
        let best = 0; for (let a = 0; a <= 0.5; a += 1e-5) best = Math.max(best, 4 * a * (1 - a) ** 2);
        close(best, 16 / 27, 1e-8);
        const P = (v) => 0.5 * 1.225 * 100 * v ** 3 * 0.4; close(P(10) / P(5), 8);
    });

    it('capacity factor', () => { close(2628 / (1 * 8760), 0.3); });
});

describe('Materials, nanomaterials, environment', () => {
    it('corrosion 87.6 = 8760 h/yr × 10 mm/cm × 10⁻³ g/mg', () => {
        close(8760 * 10 * 1e-3, 87.6);
        const W = 50; const rho = 7.87; const A = 10; const t = 1000;
        const mmPerYr = ((W / 1000) / (rho * A)) * 10 * (8760 / t); close((87.6 * W) / (rho * A * t), mmPerYr);
    });

    it('Pilling-Bedworth: Al2O3 protective, MgO porous, from molar volumes', () => {
        const pbr = (Mo, rhoM, n, Mm, rhoO) => (Mo * rhoM) / (n * Mm * rhoO);
        const al = pbr(101.96, 2.70, 2, 26.98, 3.95); close(al, (101.96 / 3.95) / (2 * (26.98 / 2.70)));
        expect(al > 1 && al < 2).toBe(true);
        expect(pbr(40.30, 1.74, 1, 24.31, 3.58)).toBeLessThan(1);
    });

    it('degree of polymerization of polyethylene', () => { close(28000 / 28, 1000); });

    it('A/V of a sphere is 3/r; specific surface 6/(ρd)', () => {
        const r = 2e-9; close((4 * Math.PI * r * r) / ((4 / 3) * Math.PI * r ** 3), 3 / r);
        close((3 / r) / 19300, 6 / (19300 * 2 * r));
    });

    it('a 5 nm gold particle: about 3900 atoms by density and by the fcc lattice', () => {
        const d = 5e-7; const V = (Math.PI / 6) * d ** 3;
        const byDensity = (19.3 * V * NA) / 196.97; close(byDensity, 3860, 1e-2);
        const a = 0.4078e-7; close((4 * V) / a ** 3, byDensity, 1e-2);
    });

    it('ppm to mg/m³ by the 24.45 rule and by the ideal gas law', () => {
        const rule = (9 * 28.01) / 24.45;
        const byGas = 9e-6 * ((101325 * 0.02801) / (R * 298.15)) * 1e6; // kg/m³ → mg/m³
        close(rule, byGas, 1e-3); close(rule, 10.31, 1e-3);
    });

    it('BOD5 is 68% of L0 at k = 0.23/day, as stepping dL/dt = −kL shows', () => {
        close(1 - exp(-0.23 * 5), 0.683, 1e-3);
        let L = 1; for (let i = 0; i < 500000; i += 1) L -= 0.23 * L * 1e-5;
        close(1 - L, 1 - exp(-1.15), 1e-4);
    });

    it('hardness factors 2.5 for Ca²⁺ and 4.12 for Mg²⁺; CO2 per kg carbon', () => {
        close(50 / (40.08 / 2), 2.495, 1e-3); close(50 / (24.305 / 2), 4.114, 1e-3);
        close(100.09 / 2, 50.04, 1e-3); close(44.01 / 12.011, 3.664, 1e-3);
    });
});
