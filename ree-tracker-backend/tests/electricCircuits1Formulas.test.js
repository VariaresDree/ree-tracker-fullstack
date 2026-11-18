import { describe, it, expect } from 'vitest';

// EE › Electric Circuits 1 formula cards, checked by solving circuits (Library
// round, 2026-11-18): nodal and mesh matrices solved and cross-checked with
// KCL, KVL, superposition, source transformation and a Thévenin equivalent;
// delta-wye by terminal resistances; op amps with a large finite gain; RC, RL
// and RLC responses by stepping the differential equations; the phasor answer
// of an RL circuit against its simulated steady state.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, exp, sin, cos, atan2, PI, hypot } = Math;
const solve = (A, b) => { // Gaussian elimination with partial pivoting
    const n = b.length; const M = A.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < n; c += 1) {
        let p = c; for (let r = c + 1; r < n; r += 1) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]];
        for (let r = 0; r < n; r += 1) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k += 1) M[r][k] -= f * M[c][k]; }
    }
    return M.map((row, i) => row[n] / row[i]);
};
const par = (...R) => 1 / R.reduce((s, x) => s + 1 / x, 0);

describe('Components', () => {
    it('Ohm and power: the three forms agree; energy and its cost', () => {
        const V = 230; const R = 52.9; const I = V / R; close(V * I, I * I * R); close(V * I, (V * V) / R); close(V * I, 1000);
        close(1.5 * 4, 6); close(6 * 12.5, 75);
    });

    it('circular mils: AWG 12 (80.81 mil) is 6530 CM = 3.31 mm²; 1 CM = π/4 × (0.0254 mm)²', () => {
        close((PI / 4) * 0.0254 ** 2, 5.067e-4, 1e-3); close(80.81 ** 2, 6530, 1e-3); close(80.81 ** 2 * 5.067e-4, 3.31, 2e-3);
        close((10.37 * 1000) / 6530, 1.588, 1e-3); // Ω per 1000 ft of AWG 12
    });

    it('inferred zero 234.5 °C gives α20 = 0.00393 and agrees with the linear formula', () => {
        const a20 = 1 / (234.5 + 20); close(a20, 0.00393, 1e-3);
        close(10 * ((234.5 + 75) / (234.5 + 20)), 10 * (1 + a20 * (75 - 20)), 1e-12);
    });

    it('series and parallel; n equal resistors in parallel give R/n', () => {
        close(par(6, 3), 2); close(par(10, 10, 10, 10), 2.5); expect(par(1, 1000)).toBeLessThan(1);
    });
});

describe('Network analysis', () => {
    // 12 V source with 2 Ω to node A; 4 Ω A–ground; 3 Ω A–B; 6 Ω B–ground; 1 A into B.
    const nodal = (Vs, Is) => solve([[1 / 2 + 1 / 4 + 1 / 3, -1 / 3], [-1 / 3, 1 / 3 + 1 / 6]], [Vs / 2, Is]);

    it('nodal solution satisfies KCL at both nodes and KVL around the source loop', () => {
        const [vA, vB] = nodal(12, 1);
        close((12 - vA) / 2, vA / 4 + (vA - vB) / 3, 1e-12); close((vA - vB) / 3 + 1, vB / 6, 1e-12);
        const i1 = (12 - vA) / 2; close(12 - 2 * i1 - vA, 0, 1e-12);
    });

    it('superposition: the 12 V alone plus the 1 A alone gives the full answer', () => {
        const full = nodal(12, 1); const a = nodal(12, 0); const b = nodal(0, 1);
        close(a[0] + b[0], full[0], 1e-12); close(a[1] + b[1], full[1], 1e-12);
        const P = (x) => (x[1] * x[1]) / 6; expect(Math.abs(P(a) + P(b) - P(full))).toBeGreaterThan(1e-3); // powers do NOT add
    });

    it('source transformation: 12 V with 2 Ω equals 6 A with 2 Ω in parallel', () => {
        const [vA] = nodal(12, 1); const [vA2] = solve([[1 / 2 + 1 / 4 + 1 / 3, -1 / 3], [-1 / 3, 1 / 3 + 1 / 6]], [6, 1]); close(vA, vA2, 1e-12);
    });

    it('Thévenin at node B: V_oc / I_sc gives R_th, and the equivalent predicts any load', () => {
        const Voc = solve([[1 / 2 + 1 / 4 + 1 / 3, -1 / 3], [-1 / 3, 1 / 3]], [6, 1])[1]; // 6 Ω removed
        const vAsc = (6) / (1 / 2 + 1 / 4 + 1 / 3); const Isc = vAsc / 3 + 1; const Rth = Voc / Isc;
        close(Rth, 3 + par(2, 4), 1e-12); // sources off
        const RL = 6; close(Voc * (RL / (Rth + RL)), nodal(12, 1)[1], 1e-12);
    });

    it('mesh matrix agrees with nodal on a two-mesh circuit', () => {
        // 10 V, 2 Ω (mesh 1); 4 Ω shared; 3 Ω and a 5 V source (+ at top) on the right (mesh 2)
        const [i1, i2] = solve([[2 + 4, -4], [-4, 4 + 3]], [10, -5]);
        const vN = solve([[1 / 2 + 1 / 4 + 1 / 3]], [10 / 2 + 5 / 3])[0];
        close(4 * (i1 - i2), vN, 1e-12);
    });

    it('maximum power: the load-power curve peaks at R_L = R_th with V²/4R and 50% efficiency', () => {
        const Vth = 10; const Rth = 4; const P = (RL) => (Vth * Vth * RL) / (Rth + RL) ** 2;
        let best = 0; let at = 0; for (let RL = 0.01; RL < 40; RL += 0.001) if (P(RL) > best) { best = P(RL); at = RL; }
        close(at, Rth, 1e-3); close(best, (Vth * Vth) / (4 * Rth), 1e-6); close(Rth / (Rth + Rth), 0.5);
    });

    it('delta-wye: same resistance between every pair of terminals, and a round trip returns the delta', () => {
        const [ab, bc, ca] = [10, 20, 30]; const S = ab + bc + ca;
        const Ra = (ab * ca) / S; const Rb = (ab * bc) / S; const Rc = (bc * ca) / S;
        close(par(ab, bc + ca), Ra + Rb, 1e-12); close(par(bc, ab + ca), Rb + Rc, 1e-12); close(par(ca, ab + bc), Rc + Ra, 1e-12);
        const P = Ra * Rb + Rb * Rc + Rc * Ra; close(P / Rc, ab, 1e-12); close(P / Ra, bc, 1e-12); close(P / Rb, ca, 1e-12);
        close((9 * 9) / 27, 9 / 3);
    });
});

