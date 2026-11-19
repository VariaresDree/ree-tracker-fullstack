import { describe, it, expect } from 'vitest';

// EE › Industrial Electronics formula cards, checked with numbers (Library
// round, 2026-11-19): rectifier and AC-controller outputs by integrating the
// waveform; commutation overlap by integrating the commutating voltage;
// power factor and inverter harmonics by Fourier series of the switched
// waveform; sine PWM by comparing a sine with a triangle; choppers by
// simulating the switch, inductor, diode and capacitor; the UJT and 555 by
// charging the capacitor between thresholds; the rest against hand-worked
// values.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, sin, cos, PI, log, atan, atan2, abs, max, min } = Math;
const N = 200000;
// Mean of f over [a, b] by the midpoint rule.
const mean = (f, a, b, n = N) => { let s = 0; const h = (b - a) / n; for (let i = 0; i < n; i += 1) s += f(a + (i + 0.5) * h); return s / n; };
// Fourier sine/cosine coefficient of order k for a 2π-periodic f.
const harmonic = (f, k) => { const a = 2 * mean((t) => f(t) * cos(k * t), 0, 2 * PI); const b = 2 * mean((t) => f(t) * sin(k * t), 0, 2 * PI); return { amp: Math.hypot(a, b), phase: atan2(a, b) }; };
const wrap = (t) => ((t % (2 * PI)) + 2 * PI) % (2 * PI);

describe('Thyristors and SCRs', () => {
    it('two-transistor model satisfies both transistors\' KCL; current runs away as α1 + α2 → 1', () => {
        const a1 = 0.4; const a2 = 0.5; const IG = 0.02; const I1 = 1e-6; const I2 = 2e-6;
        const IA = (a2 * IG + I1 + I2) / (1 - (a1 + a2)); close(IA, a1 * IA + I1 + a2 * (IA + IG) + I2, 1e-12);
        const at = (s) => (a2 * IG + I1 + I2) / (1 - s); expect(at(0.999)).toBeGreaterThan(50 * at(0.9));
    });

    it('di/dt inductor and RC snubber: the capacitor reaches 63.2% of Vs in one time constant', () => {
        close(400 / 50e6, 8e-6); // 400 V, 50 A/µs → 8 µH
        const Vs = 400; const R = 20; const C = 0.1e-6; let vc = 0; const dt = 1e-10; for (let t = 0; t < R * C; t += dt) vc += ((Vs - vc) / (R * C)) * dt;
        close(vc, 0.632 * Vs, 1e-3); close(Vs / R, 20);
    });

    it('string derating, and the equalising resistor holds the lowest-leakage SCR at its limit', () => {
        close(1 - 3000 / (3 * 1200), 1 / 6, 1e-12); close(1 - 1000 / (3 * 400), 1 / 6, 1e-12);
        const ns = 4; const Vs = 4000; const Vmax = 1100; const I1 = 2e-3; const dI = 5e-3;
        const R = (ns * Vmax - Vs) / ((ns - 1) * dI);
        // Series current IT is common: device 1 (least leakage I1) sees R(IT − I1), the rest R(IT − I1 − dI).
        const IT = (Vs / R + ns * I1 + (ns - 1) * dI) / ns; close(R * (IT - I1), Vmax, 1e-12); close(R * (IT - I1) + (ns - 1) * R * (IT - I1 - dI), Vs, 1e-12);
    });

    it('UJT oscillator: capacitor charging to ηV_BB repeats at RC ln(1/(1 − η))', () => {
        const R = 20e3; const C = 0.1e-6; const eta = 0.63; const VBB = 20; let v = 0; let t = 0; const dt = 1e-8;
        while (v < eta * VBB) { v += ((VBB - v) / (R * C)) * dt; t += dt; } close(1 / t, 1 / (R * C * log(1 / (1 - eta))), 1e-3);
    });
});

