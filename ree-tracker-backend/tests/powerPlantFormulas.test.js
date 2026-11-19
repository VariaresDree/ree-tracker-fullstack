import { describe, it, expect } from 'vitest';

// EE › Power Plant Engineering formula cards, checked with numbers (Library
// round, 2026-11-19): Betz and the Pelton bucket speed by maximizing; the
// gas turbine's best pressure ratio by searching the ideal Brayton net work;
// the combined cycle from its energy flows; uranium burned from 200 MeV per
// fission; wind shear and tip speed; the break-even hours where two cost lines
// cross; the rest against hand-worked values.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, PI, abs } = Math;

describe('Plant factors and thermal plants', () => {
    it('capacity, use and load factors; reserve margin', () => {
        const E = 350e6; const P = 100e3; close(E / (P * 8760), 0.3995, 1e-3); close(E / (P * 6000), 0.5833, 1e-3);
        const LF = 0.6; const peak = 80e3; close(LF * (peak / P), (LF * peak * 8760) / (P * 8760)); close((120 - 100) / 100, 0.2);
    });

    it('station efficiency, heat rate, fuel use, boiler efficiency, condenser water', () => {
        const eta = 0.88 * 0.42 * 0.98 * 0.98; close(3600 / eta, 10142, 1e-3);
        close((100e3 * (3600 / eta)) / 25000, 40568, 1e-3);
        close((50 * (3300 - 800)) / (5 * 30000), 0.8333, 1e-3);
        const Qrej = 100e3 * (1 / 0.35 - 1); close(Qrej / (4.187 * 10), 4434, 1e-3);
    });
});

describe('Hydro', () => {
    it('power, net head and reservoir energy', () => {
        close(9.81 * 20 * 95 * 0.88, 16402, 1e-4); close(100 - 0.02 * (500 / 2) * (4 ** 2 / (2 * 9.81)), 95.92, 1e-4);
        close((1000 * 9.81 * 1e6 * 100 * 0.85) / 3.6e6, 231625, 1e-5);
    });

    it('Pelton: power on the buckets u(v − u) peaks at u = v/2 (searched)', () => {
        const v = 0.98 * sqrt(2 * 9.81 * 400); let best = 0; let at = 0;
        for (let u = 0; u <= v; u += 0.001) { const p = u * (v - u); if (p > best) { best = p; at = u; } }
        close(at, v / 2, 1e-4); close(v, 86.82, 1e-3);
    });

    it('specific speed places a 400 m head in Pelton range and a 15 m head in Kaplan range', () => {
        const Ns = (N, P, H) => (N * sqrt(P)) / H ** 1.25; expect(Ns(500, 8000, 400)).toBeLessThan(30); expect(Ns(150, 10000, 15)).toBeGreaterThan(250);
    });

    it('pumped storage loses energy both ways', () => { close(0.88 * 0.9, 0.792, 1e-12); });
});

describe('Engines, gas turbines and combined cycles', () => {
    it('indicated power four-stroke; efficiencies; specific fuel consumption', () => {
        const ip = (800 * 0.2 * (PI * 0.15 ** 2) / 4 * 1500 * 6) / (60 * 2); close(ip, 212.06, 1e-4);
        close(180 / ip, 0.8488, 1e-3); close(3600 / (0.2 * 43000), 0.4186, 1e-3);
    });

    it('ideal Brayton net work peaks at (T3/T1)^(k/2(k−1)) (searched)', () => {
        const k = 1.4; const cp = 1.005; const T1 = 300; const T3 = 1200; const work = (rp) => { const x = rp ** ((k - 1) / k); return cp * (T3 * (1 - 1 / x) - T1 * (x - 1)); };
        let best = 0; let at = 0; for (let rp = 1.01; rp < 40; rp += 0.001) { const w = work(rp); if (w > best) { best = w; at = rp; } }
        close(at, (T3 / T1) ** (k / (2 * (k - 1))), 1e-3); close(at, 11.31, 1e-3);
    });

    it('combined cycle from energy flows', () => {
        const Q = 100; const Wgt = 0.35 * Q; const Wst = 0.3 * (Q - Wgt); close((Wgt + Wst) / Q, 0.35 + 0.3 * (1 - 0.35), 1e-12); close((Wgt + Wst) / Q, 0.545, 1e-12);
    });
});

describe('Geothermal and nuclear', () => {
    it('flash fraction and single-flash output', () => {
        const x = (1100 - 670.4) / 2085.8; close(x, 0.206, 1e-3);
        close(x * 100 * (2756 - 2300) * 0.85 * 0.97, 7744, 2e-3);
    });

    it('1 g of U-235 fissioned gives about 0.95 MWd; reactivity', () => {
        const J = (6.022e23 / 235) * 200 * 1.602e-13; close(J / 86400e6, 0.950, 2e-3);
        const Eth = (1000e6 / 0.33) * 86400 * 365; close((Eth / J) / 1000, 1165, 2e-3);
        close((1.005 - 1) / 1.005, 0.004975, 1e-3);
    });
});

describe('Solar, wind and biomass', () => {
    it('PV derating with NOCT; array and battery sizing', () => {
        const Tc = 32 + ((45 - 20) / 800) * 1000; close(Tc, 63.25); close(400 * (1 - 0.004 * (Tc - 25)), 338.8, 1e-4);
        close(20 / (5 * 0.78), 5.128, 1e-3); close(Math.ceil(5128 / 400), 13);
        close((5000 * 2) / (48 * 0.8 * 0.95), 274.1, 1e-3);
    });

    it('Betz: 4a(1 − a)² peaks at a = 1/3 with 16/27 (searched)', () => {
        let best = 0; let at = 0; for (let a = 0; a <= 0.5; a += 1e-5) { const c = 4 * a * (1 - a) ** 2; if (c > best) { best = c; at = a; } }
        close(at, 1 / 3, 1e-4); close(best, 16 / 27, 1e-6);
    });

    it('tip speed ratio and wind shear (v³ makes 10% more wind 33% more power)', () => {
        close((2 * PI * 15 * 50) / (60 * 10), 7.854, 1e-3); close(6 * (80 / 10) ** (1 / 7), 8.075, 1e-3); close(1.1 ** 3, 1.331);
    });

    it('biomass output and wet-basis heating value', () => {
        close((10000 * 7600 * 0.22) / 3600, 4644, 1e-3); close(19 * (1 - 0.5) - 2.44 * 0.5, 8.28, 1e-12); expect(8.28 / 19).toBeLessThan(0.5);
    });
});

describe('Economics and auxiliaries', () => {
    it('cost per kWh with CRF; two-part tariff; break-even hours where costs cross', () => {
        const i = 0.1; const n = 25; const CRF = (i * (1 + i) ** n) / ((1 + i) ** n - 1); close(CRF, 0.11017, 1e-4);
        close((5e9 * CRF + 100e6 + 900e6) / 700e6, 2.2155, 1e-3);
        close(300 * 1500 + 6 * 600000, 4050000);
        const F1 = 9000; const v1 = 3; const F2 = 3000; const v2 = 8; const h = (F1 - F2) / (v2 - v1); close(F1 + v1 * h, F2 + v2 * h, 1e-12); close(h, 1200);
    });

    it('pump and fan power; net output and net heat rate', () => {
        close((1000 * 9.81 * 0.5 * 120) / 0.8, 735750); close((50 * 3000) / 0.7, 214286, 1e-5);
        close(100 - 7, 93); close(10000 * (100 / 93), 10752.7, 1e-5);
    });
});
