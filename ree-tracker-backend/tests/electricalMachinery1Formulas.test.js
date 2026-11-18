import { describe, it, expect } from 'vitest';

// EE › Electrical Machinery 1 formula cards, checked with numbers (Library
// round, 2026-11-18): regulation by phasors; the open- and short-circuit tests
// run on a transformer of known parameters and read back; autotransformer and
// open-delta ratings from winding currents; parallel sharing as a current
// divider; DC machine torque by power balance; a starter simulated step by
// step; a shunt generator's build-up simulated against its field resistance.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, cos, sin, acos, PI, log, ceil, abs, tanh } = Math;
const C = { add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], div: (a, b) => { const d = b[0] ** 2 + b[1] ** 2; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }, abs: (a) => Math.hypot(a[0], a[1]), polar: (m, th) => [m * cos(th), m * sin(th)] };

describe('Magnetic circuits and transformer principles', () => {
    it('stacking factor and fringing; parallel paths combine like resistors', () => {
        close(0.92 * 0.0025, 0.0023); close((0.04 + 0.002) * (0.05 + 0.002), 0.002184);
        // Shell core: coil on the centre leg; solve the two-loop network directly.
        const Rc = 2e5; const R1 = 5e5; const R2 = 8e5; const F = 1000;
        const Req = Rc + (R1 * R2) / (R1 + R2); const Phc = F / Req;
        const Ph1 = (Phc * R2) / (R1 + R2); const Ph2 = Phc - Ph1;
        close(Ph1 * R1, Ph2 * R2); close(Phc * Rc + Ph1 * R1, F);
    });

    it('peak flux: integrating the applied sine gives V/(4.44 f N)', () => {
        const V = 240; const f = 60; const N = 200; const w = 2 * PI * f;
        let flux = 0; let peak = 0; const dt = 1 / f / 20000;
        for (let t = 0; t < 1 / f; t += dt) { flux += (V * sqrt(2) * sin(w * t) * dt) / N; peak = Math.max(peak, abs(flux - (V * sqrt(2)) / (w * N))); }
        close(peak, V / (4.44 * f * N), 2e-3);
        close((2 * PI) / sqrt(2), 4.443, 1e-3);
    });

    it('rated currents and exciting-current parts', () => {
        close(10000 / 2400, 4.1667, 1e-4); close(10000 / 240, 41.667, 1e-4); close(500e3 / (sqrt(3) * 13800), 20.92, 1e-3);
        const I0 = 0.5; const th = acos(0.2); close(sqrt((I0 * cos(th)) ** 2 + (I0 * sin(th)) ** 2), I0);
    });
});

