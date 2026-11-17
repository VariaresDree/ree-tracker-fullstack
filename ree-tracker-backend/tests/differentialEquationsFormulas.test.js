import { describe, it, expect } from 'vitest';

// Differential Equations' formula cards, checked with numbers (Library round,
// 2026-11-17). A closed-form solution is put back into its equation with
// numerical derivatives, or set against a Runge-Kutta solution that knows only
// the equation; a Laplace transform is checked by integrating e^(−st) f(t).

const close = (a, b, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sin, cos, exp, log, sqrt, tan, sinh, cosh } = Math;
const H = 1e-4;
const d1 = (f, x) => (f(x + H) - f(x - H)) / (2 * H);
const d2 = (f, x) => (f(x + H) - 2 * f(x) + f(x - H)) / (H * H);
/** RK4 for y' = F(t, y) with y a number or an array, from t0 to t1. */
function rk4(F, y0, t0, t1, n = 4000) {
    const h = (t1 - t0) / n;
    const addv = (a, b, k) => (Array.isArray(a) ? a.map((x, i) => x + k * b[i]) : a + k * b);
    let y = y0; let t = t0;
    for (let i = 0; i < n; i += 1) {
        const k1 = F(t, y); const k2 = F(t + h / 2, addv(y, k1, h / 2));
        const k3 = F(t + h / 2, addv(y, k2, h / 2)); const k4 = F(t + h, addv(y, k3, h));
        y = Array.isArray(y) ? y.map((x, j) => x + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])) : y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
        t += h;
    }
    return y;
}
const simpson = (f, a, b, n = 20000) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i += 1) s += f(a + i * h) * (i % 2 ? 4 : 2); return (s * h) / 3; };
const laplace = (f, s) => simpson((t) => exp(-s * t) * f(t), 0, 60);

describe('First-order equations', () => {
    it('separable, and reducible to separable: y′ = (x + y)² by tan', () => {
        // y' = xy, y(0) = 2 → y = 2e^{x²/2}.
        close(rk4((x, y) => x * y, 2, 0, 1.3), 2 * exp(1.3 * 1.3 / 2), 1e-8);
        // u = x + y: u' = 1 + u², u(0) = 0 → u = tan x, so y = tan x − x.
        close(rk4((x, y) => (x + y) ** 2, 0, 0, 1), tan(1) - 1, 1e-8);
    });

    it('homogeneous: y′ = (x² + y²)/(xy) via y = vx gives y² = x²(2 ln x + C)', () => {
        // y(1) = 1 → C = 1.
        close(rk4((x, y) => (x * x + y * y) / (x * y), 1, 1, 2.5), sqrt(2.5 * 2.5 * (2 * log(2.5) + 1)), 1e-8);
        close(((2 * 3) ** 2 + (2 * 5) ** 2), 2 ** 2 * (3 * 3 + 5 * 5)); // M = x² + y² is homogeneous of degree 2
    });

    it('exact, and made exact by an integrating factor', () => {
        // (2xy + 3) dx + (x² − 1) dy = 0: M_y = 2x = N_x; F = x²y + 3x − y.
        const M = (x, y) => 2 * x * y + 3; const N = (x) => x * x - 1;
        close((M(1, 2 + H) - M(1, 2 - H)) / (2 * H), d1((x) => N(x), 1), 1e-8);
        const F = (x, y) => x * x * y + 3 * x - y;
        close(d1((x) => F(x, 0.7), 1.5), M(1.5, 0.7), 1e-6);
        close((F(1.5, 0.7 + H) - F(1.5, 0.7 - H)) / (2 * H), N(1.5), 1e-6);
        // y dx − x dy = 0 is not exact; (M_y − N_x)/N = 2/(−x) gives μ = 1/x² and then it is.
        const Mu = (x, y) => y / (x * x); const Nu = (x) => -x / (x * x);
        close((Mu(2, 3 + H) - Mu(2, 3 - H)) / (2 * H), d1(Nu, 2), 1e-6);
    });

    it('linear: the integrating factor solution, and y′ + ay = b', () => {
        // y' + 2y = x, y(0) = 1: μ = e^{2x}, y = x/2 − 1/4 + (5/4)e^{−2x}.
        const y = (x) => x / 2 - 0.25 + 1.25 * exp(-2 * x);
        for (const x of [0.3, 1, 2]) close(d1(y, x) + 2 * y(x), x, 1e-6);
        close(rk4((x, yy) => x - 2 * yy, 1, 0, 2), y(2), 1e-8);
        const [a, b, Cc] = [3, 6, 1.5];
        const z = (x) => b / a + Cc * exp(-a * x);
        for (const x of [0.2, 1]) close(d1(z, x) + a * z(x), b, 1e-6);
    });

    it("Bernoulli: y′ + y = y², through v = y⁻¹", () => {
        // v' − v = −1 → v = 1 + Ce^{x}; y(0) = 0.5 → C = 1: y = 1/(1 + e^x).
        close(rk4((x, y) => y * y - y, 0.5, 0, 2), 1 / (1 + exp(2)), 1e-8);
    });
});

