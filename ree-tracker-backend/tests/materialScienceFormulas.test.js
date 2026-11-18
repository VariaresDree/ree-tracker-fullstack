import { describe, it, expect } from 'vitest';

// ESAS › Material Science formula cards, checked with numbers (Library round,
// 2026-11-18). Each card's numbers come from a second route where one exists:
// packing factors and radius ratios from sphere geometry, d-spacing as the
// distance from the origin to a plane, Fick's second law by a finite-
// difference run, necking at εT = n by maximising the engineering stress,
// the lever rule against a mass balance, composites as springs in parallel
// and series, the Wiedemann-Franz constant from π²k²/3e², corrosion by
// bisecting the Tafel lines.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, log, log10, exp, PI } = Math;
const NA = 6.022e23; const kB = 8.62e-5; const e = 1.602e-19; const F = 96485; const R = 8.314;
const simpson = (f, a, b, n = 2000) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i += 1) s += f(a + i * h) * (i % 2 ? 4 : 2); return (s * h) / 3; };
const erf = (x) => (2 / sqrt(PI)) * simpson((t) => exp(-t * t), 0, x);
const argmax = (f, a, b, n = 200000) => { let best = a; let fb = f(a); for (let i = 1; i <= n; i += 1) { const x = a + ((b - a) * i) / n; const fx = f(x); if (fx > fb) { fb = fx; best = x; } } return best; };

describe('Bonding and crystal structures', () => {
    it('the energy minimum sits where the force is zero: K⁺–Cl⁻ at 0.279 nm, −4.57 eV', () => {
        const A = 1.436; const B = 5.86e-6; const n = 9; const E = (r) => -A / r + B / r ** n;
        const r0 = (A / (n * B)) ** (1 / (1 - n)); close(r0, 0.279, 2e-3); close(E(r0), -4.57, 3e-3);
        close(argmax((r) => -E(r), 0.2, 0.4), r0, 1e-5);
    });

    it('percent ionic character of NaCl about 71%', () => {
        close((1 - exp(-0.25 * (3.16 - 0.93) ** 2)) * 100, 71.2, 2e-3);
    });

    it('atoms per cell; packing factors from where the spheres touch', () => {
        expect([0 + 0 + 8 / 8, 1 + 8 / 8, 6 / 2 + 8 / 8]).toEqual([1, 2, 4]);
        const apf = (N, a) => (N * (4 / 3) * PI) / a ** 3; // R = 1
        close(apf(1, 2), PI / 6); close(apf(2, 4 / sqrt(3)), (sqrt(3) * PI) / 8); close(apf(4, 2 * sqrt(2)), PI / (3 * sqrt(2)));
        close(apf(2, 4 / sqrt(3)), 0.68, 1e-2); close(apf(4, 2 * sqrt(2)), 0.74, 1e-2);
    });

    it('theoretical density: copper 8.89, iron 7.90 g/cm³', () => {
        const a = 2 * 0.128 * sqrt(2) * 1e-7; close((4 * 63.5) / (a ** 3 * NA), 8.89, 2e-3);
        const aFe = ((4 * 0.124) / sqrt(3)) * 1e-7; close((2 * 55.85) / (aFe ** 3 * NA), 7.90, 3e-3);
    });

    it('Miller indices are proportional to the plane normal; d is the distance from the origin', () => {
        const [x0, y0] = [1, 2]; const hkl = [1 / x0, 1 / y0, 0].map((t) => t * 2); expect(hkl).toEqual([2, 1, 0]);
        const a = 0.2866; const [h, k, l] = [2, 2, 0];
        const norm = sqrt(h * h + k * k + l * l); const dist = a / norm; // plane hx + ky + lz = a
        const p = [a / h, 0, 0]; close((p[0] * h) / norm, dist); close(dist, 0.1013, 1e-3);
    });

    it("Bragg: iron (220) with 0.1790 nm X-rays diffracts at 2θ = 124.2°", () => {
        const d = 0.2866 / sqrt(8); const theta = Math.asin(0.179 / (2 * d));
        close((2 * theta * 180) / PI, 124.2, 2e-3);
    });
});

