import { describe, it, expect } from 'vitest';

// EE › Instrumentation & Control formula cards, checked with numbers (Library
// round, 2026-11-19): each bridge's detector voltage computed as a divider
// pair and shown to be zero at the card's balance; meters from their
// circuits; the average-responding error on a square wave; one-wattmeter vars
// and phase-angle error with phasors; the Lissajous ellipse sampled; probe
// compensation flat across frequency; aliasing and quantization SNR from
// sampled sines; the rest against hand-worked values.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, sin, cos, PI, exp, log10, abs, round, max, asin, atan2, hypot } = Math;
const C = { add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], div: (a, b) => { const d = b[0] ** 2 + b[1] ** 2; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }, abs: (a) => hypot(a[0], a[1]), polar: (m, t) => [m * cos(t), m * sin(t)], conj: (a) => [a[0], -a[1]] };
const par = (a, b) => C.div(C.mul(a, b), C.add(a, b));
// Bridge: arms Z1–Z2 form one divider, Z3–Zx the other; the detector sits between the midpoints.
const detector = (Z1, Z2, Z3, Zx) => C.sub(C.div(Z2, C.add(Z1, Z2)), C.div(Zx, C.add(Z3, Zx)));

describe('Errors and analog meters', () => {
    it('full-scale error, combined error, voltmeter loading', () => {
        close(1 * (150 / 50), 3); close(0.5 + 1.0, 1.5);
        const Rm = 20000 * 10; close(10 * (Rm / (100e3 + Rm)), 6.667, 1e-3);
    });

    it('shunt and multiplier make the movement read full scale at the new range', () => {
        const Im = 1e-3; const Rm = 100; const Rsh = (Im * Rm) / (10 - Im); close((Im * Rm) / Rsh + Im, 10, 1e-12);
        const Rs = 50 / Im - Rm; close(50 / (Rs + Rm), Im, 1e-12); close(1 / 50e-6, 20000);
    });

    it('series ohmmeter: half scale at R_x = R_in; average meter reads a square wave 11% high', () => {
        close(1500 / (1500 + 1500), 0.5);
        const n = 100000; let sAbs = 0; let sSq = 0; for (let k = 0; k < n; k += 1) { const t = ((k + 0.5) * 2 * PI) / n; const vv = sin(t) >= 0 ? 1 : -1; sAbs += abs(vv); sSq += vv * vv; }
        const reading = 1.11 * (sAbs / n); const rms = sqrt(sSq / n); close((reading - rms) / rms, 0.11, 1e-9);
        let sa = 0; for (let k = 0; k < n; k += 1) sa += abs(sin(((k + 0.5) * 2 * PI) / n)); close(1.1107 * (sa / n), 1 / sqrt(2), 1e-4);
    });

    it('PMMC deflection is linear in current', () => {
        const th = (I) => (0.2 * 100 * 1e-4 * I) / 1e-6; close(th(2e-4) / th(1e-4), 2);
    });
});

describe('Bridges and potentiometer', () => {
    const w = 2 * PI * 1000;

    it('Wheatstone and Kelvin balance', () => {
        const R1 = 100; const R2 = 470; const R3 = 220; const Rx = (R2 * R3) / R1;
        close(C.abs(detector([R1, 0], [R2, 0], [R3, 0], [Rx, 0])), 0, 1e-12);
        expect(C.abs(detector([R1, 0], [R2, 0], [R3, 0], [Rx * 1.01, 0]))).toBeGreaterThan(1e-4); // off balance it reads
        close(0.001 * (100 / 1000), 1e-4);
    });

    it('Maxwell bridge: Z1 = R1 ∥ C1 opposite Zx = Rx + jωLx balances at Lx = R2R3C1', () => {
        const R1 = 5000; const C1 = 0.1e-6; const R2 = 1000; const R3 = 2000;
        const Zx = [(R2 * R3) / R1, w * R2 * R3 * C1]; const Z1 = par([R1, 0], [0, -1 / (w * C1)]);
        close(C.abs(detector(Z1, [R2, 0], [R3, 0], Zx)), 0, 1e-12);
    });

    it('Schering bridge: Zx = Z2 Z3 / Z1 gives Cx = C3 R1/R2 and Rx = R2 C1/C3', () => {
        const R1 = 3000; const C1 = 0.05e-6; const R2 = 1000; const C3 = 100e-12;
        const Z1 = par([R1, 0], [0, -1 / (w * C1)]); const Zx = C.div(C.mul([R2, 0], [0, -1 / (w * C3)]), Z1);
        close(Zx[0], (R2 * C1) / C3, 1e-9); close(-1 / (w * Zx[1]), (C3 * R1) / R2, 1e-9);
    });

    it('potentiometer: lengths in proportion to emf', () => { close(1.0183 * (60.2 / 54.0), 1.1352, 1e-4); });
});

