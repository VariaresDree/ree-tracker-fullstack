import { describe, it, expect } from 'vitest';

// EE › Fundamentals of Electronic Communications formula cards, checked with
// numbers (Library round, 2026-11-19): AM, FM and pulse spectra from the
// signal itself; Bessel functions by their integral; the BPSK error rate by
// integrating the Gaussian and by simulation; line impedance from L and C per
// metre, and input impedance by a ladder of 4000 LC sections; dipole
// radiation resistance by integrating the far field; the radio horizon,
// critical frequency and geostationary radius from physical constants;
// numerical aperture and modal dispersion by tracing the ray; cellular reuse
// distance on a hexagonal lattice; the rest against hand-worked values.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, sin, cos, PI, log, log10, log2, exp, asin, acosh, abs, hypot, cbrt, max, min } = Math;
const k = 1.380649e-23; const q = 1.602176634e-19; const c = 299792458; const eps0 = 8.8541878128e-12; const mu0 = 4e-7 * PI;
const mean = (f, a, b, n = 200000) => { let s = 0; const h = (b - a) / n; for (let i = 0; i < n; i += 1) s += f(a + (i + 0.5) * h); return s / n; };
const C = { add: (a, b) => [a[0] + b[0], a[1] + b[1]], mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], div: (a, b) => { const d = b[0] ** 2 + b[1] ** 2; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }, abs: (a) => hypot(a[0], a[1]) };
const db = (x) => 10 * log10(x);
// Amplitude of the component at integer frequency n (cycles per window) of f over t in [0, 1).
const line = (f, n, N = 200000) => 2 * hypot(mean((t) => f(t) * cos(2 * PI * n * t), 0, 1, N), mean((t) => f(t) * sin(2 * PI * n * t), 0, 1, N));

describe('Signals, decibels and noise', () => {
    it('dBm, dBW and a chain of gains', () => {
        close(db(1 / 1e-3), 30); close(db(2e-3 / 1e-3), 3.0103, 1e-4); close(db(1e-3 / 1e-3) - 30, -30);
        close(-10 + 20 - 3 + 15, 22); close(db(0.1 * 100 * 0.5 * 31.6227766), 22, 1e-3); // 0.1 mW (−10 dBm) through ×100, ×0.5, ×31.6 → mW
    });

    it('pulse-train lines follow (Aτ/T) sinc(nτ/T)', () => {
        const A = 2; const d = 0.2; const f = (t) => (t < d / 2 || t > 1 - d / 2 ? A : 0);
        for (const n of [1, 2, 3, 5]) { const x = n * d; close(line(f, n) / 2, abs(A * d * (sin(PI * x) / (PI * x))), 1e-4); }
        close(line(f, 5), 0, 1e-4);
    });

    it('thermal noise: a matched load receives V²/(4R) = kTB; −174 dBm/Hz at 290 K; shot noise', () => {
        const T = 290; const R = 50; const B = 1e6; const Vn = sqrt(4 * k * T * R * B); close(Vn ** 2 / (4 * R), k * T * B, 1e-12); close(Vn, 0.8949e-6, 1e-3);
        close(db((k * T) / 1e-3), -173.98, 1e-4); close(sqrt(2 * q * 1e-3 * 1e6), 17.9e-9, 1e-3);
    });

    it('noise figure from SNRs; Friis cascade equals adding noise powers through the chain', () => {
        const T0 = 290; const F1 = 2; const G1 = 100; const F2 = 10; const G2 = 10; const B = 1;
        const T1 = (F1 - 1) * T0; const T2 = (F2 - 1) * T0;
        const Nout = k * B * ((T0 + T1) * G1 * G2 + T2 * G2); const S = 1e-12; const snrIn = S / (k * T0 * B); const snrOut = (S * G1 * G2) / Nout;
        close(snrIn / snrOut, F1 + (F2 - 1) / G1, 1e-12); close(1 + (T1 + T2 / G1) / T0, F1 + (F2 - 1) / G1, 1e-12);
    });
});