describe('Triacs and diacs', () => {
    it('phase control rms by integrating the chopped sine', () => {
        const Vs = 230; for (const a of [0, PI / 6, PI / 2, 2 * PI / 3]) {
            const vo = sqrt(mean((t) => { const th = wrap(t) % PI; return th >= a ? (sqrt(2) * Vs * sin(wrap(t))) ** 2 : 0; }, 0, 2 * PI));
            close(vo, Vs * sqrt((PI - a + sin(2 * a) / 2) / PI), 1e-4);
        }
    });

    it('RC firing network: simulated capacitor lags by tan⁻¹ωRC with Vs/√(1 + (ωRC)²)', () => {
        const w = 2 * PI * 60; const R = 50e3; const C = 0.1e-6; let v = 0; const dt = 1e-6; let peak = 0; let tPeak = 0;
        for (let t = 0; t < 0.2; t += dt) { v += ((sin(w * t) - v) / (R * C)) * dt; if (t > 0.18 && v > peak) { peak = v; tPeak = t; } }
        close(peak, 1 / sqrt(1 + (w * R * C) ** 2), 2e-3); const lag = wrap(w * tPeak) - PI / 2; close(lag, atan(w * R * C), 5e-3);
    });

    it('integral-cycle control: rms over n on and m off cycles', () => {
        const n = 3; const m = 5; const vo = sqrt(mean((t) => (t < n * 2 * PI ? (sqrt(2) * sin(t)) ** 2 : 0), 0, (n + m) * 2 * PI)); close(vo, sqrt(n / (n + m)), 1e-6);
    });
});

describe('Power transistors and IGBTs', () => {
    it('switching energy: clamped inductive VIt/2, resistive VIt/6 (integrated)', () => {
        const V = 400; const I = 20; const tr = 1e-7; const tf = 2e-7;
        // Inductive turn-on: current rises at full voltage, then voltage falls at full current.
        const Ei = mean((x) => V * (I * x), 0, 1) * tr + mean((x) => V * (1 - x) * I, 0, 1) * tf; close(Ei, 0.5 * V * I * (tr + tf), 1e-6);
        const Er = mean((x) => V * (1 - x) * I * x, 0, 1) * (tr + tf); close(Er, (V * I * (tr + tf)) / 6, 1e-6);
    });

    it('conduction loss of an IGBT on a half-sine current = V_CE0·I_av + r·I_rms²', () => {
        const Ip = 50; const V0 = 1.2; const rce = 0.02; const i = (t) => (wrap(t) < PI ? Ip * sin(t) : 0);
        const P = mean((t) => (V0 + rce * i(t)) * i(t), 0, 2 * PI); close(P, V0 * mean(i, 0, 2 * PI) + rce * mean((t) => i(t) ** 2, 0, 2 * PI), 1e-9);
        close(mean(i, 0, 2 * PI), Ip / PI, 1e-6);
    });

    it('overdrive factor and forced beta', () => {
        const ICS = 10; const beta = 20; const IB = 1; close(IB / (ICS / beta), 2); close(ICS / IB, 10);
    });
});

describe('Controlled rectifiers', () => {
    const Vm = 100;
    it('single-phase: half-wave R, full converter, semi-converter averages (integrated)', () => {
        for (const a of [0, PI / 4, PI / 2, 2 * PI / 3]) {
            close(mean((t) => (wrap(t) >= a && wrap(t) <= PI ? Vm * sin(t) : 0), 0, 2 * PI), (Vm / (2 * PI)) * (1 + cos(a)), 1e-4);
            close(mean((t) => Vm * sin(t), a, a + PI), ((2 * Vm) / PI) * cos(a), 1e-5);
            close(mean((t) => (t % PI >= a ? Vm * abs(sin(t)) : 0), 0, PI), (Vm / PI) * (1 + cos(a)), 1e-4);
        }
    });

    it('three-phase full (6-pulse) and half-wave (3-pulse) averages', () => {
        const VLL = 415; const a = PI / 6;
        close(mean((t) => sqrt(2) * VLL * sin(t), PI / 3 + a, (2 * PI) / 3 + a), ((3 * sqrt(2)) / PI) * VLL * cos(a), 1e-6);
        const Vp = 240; close(mean((t) => sqrt(2) * Vp * sin(t), PI / 6 + a, (5 * PI) / 6 + a), 1.17 * Vp * cos(a), 1e-3);
    });

    it('overlap: integrating half the commutating line voltage until the current transfers gives μ and the 3ωLsId/π drop', () => {
        const VLL = 415; const w = 2 * PI * 50; const Ls = 2e-3; const Id = 100; const a = PI / 6;
        let i = 0; let th = a; const h = 1e-6; let area = 0; while (i < Id) { const vh = (sqrt(2) * VLL * sin(th)) / 2; i += (vh / (w * Ls)) * h; area += vh * h; th += h; }
        close(cos(a) - cos(th), (sqrt(2) * w * Ls * Id) / VLL, 1e-4); close(area / (PI / 3), (3 * w * Ls * Id) / PI, 1e-4);
    });

    it('input power factor from the Fourier series of the line current', () => {
        const a = PI / 4; const sq = (t) => (wrap(t - a) < PI ? 1 : -1); close((harmonic(sq, 1).amp / sqrt(2)) * cos(a), 0.9 * cos(a), 1e-3);
        const blk = (t) => { const x = wrap(t); if (x >= PI / 6 && x < (5 * PI) / 6) return 1; if (x >= (7 * PI) / 6 && x < (11 * PI) / 6) return -1; return 0; };
        const Irms = sqrt(mean((t) => blk(t) ** 2, 0, 2 * PI)); close(Irms, sqrt(2 / 3), 1e-4); close((harmonic(blk, 1).amp / sqrt(2) / Irms), 3 / PI, 1e-4);
    });
});

