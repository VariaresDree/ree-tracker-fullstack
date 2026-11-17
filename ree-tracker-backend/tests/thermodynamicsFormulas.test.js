import { describe, it, expect } from 'vitest';

// ESAS › Basic Thermodynamics formula cards, checked with numbers (Library
// round, 2026-11-17). Process work by integrating p dV along the path; heat
// by the first law; entropy by integrating dQ/T and by taking two different
// paths between the same states; each gas cycle run state by state and its
// efficiency compared with the closed formula; a Rankine cycle from
// steam-table values.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, log, exp, abs } = Math;
const simpson = (f, a, b, n = 4000) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i += 1) s += f(a + i * h) * (i % 2 ? 4 : 2); return (s * h) / 3; };
const R = 0.287; const cp = 1.005; const cv = cp - R; const k = cp / cv; // air, kJ/kg·K

describe('Basics, first law, ideal gases', () => {
    it('heat rate; flow work units; nozzle speed from an enthalpy drop', () => {
        close(3600 / 0.36, 10000);
        close(200 * 0.5, 100); // kPa × m³ = kJ
        close(sqrt(2 * 100 * 1000), 447.21, 1e-5); close(44.72 * 10, 447.2);
    });

    it('R = Ru/M; cp − cv = R; cv = R/(k−1); cp = kR/(k−1)', () => {
        close(8.314 / 28.97, 0.28699, 1e-4); close(8.314 / 18.015, 0.4615, 1e-3);
        close(cp - cv, R); close(R / (k - 1), cv); close((k * R) / (k - 1), cp);
        close(1.005 / 0.718, 1.3997, 1e-4);
    });

    it('a mixture: Dalton partial pressures and mass-weighted R', () => {
        const p = 200; const y = [0.79, 0.21]; close(y.reduce((s, yi) => s + yi * p, 0), p);
        const m = [0.767, 0.233]; const Ri = [0.2968, 0.2598];
        close(m.reduce((s, mi, i) => s + mi * Ri[i], 0), 0.2882, 1e-3);
    });
});

describe('Processes of ideal gases: W = ∫p dV and Q = ΔU + W', () => {
    const m = 1; const p1 = 100; const T1 = 300; const V1 = (m * R * T1) / p1;

    it('isothermal: ∫p dV = p1V1 ln(V2/V1) = Q', () => {
        const V2 = 3 * V1; const W = simpson((V) => (p1 * V1) / V, V1, V2);
        close(W, p1 * V1 * log(3), 1e-9); close(W, m * R * T1 * log(p1 / (p1 / 3)), 1e-9);
    });

    it('isentropic: ∫p dV = (p2V2 − p1V1)/(1 − k) = −ΔU; the T-p relation', () => {
        const V2 = V1 / 8; const p = (V) => p1 * (V1 / V) ** k; const p2 = p(V2);
        const W = simpson(p, V1, V2);
        close(W, (p2 * V2 - p1 * V1) / (1 - k), 1e-8);
        const T2 = (p2 * V2) / (m * R);
        close(W, -m * cv * (T2 - T1), 1e-8); // Q = 0
        close(T2 / T1, (p2 / p1) ** ((k - 1) / k)); close(T2 / T1, 8 ** (k - 1));
    });

    it('polytropic: W by integral, Q = m c_n ΔT, and n = 0, 1, k reduce to the special cases', () => {
        const n = 1.3; const V2 = V1 / 5; const p = (V) => p1 * (V1 / V) ** n; const p2 = p(V2);
        const W = simpson(p, V1, V2); close(W, (p2 * V2 - p1 * V1) / (1 - n), 1e-8);
        const T2 = (p2 * V2) / (m * R); const cn = cv * ((k - n) / (1 - n));
        close(m * cn * (T2 - T1), m * cv * (T2 - T1) + W, 1e-8); // first law
        expect(cn).toBeLessThan(0); // between 1 and k: heat out while compressed
        close(cv * ((k - 0) / (1 - 0)), cp); // n = 0: constant pressure
        close(cv * ((k - k) / (1 - k)), 0); // n = k: isentropic, no heat
    });

    it('constant pressure and constant volume: W and Q', () => {
        const T2 = 600; const V2 = V1 * (T2 / T1);
        close(p1 * (V2 - V1), m * R * (T2 - T1)); close(m * cv * (T2 - T1) + p1 * (V2 - V1), m * cp * (T2 - T1));
        close((p1 * T2) / T1, 200); // constant volume: p ∝ T
    });

    it('entropy change of an ideal gas is the same along two different paths', () => {
        const T2 = 500; const p2 = 400; // from (300 K, 100 kPa)
        const direct = cp * log(T2 / T1) - R * log(p2 / p1);
        // path A: constant p to T2, then isothermal to p2
        const a = cp * log(T2 / T1) + -R * log(p2 / p1);
        // path B: isothermal to p2 at T1 (∫dQ/T = ∫p dV / T), then constant p to T2 (∫cp dT/T)
        const Vb1 = (R * T1) / p1; const Vb2 = (R * T1) / p2;
        const isoT = simpson((V) => (R * T1) / V, Vb1, Vb2) / T1;
        const isoP = simpson((T) => cp / T, T1, T2);
        close(a, direct); close(isoT + isoP, direct, 1e-8);
        close(cv * log(T2 / T1) + R * log(((R * T2) / p2) / ((R * T1) / p1)), direct, 1e-12);
    });
});