describe('Growth, decay, mixing and circuits', () => {
    it('half-life, logistic, continuous compounding, cooling', () => {
        const k = -0.3;
        close(exp(k * (log(2) / Math.abs(k))), 0.5);
        const [M, kk, P0] = [1000, 0.4, 50];
        const A = (M - P0) / P0;
        close(rk4((t, P) => kk * P * (1 - P / M), P0, 0, 12), M / (1 + A * exp(-kk * 12)), 1e-8);
        close(rk4((t, x) => 0.05 * x, 1000, 0, 10), 1000 * exp(0.5), 1e-8);
        const [Ts, T0, kc] = [25, 90, 0.1];
        close(rk4((t, T) => -kc * (T - Ts), T0, 0, 7), Ts + (T0 - Ts) * exp(-kc * 7), 1e-8);
    });

    it('mixing: equal flows settle at the incoming concentration', () => {
        // 100 L tank, 2 g/L in at 5 L/min, out at 5 L/min, Q(0) = 0.
        const Q = rk4((t, q) => 5 * 2 - 5 * (q / 100), 0, 0, 30);
        close(Q, 200 * (1 - exp(-30 / 20)), 1e-8);
    });

    it('RL, RC and falling-body transients', () => {
        const [E, R, L, C] = [12, 4, 2, 0.05];
        close(rk4((t, i) => (E - R * i) / L, 0, 0, 0.8), (E / R) * (1 - exp((-R * 0.8) / L)), 1e-8);
        close(rk4((t, q) => (E - q / C) / R, 0, 0, 0.3), C * E * (1 - exp(-0.3 / (R * C))), 1e-8);
        const [m, g, kd] = [2, 9.81, 0.5];
        close(rk4((t, vv) => g - (kd / m) * vv, 0, 0, 5), ((m * g) / kd) * (1 - exp((-kd * 5) / m)), 1e-8);
        close(1 - exp(-1), 0.6321205588, 1e-9); // one time constant: 63.2%
    });
});

describe('Higher-order linear equations', () => {
    it('solutions by root type satisfy their equations', () => {
        const check = (y, a, b, c) => { for (const x of [0.3, 0.9, 1.6]) close(a * d2(y, x) + b * d1(y, x) + c * y(x), 0, 1e-4); };
        check((x) => 2 * exp(2 * x) - exp(-3 * x), 1, 1, -6); // r = 2, −3
        check((x) => (1 + 3 * x) * exp(-2 * x), 1, 4, 4); // r = −2 double
        check((x) => exp(-x) * (cos(2 * x) + 2 * sin(2 * x)), 1, 2, 5); // r = −1 ± j2
    });

    it('simple harmonic and damped motion against RK4', () => {
        const w = 3; const [A, phi] = [2, 0.4];
        const x0 = A * cos(-phi); const v0 = A * w * sin(phi);
        const [xT] = rk4((t, [x, v]) => [v, -w * w * x], [x0, v0], 0, 2.5);
        close(xT, A * cos(w * 2.5 - phi), 1e-8);
        // Damping decides the regime: c² vs 4mk.
        const regime = (m, c, k) => (c * c < 4 * m * k ? 'under' : c * c === 4 * m * k ? 'critical' : 'over');
        expect(regime(1, 2, 5)).toBe('under'); expect(regime(1, 4, 4)).toBe('critical'); expect(regime(1, 5, 4)).toBe('over');
    });

    it('undetermined coefficients, resonance, the Wronskian, variation of parameters', () => {
        // y'' − y = e^{2x}: trial Ae^{2x} gives A = 1/3.
        const yp = (x) => exp(2 * x) / 3;
        for (const x of [0.2, 1]) close(d2(yp, x) - yp(x), exp(2 * x), 1e-4);
        // x'' + ω²x = F cos ωt: x_p = (F/2ω) t sin ωt.
        const [w, F0] = [2, 3];
        const xr = (t) => (F0 / (2 * w)) * t * sin(w * t);
        for (const t of [0.5, 1.3]) close(d2(xr, t) + w * w * xr(t), F0 * cos(w * t), 1e-4);
        // Wronskian of e^{x}, e^{3x} is 2e^{4x}.
        const x = 0.7;
        close(exp(x) * 3 * exp(3 * x) - exp(x) * exp(3 * x), 2 * exp(4 * x), 1e-12);
        // y'' + y = sec x on (−π/2, π/2): y_p = x sin x + cos x ln(cos x).
        const yv = (t) => t * sin(t) + cos(t) * log(cos(t));
        for (const t of [0.2, 0.6, 1]) close(d2(yv, t) + yv(t), 1 / cos(t), 1e-4);
    });

    it('Cauchy-Euler equations by root type', () => {
        const check = (y, a, b, c) => { for (const t of [0.8, 1.5, 2.4]) close(a * t * t * d2(y, t) + b * t * d1(y, t) + c * y(t), 0, 1e-4); };
        check((t) => t ** 2 + 3 * t ** -1, 1, 0, -2); // m(m − 1) − 2 = 0: m = 2, −1
        check((t) => (1 + 2 * log(t)) * t, 1, -1, 1); // m = 1 double
        check((t) => t * (cos(2 * log(t)) + sin(2 * log(t))), 1, -1, 5); // m = 1 ± j2
    });
});

