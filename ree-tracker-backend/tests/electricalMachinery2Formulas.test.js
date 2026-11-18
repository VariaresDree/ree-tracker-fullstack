import { describe, it, expect } from 'vitest';

// EE › Electrical Machinery 2 formula cards, checked with numbers (Library
// round, 2026-11-18): winding factors by adding the coil EMFs as phasors;
// power-angle results from S = 3VI*; the salient-pole equation from the
// two-reaction phasors; synchronizing power by differentiating; induction
// torque from the full equivalent circuit, its peak found by search; the
// starting ratios from the motor's own currents; the 90° capacitor by angle.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, sin, cos, atan2, PI, abs, tan, acos } = Math;
const deg = PI / 180;
const C = { add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], div: (a, b) => { const d = b[0] ** 2 + b[1] ** 2; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }, abs: (a) => Math.hypot(a[0], a[1]), polar: (m, th) => [m * cos(th), m * sin(th)], conj: (a) => [a[0], -a[1]], arg: (a) => atan2(a[1], a[0]) };

describe('Alternator windings and regulation', () => {
    it('distribution factor: q coil EMFs α apart add to q·k_d; pitch factor from the two coil sides', () => {
        const q = 4; const a = 15 * deg; let sum = [0, 0];
        for (let k = 0; k < q; k += 1) sum = C.add(sum, C.polar(1, k * a));
        close(C.abs(sum) / q, sin((q * a) / 2) / (q * sin(a / 2)), 1e-12);
        const beta = 30 * deg; const side = C.sub(C.polar(1, 0), C.polar(1, PI - beta)); // coil sides 180° − β apart
        close(C.abs(side) / 2, cos(beta / 2), 1e-12);
        close(cos((5 * 36 * deg) / 2), 0, 1e-12); // β = 36° wipes out the 5th harmonic
        close((4 / 2) * 30, 60); close((180 * 4) / 48, 15);
    });

    it('E = V + I Z_s per phase; Z_s from tests; SCR = 1/X_s(pu) with linear characteristics', () => {
        const V = 1000; const Ra = 0.2; const Xs = 4; const I = C.polar(100, -acos(0.8));
        const E = C.add([V, 0], C.mul(I, [Ra, Xs])); expect(C.abs(E)).toBeGreaterThan(V);
        const Ilead = C.polar(100, acos(0.2)); expect(C.abs(C.add([V, 0], C.mul(Ilead, [Ra, Xs])))).toBeLessThan(V);
        const koc = 50; const ksc = 12.5; const Zs = koc / ksc; // E_oc and I_sc per field ampere
        const Vr = 2000; const Ir = 200; const SCR = Vr / koc / (Ir / ksc); close(SCR, Vr / Ir / Zs, 1e-12);
        close(sqrt(Zs * Zs - 0.3 ** 2), sqrt(16 - 0.09), 1e-12);
    });
});

