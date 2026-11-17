import { describe, it, expect } from 'vitest';

// Calculus 1's formula cards, checked with numbers (Library round, 2026-11-17).
// Each rule is set against a numerical derivative (a central difference), a
// limit evaluated close in, or an optimum found by brute force: never against
// the rule itself.

const close = (a, b, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sin, cos, tan, exp, log, sqrt, PI, asin, acos, atan, sinh, cosh, tanh, abs, hypot } = Math;
const H = 1e-5;
const d = (f, x, h = H) => (f(x + h) - f(x - h)) / (2 * h);
const d2 = (f, x, h = 1e-4) => (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
const dn = (f, x, n, h = 1e-2) => (n === 0 ? f(x) : (dn(f, x + h, n - 1, h) - dn(f, x - h, n - 1, h)) / (2 * h));
const XS = [0.3, 0.7, 1.4, 2.2];
const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i += 1) r = (r * (n - k + i)) / i; return r; };

describe('Limits and continuity', () => {
    it('special limits, close in', () => {
        const t = 1e-6;
        close(sin(t) / t, 1);
        close((1 - cos(t)) / t, 0);
        close(tan(t) / t, 1);
        close(sin(3 * t) / t, 3);
        close((exp(t) - 1) / t, 1);
        close((1 + t) ** (1 / t), Math.E, 1e-5);
        close((1 + 1 / 1e7) ** 1e7, Math.E, 1e-6);
        close((1 + 2 / 1e7) ** 1e7, exp(2), 1e-6);
    });

    it('rational functions at infinity follow their leading terms; the squeeze', () => {
        const x = 1e8;
        close((3 * x * x + 5 * x - 1) / (2 * x * x - 7), 1.5);
        close((4 * x + 1) / (x * x + 1), 0);
        expect((x ** 3) / (x * x + 1)).toBeGreaterThan(1e7);
        for (const t of [1e-3, -1e-4, 1e-6]) expect(abs(t * sin(1 / t))).toBeLessThanOrEqual(abs(t));
    });
});

describe('Differentiation rules', () => {
    it('power, sum, constant multiple, product, quotient, square root', () => {
        for (const x of XS) {
            for (const n of [3, -2, 0.5, 1.7]) close(d((t) => t ** n, x), n * x ** (n - 1));
            close(d((t) => 5 * t ** 3 + sin(t) - 7, x), 15 * x * x + cos(x));
            const u = (t) => t * t + 1; const v = (t) => sin(t) + 2;
            close(d((t) => u(t) * v(t), x), 2 * x * v(x) + u(x) * cos(x));
            close(d((t) => u(t) / v(t), x), (2 * x * v(x) - u(x) * cos(x)) / v(x) ** 2);
            close(d((t) => sqrt(u(t)), x), (2 * x) / (2 * sqrt(u(x))));
            close(((x + 1e-7) ** 2 - x * x) / 1e-7, 2 * x, 1e-5); // the limit definition itself, h small
        }
    });
});

describe('Chain rule, implicit and inverse functions', () => {
    it('chain rule and the power of a function', () => {
        for (const x of XS) {
            close(d((t) => sin(t * t), x), cos(x * x) * 2 * x);
            close(d((t) => (3 * t + 1) ** 5, x), 5 * (3 * x + 1) ** 4 * 3);
        }
    });

    it('implicit: on the circle x² + y² = 25, dy/dx = −Fx/Fy matches the explicit branch', () => {
        const y = (x) => sqrt(25 - x * x);
        for (const x of [1, 2.5, 4]) close(d(y, x), -(2 * x) / (2 * y(x)));
    });

    it('inverse function slope, and logarithmic differentiation of x^x', () => {
        const f = (t) => t ** 3 + t; // one-to-one
        const a = 1.2; const b = f(a);
        // f⁻¹ near b by Newton's method.
        const inv = (y) => { let t = 1; for (let i = 0; i < 60; i += 1) t -= (f(t) - y) / (3 * t * t + 1); return t; };
        close(d(inv, b), 1 / (3 * a * a + 1));
        for (const x of [0.5, 1.5, 2]) close(d((t) => t ** t, x), x ** x * (log(x) + 1));
    });
});