describe('Op amps (gain 10⁶ against the ideal rules)', () => {
    const A = 1e6;

    it('summing amplifier: −Rf(v1/R1 + v2/R2)', () => {
        const [Rf, R1, R2, v1, v2] = [10e3, 10e3, 5e3, 0.5, 0.2];
        // node at the inverting input: (v1 − x)/R1 + (v2 − x)/R2 + (vo − x)/Rf = 0, vo = −A x
        const x = (v1 / R1 + v2 / R2) / (1 / R1 + 1 / R2 + 1 / Rf + A / Rf); const vo = -A * x;
        close(vo, -Rf * (v1 / R1 + v2 / R2), 1e-5);
    });

    it('difference amplifier with matched ratios: (R2/R1)(v2 − v1)', () => {
        const [R1, R2, v1, v2] = [1e3, 10e3, 1.0, 1.2]; const vp = v2 * (R2 / (R1 + R2));
        // vo = A(vp − vn) with vn = (v1R2 + voR1)/(R1 + R2), solved for vo
        const exact = (A * (vp - (v1 * R2) / (R1 + R2))) / (1 + (A * R1) / (R1 + R2)); close(exact, (R2 / R1) * (v2 - v1), 1e-4);
    });
});

describe('Capacitors, inductors, transients, phasors', () => {
    it('series capacitors share one charge, so voltages divide inversely to C', () => {
        const C1 = 2e-6; const C2 = 6e-6; const V = 12; const Cs = (C1 * C2) / (C1 + C2); const Q = Cs * V;
        close(Q / C1 + Q / C2, V, 1e-12); close(Q / C1, 9, 1e-12); close(1 / (1 / 2 + 1 / 6), 1.5);
    });

    it('RC and RL step responses: stepping the equations matches x∞ + (x0 − x∞)e^(−t/τ)', () => {
        const R = 1e3; const C = 1e-6; const Vs = 10; let v = 2; const dt = 1e-7;
        for (let t = 0; t < 2e-3; t += dt) v += ((Vs - v) / (R * C)) * dt; close(v, Vs + (2 - Vs) * exp(-2e-3 / (R * C)), 1e-4);
        const L = 0.5; const Rl = 100; let i = 0; for (let t = 0; t < 0.01; t += 1e-7) i += ((Vs - Rl * i) / L) * 1e-7;
        close(i, (Vs / Rl) * (1 - exp(-0.01 / (L / Rl))), 1e-4); close(exp(-5), 0.0067, 1e-2);
    });

    it('series RLC: underdamped natural response matches e^(−αt)(A cos ω_d t + B sin ω_d t)', () => {
        const R = 10; const L = 0.1; const C = 1e-4; const a = R / (2 * L); const w0 = 1 / sqrt(L * C); const wd = sqrt(w0 * w0 - a * a);
        expect(a < w0).toBe(true);
        let q = 1e-3; let i = 0; const dt = 1e-7; // charge on C, initial current 0
        for (let t = 0; t < 0.01; t += dt) { const di = (-R * i - q / C) / L; i += di * dt; q += i * dt; }
        const t = 0.01; const qExact = 1e-3 * exp(-a * t) * (cos(wd * t) + (a / wd) * sin(wd * t)); close(q, qExact, 2e-3);
        close(2 * sqrt(L / C), 63.25, 1e-3); // critical resistance
        expect(1 / (2 * 1e3 * 1e-4)).toBeLessThan(1 / (2 * 10 * 1e-4)); // parallel: bigger R, less damping
    });

    it('phasors: an RL circuit\'s simulated steady state matches I = V/(R + jωL)', () => {
        const R = 10; const L = 0.05; const w = 2 * PI * 60; const Vm = 100;
        const Zm = hypot(R, w * L); const th = atan2(w * L, R);
        let i = 0; const dt = 1e-6; let peak = 0; let tPeak = 0;
        for (let t = 0; t < 0.5; t += dt) { i += ((Vm * cos(w * t) - R * i) / L) * dt; if (t > 0.45 && i > peak) { peak = i; tPeak = t; } }
        close(peak, Vm / Zm, 1e-3);
        const lag = ((w * tPeak) % (2 * PI)); close(lag, th, 2e-2);
        close(hypot(3, 4), 5); close(10 / (10 ** 2 + 5 ** 2), 0.08); close(w * L, 18.85, 1e-3); close(1 / (w * 100e-6), 26.53, 1e-3);
    });
});