describe('Inverters', () => {
    it('square wave: harmonic n is 4V/(nπ); rms of the whole wave is V', () => {
        const sq = (t) => (wrap(t) < PI ? 1 : -1); for (const n of [1, 3, 5, 7]) close(harmonic(sq, n).amp, 4 / (n * PI), 1e-4);
        close(harmonic(sq, 2).amp, 0, 1e-4); close((4 / (PI * sqrt(2))), 0.9, 1e-2);
        const V1 = 4 / (PI * sqrt(2)); close(sqrt(1 - V1 ** 2) / V1, 0.483, 1e-3); // THD of a square wave
    });

    it('quasi-square: a 120° pulse removes the third harmonic', () => {
        const d = PI / 3; const q = (t) => { const x = wrap(t); if (abs(x - PI / 2) < d) return 1; if (abs(x - (3 * PI) / 2) < d) return -1; return 0; };
        close(harmonic(q, 1).amp, (4 / PI) * sin(d), 1e-4); close(harmonic(q, 3).amp, 0, 1e-4); close(harmonic(q, 5).amp, (4 / (5 * PI)) * abs(sin(5 * d)), 1e-4);
    });

    it('six-step: line-voltage fundamental 0.78 Vdc, line rms 0.816, phase rms 0.471', () => {
        const leg = (t) => (wrap(t) < PI ? 0.5 : -0.5); const vab = (t) => leg(t) - leg(t - (2 * PI) / 3); const vbc = (t) => leg(t - (2 * PI) / 3) - leg(t - (4 * PI) / 3);
        close(harmonic(vab, 1).amp / sqrt(2), sqrt(6) / PI, 1e-4); close(sqrt(mean((t) => vab(t) ** 2, 0, 2 * PI)), sqrt(2 / 3), 1e-4);
        const vca = (t) => -vab(t) - vbc(t); const van = (t) => (vab(t) - vca(t)) / 3; close(sqrt(mean((t) => van(t) ** 2, 0, 2 * PI)), sqrt(2) / 3, 1e-4);
        close(harmonic(vab, 3).amp, 0, 1e-4);
    });

    it('sine PWM: a sine against a triangle gives a fundamental of m_a·Vdc/2 per leg, 0.612 m_a Vdc line rms', () => {
        const ma = 0.8; const mf = 21; const tri = (t) => { const x = ((t * mf) / (2 * PI)) % 1; return x < 0.5 ? 4 * x - 1 : 3 - 4 * x; };
        const leg = (ph) => (t) => (ma * sin(t - ph) >= tri(t) ? 0.5 : -0.5);
        const a = leg(0); const b = leg((2 * PI) / 3); close(harmonic(a, 1).amp, ma / 2, 5e-3);
        close(harmonic((t) => a(t) - b(t), 1).amp / sqrt(2), 0.612 * ma, 5e-3);
    });
});

