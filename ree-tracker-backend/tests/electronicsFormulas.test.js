import { describe, it, expect } from 'vitest';

// EE › Electronics 1 and 2 formula cards, checked with numbers (Library round,
// 2026-11-18): rectifier averages, RMS and class B power by integrating over a
// cycle; the capacitor filter and Schmitt trigger by simulation; bias points
// by solving the full divider circuit; small-signal gains from the hybrid-π
// model; device g_m and r_d by differentiating the device laws; cutoffs,
// Miller, cascades, feedback and oscillator networks with complex arithmetic.

const close = (a, b, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, sin, exp, log, log10, PI, abs, max } = Math;
const avg = (f, n = 200000) => { let s = 0; for (let k = 0; k < n; k += 1) s += f(((k + 0.5) / n) * 2 * PI); return s / n; };
const bisect = (g, lo, hi) => { for (let k = 0; k < 200; k += 1) { const m = (lo + hi) / 2; if (g(lo) * g(m) <= 0) hi = m; else lo = m; } return (lo + hi) / 2; };
// Complex numbers as [re, im].
const C = { add: (a, b) => [a[0] + b[0], a[1] + b[1]], mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], div: (a, b) => { const d = b[0] ** 2 + b[1] ** 2; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }, abs: (a) => Math.hypot(a[0], a[1]), arg: (a) => Math.atan2(a[1], a[0]) };
const par = (a, b) => C.div(C.mul(a, b), C.add(a, b));
const VT = 1.380649e-23 * 300 / 1.602176634e-19;

describe('Semiconductors and diodes', () => {
    it('mass action, built-in potential and conductivity', () => {
        const ni = 1e10; const ND = 1e16; close(ND * (ni * ni / ND), ni * ni, 1e-12);
        const V0 = VT * log((1e16 * 1e16) / (ni * ni)); expect(V0).toBeGreaterThan(0.6); expect(V0).toBeLessThan(0.8);
        close(1.602e-19 * (1e22 * 0.135 + 0), 216.27, 1e-3); // n-type Si, 10¹⁶ cm⁻³ = 10²² m⁻³
    });

    it('dynamic resistance and 60 mV per decade from differentiating Shockley', () => {
        const Is = 1e-14; const I = (V) => Is * (exp(V / VT) - 1); const Vq = VT * log(1e-3 / Is + 1); const h = 1e-7;
        close(1 / ((I(Vq + h) - I(Vq - h)) / (2 * h)), VT / 1e-3, 1e-5);
        close(VT * log(10 * 1e-3 / Is + 1) - Vq, VT * log(10), 1e-6); close(VT * log(10), 0.0595, 1e-2);
        close((5 - 0.7) / 1000, 4.3e-3, 1e-12);
    });
});

describe('Rectifiers, filters and Zeners', () => {
    const Vm = 10;
    it('averages, RMS, ripple factors and efficiencies by integrating one cycle', () => {
        const half = (t) => max(0, Vm * sin(t)); const full = (t) => abs(Vm * sin(t));
        const dcH = avg(half); const rmsH = sqrt(avg((t) => half(t) ** 2)); const dcF = avg(full); const rmsF = sqrt(avg((t) => full(t) ** 2));
        close(dcH, Vm / PI, 1e-6); close(rmsH, Vm / 2, 1e-6); close(dcF, (2 * Vm) / PI, 1e-6); close(rmsF, Vm / sqrt(2), 1e-6);
        close(sqrt((rmsH / dcH) ** 2 - 1), 1.211, 1e-3); close(sqrt((rmsF / dcF) ** 2 - 1), 0.483, 1e-3);
        close((dcH / rmsH) ** 2, 4 / PI ** 2, 1e-6); close((dcF / rmsF) ** 2, 8 / PI ** 2, 1e-6); close(100 * 4 / PI ** 2, 40.5, 1e-3);
    });

    it('capacitor filter: simulated ripple matches I/(f_r C), and V_dc ≈ V_m − V_r/2', () => {
        const f = 60; const Cf = 2200e-6; const R = 200; const Vpk = 20; const dt = 1e-6; let vc = 0; let lo = Infinity; let hi = 0; let sum = 0; let n = 0;
        for (let t = 0; t < 0.5; t += dt) {
            const vs = abs(Vpk * sin(2 * PI * f * t)); vc = max(vs, vc - (vc / (R * Cf)) * dt);
            if (t > 0.3) { lo = Math.min(lo, vc); hi = max(hi, vc); sum += vc; n += 1; }
        }
        const Vr = hi - lo; const Idc = sum / n / R;
        close(Vr, Idc / (2 * f * Cf), 0.05); close(sum / n, Vpk - Vr / 2, 0.01);
        // Half-wave with a filter: the diode blocks V_m + v_C ≈ 2V_m at the negative peak.
        close(Vpk + Vpk, 2 * Vpk, 1e-12);
    });

    it('Zener: current left for the Zener, the largest R_S, and no-load dissipation', () => {
        const Vin = 15; const Vz = 9.1; const Rs = 200; const IL = 0.02;
        close((Vin - Vz) / Rs - IL, 0.0095, 1e-9);
        const RsMax = (12 - Vz) / (0.005 + 0.025); close((12 - Vz) / RsMax - 0.025, 0.005, 1e-9);
        close(Vz * ((18 - Vz) / Rs), 0.40495, 1e-9);
        close(((12.2 - 12) / 12) * 100, 1.667, 1e-3);
    });
});

