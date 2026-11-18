import { describe, it, expect } from 'vitest';

// EE › Electric Circuits 2 formula cards, checked with numbers (Library round,
// 2026-11-18): complex power and its conservation, power-factor correction
// by building the corrected load, conjugate matching by scanning loads, the
// half-power points of a resonance found numerically, coupled-coil energy as
// the integral of power, reflected impedance against a two-mesh solve, three-
// phase relations, Millman, two wattmeters and symmetrical components with
// phasor arithmetic, Fourier coefficients and RMS by numerical integration,
// two-port matrices, and the filter's −3 dB point.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, sin, cos, tan, acos, atan, PI, exp, log10, hypot } = Math;
// complex numbers as [re, im]
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const div = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const conj = (a) => [a[0], -a[1]];
const mag = (a) => hypot(a[0], a[1]);
const pol = (m, deg) => [m * cos((deg * PI) / 180), m * sin((deg * PI) / 180)];
const sc = (k, a) => [k * a[0], k * a[1]];
const closeC = (a, b, tol = 1e-9) => { close(a[0], b[0], tol); close(a[1], b[1], tol); };
const avg = (f, T, n = 20000) => { let s = 0; for (let i = 0; i < n; i += 1) s += f(((i + 0.5) / n) * T); return s / n; };

describe('AC power', () => {
    it('S = VI* = P + jQ, conserved across parallel loads; P and Q match VI cos θ and VI sin θ', () => {
        const V = [230, 0]; const Z1 = [10, 5]; const Z2 = [20, -8];
        const I1 = div(V, Z1); const I2 = div(V, Z2); const S = mul(V, conj(add(I1, I2)));
        closeC(S, add(mul(V, conj(I1)), mul(V, conj(I2))), 1e-12);
        const th = Math.atan2(5, 10); close(mul(V, conj(I1))[0], 230 * mag(I1) * cos(th), 1e-12); close(mul(V, conj(I1))[1], 230 * mag(I1) * sin(th), 1e-12);
        close(mag(S) ** 2, S[0] ** 2 + S[1] ** 2, 1e-12);
    });

    it('power-factor correction: 100 kW from 0.70 to 0.95 needs 69.2 kvar, and the corrected load really reads 0.95', () => {
        const P = 100e3; const Qc = P * (tan(acos(0.7)) - tan(acos(0.95))); close(Qc, 69.15e3, 1e-3);
        const Qnew = P * tan(acos(0.7)) - Qc; close(P / hypot(P, Qnew), 0.95, 1e-12);
        const C = Qc / (2 * PI * 60 * 230 ** 2); close(C, 3.467e-3, 1e-3);
        close(1 / (2 * PI * 60 * C), 230 ** 2 / Qc, 1e-12); // X_C = V²/Q
    });

    it('AC maximum power: scanning loads finds Z_th*, with |V|²/4R; a pure resistance does best at |Z_th|', () => {
        const Vth = 100; const Zth = [6, 8]; const P = (Z) => mag(div([Vth, 0], add(Zth, Z))) ** 2 * Z[0];
        let best = 0; let at = null;
        for (let R = 1; R <= 12; R += 0.05) for (let X = -14; X <= 0; X += 0.05) { const p = P([R, X]); if (p > best) { best = p; at = [R, X]; } }
        close(at[0], 6, 1e-2); close(at[1], -8, 1e-2); close(best, (Vth * Vth) / (4 * 6), 1e-6);
        let bR = 0; let atR = 0; for (let R = 0.1; R < 30; R += 0.001) { const p = P([R, 0]); if (p > bR) { bR = p; atR = R; } }
        close(atR, mag(Zth), 1e-3); expect(bR).toBeLessThan(best);
    });
});

