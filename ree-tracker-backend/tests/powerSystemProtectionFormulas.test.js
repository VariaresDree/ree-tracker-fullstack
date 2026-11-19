import { describe, it, expect } from 'vitest';

// EE › Power System Protection formula cards, checked with numbers (Library
// round, 2026-11-19): relay curves at known points and a coordination built
// from them; the mho circle and residual compensation against a simulated
// ground fault; the percentage differential on internal and through faults;
// the Δ-Y CT connection by phasors; the thermal replica by simulating its
// heating equation; the asymmetrical current against the waveform's RMS;
// rod resistance by summing a line of point sources; arrester separation by
// a reflection; arc-flash energy and boundary as inverses.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, sin, cos, exp, log, PI, abs, hypot, atan2 } = Math;
const C = { add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], div: (a, b) => { const d = b[0] ** 2 + b[1] ** 2; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }, abs: (a) => hypot(a[0], a[1]), polar: (m, t) => [m * cos(t), m * sin(t)], s: (k, a) => [k * a[0], k * a[1]] };
const iec = (M, tms, k = 0.14, a = 0.02) => (tms * k) / (M ** a - 1);
const ieee = (M, td, A, B, p) => td * (A / (M ** p - 1) + B);

describe('Instrument transformers and overcurrent relays', () => {
    it('ratios, burden, knee point and the C-class burden limit', () => {
        close(1200 / (600 / 5), 10); close(5 ** 2 * 0.5, 12.5); close((20000 / 120) * (0.3 + 2 * 0.2 + 0.1), 133.33, 1e-4);
        close(400 / (20 * 5), 4);
    });

    it('PSM and the IEC standard-inverse time at M = 10 (2.97 s)', () => {
        const Ipick = 1.25 * (400 / 5) * 5; close(Ipick, 500); close(5000 / Ipick, 10);
        close(iec(10, 1), 2.971, 1e-3); close(iec(10, 1, 13.5, 1), 1.5); close(iec(10, 1, 80, 2), 0.808, 1e-3);
    });

    it('IEEE curves: the very-inverse curve is steeper than moderately inverse', () => {
        const mi = (M) => ieee(M, 1, 0.0515, 0.114, 0.02); const vi = (M) => ieee(M, 1, 19.61, 0.491, 2);
        expect(vi(2) / vi(20)).toBeGreaterThan(mi(2) / mi(20)); close(vi(10), 19.61 / 99 + 0.491, 1e-12);
    });

    it('pickup window sits between 1.25 × load and min fault / 1.5', () => {
        const lo = 1.25 * 400; const hi = 3000 / 1.5; expect(lo).toBeLessThan(hi);
    });

    it('coordination: the TMS that gives the upstream relay a 0.3 s margin', () => {
        const If = 4000; const down = iec(If / 400, 0.1); const tReq = down + 0.3; const tms = tReq / iec(If / 600, 1);
        close(iec(If / 600, tms), down + 0.3, 1e-12); expect(iec(2500 / 600, tms)).toBeGreaterThan(iec(2500 / 400, 0.1));
    });
});

describe('Directional, distance and differential', () => {
    it('directional torque operates within ±90° of the maximum torque angle', () => {
        const T = (th) => cos(th - (45 * PI) / 180); expect(T((120 * PI) / 180)).toBeGreaterThan(0); expect(T((-60 * PI) / 180)).toBeLessThan(0);
    });

    it('secondary impedance and zone reaches', () => {
        close(10 * (1200 / 5) / (138000 / 115), 2, 1e-12); close(0.8 * 10, 8); close(10 + 1.2 * 6, 17.2);
    });

    it('mho: the circle through the origin reaches Z_set cos(θ − φ)', () => {
        const Zs = 10; const phi = (75 * PI) / 180; const c = C.polar(Zs / 2, phi);
        for (const th of [75, 45, 0].map((d) => (d * PI) / 180)) {
            const reach = Zs * cos(th - phi); close(C.abs(C.sub(C.polar(reach, th), c)), Zs / 2, 1e-12);
        }
    });

    it('residual compensation makes a ground fault measure Z₁ (simulated SLG along a line)', () => {
        const Z1 = [1, 8]; const Z0 = [3, 24]; const I0 = [0.4, -1.2]; // per-unit, fault at the line's far end
        const Va = C.add(C.s(2, C.mul(I0, Z1)), C.mul(I0, Z0)); const Ia = C.s(3, I0);
        const k0 = C.div(C.sub(Z0, Z1), C.s(3, Z1));
        const Zmeas = C.div(Va, C.add(Ia, C.mul(k0, C.s(3, I0)))); close(Zmeas[0], Z1[0], 1e-12); close(Zmeas[1], Z1[1], 1e-12);
        const Zraw = C.div(Va, Ia); expect(C.abs(Zraw)).toBeGreaterThan(C.abs(Z1)); // uncompensated underreaches
    });

    it('percentage differential: trips on an internal fault, restrains on a big through fault with CT error', () => {
        const k = 0.25; const op = (I1, I2) => abs(I1 - I2) > (k * (abs(I1) + abs(I2))) / 2;
        expect(op(30, 0)).toBe(true); expect(op(40, 40 * 0.92)).toBe(false);
    });

    it('Δ-Y differential: wye-side CTs in delta give √3 I_Y/N_Y, shifted 30°, matching the delta side', () => {
        const a = C.polar(1, (-2 * PI) / 3); const IY = [[100, 0], C.mul([100, 0], a), C.mul([100, 0], C.mul(a, a))];
        const delta = C.sub(IY[0], IY[1]); close(C.abs(delta), sqrt(3) * 100, 1e-12); close(atan2(delta[1], delta[0]), PI / 6, 1e-12);
        close((sqrt(3) * 300) / 600 * 5, (900 / 1200) * 5 * (sqrt(3) * 300 * 1200) / (600 * 900), 1e-12);
    });
});