describe('Laplace transforms', () => {
    it('the table, by integrating e^(−st) f(t)', () => {
        const s = 2.5; const [a, b] = [0.7, 1.8];
        close(laplace(() => 1, s), 1 / s, 1e-8);
        close(laplace((t) => t ** 3, s), 6 / s ** 4, 1e-7);
        close(laplace((t) => exp(a * t), s), 1 / (s - a), 1e-8);
        close(laplace((t) => sin(b * t), s), b / (s * s + b * b), 1e-8);
        close(laplace((t) => cos(b * t), s), s / (s * s + b * b), 1e-8);
        close(laplace((t) => sinh(a * t), s), a / (s * s - a * a), 1e-8);
        close(laplace((t) => cosh(a * t), s), s / (s * s - a * a), 1e-8);
    });

    it('shifting theorems, derivatives, t·f and ∫f', () => {
        const s = 3; const b = 2;
        close(laplace((t) => exp(2 * t) * sin(3 * t), s + 2), 3 / (s * s + 9), 1e-7); // F(s − a) with s → s + 2
        const step = (t) => (t >= 1 ? (t - 1) ** 2 : 0);
        close(laplace(step, s), exp(-s) * (2 / s ** 3), 1e-6);
        const f = (t) => sin(b * t) + 2; const F = (q) => b / (q * q + b * b) + 2 / q;
        close(laplace((t) => -b * b * sin(b * t), s), s * s * F(s) - s * f(0) - d1(f, 0), 1e-6);
        close(laplace((t) => t * sin(b * t), s), (2 * b * s) / (s * s + b * b) ** 2, 1e-7);
        close(laplace((t) => (1 - cos(b * t)) / b, s), (b / (s * s + b * b)) / s, 1e-7); // ∫₀ᵗ sin bτ dτ
    });

    it('initial and final value theorems; an IVP solved by transform', () => {
        // F(s) = 5/(s(s + 2)) is f = 2.5(1 − e^{−2t}): f(0) = 0, f(∞) = 2.5.
        const F = (s) => 5 / (s * (s + 2));
        close(1e8 * F(1e8), 0, 1e-6);
        close(1e-8 * F(1e-8), 2.5, 1e-6);
        // y'' + 3y' + 2y = 0, y(0) = 1, y'(0) = 0 → Y = (s + 3)/((s + 1)(s + 2)) → y = 2e^{−t} − e^{−2t}.
        const [y2] = rk4((t, [y, yp]) => [yp, -3 * yp - 2 * y], [1, 0], 0, 2);
        close(y2, 2 * exp(-2) - exp(-4), 1e-8);
    });
});

describe('Systems', () => {
    it('x′ = Ax by eigenvectors, and the single-equation reduction', () => {
        // A = [[1, 2], [2, 1]]: λ = 3 (v = [1, 1]), −1 (v = [1, −1]); x(0) = [3, 1] = 2[1,1] + 1[1,−1].
        const T = 0.8;
        const [x, y] = rk4((t, [a, b]) => [a + 2 * b, 2 * a + b], [3, 1], 0, T);
        close(x, 2 * exp(3 * T) + exp(-T), 1e-8);
        close(y, 2 * exp(3 * T) - exp(-T), 1e-8);
        // trace 2, det −3: λ² − 2λ − 3 = 0 gives 3 and −1.
        for (const lam of [3, -1]) close(lam * lam - 2 * lam - 3, 0);
    });
});