describe('Choppers', () => {
    // Ideal switch, diode, L and C feeding R; the diode blocks reverse inductor current.
    const run = (kind, { Vs, D, f, L, C, R }) => {
        const T = 1 / f; const steps = 2000; const dt = T / steps; let iL = 0; let vC = 0; let iMin = Infinity; let iMax = -Infinity; let vMin = Infinity; let vMax = -Infinity; let vSum = 0;
        const periods = 600;
        for (let p = 0; p < periods; p += 1) {
            for (let k = 0; k < steps; k += 1) {
                const on = k < D * steps; let di; let dv;
                if (kind === 'buck') { di = on ? (Vs - vC) / L : -vC / L; dv = (iL - vC / R) / C; } else if (kind === 'boost') { di = on ? Vs / L : (Vs - vC) / L; dv = on ? -vC / (R * C) : (iL - vC / R) / C; } else { di = on ? Vs / L : -vC / L; dv = on ? -vC / (R * C) : (iL - vC / R) / C; }
                iL = max(0, iL + di * dt); vC += dv * dt;
                if (p === periods - 1) { iMin = min(iMin, iL); iMax = max(iMax, iL); vMin = min(vMin, vC); vMax = max(vMax, vC); vSum += vC; }
            }
        }
        return { Vo: vSum / steps, dI: iMax - iMin, dV: vMax - vMin, iMin };
    };
    const p = { Vs: 24, D: 0.4, f: 20e3, L: 200e-6, C: 100e-6, R: 5 };

    it('buck: Vo = D·Vs, ΔI = Vs·D(1 − D)/(Lf), ΔV/Vo = (1 − D)/(8LCf²)', () => {
        const s = run('buck', p); close(s.Vo, p.D * p.Vs, 2e-3); close(s.dI, (p.Vs * p.D * (1 - p.D)) / (p.L * p.f), 1e-2);
        close(s.dV / s.Vo, (1 - p.D) / (8 * p.L * p.C * p.f ** 2), 3e-2);
    });

    it('boost: Vo = Vs/(1 − D), ΔI = Vs·D/(Lf), ΔV = Vo·D/(RCf)', () => {
        const s = run('boost', { ...p, R: 20 }); close(s.Vo, p.Vs / (1 - p.D), 5e-3); close(s.dI, (p.Vs * p.D) / (p.L * p.f), 1e-2); close(s.dV, (s.Vo * p.D) / (20 * p.C * p.f), 3e-2);
    });

    it('buck-boost: |Vo| = D·Vs/(1 − D) above and below the input', () => {
        close(run('buckboost', { ...p, D: 0.4, R: 10 }).Vo, (0.4 / 0.6) * p.Vs, 5e-3); close(run('buckboost', { ...p, D: 0.6, R: 10 }).Vo, (0.6 / 0.4) * p.Vs, 5e-3);
    });

    it('critical inductance: just above L_c the current stays positive, below it reaches zero', () => {
        const R = 20; const Lc = ((1 - p.D) * R) / (2 * p.f); expect(run('buck', { ...p, R, L: 1.1 * Lc }).iMin).toBeGreaterThan(0); expect(run('buck', { ...p, R, L: 0.9 * Lc }).iMin).toBe(0);
        const Lb = (p.D * (1 - p.D) ** 2 * R) / (2 * p.f); expect(run('boost', { ...p, R, L: 1.1 * Lb }).iMin).toBeGreaterThan(0); expect(run('boost', { ...p, R, L: 0.9 * Lb }).iMin).toBe(0);
    });
});

