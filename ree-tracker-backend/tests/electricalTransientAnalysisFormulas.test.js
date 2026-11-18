import { describe, it, expect } from 'vitest';

// EE › Electrical Transient Analysis formula cards, checked with numbers
// (Library round, 2026-11-18): every closed form is compared with a
// fourth-order Runge-Kutta simulation of the circuit's own differential
// equation (KVL/KCL with v = L di/dt and i = C dv/dt), and the traveling-wave
// coefficients with a lattice of reflections summed until it settles.

const close = (a, b, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, sin, cos, exp, log, atan, PI, max, abs } = Math;

// RK4 for y' = f(t, y), y an array; returns the samples [t, y].
const simulate = (f, y0, T, n = 20000) => {
    const h = T / n; let y = y0.slice(); const out = [[0, y.slice()]];
    for (let k = 0; k < n; k += 1) {
        const t = k * h; const add = (a, b, s) => a.map((x, i) => x + s * b[i]);
        const k1 = f(t, y); const k2 = f(t + h / 2, add(y, k1, h / 2)); const k3 = f(t + h / 2, add(y, k2, h / 2)); const k4 = f(t + h, add(y, k3, h));
        y = y.map((x, i) => x + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])); out.push([t + h, y.slice()]);
    }
    return out;
};
const at = (samples, t) => samples.reduce((best, s) => (abs(s[0] - t) < abs(best[0] - t) ? s : best))[1];

describe('First-order circuits', () => {
    const R = 100; const L = 0.5; const C = 1e-4; const V = 12;

    it('RL rise and decay, and the inductor voltage after a step, match the simulation', () => {
        const rise = simulate((t, [i]) => [(V - R * i) / L], [0], 0.02);
        const t = 0.007; const [i] = at(rise, t);
        close(i, (V / R) * (1 - exp((-R * t) / L)), 1e-6);
        close(V - R * i, V * exp((-R * t) / L), 1e-5); // v_L
        const I0 = 0.3; const decay = simulate((tt, [ii]) => [(-R * ii) / L], [I0], 0.02);
        close(at(decay, t)[0], I0 * exp((-R * t) / L), 1e-6);
        close(L / R, 5e-3, 1e-12);
    });

    it('RC charging voltage and current from a pre-charged capacitor; discharge', () => {
        const V0 = 3; const tau = R * C; const sim = simulate((t, [vc]) => [(V - vc) / (R * C)], [V0], 0.05);
        const t = 0.013; const [vc] = at(sim, t);
        close(vc, V + (V0 - V) * exp(-t / tau), 1e-6);
        close((V - vc) / R, ((V - V0) / R) * exp(-t / tau), 1e-5);
        close(at(simulate((tt, [x]) => [-x / tau], [V], 0.05), t)[0], V * exp(-t / tau), 1e-6);
        close(V * (1 - exp(-t / tau)), V + (0 - V) * exp(-t / tau), 1e-12); // the live charging card is the V0 = 0 case
    });

    it('time to reach a value inverts the response; τ ln 2 to half; the n-τ table', () => {
        const tau = 0.01; const x0 = 2; const xf = 10; const x = (t) => xf + (x0 - xf) * exp(-t / tau);
        const t = tau * log((x0 - xf) / (7 - xf)); close(x(t), 7, 1e-12);
        close(tau * log(2), 0.693 * tau, 1e-3);
        expect([1, 2, 3, 4, 5].map((n) => +(100 * (1 - exp(-n))).toFixed(1))).toEqual([63.2, 86.5, 95, 98.2, 99.3]);
    });

    it('charging a capacitor through R wastes ½CV² in the resistor, whatever R is', () => {
        for (const Rx of [10, 1000]) {
            const sim = simulate((t, [vc, w]) => { const i = (V - vc) / Rx; return [i / C, i * i * Rx]; }, [0, 0], 20 * Rx * C);
            const [vc, wR] = sim[sim.length - 1][1]; close(vc, V, 1e-6); close(wR, 0.5 * C * V * V, 1e-5);
        }
    });

    it('initial slopes: dv/dt = i_C/C and di/dt = v_L/L at t = 0⁺', () => {
        close((V - 0) / R / C, ((V - 0) / (R * C)), 1e-12);
        const sim = simulate((t, [i]) => [(V - R * i) / L], [0], 1e-6, 100); close(sim[1][1][0] / 1e-8, V / L, 1e-4);
    });
});