describe('BJT bias and amplifiers', () => {
    it('base bias with R_E: the loop equation, checked by simulating the transistor with Shockley', () => {
        const Vcc = 12; const RB = 470e3; const RE = 1e3; const RC = 2.2e3; const beta = 100; const Is = 1e-14;
        // Exact: I_B = I_E/(β + 1), V_BE from Shockley; solve VCC = I_B R_B + V_BE + I_E R_E for I_E.
        const IE = bisect((ie) => Vcc - (ie / (beta + 1)) * RB - VT * log((ie * beta) / (beta + 1) / Is) - ie * RE, 1e-7, 1e-2);
        const Vbe = VT * log((IE * beta) / (beta + 1) / Is);
        close(IE / (beta + 1), (Vcc - Vbe) / (RB + (beta + 1) * RE), 1e-9);
        close(Vcc - ((IE * beta) / (beta + 1)) * RC - IE * RE, Vcc - beta * (IE / (beta + 1)) * RC - IE * RE, 1e-12);
    });

    it('voltage-divider bias: the Thévenin formula matches the full divider circuit', () => {
        const Vcc = 15; const R1 = 39e3; const R2 = 8.2e3; const RE = 1e3; const beta = 120; const Vbe = 0.7;
        const VB = bisect((vb) => (Vcc - vb) / R1 - vb / R2 - (vb - Vbe) / RE / (beta + 1), 0.7, 15);
        const Vth = (Vcc * R2) / (R1 + R2); const Rth = (R1 * R2) / (R1 + R2);
        close((VB - Vbe) / RE, (Vth - Vbe) / (RE + Rth / (beta + 1)), 1e-9);
        close((Vth - Vbe) / RE, 1.906e-3, 1e-3); // the approximate method, about 6% high here
    });

    it('g_m by differentiating the collector current; r_π = β/g_m = (β + 1) r_e', () => {
        const Is = 1e-15; const Ic = (v) => Is * exp(v / VT); const v = VT * log(1e-3 / Is); const h = 1e-7;
        close((Ic(v + h) - Ic(v - h)) / (2 * h), 1e-3 / VT, 1e-6); close(1e-3 / VT, 0.0386, 1e-2);
        const beta = 100; const gm = 1e-3 / VT; const IE = (1e-3 * (beta + 1)) / beta; close(beta / gm, (beta + 1) * (VT / IE), 1e-12);
    });

    it('CE and CC gains and resistances from the hybrid-π model', () => {
        const beta = 100; const Ic = 2e-3; const gm = Ic / VT; const rpi = beta / gm; const IE = (Ic * (beta + 1)) / beta; const re = VT / IE;
        const RL = (4.7e3 * 10e3) / (4.7e3 + 10e3); const RE = 220;
        // KCL at the emitter: (vb − ve)/rπ + gm(vb − ve) = ve/RE.
        const g = 1 / rpi + gm; const ve = g / (g + 1 / RE); const ic = gm * (1 - ve);
        close(-ic * RL, -(beta / (beta + 1)) * RL / (re + RE), 1e-9); close(-ic * RL, -RL / (re + RE), 1e-2);
        close(1 / ((1 - ve) / rpi), (beta + 1) * (re + RE), 1e-9);
        const REp = 1e3; const veF = g / (g + 1 / REp); close(veF, REp / (re + REp), 1e-9); expect(veF).toBeLessThan(1);
        close(gm * RL, RL / (VT / Ic), 1e-12); // common base ≈ g_m R_L
    });

    it('Darlington: β_D = β₁β₂ + β₁ + β₂ exactly', () => {
        const b1 = 50; const b2 = 80; const IB = 1e-6; const IE1 = (b1 + 1) * IB; const IE2 = (b2 + 1) * IE1;
        close((IE2 - IB) / IB, b1 * b2 + b1 + b2, 1e-12);
    });
});

