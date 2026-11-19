import { describe, it, expect } from 'vitest';

// EE › Distribution Systems & Substation Design formula cards, checked with
// numbers (Library round, 2026-11-19): a uniformly loaded feeder integrated
// along its length; a two-source feeder solved by KVL; the drop formula
// against the phasor answer; the two-thirds capacitor rule found by search;
// loss factor from a load curve; the Wenner formula from point-source
// potentials; the rolling sphere by geometry; reliability indices from an
// outage list; unbalance from sequence components; THD from a sampled wave.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, sin, cos, acos, exp, PI, tan, hypot, abs, max } = Math;
const C = { add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], abs: (a) => hypot(a[0], a[1]), polar: (m, t) => [m * cos(t), m * sin(t)], s: (k, a) => [k * a[0], k * a[1]] };

describe('Loads and feeders', () => {
    it('loss falls as 1/V²; loss factor of a two-level load curve lies between LF² and LF', () => {
        const loss = (V) => (10e6 ** 2 * 0.5) / (V * V * 0.9 ** 2); close(loss(13.8e3) / loss(34.5e3), (34.5 / 13.8) ** 2);
        // 8 h at 100%, 16 h at 40% of peak.
        const LF = (8 * 1 + 16 * 0.4) / 24; const LsF = (8 * 1 + 16 * 0.16) / 24;
        expect(LsF).toBeGreaterThanOrEqual(LF * LF); expect(LsF).toBeLessThanOrEqual(LF);
        expect(abs(0.3 * LF + 0.7 * LF * LF - LsF)).toBeLessThan(0.05);
        close(0.6 * 1000 * 8760, 5256000); close(1 / 1.25, 0.8); close(450 / 500, 0.9);
    });

    it('uniformly distributed load: drop IR/2 and loss I²R/3 by integrating along the feeder', () => {
        const I = 200; const R = 0.5; const n = 100000; let drop = 0; let loss = 0;
        for (let k = 0; k < n; k += 1) { const x = (k + 0.5) / n; const Ix = I * (1 - x); drop += Ix * (R / n); loss += Ix * Ix * (R / n); }
        close(drop, (I * R) / 2, 1e-6); close(loss, (I * I * R) / 3, 1e-6);
    });

    it('feeder fed from both ends: the moment split satisfies KVL between equal sources', () => {
        const L = 1000; const r = 0.0004; const loads = [[100, 200], [150, 500], [80, 800]];
        const IA = loads.reduce((s, [i, x]) => s + (i * (L - x)) / L, 0); const total = loads.reduce((s, [i]) => s + i, 0);
        // Walk from A to B: the voltage must come back to the same value.
        let I = IA; let pos = 0; let dv = 0; for (const [i, x] of loads) { dv += I * r * (x - pos); I -= i; pos = x; } dv += I * r * (L - pos);
        close(dv, 0, 1e-9); expect(IA).toBeLessThan(total);
    });

    it('voltage drop I(R cosθ + X sinθ) is close to the exact phasor drop', () => {
        const Vs = 7967; const I = 150; const R = 1.2; const X = 2.4; const th = acos(0.85);
        // Receiving voltage from a known sending voltage: solve |Vr + I Z| = Vs.
        let Vr = Vs; for (let k = 0; k < 50; k += 1) { const Vsend = C.add([Vr, 0], C.mul(C.polar(I, -th), [R, X])); Vr += Vs - C.abs(Vsend); }
        close(Vs - Vr, I * (R * cos(th) + X * sin(th)), 2e-2);
    });
});

describe('Voltage regulation and capacitors', () => {
    it('capacitor rise %ΔV = kvar·X/(10 kV²) equals Q X/V²', () => {
        close((600 * 4) / (10 * 13.8 ** 2), ((600e3 * 4) / 13.8e3 ** 2) * 100, 1e-12);
    });

    it('loss reduction R(2QQ_c − Q_c²)/V² from the loss before and after', () => {
        const R = 2; const V = 13.8e3; const P = 3e6; const Q = 2e6; const Qc = 1.2e6;
        const loss = (q) => ((P * P + q * q) * R) / (V * V); close(loss(Q) - loss(Q - Qc), (R * (2 * Q * Qc - Qc * Qc)) / (V * V), 1e-9);
    });

    it('two-thirds rule: the best single capacitor is 2/3 of the vars at 2/3 of the length (searched)', () => {
        const L = 1; const Q = 1; const n = 400; // uniform reactive load; reactive current q(x) = Q(1 − x)
        const loss = (qc, xc) => { let s = 0; for (let k = 0; k < n; k += 1) { const x = (k + 0.5) / n; const q = Q * (1 - x) - (x < xc ? qc : 0); s += (q * q) / n; } return s; };
        let best = Infinity; let at = [0, 0]; for (let qc = 0.5; qc <= 0.8; qc += 0.005) for (let xc = 0.5; xc <= 0.8; xc += 0.005) { const l = loss(qc, xc); if (l < best) { best = l; at = [qc, xc]; } }
        close(at[0], 2 / 3, 1e-2); close(at[1], 2 / 3, 1e-2); close(1 - best / loss(0, 0), 8 / 9, 1e-2);
    });

    it('regulator: ±10% in 32 steps; line-drop compensator settings', () => {
        close(16 * 0.00625, 0.1); close((600 / 60) * 3, 30);
    });
});