describe('Resonance and coupling', () => {
    it('series RLC: the half-power points found numerically give BW = R/L and ω0 = √(ω1ω2)', () => {
        const R = 10; const L = 0.1; const C = 1e-5; const w0 = 1 / sqrt(L * C);
        const I = (w) => 1 / hypot(R, w * L - 1 / (w * C)); const half = 1 / (R * sqrt(2));
        const find = (lo, hi) => { for (let k = 0; k < 80; k += 1) { const m = (lo + hi) / 2; if ((I(m) - half) * (I(lo) - half) > 0) lo = m; else hi = m; } return lo; };
        const w1 = find(1, w0); const w2 = find(w0, 10 * w0);
        close(w2 - w1, R / L, 1e-6); close(sqrt(w1 * w2), w0, 1e-9); close(w0 / (w2 - w1), (w0 * L) / R, 1e-6);
    });

    it('parallel resonance: a lossy coil\'s admittance turns real at √(1/LC − r²/L²); ideal Q = ω0RC', () => {
        const L = 0.01; const C = 1e-6; const r = 20; const w = sqrt(1 / (L * C) - (r * r) / (L * L));
        const Y = add(div([1, 0], [r, w * L]), [0, w * C]); close(Y[1], 0, 1e-9);
        const R = 5000; const w0 = 1 / sqrt(L * C); close(R / (w0 * L), w0 * R * C, 1e-12);
    });

    it('coupled-coil energy is the integral of power along any current path; M ≤ √(L1L2) keeps it positive', () => {
        const L1 = 0.2; const L2 = 0.5; const M = 0.25; const I1 = 3; const I2 = -2; const n = 20000;
        let W = 0; for (let k = 0; k < n; k += 1) { // ramp both currents together from 0
            const s = (k + 0.5) / n; const i1 = I1 * s; const i2 = I2 * s; const di1 = I1 / n; const di2 = I2 / n;
            W += i1 * (L1 * di1 + M * di2) + i2 * (L2 * di2 + M * di1);
        }
        close(W, 0.5 * L1 * I1 ** 2 + 0.5 * L2 * I2 ** 2 + M * I1 * I2, 1e-9);
        const minRatio = (x) => 0.5 * L1 + 0.5 * L2 * x * x - sqrt(L1 * L2) * x; // worst case at k = 1
        expect(minRatio(sqrt(L1 / L2))).toBeGreaterThanOrEqual(-1e-12);
    });

    it('reflected impedance equals the two-mesh solution', () => {
        const w = 377; const Z1 = [2, w * 0.05]; const Z2 = [1, w * 0.08]; const ZL = [10, -5]; const ZM = [0, w * 0.04]; const V = [100, 0];
        // [Z1, -ZM; -ZM, Z2+ZL] [I1; I2] = [V; 0]  (aiding, I2 out of the dot)
        const Z22 = add(Z2, ZL); const det = sub(mul(Z1, Z22), mul(ZM, ZM)); const I1 = div(mul(V, Z22), det);
        const Zin = div(V, I1); closeC(Zin, add(Z1, div([(w * 0.04) ** 2, 0], Z22)), 1e-9);
    });
});

describe('Three-phase', () => {
    const Va = pol(230, 0); const Vb = pol(230, -120); const Vc = pol(230, 120);

    it('wye: V_ab = √3 V_a ∠30°; delta: I_a = √3 I_ab ∠−30°; and P = √3 V_L I_L cos θ = 3 V_p I_p cos θ', () => {
        closeC(sub(Va, Vb), mul(Va, pol(sqrt(3), 30)), 1e-9);
        const Iab = pol(10, -25); const Ica = pol(10, -25 + 120); closeC(sub(Iab, Ica), mul(Iab, pol(sqrt(3), -30)), 1e-9);
        close(sqrt(3) * 400 * 20 * 0.8, 3 * (400 / sqrt(3)) * 20 * 0.8, 1e-12);
    });

    it("Millman's neutral shift matches a direct nodal solve of an unbalanced wye with no neutral", () => {
        const Y = [div([1, 0], [10, 0]), div([1, 0], [5, 5]), div([1, 0], [8, -6])]; const V = [Va, Vb, Vc];
        const num = V.reduce((s, v, k) => add(s, mul(v, Y[k])), [0, 0]); const den = Y.reduce((s, y) => add(s, y), [0, 0]);
        const VN = div(num, den); const I = V.map((v, k) => mul(sub(v, VN), Y[k])); closeC(I.reduce((s, x) => add(s, x), [0, 0]), [0, 0], 1e-9);
    });

    it('two wattmeters on a balanced load: they sum to the power, and give the angle', () => {
        const VL = 400; const IL = 20; const th = (35 * PI) / 180;
        const W1 = VL * IL * cos((30 * PI) / 180 + th); const W2 = VL * IL * cos((30 * PI) / 180 - th);
        close(W1 + W2, sqrt(3) * VL * IL * cos(th), 1e-12); close(atan((sqrt(3) * (W2 - W1)) / (W1 + W2)), th, 1e-12);
        close(VL * IL * cos((30 * PI) / 180 + acos(0.5)), 0, 1e-9); // pf 0.5: one meter reads zero
    });

    it('symmetrical components decompose and recompose; a balanced set is pure positive sequence', () => {
        const a = pol(1, 120); const a2 = mul(a, a); const U = [pol(100, 0), pol(80, -110), pol(60, 130)];
        const V0 = sc(1 / 3, add(add(U[0], U[1]), U[2]));
        const V1 = sc(1 / 3, add(add(U[0], mul(a, U[1])), mul(a2, U[2])));
        const V2 = sc(1 / 3, add(add(U[0], mul(a2, U[1])), mul(a, U[2])));
        closeC(add(add(V0, V1), V2), U[0], 1e-9); closeC(add(add(V0, mul(a2, V1)), mul(a, V2)), U[1], 1e-9);
        const B = [Va, Vb, Vc]; const B0 = sc(1 / 3, add(add(B[0], B[1]), B[2])); const B2 = sc(1 / 3, add(add(B[0], mul(a2, B[1])), mul(a, B[2])));
        close(mag(B0), 0, 1e-9); close(mag(B2), 0, 1e-9);
    });
});