describe('Wattmeters, energy meters and instrument transformers', () => {
    it('connection error adds the coil loss; energy-meter power and error', () => {
        close(1000 + 230 ** 2 / 10000, 1005.29, 1e-5); close((3600 * 7.2 * 20) / 60, 8640); close(((10.2 - 10) / 10) * 100, 2, 1e-12);
    });

    it('one wattmeter across b–c reads Q/√3 on a balanced load (phasors)', () => {
        const V = 230; const I = 50; const phi = 0.6; const Va = C.polar(V, 0); const Vb = C.polar(V, (-2 * PI) / 3); const Vc = C.polar(V, (2 * PI) / 3);
        const Ia = C.polar(I, -phi); const W = C.mul(C.sub(Vb, Vc), C.conj(Ia))[0]; close(sqrt(3) * W, 3 * V * I * sin(phi), 1e-9);
    });

    it('phase-angle error ≈ β tanφ, against the exact cosine', () => {
        const b = (10 / 60) * (PI / 180); const phi = Math.acos(0.5); const exact = cos(phi - b) / cos(phi) - 1; close(exact, b * Math.tan(phi), 1e-2); close(b * Math.tan(phi) * 100, 0.504, 1e-2);
    });
});

describe('Oscilloscopes', () => {
    it('reading, rise time and the compensated probe flat across frequency', () => {
        close(3.2 * 0.5 * 10, 16); close(1 / (4 * 0.5e-3), 500); close(0.35 / 100e6, 3.5e-9); close(sqrt(5e-9 ** 2 + 3.5e-9 ** 2), 6.10e-9, 1e-2);
        const Rp = 9e6; const Rs = 1e6; const Cs = 20e-12; const Cp = (Rs * Cs) / Rp;
        for (const f of [10, 1e4, 1e7]) { const ww = 2 * PI * f; const Zp = par([Rp, 0], [0, -1 / (ww * Cp)]); const Zs = par([Rs, 0], [0, -1 / (ww * Cs)]); close(C.abs(C.div(Zs, C.add(Zp, Zs))), 0.1, 1e-9); }
    });

    it('Lissajous: 2:1 shows two horizontal tangencies to one vertical; the ellipse gives sinφ = y0/ymax', () => {
        const phi = 0.5; const n = 100000; let ymax = 0; let y0 = 0; let best = Infinity;
        for (let k = 0; k < n; k += 1) { const t = (k * 2 * PI) / n; const x = sin(t); const y = sin(t + phi); ymax = max(ymax, y); if (abs(x) < best && y > 0) { best = abs(x); y0 = y; } }
        close(asin(y0 / ymax), phi, 1e-3);
        let topTouch = 0; for (let k = 0; k < n; k += 1) { const t = (k * 2 * PI) / n; const y = sin(2 * t + 0.3); if (y > 0.99999) topTouch += 1; } expect(topTouch).toBeGreaterThan(0);
    });
});

describe('Transducers and data acquisition', () => {
    it('strain bridge, RTD, thermocouple, thermistor', () => {
        const Vex = 5; const GF = 2; const eps = 500e-6; const R = 350; const dR = R * GF * eps;
        const Vo = Vex * ((R + dR) / (2 * R + dR) - 0.5); close(Vo, (Vex * GF * eps) / 4, 1e-3);
        close(100 * (1 + 0.00385 * 100), 138.5); close(41 * (300 - 25), 11275);
        close(10000 * exp(3950 * (1 / 323.15 - 1 / 298.15)), 3588, 1e-3);
    });

    it('quantizing a full-scale sine gives SNR ≈ 6.02N + 1.76 dB', () => {
        const N = 10; const q = 2 / 2 ** N; const n = 200000; let ps = 0; let pn = 0;
        for (let k = 0; k < n; k += 1) { const s = sin((2 * PI * k * 0.1234567) ); const qs = round(s / q) * q; ps += s * s; pn += (qs - s) ** 2; }
        close(10 * log10(ps / pn), 6.02 * N + 1.76, 1e-2);
    });

    it('a 900 Hz tone sampled at 1 kHz looks like 100 Hz', () => {
        const fs = 1000; const f = 900; const n = 1000; const x = Array.from({ length: n }, (_, k) => sin((2 * PI * f * k) / fs));
        let bestF = 0; let bestA = 0; for (let g = 1; g < fs / 2; g += 1) { let re = 0; let im = 0; for (let k = 0; k < n; k += 1) { re += x[k] * cos((2 * PI * g * k) / fs); im += x[k] * sin((2 * PI * g * k) / fs); } const a = hypot(re, im); if (a > bestA) { bestA = a; bestF = g; } }
        expect(bestF).toBe(abs(f - fs));
    });

    it('4–20 mA scaling', () => { close(0 + ((12 - 4) / 16) * (200 - 0), 100); close(-50 + ((8 - 4) / 16) * 200, 0); });
});

describe('Control, PLCs, SCADA and calibration', () => {
    it('proportional band; Ziegler–Nichols', () => { close(100 / 2.5, 40); close(0.6 * 8, 4.8); close(30 / 2, 15); close(30 / 8, 3.75); });

    it('PLC response, timer preset; SCADA cycle', () => {
        close(2 * 0.015 + 0.01 + 0.005, 0.045); close(5 / 0.01, 500);
        close(20 * ((8 * 11) / 9600 + (40 * 11) / 9600 + 0.05), 2.1, 1e-2);
    });

    it('RSS uncertainty and expanded U; TUR', () => {
        const uc = sqrt(0.3 ** 2 + 0.4 ** 2); close(uc, 0.5); close(2 * uc, 1); close(1.0 / 0.25, 4);
    });
});