describe('Transcendental derivatives', () => {
    it('trigonometric, all six', () => {
        for (const x of XS) {
            close(d(sin, x), cos(x)); close(d(cos, x), -sin(x));
            close(d(tan, x), 1 / cos(x) ** 2);
            close(d((t) => 1 / tan(t), x), -1 / sin(x) ** 2);
            close(d((t) => 1 / cos(t), x), (1 / cos(x)) * tan(x));
            close(d((t) => 1 / sin(t), x), -(1 / sin(x)) * (1 / tan(x)));
        }
    });

    it('inverse trigonometric', () => {
        for (const x of [0.2, 0.5, 0.8]) {
            close(d(asin, x), 1 / sqrt(1 - x * x));
            close(d(acos, x), -1 / sqrt(1 - x * x));
        }
        const acot = (t) => PI / 2 - atan(t);
        const asec = (t) => acos(1 / t);
        const acsc = (t) => asin(1 / t);
        for (const x of [1.5, 2.5, 4]) {
            close(d(acot, x), -1 / (1 + x * x));
            close(d(asec, x), 1 / (abs(x) * sqrt(x * x - 1)));
            close(d(acsc, x), -1 / (abs(x) * sqrt(x * x - 1)));
        }
    });

    it('exponential, logarithmic and hyperbolic', () => {
        for (const x of XS) {
            close(d((t) => exp(3 * t), x), 3 * exp(3 * x));
            close(d((t) => 2 ** t, x), 2 ** x * log(2));
            close(d((t) => log(t * t + 1), x), (2 * x) / (x * x + 1));
            close(d((t) => Math.log10(t), x), 1 / (x * log(10)));
            close(d(sinh, x), cosh(x)); close(d(cosh, x), sinh(x));
            close(d(tanh, x), 1 / cosh(x) ** 2);
        }
    });
});

describe('Higher-order derivatives', () => {
    it('nth derivatives of a power, of sine and of an exponential; Leibniz', () => {
        const x = 0.9;
        close(dn((t) => t ** 5, x, 3), (120 / 2) * x ** 2, 1e-3); // 5!/(5−3)! x²
        for (const n of [1, 2, 3, 4]) {
            close(dn(sin, x, n), sin(x + (n * PI) / 2), 1e-3);
            close(dn((t) => exp(2 * t), x, n), 2 ** n * exp(2 * x), 1e-3);
        }
        // (uv)'' with u = x³, v = sin x.
        const u = [x ** 3, 3 * x * x, 6 * x]; const v = [sin(x), cos(x), -sin(x)];
        const leibniz = [0, 1, 2].reduce((s, k) => s + binom(2, k) * u[k] * v[2 - k], 0);
        close(d2((t) => t ** 3 * sin(t), x), leibniz, 1e-4);
    });
});

describe('Curve sketching', () => {
    it('signs of f′ and f″, an inflection, and x⁴ with no inflection', () => {
        const f = (t) => t ** 3 - 3 * t;
        expect(d(f, 2)).toBeGreaterThan(0); // increasing
        expect(d(f, 0)).toBeLessThan(0); // decreasing
        expect(d2(f, -0.5)).toBeLessThan(0);
        expect(d2(f, 0.5)).toBeGreaterThan(0); // inflection at 0
        expect(d2((t) => t ** 4, -0.1)).toBeGreaterThan(0);
        expect(d2((t) => t ** 4, 0.1)).toBeGreaterThan(0); // f″(0) = 0, no sign change
    });

    it('radius of curvature: a circle of radius 5 has R = 5 everywhere', () => {
        const y = (x) => sqrt(25 - x * x);
        for (const x of [0, 1.5, 3]) {
            const k = abs(d2(y, x)) / (1 + d(y, x) ** 2) ** 1.5;
            close(1 / k, 5, 1e-4);
        }
    });

    it('a slant asymptote is the quotient of the long division', () => {
        // (x² + 3x + 1)/(x − 1) = x + 4 + 5/(x − 1).
        const x = 1e6;
        close((x * x + 3 * x + 1) / (x - 1) - (x + 4), 0, 1e-5);
    });
});

describe('Maxima and minima', () => {
    const argmax = (f, a, b, n = 200000) => { let best = a; for (let i = 0; i <= n; i += 1) { const x = a + ((b - a) * i) / n; if (f(x) > f(best)) best = x; } return best; };

    it('the second derivative test agrees with brute force', () => {
        const f = (t) => -(t ** 3) + 3 * t; // max at 1
        close(d(f, 1), 0, 1e-6);
        expect(d2(f, 1)).toBeLessThan(0);
        close(argmax(f, 0, 2), 1, 1e-4);
    });

    it('the optimum shapes: a square, s/6, and h = 2r', () => {
        const P = 40;
        close(argmax((w) => w * (P / 2 - w), 0, P / 2), P / 4, 1e-4); // square
        const s = 12;
        close(argmax((x) => x * (s - 2 * x) ** 2, 0, s / 2), s / 6, 1e-4);
        const Vol = 500;
        const area = (rr) => 2 * PI * rr * rr + (2 * Vol) / rr;
        const r0 = argmax((rr) => -area(rr), 0.5, 20);
        close(Vol / (PI * r0 * r0), 2 * r0, 1e-3); // h = 2r
        const openArea = (rr) => PI * rr * rr + (2 * Vol) / rr;
        const r1 = argmax((rr) => -openArea(rr), 0.5, 20);
        close(Vol / (PI * r1 * r1), r1, 1e-3); // open can: h = r
    });
});