describe('AM, SSB and FM', () => {
    const fc = 40; const fm = 2;
    it('AM: power Pc(1 + m²/2), sidebands mVc/2, index from the envelope, multitone √Σm²', () => {
        const Vc = 10; const m = 0.6; const R = 50; const v = (t) => Vc * (1 + m * cos(2 * PI * fm * t)) * cos(2 * PI * fc * t);
        const Pc = Vc ** 2 / (2 * R); close(mean((t) => v(t) ** 2 / R, 0, 1), Pc * (1 + m * m / 2), 1e-6);
        close(line(v, fc + fm), (m * Vc) / 2, 1e-5); close(line(v, fc), Vc, 1e-5); close(line(v, fc + 2 * fm), 0, 1e-5);
        close((Vc * (1 + m) - Vc * (1 - m)) / (Vc * (1 + m) + Vc * (1 - m)), m); close((m * m) / (2 + m * m), 0.1525, 1e-3);
        const w = (t) => Vc * (1 + 0.4 * cos(2 * PI * fm * t) + 0.3 * cos(2 * PI * 3 * fm * t)) * cos(2 * PI * fc * t);
        close(mean((t) => w(t) ** 2 / R, 0, 1), Pc * (1 + 0.5 ** 2 / 2), 1e-6); close(sqrt(1 + 0.25 / 2), 1.0607, 1e-4);
    });

    it('SSB saves 83.3% and DSB-SC 66.7% at m = 1; two-tone PEP is twice the average', () => {
        close(1 - 0.25 / 1.5, 0.8333, 1e-4); close(1 / 1.5, 0.6667, 1e-4);
        const V = 5; const R = 50; const v = (t) => V * cos(2 * PI * 40 * t) + V * cos(2 * PI * 42 * t);
        close(mean((t) => v(t) ** 2 / R, 0, 1), V ** 2 / R, 1e-6); close((2 * V) ** 2 / (2 * R) / (V ** 2 / R), 2);
    });

    it('FM: sideband n has amplitude J_n(β); powers sum to 1; carrier nulls at 2.405; Carson holds ~98%', () => {
        const J = (n, b) => mean((t) => cos(n * t - b * sin(t)), 0, PI, 20000);
        const beta = 2; const v = (t) => cos(2 * PI * fc * t + beta * sin(2 * PI * fm * t));
        for (const n of [0, 1, 2, 3]) close(line(v, fc + n * fm), abs(J(n, beta)), 1e-5);
        let s = 0; for (let n = -25; n <= 25; n += 1) s += J(n, 5) ** 2; close(s, 1, 1e-8);
        close(J(0, 2.404826), 0, 1e-6);
        let inside = 0; for (let n = -6; n <= 6; n += 1) inside += J(n, 5) ** 2; expect(inside).toBeGreaterThan(0.98);
        close(2 * (75e3 + 15e3), 180e3); close(1 / (2 * PI * 75e-6), 2122, 1e-3);
    });
});

describe('PCM and digital modulation', () => {
    it('PCM rate; quantizing a ramp leaves Δ/2 maximum and Δ/√12 rms error', () => {
        close(8 * 8000, 64000); close(2 ** 8, 256);
        const n = 4; const Vpp = 2; const D = Vpp / 2 ** n; let e2 = 0; let emax = 0; const M = 100000;
        for (let i = 0; i < M; i += 1) { const x = -1 + (Vpp * (i + 0.5)) / M; const qx = -1 + D * (Math.floor((x + 1) / D) + 0.5); e2 += (x - qx) ** 2; emax = max(emax, abs(x - qx)); }
        close(sqrt(e2 / M), D / sqrt(12), 1e-4); close(emax, D / 2, 1e-4);
    });

    it('µ-law maps 1 to 1 and boosts small signals by µ/ln(1 + µ)', () => {
        const mu = 255; const y = (x) => log(1 + mu * x) / log(1 + mu); close(y(1), 1); close(y(1e-6) / 1e-6, mu / log(1 + mu), 1e-3); expect(y(0.01)).toBeGreaterThan(0.2);
    });

    it('baud, Shannon, Nyquist, raised cosine, Eb/N0', () => {
        close(2400 * log2(16), 9600); close(3100 * log2(1 + 1000), 30898, 1e-4); close(2 * 3100 * log2(4), 12400);
        close((1e6 / 2) * (1 + 0.35), 675e3); close(1e6 * 1.35, 1.35e6); close(20 + db(1e6 / 2e6), 16.99, 1e-3);
    });

    it('BPSK: Q(√(2Eb/N0)) by integrating the Gaussian equals ½erfc(√(Eb/N0)); 9.6 dB gives ~1e-5; a simulation agrees', () => {
        const Q = (x) => mean((t) => exp(-(t ** 2) / 2) / sqrt(2 * PI), x, x + 12, 400000) * 12;
        const erfc = (x) => (2 / sqrt(PI)) * mean((t) => exp(-(t ** 2)), x, x + 9, 400000) * 9;
        for (const ebn0dB of [0, 4, 9.6]) { const e = 10 ** (ebn0dB / 10); close(Q(sqrt(2 * e)), 0.5 * erfc(sqrt(e)), 1e-6); }
        const p = Q(sqrt(2 * 10 ** 0.96)); expect(p).toBeGreaterThan(0.5e-5); expect(p).toBeLessThan(1.5e-5);
        let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return (seed + 0.5) / 2147483648; };
        const e = 10 ** 0.4; const sigma = sqrt(1 / (2 * e)); let errs = 0; const trials = 400000;
        for (let i = 0; i < trials; i += 1) { const n = sqrt(-2 * log(rnd())) * cos(2 * PI * rnd()) * sigma; if (1 + n < 0) errs += 1; }
        close(errs / trials, Q(sqrt(2 * e)), 0.06);
    });
});