describe('Second-order circuits and damping', () => {
    // Series RLC driven by a step V: state [vC, i]; vC' = i/C, i' = (V − R i − vC)/L.
    const series = (R, L, C, V) => (t, [vc, i]) => [i / C, (V - R * i - vc) / L];

    it('α, ω₀, ω_d and the underdamped step response of a series RLC match the simulation', () => {
        const R = 20; const L = 0.1; const C = 1e-5; const V = 10;
        const a = R / (2 * L); const w0 = 1 / sqrt(L * C); const wd = sqrt(w0 * w0 - a * a);
        const sim = simulate(series(R, L, C, V), [0, 0], 0.03, 30000);
        for (const t of [0.002, 0.0075, 0.02]) {
            close(at(sim, t)[0], V * (1 - exp(-a * t) * (cos(wd * t) + (a / wd) * sin(wd * t))), 1e-5);
        }
    });

    it('overshoot, peak time and settling time from ζ; log decrement from successive peaks', () => {
        const R = 40; const L = 0.1; const C = 1e-5; const V = 1;
        const a = R / (2 * L); const w0 = 1 / sqrt(L * C); const z = a / w0; const wd = w0 * sqrt(1 - z * z);
        close(z, (R / 2) * sqrt(C / L), 1e-12); close(1 / (2 * z), (1 / R) * sqrt(L / C), 1e-12); // Q = 1/2ζ
        const sim = simulate(series(R, L, C, V), [0, 0], 0.05, 50000);
        let peak = 0; let tPeak = 0; for (const [t, [vc]] of sim) if (vc > peak) { peak = vc; tPeak = t; }
        close((peak - V) * 100, 100 * exp((-PI * z) / sqrt(1 - z * z)), 1e-4); close(tPeak, PI / wd, 2e-3);
        const Td = (2 * PI) / wd; const x1 = at(sim, tPeak)[0] - V; const x2 = at(sim, tPeak + Td)[0] - V;
        close(log(x1 / x2), a * Td, 1e-3); close(a * Td, (2 * PI * z) / sqrt(1 - z * z), 1e-12);
        const settle = sim.filter(([, [vc]]) => abs(vc - V) > 0.02 * V).pop()[0];
        expect(settle).toBeLessThan(4 / a); expect(settle).toBeGreaterThan(3 / a); // 4/α is the usual estimate
        close(100 * exp((-PI * 0.5) / sqrt(0.75)), 16.3, 1e-2);
    });

    it('series critical resistance 2√(L/C) and parallel ½√(L/C) give α = ω₀', () => {
        const L = 0.2; const C = 5e-6; const w0 = 1 / sqrt(L * C);
        close((2 * sqrt(L / C)) / (2 * L), w0, 1e-12); close(1 / (2 * (0.5 * sqrt(L / C)) * C), w0, 1e-12);
    });

    it('parallel RLC: α = 1/2RC, and a larger R rings longer (simulated)', () => {
        const L = 0.1; const C = 1e-5; const ring = (R) => {
            // Parallel RLC natural response: state [v, iL]; C v' = −v/R − iL, L iL' = v.
            const sim = simulate((t, [vv, iL]) => [(-vv / R - iL) / C, vv / L], [10, 0], 0.01, 20000);
            return abs(at(sim, 0.008)[0]);
        };
        const a = (R) => 1 / (2 * R * C); expect(a(1000)).toBeLessThan(a(200));
        const R = 500; const w0 = 1 / sqrt(L * C); const wd = sqrt(w0 * w0 - a(R) ** 2);
        const sim = simulate((t, [vv, iL]) => [(-vv / R - iL) / C, vv / L], [10, 0], 0.01, 20000);
        // v(0) = 10, v'(0) = −10/(RC): v = e^(−αt)(10 cos ωd t + B2 sin ωd t), B2 = (−10/(RC) + 10α)/ωd
        const B2 = (-10 / (R * C) + 10 * a(R)) / wd; const t = 0.004;
        close(at(sim, t)[0], exp(-a(R) * t) * (10 * cos(wd * t) + B2 * sin(wd * t)), 1e-5);
        expect(ring(1000)).toBeGreaterThan(ring(100));
    });

    it('overdamped and critical natural forms fit their initial conditions', () => {
        const L = 0.1; const C = 1e-5; const Rc = 2 * sqrt(L / C);
        for (const R of [3 * Rc, Rc]) {
            const sim = simulate((t, [vc, i]) => [i / C, (-R * i - vc) / L], [5, 0], 0.01, 20000);
            const a = R / (2 * L); const w0 = 1 / sqrt(L * C); const t = 0.003;
            let x;
            if (R > Rc) { const d = sqrt(a * a - w0 * w0); const s1 = -a + d; const s2 = -a - d; const A1 = (-5 * s2) / (s1 - s2); x = A1 * exp(s1 * t) + (5 - A1) * exp(s2 * t); } else x = (5 + 5 * a * t) * exp(-a * t);
            close(at(sim, t)[0], x, 1e-5);
        }
    });
});