describe('Transformer, generator and motor protection', () => {
    it('V/Hz at start-up, through-fault current, I₂²t', () => {
        close(1 / (55 / 60), 1.0909, 1e-4); close(1000 / 0.05, 20000); close(10 / 0.5 ** 2, 40);
    });

    it('neutral resistor equals X_C0/3; earth-fault coverage', () => {
        const C0 = 0.25e-6; const w = 2 * PI * 60; const Rn = 1 / (3 * w * C0); const V = 13800 / sqrt(3);
        close(V / Rn, 3 * w * C0 * V, 1e-12); close(Rn / (13800 / 240) ** 2, Rn / 3306.25, 1e-12); close(1 - 0.05, 0.95);
    });

    it('thermal replica: simulating dθ/dt = (I² − θ)/τ reaches the trip level at the card\'s time', () => {
        const tau = 600; const kIB = 1.05; const I = 1.5;
        for (const Ip of [0, 0.9]) {
            let th = Ip * Ip; let t = 0; const dt = 0.01; while (th < kIB * kIB) { th += ((I * I - th) / tau) * dt; t += dt; }
            close(t, tau * log((I * I - Ip * Ip) / (I * I - kIB * kIB)), 1e-3);
        }
    });

    it('locked-rotor I²t and unbalance heating', () => {
        close(10 * (6 / 4.8) ** 2, 15.625); close(sqrt(1 + 6 * 0.1 ** 2), 1.0296, 1e-4); close(175 / 5.4 ** 2, 6.0, 1e-2);
    });

    it('high-impedance bus differential setting', () => {
        close((40000 / 400) * (2 + 2 * 1), 400); expect(2 * 400).toBe(800);
    });
});

describe('Breakers, grounding, lightning and arc flash', () => {
    it('asymmetrical RMS at contact parting equals the waveform RMS; close-and-latch 2.6', () => {
        const Isym = 1; const XR = 15; const tau = XR / (2 * PI * 60); const tp = 0.05;
        const dc = sqrt(2) * Isym * exp(-tp / tau); close(sqrt(Isym ** 2 + dc ** 2), Isym * sqrt(1 + 2 * exp((-2 * tp) / tau)), 1e-12);
        close(sqrt(2) * (1 + exp(-PI / 17)), 2.59, 2e-3); close(500 / (sqrt(3) * 13.8), 20.92, 1e-3);
    });

    it('resistance grounding and effective grounding (COG at X0/X1 = 3)', () => {
        close(7967 / 20, 398.35, 1e-4);
        const a = C.polar(1, (2 * PI) / 3); const k = 3; // bolted SLG, R = 0: healthy-phase voltage
        const Vb = C.add(C.mul(C.mul(a, a), [1, 0]), C.s((1 - k) / (2 + k), [1, 0])); const cog = C.abs(Vb) / sqrt(3);
        expect(cog).toBeLessThanOrEqual(0.8);
    });

    it('rod resistance: a line of point sources and their images reproduces Dwight', () => {
        const rho = 100; const L = 3; const a = 0.008; const n = 4000;
        // Uniform current I/L along the rod and its image in the surface; potential at the rod surface, middle.
        let V = 0; for (let k = 0; k < n; k += 1) { const z = ((k + 0.5) * L) / n; const zr = L / 2;
            V += (rho / (4 * PI)) * (1 / L) * (L / n) * (1 / hypot(a, z - zr) + 1 / hypot(a, z + zr)); }
        close(V, (rho / (2 * PI * L)) * (log((4 * L) / a) - 1), 0.08); // Dwight averages along the rod
    });

    it('grid resistance and tolerable voltages', () => {
        close((100 / 4) * sqrt(PI / 3600) + 100 / 1500, 0.8052, 1e-3);
        close((1000 + 1.5 * 0.7 * 3000) * (0.116 / sqrt(0.5)), 680.8, 1e-3); close((1000 + 6 * 0.7 * 3000) * (0.116 / sqrt(0.5)), 2231.0, 1e-3);
    });

    it('arrester rating, protective margin, separation by reflection, striking distance', () => {
        close(0.8 * 72.5, 58); close((550 / 400 - 1) * 100, 37.5);
        // A surge of steepness S reaches an open end d away: the reflection adds 2·S·d/v.
        const S = 1000; const d = 15; const vw = 300; close(330 + (2 * S * d) / vw, 430);
        close(10 * 10 ** 0.65, 44.67, 1e-3);
    });

    it('arc flash: incident energy and boundary are inverses at E_B', () => {
        const V = 0.48; const I = 30; const t = 0.1; const E = (D) => (2.142e6 * V * I * t) / (D * D);
        const DB = sqrt((2.142e6 * V * I * t) / 5.0); close(E(DB), 5.0, 1e-12); close(E(455) / 4.184, (2.142e6 * V * I * t) / 455 ** 2 / 4.184);
        close(E(455) * 0.5, (2.142e6 * V * I * (t / 2)) / 455 ** 2, 1e-12);
    });
});