describe('FETs', () => {
    it('MOSFET triode and saturation agree at V_DS = V_GS − V_th; g_m = 2√(kI_D)', () => {
        const k = 0.5e-3; const Vth = 1.5; const Vgs = 4; const Vov = Vgs - Vth;
        close(k * (2 * Vov * Vov - Vov * Vov), k * Vov * Vov, 1e-12);
        const Id = (v) => k * (v - Vth) ** 2; const h = 1e-6; const gm = (Id(Vgs + h) - Id(Vgs - h)) / (2 * h);
        close(gm, 2 * k * Vov, 1e-6); close(gm, 2 * sqrt(k * Id(Vgs)), 1e-6);
    });

    it('JFET g_m by differentiating Shockley; self-bias root lies between V_P and 0', () => {
        const Idss = 10e-3; const Vp = -4; const Id = (v) => Idss * (1 - v / Vp) ** 2; const h = 1e-7; const v = -1.5;
        close((Id(v + h) - Id(v - h)) / (2 * h), ((2 * Idss) / abs(Vp)) * (1 - v / Vp), 1e-6);
        const Rs = 500; const vgs = bisect((x) => x + Id(x) * Rs, Vp, 0); expect(vgs).toBeGreaterThan(Vp); close(vgs, -Id(vgs) * Rs, 1e-9);
        const gm = 4e-3; close((gm * 1e3) / (1 + gm * 1e3), 0.8, 1e-12);
    });
});

describe('Frequency response and feedback', () => {
    it('coupling cutoff where |H| = 1/√2; Miller input capacitance', () => {
        const R = 1e3 + 9e3; const Cc = 1e-6; const H = (f) => C.abs(C.div([R, 0], [R, -1 / (2 * PI * f * Cc)]));
        close(bisect((f) => H(f) - 1 / sqrt(2), 1, 1e4), 1 / (2 * PI * R * Cc), 1e-6);
        const Cf = 2e-12; const A = -99; const w = 1e6; const iin = C.mul([0, w * Cf], [1 - A, 0]); close(iin[1] / w, Cf * (1 + 99), 1e-12);
        close(20 * log10(100), 40, 1e-12); close(20 * log10(1 / sqrt(2)), -3.01, 1e-3);
    });

    it('cascaded identical stages: the bandwidth shrinks by √(2^(1/n) − 1)', () => {
        const fH = 1e5; const fL = 100;
        for (const n of [2, 3]) {
            const hi = bisect((f) => C.abs(C.div([1, 0], [1, f / fH])) ** n - 1 / sqrt(2), 1, fH);
            close(hi, fH * sqrt(2 ** (1 / n) - 1), 1e-6);
            const lo = bisect((f) => C.abs(C.div([1, 0], [1, -fL / f])) ** n - 1 / sqrt(2), fL, 1e4);
            close(lo, fL / sqrt(2 ** (1 / n) - 1), 1e-6);
        }
        close(sqrt(2 ** 0.5 - 1), 0.644, 1e-3);
    });

    it('negative feedback: A/(1 + Aβ), desensitivity, and bandwidth × (1 + Aβ)', () => {
        const A = 1e4; const b = 0.01; const Af = (a) => a / (1 + a * b); close(Af(A), 99.0099, 1e-6);
        close((Af(A * 1.1) - Af(A)) / Af(A), 0.1 / (1 + A * b), 2e-3);
        const fp = 100; const Aol = (f) => C.div([A, 0], [1, f / fp]); const Acl = (f) => C.abs(C.div(Aol(f), C.add([1, 0], C.mul(Aol(f), [b, 0]))));
        close(bisect((f) => Acl(f) - Af(A) / sqrt(2), 1, 1e7), fp * (1 + A * b), 1e-6);
    });

    it('gain-bandwidth: a 1 MHz op-amp at a gain of 100 gives 10 kHz', () => {
        const A0 = 2e5; const fc = 5; const Aol = (f) => C.div([A0, 0], [1, f / fc]); const beta = 1 / 100;
        const Acl = (f) => C.abs(C.div(Aol(f), C.add([1, 0], C.mul(Aol(f), [beta, 0]))));
        close(bisect((f) => Acl(f) - Acl(0.001) / sqrt(2), 1, 1e6), (A0 * fc) / 100, 1e-3);
    });
});