describe('Cycloconverters and drives', () => {
    it('p-pulse peak: (p/π) sin(π/p) of the phase peak; p = 3 gives 1.17 V_ph', () => {
        for (const pp of [3, 6]) close(mean((t) => sin(t), PI / 2 - PI / pp, PI / 2 + PI / pp), (pp / PI) * sin(PI / pp), 1e-6);
        close(sqrt(2) * (3 / PI) * sin(PI / 3), 1.17, 1e-3); close((3 / PI) * sin(PI / 3), 0.827, 1e-3); close(60 / 4, 15);
    });

    it('converter-fed DC motor speed; chopper regeneration', () => {
        const Vdc = 1.35 * 415 * cos(PI / 6); close(Vdc, 485.2, 1e-3); close((Vdc - 50 * 0.5) / 2.0, 230.1, 1e-3);
        const Vs = 220; const Ea = 150; const Ia = 20; const Ra = 0.5; close(1 - (Ea - Ia * Ra) / Vs, 0.3636, 1e-3);
    });

    it('breakdown torque ∝ (V/f)² from 3V²/(2ω_s·X) with X ∝ f', () => {
        const Tmax = (V, f) => (3 * V ** 2) / (2 * ((4 * PI * f) / 4) * (2 * PI * f * 5e-3)); close(Tmax(400, 75) / Tmax(400, 50), (50 / 75) ** 2, 1e-12);
    });

    it('acceleration time by integrating J dω/dt = Tm − TL; braking energy', () => {
        const J = 2; const Tm = 100; const TL = 40; let w = 0; let t = 0; const dt = 1e-5; while (w < 150) { w += ((Tm - TL) / J) * dt; t += dt; } close(t, (J * 150) / (Tm - TL), 1e-4);
        close(0.5 * J * (150 ** 2 - 0), 22500); close(700 ** 2 / 20000, 24.5);
    });

    it('static rotor resistance: 120° rotor currents of rms √(2/3)·Id give 0.5R(1 − D) per phase', () => {
        const blk = (t) => { const x = wrap(t); if (x >= PI / 6 && x < (5 * PI) / 6) return 1; if (x >= (7 * PI) / 6 && x < (11 * PI) / 6) return -1; return 0; };
        const Ir2 = mean((t) => blk(t) ** 2, 0, 2 * PI); const R = 4; const D = 0.3; close((R * (1 - D)) / (3 * Ir2), 0.5 * R * (1 - D), 1e-4);
    });
});

describe('UPS, sensors, optoelectronics and timers', () => {
    it('UPS sizing, DC current, cells and charging time', () => {
        close((1.25 * 8000) / 0.8, 12500); close(5000 / (0.9 * 40.8), 136.2, 1e-3); close(40.8 / 1.75, 23.31, 1e-3); expect(24 * 2.25).toBeLessThanOrEqual(56);
        close((1.2 * 100) / 10, 12);
    });

    it('Hall voltage, capacitive change, piezo voltage two ways, encoder speed', () => {
        const q = 1.602e-19; close((5e-3 * 0.5) / (1e22 * q * 1e-3) * 1e3, 1.5605, 1e-3); // mV
        const eps0 = 8.854e-12; const A = 1e-4; const d = 1e-3; const Cd = (x) => (eps0 * A) / x; close((Cd(d + 1e-6) - Cd(d)) / Cd(d), -1e-3, 2e-3);
        const dd = 2.3e-12; const er = 5; const t = 1e-3; const Ap = 1e-4; const F = 10; const Cp = (eps0 * er * Ap) / t; const g = dd / (eps0 * er);
        close((dd * F) / Cp, (g * F * t) / Ap, 1e-12); close((60 * 5000) / 1000, 300); close(360 / (4 * 1000), 0.09);
    });

    it('LED wavelength and responsivity from h, c, q', () => {
        const h = 6.62607015e-34; const c = 299792458; const q = 1.602176634e-19; close((h * c) / q / 1e-6, 1.2398, 1e-4); close(1.24 / 1.43, 0.867, 1e-3);
        close((0.8 * q * 0.85e-6) / (h * c), (0.8 * 0.85) / 1.2398, 1e-4); close((12 - 3 * 2.0) / 0.02, 300); close(2e-3 / 10e-3, 0.2);
    });

    it('555: charging between ⅓ and ⅔ of Vcc gives 0.693 RC times and 1.1 RC for the monostable', () => {
        const Vcc = 9; const RA = 10e3; const RB = 20e3; const C = 10e-9; const dt = 1e-9;
        const time = (from, to, target, Rt) => { let v = from; let t = 0; while (target > from ? v < to : v > to) { v += ((target - v) / (Rt * C)) * dt; t += dt; } return t; };
        const tH = time(Vcc / 3, (2 * Vcc) / 3, Vcc, RA + RB); const tL = time((2 * Vcc) / 3, Vcc / 3, 0, RB);
        close(tH, 0.693 * (RA + RB) * C, 1e-3); close(tL, 0.693 * RB * C, 1e-3); close(1 / (tH + tL), 1.44 / ((RA + 2 * RB) * C), 2e-3);
        close(time(0, (2 * Vcc) / 3, Vcc, 100e3), 1.0986 * 100e3 * C, 1e-3);
    });
});