describe('Pure substances (steam-table values)', () => {
    it('quality, isentropic turbine exit, throttling calorimeter, saturation at 1 atm', () => {
        // 10 kPa: hf 191.83, hfg 2392.8, sf 0.6493, sfg 7.5009
        const x = (6.7428 - 0.6493) / 7.5009; close(x, 0.8124, 1e-4);
        close(191.83 + x * 2392.8, 2135.7, 1e-4);
        close(419.0 + 2257.0, 2676.0, 1e-4); // hg at 1 atm ≈ 2676.1
        // throttling: wet steam at 1 MPa (hf 762.81, hfg 2015.3) to 100 kPa, 120 °C (h 2716.6)
        const x1 = (2716.6 - 762.81) / 2015.3; expect(x1).toBeGreaterThan(0.95); expect(x1).toBeLessThan(1);
        close(762.81 + x1 * 2015.3, 2716.6);
    });
});

describe('Second law', () => {
    it('engine and COPs; Carnot ratios; entropy of melting ice; mixing generates entropy', () => {
        const QH = 1000; const QL = 600; close((QH - QL) / QH, 1 - QL / QH);
        const W = 2; const QLr = 7; close(QLr / W + 1, (QLr + W) / W);
        const TH = 300; const TL = 270;
        close(TL / (TH - TL), 9); close(TH / (TH - TL), 10); close(1 - TL / TH, 0.1);
        close(334 / 273.15, 1.2228, 1e-4);
        // mixing 1 kg at 80 °C with 1 kg at 20 °C: entropy rises
        const c = 4.1868; const Tf = 323.15;
        const dS = c * log(Tf / 353.15) + c * log(Tf / 293.15);
        expect(dS).toBeGreaterThan(0);
        close(simpson((T) => c / T, 293.15, Tf), c * log(Tf / 293.15), 1e-10);
        close(3.517 * 60, 211.02, 1e-4);
    });
});

describe('Gas cycles run state by state', () => {
    it('Otto: heats from the states match 1 − 1/r^(k−1)', () => {
        const r = 8; const T1 = 300; const T2 = T1 * r ** (k - 1); const T3 = 1800; const T4 = T3 / r ** (k - 1);
        const qin = cv * (T3 - T2); const qout = cv * (T4 - T1);
        close(1 - qout / qin, 1 - 1 / r ** (k - 1)); close(1 - 1 / 8 ** 0.4, 0.5647, 1e-4);
    });

    it('Diesel: heats from the states match the cutoff-ratio formula, and fall below Otto at the same r', () => {
        const r = 18; const rc = 2; const T1 = 300; const T2 = T1 * r ** (k - 1); const T3 = T2 * rc; const T4 = T3 * (rc / r) ** (k - 1);
        const eta = 1 - (cv * (T4 - T1)) / (cp * (T3 - T2));
        close(eta, 1 - (1 / r ** (k - 1)) * ((rc ** k - 1) / (k * (rc - 1))));
        expect(eta).toBeLessThan(1 - 1 / r ** (k - 1));
    });

    it('Brayton: efficiency from the states; the optimum pressure ratio maximises net work', () => {
        const T1 = 300; const T3 = 1300; const net = (rp) => { const T2 = T1 * rp ** ((k - 1) / k); const T4 = T3 / rp ** ((k - 1) / k); return cp * (T3 - T4) - cp * (T2 - T1); };
        const rp = 10; const T2 = T1 * rp ** ((k - 1) / k); const T4 = T3 / rp ** ((k - 1) / k);
        close(1 - (T4 - T1) / (T3 - T2), 1 - 1 / rp ** ((k - 1) / k));
        const opt = (T3 / T1) ** (k / (2 * (k - 1)));
        expect(net(opt)).toBeGreaterThan(net(opt * 0.9)); expect(net(opt)).toBeGreaterThan(net(opt * 1.1));
    });

    it('mean effective pressure times displacement is the net work', () => {
        const Wnet = 0.6; const V1 = 0.0005; const V2 = V1 / 8; close(((Wnet / (V1 - V2)) * (V1 - V2)), Wnet);
    });
});

describe('Rankine cycle from steam tables', () => {
    it('3 MPa, 350 °C to 10 kPa: about 33.4%; pump work is a small fraction', () => {
        const h1 = 3115.3; const s1 = 6.7428; const x2 = (s1 - 0.6493) / 7.5009; const h2 = 191.83 + x2 * 2392.8;
        const h3 = 191.83; const wp = 0.00101 * (3000 - 10); const h4 = h3 + wp;
        const eta = ((h1 - h2) - (h4 - h3)) / (h1 - h4);
        close(eta, 0.3343, 2e-3);
        expect(wp / (h1 - h2)).toBeLessThan(0.01);
        close(3600 / ((h1 - h2) - wp), 3.687, 2e-3);
        // isentropic efficiency 85%: actual exit enthalpy
        const h2a = h1 - 0.85 * (h1 - h2); close((h1 - h2a) / (h1 - h2), 0.85);
        // open feedwater heater at 0.5 MPa: hf 640.23; bleed h 2738; feedwater in 192.3
        const y = (640.23 - 192.3) / (2738 - 192.3); close(y * 2738 + (1 - y) * 192.3, 640.23);
    });
});