describe('Multiplexing and transmission lines', () => {
    it('FDM, T1/E1 and WDM spacing', () => {
        close(5 * 100e3 + 4 * 10e3, 540e3); close((24 * 8 + 1) * 8000, 1.544e6); close(32 * 8 * 8000, 2.048e6); close((c * 0.8e-9) / (1550e-9) ** 2, 99.83e9, 1e-3);
    });

    it('coax and twin-lead Z0 from L and C per metre; velocity factor', () => {
        const er = 2.25; const Dd = 3.5; const L = (mu0 / (2 * PI)) * log(Dd); const Cc = (2 * PI * eps0 * er) / log(Dd);
        close(sqrt(L / Cc), (138 / sqrt(er)) * log10(Dd), 2e-3); close(1 / sqrt(L * Cc), c / sqrt(er), 1e-6); close(1 / sqrt(er), 0.667, 1e-3);
        const sd = 10; close((120 / sqrt(1)) * acosh(sd), 276 * log10(2 * sd), 2e-3);
    });

    it('VSWR from the standing wave; mismatch loss from the power delivered by a matched source', () => {
        const Z0 = 50; const ZL = [100, 50]; const G = C.div(C.add(ZL, [-Z0, 0]), C.add(ZL, [Z0, 0])); const g = C.abs(G);
        let vmax = 0; let vmin = Infinity; for (let x = 0; x < PI; x += 1e-4) { const m = C.abs(C.add([1, 0], C.mul(G, [cos(-2 * x), sin(-2 * x)]))); vmax = max(vmax, m); vmin = min(vmin, m); }
        close(vmax / vmin, (1 + g) / (1 - g), 1e-6);
        const I = C.div([1, 0], C.add(ZL, [Z0, 0])); const P = C.abs(I) ** 2 * ZL[0]; close(P / (1 / (4 * Z0)), 1 - g * g, 1e-12);
        const g2 = 1 / 3; close((1 + g2) / (1 - g2), 2); close(-10 * log10(1 - g2 * g2), 0.5115, 1e-3); close(-20 * log10(g2), 9.54, 1e-3);
    });

    it('input impedance: a ladder of 4000 LC sections matches the tan formula; λ/4 inverts', () => {
        const Z0 = 75; const w = 2 * PI * 100e6; const vel = 2e8; const Lp = Z0 / vel; const Cp = 1 / (Z0 * vel); const beta = w / vel;
        const ladder = (ZL, len, n = 4000) => { let Z = ZL; const dz = len / n; for (let i = 0; i < n; i += 1) { const Y = C.add([0, w * Cp * dz], C.div([1, 0], Z)); Z = C.add([0, w * Lp * dz], C.div([1, 0], Y)); } return Z; };
        const formula = (ZL, len) => { const t = Math.tan(beta * len); return C.mul([Z0, 0], C.div(C.add(ZL, [0, Z0 * t]), C.add([Z0, 0], C.mul([0, t], ZL)))); };
        const ZL = [30, -20]; const len = 1 / beta; const a = ladder(ZL, len); const b = formula(ZL, len); close(a[0], b[0], 1e-3); close(a[1], b[1], 1e-3);
        const q4 = ladder([200, 0], PI / 2 / beta); close(q4[0], Z0 ** 2 / 200, 1e-3); close(sqrt(50 * 200), 100);
    });
});