describe('Power angle, sharing and synchronous motors', () => {
    const V = 2400; const E = 2800; const Xs = 5; const d = 25 * deg;

    it('P and Q from S = 3 V I* match the power-angle equation', () => {
        const I = C.div(C.sub(C.polar(E, d), [V, 0]), [0, Xs]); const S = C.mul([3 * V, 0], C.conj(I));
        close(S[0], ((3 * E * V) / Xs) * sin(d), 1e-9); close(S[1], (3 * V * (E * cos(d) - V)) / Xs, 1e-9);
    });

    it('salient pole: the two-reaction phasors give EV sinδ/X_d + (V²/2)(1/X_q − 1/X_d) sin 2δ', () => {
        const Xd = 1.2; const Xq = 0.8; const Vv = 1; const Ee = 1.5; const dd = 30 * deg;
        const Id = (Ee - Vv * cos(dd)) / Xd; const Iq = (Vv * sin(dd)) / Xq;
        close(Vv * sin(dd) * Id + Vv * cos(dd) * Iq, ((Ee * Vv) / Xd) * sin(dd) + ((Vv * Vv) / 2) * (1 / Xq - 1 / Xd) * sin(2 * dd), 1e-12);
    });

    it('synchronizing power is dP/dδ; pull-out at δ = 90°', () => {
        const Pf = (x) => ((3 * E * V) / Xs) * sin(x); const h = 1e-6;
        close((Pf(d + h) - Pf(d - h)) / (2 * h), ((3 * E * V) / Xs) * cos(d), 1e-6);
        let best = 0; let at = 0; for (let x = 0; x < PI; x += 1e-4) if (Pf(x) > best) { best = Pf(x); at = x; }
        close(at, PI / 2, 1e-3); close(best, (3 * E * V) / Xs, 1e-6);
    });

    it('droop sharing: one frequency, each unit on its own line', () => {
        // Units: f = 61.0 − 1.0·P1 and f = 61.5 − 0.5·P2 (Hz, MW); load 2.5 MW.
        const f = (61.0 / 1.0 + 61.5 / 0.5 - 2.5) / (1 / 1.0 + 1 / 0.5); const P1 = (61.0 - f) / 1.0; const P2 = (61.5 - f) / 0.5;
        close(P1 + P2, 2.5); close(61.0 - P1, 61.5 - 0.5 * P2);
        close(C.abs(C.div(C.sub([1000, 0], C.polar(1000, -5 * deg)), [0, 8])), (2 * 1000 * sin(2.5 * deg)) / 8, 1e-9);
    });

    it('motor: E = V − IZ_s; at unity pf E = √(V² + (IX_s)²) and the current is least (V-curve)', () => {
        const P = 300e3; const Vp = 2400; const X = 6; const current = (Em) => {
            // For a given excitation E and power P: δ from P = 3EV sinδ/X, then I = (V − E∠−δ)/(jX).
            const dl = Math.asin((P * X) / (3 * Em * Vp)); return C.abs(C.div(C.sub([Vp, 0], C.polar(Em, -dl)), [0, X]));
        };
        const Iu = P / (3 * Vp); const Eu = sqrt(Vp * Vp + (Iu * X) ** 2);
        close(current(Eu), Iu, 1e-9);
        expect(current(Eu * 0.9)).toBeGreaterThan(Iu); expect(current(Eu * 1.1)).toBeGreaterThan(Iu);
    });

    it('an overexcited motor brings the plant to the target power factor', () => {
        const Pl = 400; const Ql = 400 * tan(acos(0.7)); const Pm = 100; const th2 = acos(0.95);
        const Qm = Ql - (Pl + Pm) * tan(th2); close((Pl + Pm) / Math.hypot(Pl + Pm, Ql - Qm), 0.95, 1e-12);
        expect(sqrt(Pm * Pm + Qm * Qm)).toBeGreaterThan(Pm);
    });
});