describe('Imperfections and diffusion', () => {
    it('atoms per volume and vacancies in copper at 1000 °C', () => {
        close((NA * 8.96) / 63.55, 8.49e22, 1e-2);
        close(8.0e28 * exp(-0.9 / (kB * 1273)), 2.2e25, 2e-2);
    });

    it('ASTM n = 6 means 32 grains per square inch at 100×', () => { expect(2 ** (6 - 1)).toBe(32); });

    it("Fick's first law: carbon through iron at 2.4e-9 kg/(m²·s)", () => {
        close(-3e-11 * ((0.8 - 1.2) / (10e-3 - 5e-3)), 2.4e-9, 1e-9);
    });

    it('Cu in Al at 500 °C: D = 4.2e-14 m²/s; the two-point form recovers Q', () => {
        const D = (T) => 6.5e-5 * exp(-136000 / (R * T)); close(D(773), 4.2e-14, 2e-2);
        close((-R * log(D(773) / D(873))) / (1 / 773 - 1 / 873), 136000, 1e-9);
    });

    it("Fick's second law: carburizing to 0.80 wt% at 0.5 mm takes 7.1 h, matched by a finite-difference run", () => {
        const D = 1.6e-11; const x = 5e-4; const C0 = 0.25; const Cs = 1.2;
        let lo = 0; let hi = 2; const target = 1 - (0.8 - C0) / (Cs - C0);
        for (let i = 0; i < 60; i += 1) { const m = (lo + hi) / 2; if (erf(m) < target) lo = m; else hi = m; }
        const t = x ** 2 / (4 * D * lo * lo); close(t / 3600, 7.1, 1e-2);
        const dx = 2e-5; const n = 250; const dt = 10; let C = new Array(n).fill(C0); C[0] = Cs;
        for (let s = 0; s < Math.round(t / dt); s += 1) {
            const N = C.slice(); for (let i = 1; i < n - 1; i += 1) N[i] = C[i] + ((D * dt) / dx ** 2) * (C[i + 1] - 2 * C[i] + C[i - 1]); C = N;
        }
        close(C[Math.round(x / dx)], 0.8, 1e-2);
    });
});

describe('Mechanical properties', () => {
    it('true strain integrates dl/l; true stress keeps the volume constant', () => {
        const eps = 0.25; close(simpson((l) => 1 / l, 1, 1 + eps), log(1 + eps), 1e-12);
        const A = 1 / (1 + eps); close(300 / A, 300 * (1 + eps));
    });

    it('Hollomon: the engineering stress Kε^n e^(−ε) peaks (necking) at ε_T = n', () => {
        for (const n of [0.15, 0.3, 0.45]) close(argmax((t) => 600 * t ** n * exp(-t), 1e-6, 2), n, 1e-4);
    });

    it('resilience is the elastic area σy²/2E; ductility percentages', () => {
        const E = 207e9; const sy = 550e6; close(simpson((s) => s / E, 0, sy), (sy * sy) / (2 * E), 1e-9);
        close(((60 - 50) / 50) * 100, 20); close(((100 - 40) / 100) * 100, 60);
    });

    it('Brinell is load over the spherical dent area πDh; strength ≈ 3.45 HB', () => {
        const P = 3000; const D = 10; const d = 4; const HB = (2 * P) / (PI * D * (D - sqrt(D * D - d * d)));
        const h = (D - sqrt(D * D - d * d)) / 2; close(HB, P / (PI * D * h)); close(HB, 228.8, 1e-3);
        close(3.45 * HB, 789, 2e-3);
    });

    it('Hall-Petch from two grain sizes predicts a third', () => {
        const s0 = 25; const ky = 12.5; const s = (d) => s0 + ky / sqrt(d);
        const k2 = (s(0.01) - s(0.05)) / (1 / sqrt(0.01) - 1 / sqrt(0.05)); close(k2, ky);
        close(s(0.01) - k2 / sqrt(0.01), s0);
    });

    it('fracture: a 4 mm interior crack fails at 328 MPa when K_Ic = 26 MPa√m', () => {
        close(26 / sqrt(PI * 0.002), 328, 2e-3);
    });
});