describe('Equivalent circuit, regulation and tests', () => {
    // 50 kVA, 2400/240 V transformer with known parameters.
    const S = 50e3; const V1 = 2400; const V2 = 240; const a = V1 / V2;
    const R1 = 0.75; const X1 = 1.0; const R2 = 0.0075; const X2 = 0.01; const Rc = 60e3; const Xm = 10e3;

    it('referring to one side: the ideal transformer turns a load Z into a²Z; per unit is the same on both sides', () => {
        const ZL = [1, 0.5]; const I2 = C.div([V2, 0], ZL); const I1 = C.div(I2, [a, 0]);
        close(C.abs(C.div([V1, 0], I1)), a * a * C.abs(ZL), 1e-12);
        const Zeq1 = R1 + a * a * R2; const Zeq2 = Zeq1 / (a * a);
        close(Zeq1 / ((V1 * V1) / S), Zeq2 / ((V2 * V2) / S), 1e-12);
    });

    it('open- and short-circuit tests read back the parameters', () => {
        // Open circuit on the low side at rated voltage: the magnetizing branch referred to it.
        const Rc2 = Rc / (a * a); const Xm2 = Xm / (a * a);
        const Ic = V2 / Rc2; const Im = V2 / Xm2; const Ioc = sqrt(Ic * Ic + Im * Im); const Poc = V2 * Ic;
        close((V2 * V2) / Poc, Rc2); close(V2 / sqrt(Ioc * Ioc - (Poc / V2) ** 2), Xm2, 1e-9);
        // Short circuit on the high side at rated current: the series impedance only.
        const Req = R1 + a * a * R2; const Xeq = X1 + a * a * X2; const Isc = S / V1; const Vsc = Isc * sqrt(Req * Req + Xeq * Xeq); const Psc = Isc * Isc * Req;
        close(Psc / (Isc * Isc), Req); close(sqrt((Vsc / Isc) ** 2 - Req * Req), Xeq, 1e-9);
        close(Vsc / V1, (sqrt(Req * Req + Xeq * Xeq) * S) / (V1 * V1), 1e-12); // %Z = Vsc %
    });

    it('approximate regulation is within 0.1 % of the phasor sum, lagging and leading', () => {
        const Req = R1 + a * a * R2; const Xeq = X1 + a * a * X2; const I = S / V1;
        for (const [pf, sign] of [[0.8, -1], [0.8, 1]]) {
            const th = sign * acos(pf); const Vnl = C.abs(C.add([V1, 0], C.mul(C.polar(I, th), [Req, Xeq])));
            const exact = (Vnl - V1) / V1; const approx = (I * Req * pf - sign * I * Xeq * sin(acos(pf))) / V1;
            expect(abs(exact - approx)).toBeLessThan(1e-3);
        }
    });

    it('copper loss goes with x²; all-day efficiency counts core loss for 24 h', () => {
        close(0.5 ** 2 * 800, 200);
        const Pc = 0.2; const PcuFL = 0.6; const loads = [[1, 6, 50], [0.5, 10, 25], [0, 8, 0]];
        const out = loads.reduce((s, [, h, kw]) => s + kw * h, 0); const cu = loads.reduce((s, [x, h]) => s + x * x * PcuFL * h, 0);
        close(out / (out + 24 * Pc + cu), 550 / (550 + 4.8 + 5.1), 1e-12);
    });
});

describe('Autotransformers, three-phase and parallel operation', () => {
    it('autotransformer: conducted + transformed = total; reconnected rating from winding currents', () => {
        const S = 100e3; const VH = 480; const VL = 400; close(S * (VL / VH) + S * (1 - VL / VH), S);
        // 10 kVA 2400/240 V as 2640/2400 V: series winding (240 V) at its rated 41.67 A sets the line current.
        const Is = 10e3 / 240; close(2640 * Is, 10e3 * (1 + 2400 / 240), 1e-9);
        // Copper ∝ ampere-turns per section: series N_H − N_L carries I_H, common N_L carries I_L − I_H.
        const NH = 480; const NL = 400; const IH = 1; const IL = NH / NL;
        close(((NH - NL) * IH + NL * (IL - IH)) / (NH * IH + NL * IL), 1 - NL / NH, 1e-12);
    });

    it('three-phase line ratios from phasors, and open delta from the line current', () => {
        const a = 10; const VL1 = 4160;
        close((VL1 / a) * sqrt(3), (sqrt(3) * VL1) / a); close(VL1 / sqrt(3) / a, VL1 / (sqrt(3) * a));
        // Δ-Y: Y phase voltages 120° apart; the line voltage between two is √3 times one.
        const Vp = VL1 / a; close(C.abs(C.sub(C.polar(Vp, 0), C.polar(Vp, (-2 * PI) / 3))), sqrt(3) * Vp, 1e-12);
        // V-V: each unit carries the line current at line voltage; the load is √3 V I.
        const S = 50e3; const IL = S / 480; close((sqrt(3) * 480 * IL) / S, sqrt(3)); close(sqrt(3) / 3, 0.577, 1e-3); close(sqrt(3) / 2, 0.866, 1e-3);
    });

    it('parallel transformers share as a current divider; unequal ratios circulate current', () => {
        const ZA = [0.02, 0.06]; const ZB = [0.03, 0.12]; const IL = C.polar(1000, -acos(0.8));
        const IA = C.div(C.mul(IL, ZB), C.add(ZA, ZB)); const IB = C.sub(IL, IA);
        close(C.abs(C.mul(IA, ZA)), C.abs(C.mul(IB, ZB)), 1e-9);
        close(C.abs(C.div([246 - 240, 0], C.add(ZA, ZB))), 6 / C.abs(C.add(ZA, ZB)));
    });
});