describe('Induction motors', () => {
    const V = 460 / sqrt(3); const R1 = 0.3; const R2 = 0.25; const X = 0.9; const ws = (2 * PI * 1800) / 60;
    const torque = (s) => (3 * V * V * (R2 / s)) / (ws * ((R1 + R2 / s) ** 2 + X * X));

    it('torque-slip equals 3I²(R₂/s)/ω_s from the approximate circuit; the peak is where the card says', () => {
        const s = 0.04; const I2 = C.abs(C.div([V, 0], [R1 + R2 / s, X])); close((3 * I2 * I2 * (R2 / s)) / ws, torque(s), 1e-12);
        let best = 0; let at = 0; for (let x = 1e-4; x <= 1; x += 1e-5) if (torque(x) > best) { best = torque(x); at = x; }
        close(at, R2 / sqrt(R1 * R1 + X * X), 1e-3);
        close(best, (3 * V * V) / (2 * ws * (R1 + sqrt(R1 * R1 + X * X))), 1e-6);
        close(torque(0.04) * 0.81, (3 * (0.9 * V) ** 2 * (R2 / 0.04)) / (ws * ((R1 + R2 / 0.04) ** 2 + X * X)), 1e-12); // ∝ V²
    });

    it('Kloss ratio is exact with R₁ = 0, and gives the starting ratio at s = 1', () => {
        const T0 = (s) => (3 * V * V * (R2 / s)) / (ws * ((R2 / s) ** 2 + X * X)); const sm = R2 / X; const Tm = T0(sm);
        for (const s of [0.02, 0.1, 0.5]) close(T0(s) / Tm, 2 / (s / sm + sm / s), 1e-12);
        close(T0(1) / Tm, (2 * sm) / (1 + sm * sm), 1e-12);
    });

    it('power flow 1 : s : (1 − s), and P_g/ω_s = P_m/ω_m', () => {
        const s = 0.03; const Pg = 50e3; close(s * Pg + (1 - s) * Pg, Pg); close(((1 - s) * Pg) / (ws * (1 - s)), Pg / ws);
    });

    it('the stator Thévenin equivalent gives the same torque as the full circuit', () => {
        const Xm = 25; const X1 = 0.45; const X2 = 0.45; const s = 0.05;
        const Zr = [R2 / s, X2]; const Zm = [0, Xm]; const Zin = C.add([R1, X1], C.div(C.mul(Zm, Zr), C.add(Zm, Zr)));
        const I1 = C.div([V, 0], Zin); const E1 = C.sub([V, 0], C.mul(I1, [R1, X1])); const I2 = C.abs(C.div(E1, Zr));
        const Tfull = (3 * I2 * I2 * (R2 / s)) / ws;
        const Vth = C.div(C.mul([V, 0], Zm), [R1, X1 + Xm]); const Zth = C.div(C.mul(Zm, [R1, X1]), [R1, X1 + Xm]);
        const I2th = C.abs(C.div(Vth, C.add(Zth, Zr))); close((3 * I2th * I2th * (R2 / s)) / ws, Tfull, 1e-12);
        close(C.abs(Vth), (V * Xm) / sqrt(R1 * R1 + (X1 + Xm) ** 2), 1e-12);
    });

    it('starting: star-delta 1/3, autotransformer x², T_st/T_fl = (I_st/I_fl)² s_fl', () => {
        const VL = 400; const Z = 10; const IDelta = (sqrt(3) * VL) / Z; const IStar = VL / sqrt(3) / Z; close(IStar / IDelta, 1 / 3, 1e-12);
        const x = 0.65; const Ist = 600; close(x * (x * Ist), x * x * Ist);
        // From the circuit: T ∝ I²R₂/s, so T_st/T_fl = (I_st/I_fl)²·s_fl/1.
        const sfl = 0.03; const Ifl = C.abs(C.div([V, 0], [R1 + R2 / sfl, X])); const Ist2 = C.abs(C.div([V, 0], [R1 + R2, X]));
        close(torque(1) / torque(sfl), (Ist2 / Ifl) ** 2 * sfl, 1e-12);
        const Rext = sqrt(R1 * R1 + X * X) - R2; const T1 = (s) => (3 * V * V * ((R2 + Rext) / s)) / (ws * ((R1 + (R2 + Rext) / s) ** 2 + X * X));
        let best = 0; let at = 0; for (let s = 0.2; s <= 3; s += 1e-4) if (T1(s) > best) { best = T1(s); at = s; } close(at, 1, 1e-3);
    });

    it('speed control: slip ∝ rotor resistance and ∝ 1/V² at the same torque (low slip)', () => {
        const Tlow = (s, R, Vv) => (3 * Vv * Vv * s) / (ws * R); // R₂/s ≫ others
        close(Tlow(0.02, R2, V), Tlow(0.02 * 3, 3 * R2, V), 1e-12); close(Tlow(0.02, R2, V), Tlow(0.02 / 0.81, R2, 0.9 * V), 1e-12);
        close(460 / 60 * 30, 230);
    });
});

describe('Single-phase, stepper and tests', () => {
    it('backward slip is 2 − s; the capacitor puts the winding currents 90° apart', () => {
        const Ns = 1800; const N = 1746; const s = (Ns - N) / Ns; close((-Ns - N) / -Ns, 2 - s, 1e-12);
        const Rm = 2; const Xm = 3.5; const Ra = 9; const Xa = 2; const Xc = Xa + (Ra * Rm) / Xm;
        const Im = C.div([1, 0], [Rm, Xm]); const Ia = C.div([1, 0], [Ra, Xa - Xc]);
        close(abs(C.arg(Ia) - C.arg(Im)), PI / 2, 1e-12);
    });

    it('stepper: VR (8 stator, 6 rotor teeth) 15°; hybrid 50 teeth 1.8°; speed from pulse rate', () => {
        close(((8 - 6) / (8 * 6)) * 360, 15); close(360 / (2 * 2 * 50), 1.8); close((1.8 * 400) / 6, 120);
        close((360 / 1.8) * (120 / 60), 400);
    });

    it('blocked-rotor and slip tests', () => {
        close(1500 / (3 * 20 ** 2), 1.25); close(48 / (sqrt(3) * 20), 1.3856, 1e-4);
        close(230 / 20, 11.5); close(200 / 30, 6.6667, 1e-4);
    });
});