describe('Alloys and phase diagrams', () => {
    it('lever rule for Cu-35Ni at 1250 °C (68% liquid), and the mass balance it rests on', () => {
        const [C0, CL, Ca] = [35, 31.5, 42.5]; const WL = (Ca - C0) / (Ca - CL); const Wa = (C0 - CL) / (Ca - CL);
        close(WL, 0.68, 1e-2); close(WL + Wa, 1); close(WL * CL + Wa * Ca, C0);
    });

    it('phase rule: a binary eutectic at fixed pressure has no freedom', () => { expect(2 + 1 - 3).toBe(0); });

    it('97 wt% Al, 3 wt% Cu is 98.7 at% Al, as counting moles shows', () => {
        const at = (97 * 63.55) / (97 * 63.55 + 3 * 26.98); close(at * 100, 98.7, 1e-3);
        const mAl = 97 / 26.98; const mCu = 3 / 63.55; close(mAl / (mAl + mCu), at);
    });

    it('steel 0.40 wt% C: 51% pearlite, and the total ferrite matches the lever across 0.022–6.70', () => {
        const Wp = (0.4 - 0.022) / (0.76 - 0.022); close(Wp, 0.512, 2e-3);
        const aInPearlite = (6.7 - 0.76) / (6.7 - 0.022);
        close(1 - Wp + Wp * aInPearlite, (6.7 - 0.4) / (6.7 - 0.022), 1e-12);
        const Wp2 = (6.7 - 1.0) / (6.7 - 0.76); // hypereutectoid 1.0 wt% C
        close(1 - Wp2 + Wp2 * (1 - aInPearlite), (1.0 - 0.022) / (6.7 - 0.022), 1e-12);
    });
});

describe('Ceramics and polymers', () => {
    it('critical radius ratios from the geometry of touching ions', () => {
        close(2 / sqrt(3) - 1, 0.155, 1e-2); close(sqrt(1.5) - 1, 0.225, 1e-2);
        close(sqrt(2) - 1, 0.414, 1e-3); close(sqrt(3) - 1, 0.732, 1e-3);
        const rr = 0.102 / 0.181; expect(rr > 0.414 && rr < 0.732).toBe(true);
    });

    it('rock salt density 2.14 g/cm³', () => {
        const a = 2 * (0.102 + 0.181) * 1e-7; close((4 * (22.99 + 35.45)) / (a ** 3 * NA), 2.14, 2e-3);
    });

    it('flexural strength is the flexure formula Mc/I at midspan', () => {
        const [Ff, L, b, d, Rr] = [300, 40, 5, 3, 2.5];
        close(((Ff * L) / 4) * (d / 2) / ((b * d ** 3) / 12), (3 * Ff * L) / (2 * b * d * d));
        close(((Ff * L) / 4) * Rr / ((PI * Rr ** 4) / 4), (Ff * L) / (PI * Rr ** 3));
    });

    it('5% porosity takes alumina from 393 to about 357 GPa', () => {
        close(393 * (1 - 1.9 * 0.05 + 0.9 * 0.0025), 356.6, 1e-3);
    });

    it('average molecular weights from a list of chains; PI = 1 only when all chains match', () => {
        const chains = [[100, 10000], [50, 30000], [10, 80000]];
        const N = chains.reduce((s, [c]) => s + c, 0); const mass = chains.reduce((s, [c, M]) => s + c * M, 0);
        const Mn = chains.reduce((s, [c, M]) => s + (c / N) * M, 0); close(Mn, mass / N);
        const Mw = chains.reduce((s, [c, M]) => s + ((c * M) / mass) * M, 0); expect(Mw / Mn).toBeGreaterThan(1);
        close([[5, 1e4]].reduce((s, [, M]) => s + M, 0) / 1e4, 1);
    });

    it('percent crystallinity recovers a known crystalline mass fraction', () => {
        const [rc, ra, wc] = [1.0, 0.87, 0.6]; const rs = 1 / (wc / rc + (1 - wc) / ra);
        close((rc * (rs - ra)) / (rs * (rc - ra)), wc, 1e-12);
    });

    it('stress relaxation: stepping dσ/dt = −σ/τ gives e^(−t/τ)', () => {
        let s = 10; const tau = 50; const dt = 1e-3; for (let i = 0; i < 100000; i += 1) s -= (s / tau) * dt;
        close(s, 10 * exp(-100 / tau), 1e-4);
    });
});