describe('Time rates and differentials', () => {
    it('sphere and cone rates, and the ladder, by differencing in time', () => {
        const r = (t) => 2 + 0.3 * t; const V = (t) => (4 / 3) * PI * r(t) ** 3;
        close(d(V, 1), 4 * PI * r(1) ** 2 * 0.3);
        // Cone tank, radius 2 at depth 6: r = h/3.
        const h = (t) => 1 + 0.5 * t; const Vc = (t) => (PI / 3) * (h(t) / 3) ** 2 * h(t);
        close(d(Vc, 2), PI * (h(2) / 3) ** 2 * 0.5);
        // Ladder of 10: foot moves out at 1; at x = 6 the top falls at 6/8.
        const L = 10; const x = (t) => 6 + t; const y = (t) => sqrt(L * L - x(t) ** 2);
        close(x(0) * 1 + y(0) * d(y, 0), 0);
        close(d(y, 0), -6 / 8);
    });

    it('linear approximation and relative error', () => {
        close(5 + (1 / (2 * 5)) * 1, 5.1);
        expect(abs(sqrt(26) - 5.1)).toBeLessThan(0.001);
        // 1% in r → about 3% in V = (4/3)πr³.
        const vol = (rr) => (4 / 3) * PI * rr ** 3;
        close((vol(1.0001) - vol(1)) / vol(1), 3 * 0.0001, 1e-3);
    });
});

describe('Mean value theorems and L’Hôpital', () => {
    it('MVT: for a quadratic, c is the midpoint; Rolle; Cauchy', () => {
        const f = (t) => 3 * t * t - 2 * t + 1; const [a, b] = [1, 5];
        close(d(f, (a + b) / 2), (f(b) - f(a)) / (b - a));
        const g = (t) => sin(t); // g(0) = g(π)
        close(d(g, PI / 2), 0);
        // Cauchy with f = t², g = t³ on [1, 2]: find c, then check.
        const ratio = (4 - 1) / (8 - 1); // (f(b)−f(a))/(g(b)−g(a))
        const c = 2 / (3 * ratio); // f'/g' = 2/(3c)
        expect(c).toBeGreaterThan(1); expect(c).toBeLessThan(2);
        close((2 * c) / (3 * c * c), ratio);
    });

    it('the 1-to-infinity form and L’Hôpital, close in', () => {
        close((1 + 3 / 1e7) ** (2 * 1e7), exp(6), 1e-5);
        const t = 1e-5;
        close((exp(t) - 1 - t) / (t * t), 0.5, 1e-4); // two rounds of L'Hôpital: e^t/2 → 1/2
    });
});

describe('Parametric and partial derivatives', () => {
    it('parametric slope, second derivative, tangent, speed (on a cycloid)', () => {
        const x = (t) => t - sin(t); const y = (t) => 1 - cos(t);
        const slope = (t) => d(y, t) / d(x, t);
        const t0 = 1.1;
        close(slope(t0), sin(t0) / (1 - cos(t0)), 1e-6);
        // d²y/dx² = (d/dt of the slope) / (dx/dt); the cycloid's is −1/(1 − cos t)².
        close(d(slope, t0, 1e-4) / d(x, t0), -1 / (1 - cos(t0)) ** 2, 1e-4);
        close(hypot(d(x, t0), d(y, t0)), 2 * abs(sin(t0 / 2)), 1e-6);
    });

    it('partials, mixed partials, total differential, chain rule, gradient, the 2-variable test', () => {
        const f = (x, y) => x * x * y + sin(x * y);
        const [x0, y0] = [0.8, 1.3];
        const fx = (x, y) => (f(x + H, y) - f(x - H, y)) / (2 * H);
        const fy = (x, y) => (f(x, y + H) - f(x, y - H)) / (2 * H);
        close(fx(x0, y0), 2 * x0 * y0 + y0 * cos(x0 * y0));
        const h2 = 1e-4;
        const fxy = (fx(x0, y0 + h2) - fx(x0, y0 - h2)) / (2 * h2);
        const fyx = (fy(x0 + h2, y0) - fy(x0 - h2, y0)) / (2 * h2);
        close(fxy, fyx, 1e-4);
        const [dx, dy] = [1e-4, -2e-4];
        close(f(x0 + dx, y0 + dy) - f(x0, y0), fx(x0, y0) * dx + fy(x0, y0) * dy, 1e-3);
        const X = (t) => cos(t); const Y = (t) => t * t; const t1 = 0.6;
        close(d((t) => f(X(t), Y(t)), t1), fx(X(t1), Y(t1)) * -sin(t1) + fy(X(t1), Y(t1)) * 2 * t1, 1e-5);
        const u = [3 / 5, 4 / 5];
        close((f(x0 + H * u[0], y0 + H * u[1]) - f(x0 - H * u[0], y0 - H * u[1])) / (2 * H), fx(x0, y0) * u[0] + fy(x0, y0) * u[1]);
        // g = x² + xy + y² − 3x has a minimum at (2, −1): D = 2·2 − 1 = 3 > 0, gxx = 2 > 0.
        const g = (x, y) => x * x + x * y + y * y - 3 * x;
        for (const [px, py] of [[2.01, -1], [1.99, -1.01], [2, -0.99]]) expect(g(px, py)).toBeGreaterThan(g(2, -1));
    });
});
