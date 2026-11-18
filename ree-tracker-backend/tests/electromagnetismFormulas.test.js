import { describe, it, expect } from 'vitest';

// EE › Electromagnetism formula cards, checked with numbers (Library round,
// 2026-11-18): fields of lines, loops and wires by integrating Coulomb and
// Biot-Savart over the source; Gauss's flux by integrating over a sphere;
// potentials and capacitances by integrating the field; cable insulation by
// integrating dr/r; a charged particle's circle by stepping the Lorentz force;
// the rotating coil's EMF by differentiating its flux; lifting force by
// virtual work; wave speed, impedance, Poynting average and skin depth.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, sin, cos, log, PI, exp } = Math;
const e0 = 8.854187817e-12; const mu0 = 4 * PI * 1e-7; const k = 1 / (4 * PI * e0);
const simpson = (f, a, b, n = 20000) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i += 1) s += f(a + i * h) * (i % 2 ? 4 : 2); return (s * h) / 3; };

describe('Electrostatics', () => {
    it('Coulomb constant is 1/(4πε0); a 1 µC charge at 1 m makes 8988 V/m', () => {
        close(k, 8.988e9, 1e-4); close(k * 1e-6, 8988, 1e-4);
    });

    it('an electron through 1 V gains 1 eV; F = qE', () => { close(1.602e-19 * 1, 1.602e-19); close(1e-6 * 5000, 5e-3); });

    it('a long line charge: integrating Coulomb over the line gives λ/(2πε0 r)', () => {
        const lam = 1e-9; const r = 0.5; const L = 2000;
        const Ex = simpson((z) => (k * lam * r) / (r * r + z * z) ** 1.5, -L, L, 400000);
        close(Ex, lam / (2 * PI * e0 * r), 1e-3);
        close(1e-6 / e0, 2 * (1e-6 / (2 * e0))); // two sheets' fields add between plates
    });

    it("Gauss: the flux of a point charge's field through any sphere around it is q/ε0", () => {
        const q = 2e-9; const R = 0.3; const off = 0.1; // charge off-centre
        let flux = 0; const nT = 400; const nP = 200;
        for (let i = 0; i < nT; i += 1) for (let j = 0; j < nP; j += 1) {
            const th = ((i + 0.5) / nT) * PI; const ph = ((j + 0.5) / nP) * 2 * PI;
            const n = [sin(th) * cos(ph), sin(th) * sin(ph), cos(th)]; const p = n.map((x) => R * x); const d = [p[0], p[1], p[2] - off];
            const dist = sqrt(d[0] ** 2 + d[1] ** 2 + d[2] ** 2); const E = d.map((x) => (k * q * x) / dist ** 3);
            flux += (E[0] * n[0] + E[1] * n[1] + E[2] * n[2]) * R * R * sin(th) * (PI / nT) * ((2 * PI) / nP);
        }
        close(flux, q / e0, 1e-3);
    });

    it('charged sphere: kQ/r² outside, kQr/R³ inside a uniform solid (Gauss on the enclosed charge)', () => {
        const Q = 1e-6; const R = 0.1; const r = 0.05; close((k * Q * (r / R) ** 3) / r ** 2, (k * Q * r) / R ** 3, 1e-12);
    });

    it('potential: integrating the field from r to infinity gives kq/r; two charges store kq1q2/r', () => {
        const q = 1e-9; const r = 0.2; close(simpson((x) => (k * q) / x ** 2, r, 2000, 400000), (k * q) / r, 1e-3);
        close((k * 1e-6 * -2e-6) / 0.1, -0.1798, 1e-3);
    });

    it('coaxial capacitance by integrating the field between the radii; concentric spheres too', () => {
        const a = 0.002; const b = 0.008; const L = 1000; const er = 2.3; const lam = 1e-7;
        const V = simpson((r) => lam / (2 * PI * er * e0 * r), a, b); close((lam * L) / V, (2 * PI * er * e0 * L) / log(b / a), 1e-6);
        const Q = 1e-9; const Vs = simpson((r) => (k * Q) / r ** 2, a, b); close(Q / Vs, (4 * PI * e0 * a * b) / (b - a), 1e-6);
    });

    it('layered dielectrics are capacitors in series; ½εE² over the gap is ½CV²', () => {
        const A = 0.01; const d1 = 1e-3; const d2 = 2e-3; const C1 = (4 * e0 * A) / d1; const C2 = (e0 * A) / d2;
        close((C1 * C2) / (C1 + C2), (e0 * A) / (d1 / 4 + d2 / 1), 1e-12);
        const V = 100; const d = 1e-3; const C = (e0 * A) / d; close(0.5 * e0 * (V / d) ** 2 * A * d, 0.5 * C * V * V, 1e-12);
    });

    it('drift velocity of 10 A in 2.5 mm² copper is about 0.3 mm/s', () => {
        close(10 / (8.5e28 * 1.602e-19 * 2.5e-6), 2.94e-4, 1e-2);
    });

    it('cable insulation: integrating ρ dr/(2πrL) gives (ρ/2πL) ln(b/a), and longer cables leak more', () => {
        const rho = 5e12; const a = 0.005; const b = 0.01; const L = 1000;
        close(simpson((r) => rho / (2 * PI * r * L), a, b), (rho / (2 * PI * L)) * log(b / a), 1e-9);
        expect((rho / (2 * PI * 2 * L)) * log(b / a)).toBeLessThan((rho / (2 * PI * L)) * log(b / a));
    });
});