describe('Composites', () => {
    const [Em, Ef, Vf] = [3.4, 69, 0.4]; const Vm = 1 - Vf;

    it('isostrain: parallel springs give 29.6 GPa, the fibres carrying 93%', () => {
        const eps = 0.001; const force = Em * Vm * eps + Ef * Vf * eps; close(force / eps, 29.64, 1e-9);
        const ratio = (Ef * Vf) / (Em * Vm); close(ratio / (1 + ratio), 0.93, 3e-3);
    });

    it('isostress: series compliances give 5.5 GPa, below the rule of mixtures', () => {
        const Ect = (Em * Ef) / (Vm * Ef + Vf * Em); close(1 / Ect, Vm / Em + Vf / Ef, 1e-12); close(Ect, 5.49, 2e-3);
        expect(Ect).toBeLessThan(Em * Vm + Ef * Vf);
    });

    it('longitudinal strength; critical length from the shear-pull force balance', () => {
        close(15 * 0.6 + 3500 * 0.4, 1409);
        const [sf, d, tc] = [2500, 0.01, 30]; const lc = (sf * d) / (2 * tc);
        close(tc * PI * d * (lc / 2), (sf * PI * d * d) / 4); close(lc, 0.4167, 1e-3);
    });
});

describe('Electrical, dielectric and magnetic', () => {
    it('intrinsic silicon conducts about 3 × 10⁻⁴ (Ω·m)⁻¹', () => {
        close(1e16 * e * (0.14 + 0.05), 3.04e-4, 2e-3);
    });

    it('intrinsic: ln σ against 1/T has slope −Eg/2k (the T^3/2 is minor)', () => {
        const Eg = 1.12; const ni = (T) => T ** 1.5 * exp(-Eg / (2 * kB * T));
        const slope = (log(ni(350)) - log(ni(300))) / (1 / 350 - 1 / 300);
        close(-2 * kB * slope, Eg + (3 * kB * log(350 / 300)) / (1 / 300 - 1 / 350), 1e-9);
        close(-2 * kB * slope, Eg, 8e-2);
    });

    it("Matthiessen's rule adds the scatterings; Hall gives n and the mobility", () => {
        close(1.69e-8 + 0.2e-8 + 0.05e-8, 1.94e-8);
        const n = 8.5e28; const RH = -1 / (n * e); const sigma = 5.96e7;
        close(1 / (Math.abs(RH) * e), n); close(Math.abs(RH) * sigma, sigma / (n * e));
        close((RH * 25 * 0.2) / 1e-3, -3.67e-7, 1e-2); // Hall voltage, negative for electrons
    });

    it('dielectric: D = εrε0E equals ε0E + P; breakdown of 2 mm polyethylene', () => {
        const e0 = 8.854e-12; const er = 2.3; const E = 1e6; const P = e0 * (er - 1) * E;
        close(e0 * E + P, er * e0 * E); close(20 * 2, 40);
    });

    it('magnetization: B = μ0(H + M) = μ0μrH', () => {
        const mu0 = 4 * PI * 1e-7; const chi = 1.5e-5; const H = 1000;
        close(mu0 * (H + chi * H), mu0 * (1 + chi) * H, 1e-12);
    });

    it('saturation magnetization: nickel 5.1e5, iron 1.7e6 A/m', () => {
        const N = (rho, A) => ((rho * 1e6) * NA) / A; const muB = 9.27e-24;
        close(0.6 * N(8.9, 58.69) * muB, 5.1e5, 1e-2); close(2.22 * N(7.87, 55.85) * muB, 1.75e6, 1e-2);
    });

    it('Steinmetz: hysteresis loss doubles with frequency and rises as B^1.6', () => {
        const Ph = (f, B) => 100 * f * B ** 1.6 * 0.01; close(Ph(120, 1.2) / Ph(60, 1.2), 2); close(Ph(60, 2.4) / Ph(60, 1.2), 2 ** 1.6);
    });
});