describe('DC machines', () => {
    it('EMF and torque share one constant: P_d = E I = T ω', () => {
        const P = 4; const Z = 500; const a = 2; const Phi = 0.02; const N = 1200; const Ia = 50;
        const E = (P * Phi * Z * N) / (60 * a); const w = (2 * PI * N) / 60; const T = ((P * Z) / (2 * PI * a)) * Phi * Ia;
        close(E * Ia, T * w, 1e-12); close((E * 1500 * 1.1) / 1200, E * (1500 / 1200) * 1.1, 1e-12);
    });

    it('generator currents and compound voltage', () => {
        const Vt = 230; const IL = 100; const Rf = 115; const If = Vt / Rf; const Ia = IL + If; close(Ia, 102);
        const Ra = 0.05; const Rs = 0.03; const Vb = 2; const E = Vt + Ia * (Ra + Rs) + Vb; close(E - Ia * (Ra + Rs) - Vb, Vt);
    });

    it('self-excitation builds up only below the critical field resistance (simulated)', () => {
        const Esat = 300; const k = 120; const occ = (i) => Esat * tanh((k * i) / Esat) + 2; // 2 V residual
        const Rcrit = k; // slope of the air-gap line at the origin
        const settle = (Rf) => { let i = 0; for (let n = 0; n < 200000; n += 1) i += ((occ(i) - Rf * i) / 10) * 1e-3; return occ(i); };
        expect(settle(0.8 * Rcrit)).toBeGreaterThan(100); expect(settle(1.2 * Rcrit)).toBeLessThan(20);
    });

    it('armature reaction: demagnetizing + cross ampere-turns = ZI/2P per pole', () => {
        const Z = 480; const I = 25; const P = 4; const beta = 8; const ATd = (Z * I * beta) / 360; const ATc = Z * I * (1 / (2 * P) - beta / 360);
        close(ATd + ATc, (Z * I) / (2 * P)); close(0.2e-3 * (2 * 25) / 0.5e-3, 20);
    });

    it('series motor: torque ∝ I² when flux ∝ I; maximum power at E_b = V/2 (searched)', () => {
        const T = (I) => 0.01 * I * I; close(T(40) / T(20), 4);
        const V = 220; const Ra = 0.5; let best = 0; let at = 0;
        for (let Eb = 0; Eb <= V; Eb += 0.01) { const p = (Eb * (V - Eb)) / Ra; if (p > best) { best = p; at = Eb; } }
        close(at, V / 2, 1e-4); close(best, (V * V) / (4 * Ra), 1e-6);
    });

    it('starter steps: simulated runs from I₁ to I₂ follow R(k+1) = R(k) I₂/I₁ and reach R_a', () => {
        const V = 220; const Ra = 0.4; const I1 = 60; const I2 = 40; const r = I2 / I1;
        let R = V / I1; let Eb = 0; const steps = [R];
        while (R > Ra + 1e-9) {
            Eb = V - I2 * R; // the motor speeds up until the current falls to I₂
            const next = Math.max(Ra, (V - Eb) / I1); // cut resistance so it jumps back to I₁
            steps.push(next); R = next;
        }
        for (let k = 1; k < steps.length - 1; k += 1) close(steps[k], steps[k - 1] * r, 1e-9);
        close(steps.length - 1, ceil(log(V / I1 / Ra) / log(I1 / I2)));
        close(V / 60 - Ra, 3.2667, 1e-4);
    });

    it('maximum efficiency where I²R_a equals the constant loss (searched); Swinburne', () => {
        const V = 230; const Ra = 0.2; const Pk = 800; const eff = (I) => (V * I - Pk - I * I * Ra) / (V * I);
        let best = 0; let at = 0; for (let I = 1; I < 200; I += 0.001) { const e = eff(I); if (e > best) { best = e; at = I; } }
        close(at, sqrt(Pk / Ra), 1e-3);
        close(230 * 4 - 3 ** 2 * Ra, 918.2, 1e-9);
    });
});