describe('Magnetostatics', () => {
    it('Biot-Savart around a loop: μ0I/2R at the centre and the on-axis formula', () => {
        const I = 5; const R = 0.1;
        const Bz = (x) => simpson((ph) => (mu0 * I * R * R) / (4 * PI * (R * R + x * x) ** 1.5), 0, 2 * PI, 2000); // dl ⟂ r, axial part
        close(Bz(0), (mu0 * I) / (2 * R), 1e-9); close(Bz(0.05), (mu0 * I * R * R) / (2 * (R * R + 0.05 ** 2) ** 1.5), 1e-9);
    });

    it('Biot-Savart along a long straight wire gives μ0I/(2πr), the same as Ampère', () => {
        const I = 10; const r = 0.02; const L = 500;
        close(simpson((z) => (mu0 * I * r) / (4 * PI * (r * r + z * z) ** 1.5), -L, L, 400000), (mu0 * I) / (2 * PI * r), 1e-4);
    });

    it('solenoid and toroid: B = μNI/l; inductance N²/R equals the solenoid formula', () => {
        const N = 500; const I = 2; const l = 0.25; const A = 4e-4; const mur = 1;
        close((mu0 * N * I) / l, 5.0265e-3, 1e-4);
        const Rel = l / (mur * mu0 * A); close((N * N) / Rel, (mur * mu0 * N * N * A) / l, 1e-12);
        close((mu0 * N * I) / (2 * PI * 0.1), 2e-3, 1e-9);
    });

    it('air gap: 1 mm of gap needs more ampere-turns than 0.5 m of steel (μr 2000) at 1 T', () => {
        const B = 1; const Hg = B / mu0; const Hc = B / (2000 * mu0);
        expect(Hg * 1e-3).toBeGreaterThan(Hc * 0.5); close(Hg * 1e-3 + Hc * 0.5, 795.8 + 198.9, 1e-3);
    });

    it('energy density: B²/2μ0 at 1 T is 398 kJ/m³; the gap stores μr times the iron\'s', () => {
        close(1 / (2 * mu0), 397887, 1e-5); close((1 / (2 * mu0)) / (1 / (2 * 2000 * mu0)), 2000, 1e-12);
    });

    it('core losses: doubling f doubles hysteresis, quadruples eddy', () => {
        const Ph = (f) => 0.02 * f * 1.5 ** 1.6; const Pe = (f) => 1e-4 * f * f * 1.5 ** 2;
        close(Ph(120) / Ph(60), 2); close(Pe(120) / Pe(60), 4);
    });

    it('lifting force by virtual work: dW/dx of B²/(2μ0)·A·x is B²A/(2μ0); 1 T over 1 cm² is about 40 N', () => {
        const B = 1; const A = 1e-4; const W = (x) => ((B * B) / (2 * mu0)) * A * x; close((W(1e-3 + 1e-9) - W(1e-3)) / 1e-9, (B * B * A) / (2 * mu0), 1e-5);
        close((B * B * A) / (2 * mu0), 39.79, 1e-3);
    });
});

describe('Induction, forces and waves', () => {
    it('rotating coil: −N dΦ/dt of Φ = BA cos ωt is NBAω sin ωt; E_rms = 4.44 f N Φm', () => {
        const N = 100; const B = 0.5; const A = 0.02; const w = 2 * PI * 60; const t = 0.003; const h = 1e-8;
        const flux = (s) => B * A * cos(w * s); close(-N * (flux(t + h) - flux(t - h)) / (2 * h), N * B * A * w * sin(w * t), 1e-5);
        close((2 * PI) / sqrt(2), 4.443, 1e-3);
    });

    it('Lorentz force: stepping a proton in 1 T traces a circle of radius mv/(qB)', () => {
        const m = 1.6726e-27; const q = 1.602e-19; const B = 1; let vx = 1e6; let vy = 0; let x = 0; let y = 0;
        const dt = 1e-12; let maxY = 0; let minY = 0;
        for (let i = 0; i < 80000; i += 1) {
            const ax = (q / m) * vy * B; const ay = -(q / m) * vx * B;
            vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt; maxY = Math.max(maxY, y); minY = Math.min(minY, y);
        }
        close((maxY - minY) / 2, (m * 1e6) / (q * B), 1e-2);
    });

    it('torque on a loop: greatest with the coil plane along the field', () => {
        const T = (th) => 50 * 0.4 * 2 * 0.01 * sin(th); close(T(PI / 2), 0.4); close(T(0), 0);
    });

    it('wave speed and impedance from μ0 and ε0; εr = 4 halves the speed', () => {
        close(1 / sqrt(mu0 * e0), 2.998e8, 1e-4); close(sqrt(mu0 / e0), 376.73, 1e-4); close(1 / sqrt(mu0 * 4 * e0), 1.499e8, 1e-3);
        close(3e8 / 100e6, 3);
    });

    it('Poynting: the time average of E·H for a sinusoid is Em²/(2η)', () => {
        const Em = 100; const eta = sqrt(mu0 / e0);
        close(simpson((t) => ((Em * cos(t)) * (Em * cos(t))) / eta, 0, 2 * PI) / (2 * PI), (Em * Em) / (2 * eta), 1e-9);
    });

    it('skin depth of copper at 60 Hz is about 8.5 mm; current decays as e^(−x/δ)', () => {
        const d = 1 / sqrt(PI * 60 * mu0 * 5.8e7); close(d, 8.53e-3, 1e-3); close(exp(-1), 0.368, 1e-3);
    });
});