describe('Optical and thermal', () => {
    it('glass reflects 4% per face; reflected and transmitted fractions add to one', () => {
        const R1 = ((1.5 - 1) / (1.5 + 1)) ** 2; close(R1, 0.04); close(R1 + (4 * 1.5) / 2.5 ** 2, 1);
    });

    it('a slab: two reflections and Beer absorption, by stepping through it', () => {
        const Rr = 0.04; const beta = 20; const l = 0.02; let I = 1 - Rr; const dx = 1e-6;
        for (let x = 0; x < l - 1e-12; x += dx) I -= beta * I * dx;
        close(I * (1 - Rr), (1 - Rr) ** 2 * exp(-beta * l), 1e-4);
    });

    it('heat capacity: 3R ≈ 24.9 J/(mol·K), close to copper\'s 24.5; Debye T³ scaling', () => {
        close(3 * R, 24.94, 1e-3); close(0.385 * 63.55, 24.5, 2e-3);
        const Cv = (T) => 1e-4 * T ** 3; close(Cv(20) / Cv(10), 8);
    });

    it('Wiedemann-Franz: π²k²/3e² = 2.44e-8, and copper\'s k about 436', () => {
        const kJ = 1.380649e-23; close((PI ** 2 * kJ ** 2) / (3 * (1.602177e-19) ** 2), 2.443e-8, 1e-3);
        close(2.44e-8 * 5.96e7 * 300, 436.3, 1e-3);
    });

    it('thermal shock: borosilicate about 2.5 times soda-lime glass', () => {
        const tsr = (s, k, E, a) => (s * k) / (E * a);
        close(tsr(69e6, 1.4, 63e9, 3.3e-6) / tsr(69e6, 1.7, 69e9, 9e-6), 2.46, 1e-2);
    });
});

describe('Corrosion and selection', () => {
    it('1 A/m² on iron eats 1.16 mm/yr, the same as Faraday\'s mass loss over a year', () => {
        const i = 1; const M = 0.05585; const rho = 7870; const yr = 3.156e7;
        const cpr = (i * M) / (2 * F * rho); close(cpr * 3.156e10, 1.16, 1e-2);
        const mass = (i * yr * M) / (2 * F); close((mass / rho) * 1000, cpr * 3.156e10, 1e-9);
    });

    it('zinc in acid: the Tafel lines cross at 1.2e-4 A/m² and −0.486 V', () => {
        const Ezn = (L) => -0.763 + 0.09 * (L + 7); const Eh = (L) => -0.08 * (L + 10);
        let lo = -10; let hi = 0; for (let k = 0; k < 80; k += 1) { const m = (lo + hi) / 2; if (Ezn(m) < Eh(m)) lo = m; else hi = m; }
        close(10 ** lo, 1.19e-4, 1e-2); close(Eh(lo), -0.486, 2e-3);
    });

    it('tension member mass is ρAL with A = NF/σy; stiff beams rank by E^½/ρ', () => {
        const [N, Fo, L, rho, sy] = [2, 50000, 1, 7850, 250e6];
        close((N * Fo * L * rho) / sy, rho * ((N * Fo) / sy) * L); close((N * Fo * L * rho) / sy, 3.14, 1e-3);
        const massFor = (E, r) => { const b = (1 / E) ** 0.25; return r * b * b; }; // square section: E b⁴ fixed
        close(massFor(207, 7.85) / massFor(70, 2.7), (7.85 / sqrt(207)) / (2.7 / sqrt(70)), 1e-12);
        expect(massFor(70, 2.7)).toBeLessThan(massFor(207, 7.85));
    });
});