describe('Op-amp circuits, oscillators and power stages', () => {
    it('integrator turns a ±1 V square wave into a triangle; slew limit 2πfV_p', () => {
        const R = 10e3; const Cc = 0.1e-6; const T = 1e-3; const dt = 1e-7; let vo = 0; let lo = 0; let hi = 0;
        for (let t = 0; t < 4 * T; t += dt) { const vi = (t % T) < T / 2 ? 1 : -1; vo -= (vi / (R * Cc)) * dt; lo = Math.min(lo, vo); hi = max(hi, vo); }
        close(hi - lo, (1 / (R * Cc)) * (T / 2), 1e-3);
        const SR = 0.5e6; const Vp = 10; close(SR / (2 * PI * Vp), 7958, 1e-3);
        close(2 * PI * 7958 * Vp, SR, 1e-4);
    });

    it('CMRR and the Schmitt trigger switching at ±βV_sat (simulated sweep)', () => {
        close(20 * log10(1e5 / 1), 100, 1e-12);
        const R1 = 10e3; const R2 = 2.2e3; const Vsat = 13; const beta = R2 / (R1 + R2); let vo = Vsat; let up = null; let down = null;
        for (let k = -5000; k <= 5000; k += 1) { const vin = k / 1000; if (vin > beta * vo && vo > 0) { vo = -Vsat; up = vin; } }
        for (let k = 5000; k >= -5000; k -= 1) { const vin = k / 1000; if (vin < beta * vo && vo < 0) { vo = Vsat; down = vin; } }
        close(up, beta * Vsat, 2e-3); close(down, -beta * Vsat, 2e-3);
    });

    it('phase-shift network gives −1/29 at 1/(2πRC√6); Wien gives 1/3 at 0° at 1/(2πRC)', () => {
        const R = 10e3; const Cc = 10e-9;
        // Three sections of C in series then R to ground, solved from the output back.
        const beta = (f) => { const w = 2 * PI * f; const Zc = [0, -1 / (w * Cc)]; const Zr = [R, 0];
            let v3 = [1, 0]; let i3 = C.div(v3, Zr); let v2 = C.add(v3, C.mul(i3, Zc));
            let i2 = C.add(i3, C.div(v2, Zr)); let v1 = C.add(v2, C.mul(i2, Zc));
            const i1 = C.add(i2, C.div(v1, Zr)); const vin = C.add(v1, C.mul(i1, Zc)); return C.div([1, 0], vin); };
        const f0 = 1 / (2 * PI * R * Cc * sqrt(6)); const b = beta(f0); close(b[0], -1 / 29, 1e-9); close(b[1], 0, 1e-9);
        const wien = (f) => { const w = 2 * PI * f; const Zs = [R, -1 / (w * Cc)]; const Zp = par([R, 0], [0, -1 / (w * Cc)]); return C.div(Zp, C.add(Zs, Zp)); };
        const bw = wien(1 / (2 * PI * R * Cc)); close(bw[0], 1 / 3, 1e-9); close(bw[1], 0, 1e-9);
    });

    it('Colpitts and Hartley tanks resonate at 1/(2π√(L_eq C_eq))', () => {
        const L = 10e-6; const C1 = 1e-9; const C2 = 4e-9; const Ceq = (C1 * C2) / (C1 + C2); const f = 1 / (2 * PI * sqrt(L * Ceq)); const w = 2 * PI * f;
        close(w * L - 1 / (w * C1) - 1 / (w * C2), 0, 1e-6);
        const L1 = 5e-6; const L2 = 3e-6; const M = 1e-6; const Ct = 1e-9; const fH = 1 / (2 * PI * sqrt((L1 + L2 + 2 * M) * Ct)); const wH = 2 * PI * fH;
        close(wH * (L1 + M) + wH * (L2 + M) - 1 / (wH * Ct), 0, 1e-6);
    });

    it('class A limits 25% and 50%; class B efficiency and worst dissipation by integration', () => {
        const Vcc = 20; const R = 10;
        const I = Vcc / (2 * R); close(((Vcc / 2) * I) / 2 / (Vcc * I), 0.25, 1e-12); close((Vcc * I) / 2 / (Vcc * I), 0.5, 1e-12);
        const RL = 8; const VccB = 15;
        const powers = (Vp, n = 200000) => { const Po = avg((t) => (Vp * sin(t)) ** 2 / RL, n); const Pdc = 2 * VccB * avg((t) => max(0, (Vp * sin(t)) / RL), n); return { Po, Pdc }; };
        const { Po, Pdc } = powers(12); close(Po, 144 / (2 * RL), 1e-6); close(Pdc, (2 * VccB * 12) / (PI * RL), 1e-6); close(Po / Pdc, (PI / 4) * (12 / VccB), 1e-6);
        let worst = 0; let at = 0; for (let Vp = 0.1; Vp <= VccB; Vp += 0.01) { const p = powers(Vp, 2000); const d = p.Pdc - p.Po; if (d > worst) { worst = d; at = Vp; } }
        close(worst, (2 * VccB * VccB) / (PI * PI * RL), 1e-4); close(at, (2 * VccB) / PI, 1e-2); // the maximum is flat
        close(PI / 4, 0.785, 1e-3);
    });

    it('heat sink: T_J = T_A + P(θ_JC + θ_CS + θ_SA), solved for θ_SA', () => {
        const thSA = (150 - 40) / 20 - 1.5 - 0.5; close(thSA, 3.5, 1e-12); close(40 + 20 * (1.5 + 0.5 + thSA), 150, 1e-12);
    });
});