describe('Antennas and propagation', () => {
    it('half-wave dipole: integrating its far field gives 73 Ω and D = 1.64', () => {
        const I = mean((t) => cos((PI / 2) * cos(t)) ** 2 / sin(t), 1e-9, PI - 1e-9, 400000) * PI;
        close(60 * I, 73.08, 1e-3); close(2 / I, 1.641, 1e-3); close(0.95 * (c / 100e6) / 2, 142.4 / 100, 1e-3);
    });

    it('short dipole: integrating sin³θ over the sphere gives 80π²(ℓ/λ)²', () => {
        const eta = 120 * PI; const lam = 1; const l = 0.05; const kk = (2 * PI) / lam; const Iamp = 1;
        const P = ((eta * kk ** 2 * Iamp ** 2 * l ** 2) / (32 * PI ** 2)) * 2 * PI * (mean((t) => sin(t) ** 3, 0, PI) * PI);
        close((2 * P) / Iamp ** 2, 80 * PI ** 2 * (l / lam) ** 2, 1e-6); close(73 / (73 + 2), 0.9733, 1e-3);
    });

    it('dish gain equals 4πAe/λ² with Ae = ηπD²/4; Friis equals power density times aperture', () => {
        const D = 3; const lam = c / 4e9; const eta = 0.55; const G = eta * ((PI * D) / lam) ** 2; close(G, (4 * PI * (eta * PI * D * D / 4)) / lam ** 2, 1e-12);
        close(db(G), 39.38, 1e-3); close((70 * lam) / D, 1.749, 1e-3);
        const Pt = 10; const Gt = 100; const Gr = 50; const d = 30e3; const lam2 = 0.1;
        close(((Pt * Gt) / (4 * PI * d * d)) * ((Gr * lam2 ** 2) / (4 * PI)), Pt * Gt * Gr * (lam2 / (4 * PI * d)) ** 2, 1e-12);
    });

    it('free-space path loss constant 32.45; field strength from power density', () => {
        close(20 * log10((4 * PI * 1e3 * 1e6) / c), 32.45, 1e-3); close(32.45 + 20 * log10(100) + 20 * log10(10), 92.45, 1e-4);
        const P = 1000; const G = 1.64; const d = 10e3; const S = (P * G) / (4 * PI * d * d); close(sqrt(S * 120 * PI), sqrt(30 * P * G) / d, 1e-12);
    });

    it('radio horizon √(2kRh) with k = 4/3 gives 4.12 km per √m; critical frequency is the plasma frequency ≈ 9√N', () => {
        const R = 6371e3; close(sqrt(2 * (4 / 3) * R) / 1000, 4.12, 2e-3); close(sqrt(2 * R) / 1000, 3.57, 1e-3);
        close(sqrt((R + 100) ** 2 - R ** 2), sqrt(2 * R * 100), 1e-5);
        const me = 9.1093837e-31; close(sqrt((q * q) / (eps0 * me)) / (2 * PI), 8.98, 1e-3); close(9e6 / cos(PI / 3), 18e6);
    });
});

describe('Fiber, satellite, cellular and data', () => {
    it('numerical aperture and modal dispersion by tracing the steepest guided ray', () => {
        const n1 = 1.48; const n2 = 1.46; const thc = asin(n2 / n1); const phi = PI / 2 - thc;
        close(n1 * sin(phi), sqrt(n1 ** 2 - n2 ** 2), 1e-12);
        const L = 1000; const dt = (L / cos(phi) - L) * (n1 / c); close(dt, (L * n1 * (n1 - n2)) / (c * n2), 1e-12); close(dt, (L * n1 * ((n1 - n2) / n1)) / c, 2e-2);
        const V = ((2 * PI * 4.1e-6) / 1.31e-6) * 0.12; expect(V).toBeLessThan(2.405); close(V, 2.36, 1e-3);
        close(0 - 0.35 * 40 - 2 * 0.5 - 10 * 0.1, -16);
    });

    it('geostationary radius from GM and the sidereal day; −10 log k = 228.6', () => {
        const GM = 3.986004418e14; const T = 86164.1; const r = cbrt((GM * T * T) / (4 * PI * PI)); close(r / 1e3, 42164, 1e-4); close((2 * (r - 6378e3)) / c, 0.2387, 1e-3);
        close(-db(k), 228.6, 1e-4);
    });

    it('reuse distance on the hexagonal lattice is √(3N)·R; C/I for N = 7, n = 4', () => {
        const R = 1; const a = [sqrt(3) * R, 0]; const b = [(sqrt(3) * R) / 2, 1.5 * R];
        for (const [i, j] of [[1, 1], [2, 1], [2, 2], [3, 0]]) { const N = i * i + i * j + j * j; close(hypot(i * a[0] + j * b[0], i * a[1] + j * b[1]) / R, sqrt(3 * N), 1e-12); }
        close(db(sqrt(21) ** 4 / 6), 18.66, 1e-3); close(300 * (3 / 60), 15);
    });

    it('stop-and-wait: one frame per frame time plus a round trip; 8N1 framing', () => {
        const tf = 1000 / 1e6; const tp = 2000e3 / 2e8; close(tf / (tf + 2 * tp), 1 / (1 + 2 * (tp / tf)), 1e-12); close(1 / 21, 0.0476, 1e-3);
        close(8 / 10, 0.8); close((9600 * 0.8) / 8, 960);
    });
});