describe('Waveforms, Fourier, two-ports, Laplace, filters', () => {
    it('waveform values by integration: sine RMS 0.707, average 0.637, form 1.111, crest 1.414; triangle 0.577', () => {
        const T = 1; const s = (t) => sin(2 * PI * t);
        close(sqrt(avg((t) => s(t) ** 2, T)), 1 / sqrt(2), 1e-6); close(avg((t) => Math.abs(s(t)), T), 2 / PI, 1e-6);
        close(1 / sqrt(2) / (2 / PI), 1.1107, 1e-4); close(sqrt(2), 1.4142, 1e-4);
        const tri = (t) => (t < 0.5 ? 4 * t - 1 : 3 - 4 * t); close(sqrt(avg((t) => tri(t) ** 2, T)), 1 / sqrt(3), 1e-6);
    });

    it('square-wave Fourier coefficients are 4V/nπ for odd n, zero for even', () => {
        const sq = (t) => (t < 0.5 ? 1 : -1);
        for (const n of [1, 2, 3, 4, 5]) close(2 * avg((t) => sq(t) * sin(2 * PI * n * t), 1, 200000), n % 2 ? 4 / (n * PI) : 0, 1e-4);
    });

    it('non-sinusoidal RMS adds in quadrature; power comes only from matching frequencies; THD', () => {
        const v = (t) => 10 + 100 * sqrt(2) * sin(2 * PI * t) + 30 * sqrt(2) * sin(6 * PI * t);
        const i = (t) => 2 + 5 * sqrt(2) * sin(2 * PI * t - 0.5) + 3 * sqrt(2) * sin(10 * PI * t);
        close(sqrt(avg((t) => v(t) ** 2, 1)), sqrt(10 ** 2 + 100 ** 2 + 30 ** 2), 1e-6);
        close(avg((t) => v(t) * i(t), 1), 10 * 2 + 100 * 5 * cos(0.5), 1e-6);
        close(30 / 100, 0.3); close(100 * sqrt(1 + 0.09), sqrt(100 ** 2 + 30 ** 2), 1e-12);
    });

    it('two-ports: a T network\'s z by solving, y = z⁻¹, and ABCD cascade with AD − BC = 1', () => {
        const Za = 2; const Zb = 3; const Zc = 6;
        const z = [[Za + Zc, Zc], [Zc, Zb + Zc]]; // reciprocal: z12 = z21
        const det = z[0][0] * z[1][1] - z[0][1] * z[1][0]; const y = [[z[1][1] / det, -z[0][1] / det], [-z[1][0] / det, z[0][0] / det]];
        close(y[0][0] * z[0][0] + y[0][1] * z[1][0], 1, 1e-12);
        const m = (P, Q) => [[P[0][0] * Q[0][0] + P[0][1] * Q[1][0], P[0][0] * Q[0][1] + P[0][1] * Q[1][1]], [P[1][0] * Q[0][0] + P[1][1] * Q[1][0], P[1][0] * Q[0][1] + P[1][1] * Q[1][1]]];
        const T = m(m([[1, Za], [0, 1]], [[1, 0], [1 / Zc, 1]]), [[1, Zb], [0, 1]]);
        close(T[0][0] * T[1][1] - T[0][1] * T[1][0], 1, 1e-12);
        close(T[0][0], z[0][0] / z[1][0], 1e-12); // A = z11/z21
    });

    it('initial and final value theorems against the inverse transform of 10/(s(s + 2))', () => {
        const F = (s) => 10 / (s * (s + 2)); const f = (t) => 5 * (1 - exp(-2 * t));
        close(1e9 * F(1e9), f(0), 1e-6); close(1e-9 * F(1e-9), f(50), 1e-6);
    });

    it('RC low-pass: −3 dB at 1/(2πRC), then −20 dB per decade', () => {
        const R = 1e3; const C = 1e-6; const fc = 1 / (2 * PI * R * C); const H = (f) => 1 / hypot(1, 2 * PI * f * R * C);
        close(H(fc), 1 / sqrt(2), 1e-12); close(20 * log10(H(fc)), -3.0103, 1e-4); close(20 * log10(H(1000 * fc)) - 20 * log10(H(100 * fc)), -20, 1e-3); // the asymptote, well past fc
        close(fc, 159.15, 1e-4);
    });
});