describe('Impulses, Laplace and transfer functions', () => {
    it('RC impulse response is the slope of its step response, with area 1', () => {
        const R = 1000; const C = 1e-6; const tau = R * C; const step = (t) => 1 - exp(-t / tau);
        const t = 0.0013; const h = 1e-9; close((step(t + h) - step(t - h)) / (2 * h), (1 / tau) * exp(-t / tau), 1e-5);
        let area = 0; const n = 200000; const T = 30 * tau; for (let k = 0; k < n; k += 1) area += ((1 / tau) * exp(-((k + 0.5) * T) / n / tau) * T) / n;
        close(area, 1, 1e-6);
    });

    it('Laplace pairs: transforms computed by numerical integration', () => {
        const a = 3; const w = 5; const s = 2;
        const L = (f) => { let sum = 0; const n = 200000; const T = 20; for (let k = 0; k < n; k += 1) { const t = ((k + 0.5) * T) / n; sum += f(t) * exp(-s * t) * (T / n); } return sum; };
        close(L((t) => exp(-a * t)), 1 / (s + a), 1e-6);
        close(L((t) => t * exp(-a * t)), 1 / (s + a) ** 2, 1e-6);
        close(L((t) => exp(-a * t) * sin(w * t)), w / ((s + a) ** 2 + w * w), 1e-6);
        close(L((t) => exp(-a * t) * cos(w * t)), (s + a) / ((s + a) ** 2 + w * w), 1e-6);
    });

    it('cover-up residues rebuild F(s) = (s + 3)/((s + 1)(s + 2))', () => {
        const F = (s) => (s + 3) / ((s + 1) * (s + 2)); const K1 = (-1 + 3) / (-1 + 2); const K2 = (-2 + 3) / (-2 + 1);
        for (const s of [0.5, 2, 7]) close(K1 / (s + 1) + K2 / (s + 2), F(s), 1e-12);
    });

    it('series RLC transfer function to v_C has 2ζω₀ = R/L and ω₀² = 1/LC; H(jω) matches the phasor divider', () => {
        const R = 30; const L = 0.05; const C = 2e-6; const w0 = 1 / sqrt(L * C); const z = (R / 2) * sqrt(C / L);
        close(2 * z * w0, R / L, 1e-12); close(w0 * w0, 1 / (L * C), 1e-12);
        const w = 3000; const re = w0 * w0 - w * w; const im = 2 * z * w0 * w; const Hmag = (w0 * w0) / sqrt(re * re + im * im);
        const Zre = R; const Zim = w * L - 1 / (w * C); const divider = (1 / (w * C)) / sqrt(Zre * Zre + Zim * Zim);
        close(Hmag, divider, 1e-9);
    });
});