describe('Transformers, substation, grounding and lightning', () => {
    it('hottest spot and the aging factor (1 at 110 °C, about 2.7 at 120 °C)', () => {
        const FAA = (th) => exp(15000 / 383 - 15000 / (th + 273)); close(FAA(110), 1, 1e-12); close(FAA(120), 2.709, 1e-3);
        close(30 + 55 + 25, 110); close(1.5 * 6, 9);
    });

    it('current-limiting reactor brings 1000 MVA down to 500 MVA', () => {
        const base = 100; const Xr = base / 500 - base / 1000; close(Xr, 0.1); close(1 / (base / 1000 + Xr) * base, 500, 1e-12);
    });

    it('GPR and Wenner: four surface point sources give ρ = 2πaR', () => {
        close(5000 * 0.6 * 1.1 * 0.5, 1650);
        const rho = 120; const a = 5; const I = 1; const pot = (d) => (rho * I) / (2 * PI * d); // point source on the surface
        const V2 = pot(a) - pot(2 * a); const V3 = pot(2 * a) - pot(a); close((V2 - V3) / I * 2 * PI * a, rho, 1e-12);
        close((120 * 0.9 * 1.2 * 1000) / 800, 162);
    });

    it('rolling sphere: the boundary point lies on the sphere resting on ground and the mast tip', () => {
        const R = 45; const H = 30; const y = 10; const xc = sqrt(H * (2 * R - H)); const d = xc - sqrt(y * (2 * R - y));
        close(hypot(xc - 0, R - H), R, 1e-12); close(hypot(xc - d, R - y), R, 1e-12); expect(d).toBeGreaterThan(0);
    });

    it('ground flash density and strikes to a line', () => {
        close(0.04 * 80 ** 1.25, 9.57, 1e-3); close((9.57 * (10 + 28 * 20 ** 0.6)) / 10, 9.57 * (10 + 28 * 6.034) / 10, 1e-3);
    });
});

describe('Reliability and the Philippine Distribution Code', () => {
    it('SAIFI, SAIDI, CAIDI and ASAI from an outage list', () => {
        const NT = 10000; const ev = [[2000, 90], [500, 30], [1500, 240]]; // customers, minutes
        const SAIFI = ev.reduce((s, [n]) => s + n, 0) / NT; const SAIDI = ev.reduce((s, [n, r]) => s + n * r, 0) / NT;
        close(SAIFI, 0.4); close(SAIDI, 55.5); close(SAIDI / SAIFI, 138.75); close(1 - SAIDI / 525600, 0.999894, 1e-6);
    });

    it('availability; series multiplies availability, parallel multiplies unavailability', () => {
        const A = 4000 / (4000 + 8); close(A * A, A ** 2); close(1 - (1 - A) ** 2, 1 - (8 / 4008) ** 2, 1e-12);
    });

    it('PDC power factor: Q ≤ 0.62 P', () => { close(tan(acos(0.85)), 0.6197, 1e-4); });

    it('voltage unbalance: V2/V1 from sequence components ≈ max deviation from average', () => {
        const a = C.polar(1, (2 * PI) / 3); const a2 = C.mul(a, a);
        const Va = C.polar(232, 0); const Vb = C.polar(228, (-2 * PI) / 3); const Vc = C.polar(225, (2 * PI) / 3);
        const V1 = C.s(1 / 3, C.add(C.add(Va, C.mul(a, Vb)), C.mul(a2, Vc))); const V2 = C.s(1 / 3, C.add(C.add(Va, C.mul(a2, Vb)), C.mul(a, Vc)));
        // NEMA's approximation uses the LINE voltages.
        const VL = [C.sub(Va, Vb), C.sub(Vb, Vc), C.sub(Vc, Va)].map(C.abs); const avg = VL.reduce((s, x) => s + x, 0) / 3;
        const vuf = (C.abs(V2) / C.abs(V1)) * 100; const nema = (max(...VL.map((x) => abs(x - avg))) / avg) * 100;
        expect(vuf).toBeLessThan(2.5); expect(abs(vuf - nema)).toBeLessThan(0.2);
    });

    it('THD from a sampled waveform equals the root-sum-square of its harmonics', () => {
        const h = { 1: 230, 3: 6, 5: 8, 7: 4 }; const n = 4096; const wave = (t) => Object.entries(h).reduce((s, [k, A]) => s + A * sin(k * t), 0);
        const amp = (k) => { let re = 0; let im = 0; for (let i = 0; i < n; i += 1) { const t = (2 * PI * i) / n; re += wave(t) * cos(k * t); im += wave(t) * sin(k * t); } return (2 * hypot(re, im)) / n; };
        const thd = sqrt([3, 5, 7].reduce((s, k) => s + amp(k) ** 2, 0)) / amp(1); close(thd, sqrt(36 + 64 + 16) / 230, 1e-9); expect(thd).toBeLessThan(0.05);
    });
});