describe('AC switching and traveling waves', () => {
    it('switching a sinusoid onto an RL circuit: steady ac plus the decaying offset', () => {
        const R = 2; const L = 0.02; const w = 2 * PI * 60; const Vm = 100; const Z = sqrt(R * R + (w * L) ** 2); const phi = atan((w * L) / R);
        for (const th of [0, phi, phi - PI / 2]) {
            const sim = simulate((t, [i]) => [(Vm * sin(w * t + th) - R * i) / L], [0], 0.05, 40000);
            const t = 0.0123; close(at(sim, t)[0], (Vm / Z) * (sin(w * t + th - phi) - sin(th - phi) * exp((-R * t) / L)), 1e-5);
        }
    });

    it('peak asymmetrical current √2 I (1 + e^(−πR/X)) is within 2% of the simulated first peak', () => {
        const w = 2 * PI * 60; const Vm = 100;
        for (const XR of [5, 10, 20]) {
            const R = 1; const L = (XR * R) / w; const Z = sqrt(R * R + (w * L) ** 2); const phi = atan(XR); const th = phi - PI / 2;
            const sim = simulate((t, [i]) => [(Vm * sin(w * t + th) - R * i) / L], [0], 1 / 60, 20000);
            const pk = max(...sim.map(([, [i]]) => abs(i))); const I = Vm / Z / sqrt(2);
            close(pk, sqrt(2) * I * (1 + exp((-PI * R) / (w * L))), 2e-2);
        }
    });

    it('capacitor energizing: inrush peak V√(C/L) at 1/(2π√LC), and v_C overshoots to 2V', () => {
        const L = 1e-3; const C = 50e-6; const V = 1000;
        const sim = simulate((t, [vc, i]) => [i / C, (V - vc) / L], [0, 0], 2 * PI * sqrt(L * C), 20000);
        close(max(...sim.map(([, [, i]]) => i)), V * sqrt(C / L), 1e-5);
        close(max(...sim.map(([, [vc]]) => vc)), 2 * V, 1e-5);
        close(at(sim, PI * sqrt(L * C))[0], 2 * V, 1e-5); // the peak falls half a ringing period in
    });

    it('current chopping: the stray C charges to I√(L/C)', () => {
        const L = 0.5; const C = 2e-9; const I = 3;
        const sim = simulate((t, [vc, i]) => [i / C, -vc / L], [0, I], (PI / 2) * sqrt(L * C), 20000);
        close(sim[sim.length - 1][1][0], I * sqrt(L / C), 1e-6);
    });

    it('wave velocity 1/√(LC) of an overhead line is near c; launched surge and reflections settle to the dc answer', () => {
        const Lp = 1.0e-6; const Cp = 11.1e-12; close(1 / sqrt(Lp * Cp), 3.0e8, 1e-2); close(sqrt(Lp / Cp), 300, 1e-2);
        // Lattice: a source Vs with Zs drives a line Z0 into a load ZL; sum the reflections at the load.
        const Vs = 100; const Zs = 50; const Z0 = 300; const ZL = 600;
        const vPlus = (Vs * Z0) / (Zs + Z0); const gL = (ZL - Z0) / (ZL + Z0); const gS = (Zs - Z0) / (Zs + Z0);
        let vLoad = 0; let wave = vPlus; for (let k = 0; k < 200; k += 1) { vLoad += wave * (1 + gL); wave *= gL * gS; }
        close(vLoad, (Vs * ZL) / (Zs + ZL), 1e-9); // settles to the plain voltage divider
        close(vPlus * (1 + gL), (vPlus * 2 * ZL) / (ZL + Z0), 1e-12); // τ = 1 + Γ
        close((1e6 - 300) / (1e6 + 300), 1, 1e-3); close((0 - 300) / (0 + 300), -1, 1e-12); // open and short
    });
});
