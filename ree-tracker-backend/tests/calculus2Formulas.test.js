import { describe, it, expect } from 'vitest';

// Calculus 2's formula cards, checked with numbers (Library round, 2026-11-17).
// An antiderivative is checked by differentiating it numerically; a definite
// result by Simpson's rule; a volume, centroid or moment by integrating it
// from its slices. Never against the card itself.

const close = (a, b, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sin, cos, tan, exp, log, sqrt, PI, asin, atan, acos, sinh, cosh, abs, hypot } = Math;
const H = 1e-5;
const d = (f, x) => (f(x + H) - f(x - H)) / (2 * H);
/** Simpson's rule with n (even) panels. */
const simpson = (f, a, b, n = 2000) => {
    const h = (b - a) / n;
    let s = f(a) + f(b);
    for (let i = 1; i < n; i += 1) s += f(a + i * h) * (i % 2 ? 4 : 2);
    return (s * h) / 3;
};
/** An antiderivative F of f: F' must equal f at several points. */
const antiderivative = (F, f, xs) => { for (const x of xs) close(d(F, x), f(x), 1e-5); };
const XS = [0.3, 0.8, 1.2];
const sec = (x) => 1 / cos(x); const csc = (x) => 1 / sin(x); const cot = (x) => 1 / tan(x);
const dfact = (n) => (n <= 0 ? 1 : n * dfact(n - 2));

describe('Integration formulas', () => {
    it('powers, exponentials, sine and cosine', () => {
        antiderivative((x) => x ** 3.5 / 3.5, (x) => x ** 2.5, XS);
        antiderivative((x) => log(abs(x)), (x) => 1 / x, [...XS, -2]);
        antiderivative((x) => exp(3 * x) / 3, (x) => exp(3 * x), XS);
        antiderivative((x) => 2 ** x / log(2), (x) => 2 ** x, XS);
        antiderivative((x) => -cos(x), sin, XS);
        antiderivative(sin, cos, XS);
    });

    it('tangent, cotangent, secant, cosecant and the derivative table', () => {
        antiderivative((x) => log(abs(sec(x))), tan, XS);
        antiderivative((x) => log(abs(sin(x))), cot, XS);
        antiderivative((x) => log(abs(sec(x) + tan(x))), sec, XS);
        antiderivative((x) => log(abs(csc(x) - cot(x))), csc, XS);
        antiderivative(tan, (x) => sec(x) ** 2, XS);
        antiderivative((x) => -cot(x), (x) => csc(x) ** 2, XS);
        antiderivative(sec, (x) => sec(x) * tan(x), XS);
        antiderivative((x) => -csc(x), (x) => csc(x) * cot(x), XS);
    });

    it('inverse trigonometric, logarithmic and hyperbolic forms', () => {
        const a = 2;
        antiderivative((x) => asin(x / a), (x) => 1 / sqrt(a * a - x * x), XS);
        antiderivative((x) => atan(x / a) / a, (x) => 1 / (a * a + x * x), XS);
        antiderivative((x) => acos(a / abs(x)) / a, (x) => 1 / (x * sqrt(x * x - a * a)), [2.5, 3, 5]); // sec⁻¹(|x|/a)
        antiderivative((x) => log(abs((x - a) / (x + a))) / (2 * a), (x) => 1 / (x * x - a * a), [2.5, 3, 0.5]);
        antiderivative((x) => log(abs(x + sqrt(x * x + a * a))), (x) => 1 / sqrt(x * x + a * a), XS);
        antiderivative((x) => log(abs(x + sqrt(x * x - a * a))), (x) => 1 / sqrt(x * x - a * a), [2.5, 3, 4]);
        antiderivative(cosh, sinh, XS);
        antiderivative(sinh, cosh, XS);
    });

    it('the substitution rule, on a definite integral', () => {
        // ∫₀¹ 2x cos(x²) dx = ∫₀¹ cos u du = sin 1.
        close(simpson((x) => 2 * x * cos(x * x), 0, 1), sin(1), 1e-9);
    });
});

describe('Definite integrals', () => {
    it('properties, symmetry and the average value', () => {
        const f = (x) => x * x + sin(x);
        close(simpson(f, 0, 2) + simpson(f, 2, 3), simpson(f, 0, 3), 1e-9);
        close(simpson(f, 3, 0), -simpson(f, 0, 3), 1e-9);
        close(simpson((x) => x ** 3 * cos(x), -1, 1), 0, 1e-9);
        close(simpson((x) => x * x * cos(x), -1, 1), 2 * simpson((x) => x * x * cos(x), 0, 1), 1e-9);
        close(simpson(sin, 0, PI) / PI, 2 / PI, 1e-9);
    });

    it('the derivative of an integral with a variable limit', () => {
        const G = (x) => simpson((t) => exp(-t * t), 0, x * x, 400);
        close(d(G, 0.9), exp(-(0.9 ** 4)) * 2 * 0.9, 1e-5);
    });

    it("Wallis's formula, odd and even powers", () => {
        for (const n of [2, 3, 4, 5, 6, 7]) {
            const exact = (dfact(n - 1) / dfact(n)) * (n % 2 === 0 ? PI / 2 : 1);
            close(simpson((x) => sin(x) ** n, 0, PI / 2), exact, 1e-9);
            close(simpson((x) => cos(x) ** n, 0, PI / 2), exact, 1e-9);
        }
        close(simpson((x) => sin(x) ** 4, 0, PI / 2), (3 * PI) / 16, 1e-9);
    });
});

describe('Integration by parts', () => {
    it('ln x, x ln x, e^ax sin and cos, the tabular form', () => {
        antiderivative((x) => x * log(x) - x, log, XS);
        antiderivative((x) => (x * x / 2) * log(x) - x * x / 4, (x) => x * log(x), XS);
        const [a, b] = [2, 3];
        antiderivative((x) => (exp(a * x) * (a * sin(b * x) - b * cos(b * x))) / (a * a + b * b), (x) => exp(a * x) * sin(b * x), XS);
        antiderivative((x) => (exp(a * x) * (a * cos(b * x) + b * sin(b * x))) / (a * a + b * b), (x) => exp(a * x) * cos(b * x), XS);
        antiderivative((x) => exp(x) * (x * x - 2 * x + 2), (x) => x * x * exp(x), XS);
        // p(x) = x³, a = 2: e^{2x}(p/2 − p'/4 + p''/8 − p'''/16).
        antiderivative((x) => exp(2 * x) * (x ** 3 / 2 - (3 * x * x) / 4 + (6 * x) / 8 - 6 / 16), (x) => x ** 3 * exp(2 * x), XS);
    });
});

describe('Trigonometric integrals and substitutions', () => {
    it('sin², cos², sin³, the sine reduction, sec³', () => {
        antiderivative((x) => x / 2 - sin(2 * x) / 4, (x) => sin(x) ** 2, XS);
        antiderivative((x) => x / 2 + sin(2 * x) / 4, (x) => cos(x) ** 2, XS);
        antiderivative((x) => -cos(x) + cos(x) ** 3 / 3, (x) => sin(x) ** 3, XS);
        const n = 5; const [a, b] = [0.2, 1.3];
        const lhs = simpson((x) => sin(x) ** n, a, b);
        const boundary = (-(sin(b) ** (n - 1)) * cos(b) + sin(a) ** (n - 1) * cos(a)) / n;
        close(lhs, boundary + ((n - 1) / n) * simpson((x) => sin(x) ** (n - 2), a, b), 1e-9);
        antiderivative((x) => 0.5 * (sec(x) * tan(x) + log(abs(sec(x) + tan(x)))), (x) => sec(x) ** 3, XS);
    });

    it('products of sines and cosines, and their orthogonality', () => {
        for (const x of XS) close(sin(2 * x) * cos(5 * x), 0.5 * (sin(2 * x - 5 * x) + sin(2 * x + 5 * x)));
        close(simpson((x) => sin(2 * x) * sin(3 * x), 0, 2 * PI), 0, 1e-9);
        close(simpson((x) => sin(3 * x) * sin(3 * x), 0, 2 * PI), PI, 1e-9);
    });

    it('the root of a² − u², and the Weierstrass substitution', () => {
        const a = 3;
        antiderivative((u) => (u / 2) * sqrt(a * a - u * u) + ((a * a) / 2) * asin(u / a), (u) => sqrt(a * a - u * u), [0.5, 1.5, 2.5]);
        close(simpson((u) => sqrt(a * a - u * u), -a, a, 200000), (PI * a * a) / 2, 1e-6);
        // ∫₀^{π/2} dx/(2 + cos x), and the same integral in t = tan(x/2).
        const direct = simpson((x) => 1 / (2 + cos(x)), 0, PI / 2);
        const inT = simpson((t) => (1 / (2 + (1 - t * t) / (1 + t * t))) * (2 / (1 + t * t)), 0, 1);
        close(direct, inT, 1e-9);
        for (const x of XS) { const t = tan(x / 2); close((2 * t) / (1 + t * t), sin(x)); close((1 - t * t) / (1 + t * t), cos(x)); }
    });
});

describe('Partial fractions', () => {
    it('the cover-up rule, and a repeated factor', () => {
        // (x + 5)/((x − 1)(x + 2)) = 2/(x − 1) − 1/(x + 2).
        for (const x of [0.3, 3, -5]) close((x + 5) / ((x - 1) * (x + 2)), 2 / (x - 1) - 1 / (x + 2));
        // A = P(a)/Q'(a) for Q = (x − 1)(x + 2)(x − 3).
        const P = (x) => x * x + 1; const Q = (x) => (x - 1) * (x + 2) * (x - 3);
        const roots = [1, -2, 3];
        const coef = roots.map((a) => P(a) / d(Q, a));
        for (const x of [0.5, 4, -1]) close(P(x) / Q(x), coef.reduce((s, A, i) => s + A / (x - roots[i]), 0), 1e-5);
        // (3x + 5)/(x + 1)² = 3/(x + 1) + 2/(x + 1)².
        for (const x of [0.5, 2, -3]) close((3 * x + 5) / (x + 1) ** 2, 3 / (x + 1) + 2 / (x + 1) ** 2);
    });
});

describe('Improper integrals', () => {
    it('p-integrals at infinity and near zero, gamma, Gaussian', () => {
        // ∫₁^B x⁻³ dx tends to 1/(3 − 1) as B grows.
        close(simpson((x) => x ** -3, 1, 1000, 400000), 1 / (3 - 1), 1e-5);
        // ∫₀¹ x^{-1/2} dx = 2: substitute x = s², ∫₀¹ 2 ds.
        close(simpson(() => 2, 0, 1), 1 / (1 - 0.5), 1e-9);
        for (const n of [1, 2, 3, 5]) close(simpson((x) => x ** (n - 1) * exp(-x), 0, 60, 20000), [1, 1, 2, 6, 24][n - 1], 1e-6);
        // Γ(½) with x = s²: 2∫₀^∞ e^{−s²} ds, free of the singularity at 0.
        close(simpson((s2) => 2 * exp(-s2 * s2), 0, 10, 20000), sqrt(PI), 1e-9);
        close(simpson((x) => exp(-x * x), -10, 10, 20000), sqrt(PI), 1e-9);
        close(simpson((x) => exp(-3 * x * x), 0, 10, 20000), 0.5 * sqrt(PI / 3), 1e-9);
        close(simpson((x) => x ** 3 * exp(-2 * x), 0, 40, 20000), 6 / 2 ** 4, 1e-6);
    });
});

describe('Areas and volumes', () => {
    it('between curves, and the parabolic segment', () => {
        // y = x and y = x² on [0, 1]: area 1/6.
        close(simpson((x) => x - x * x, 0, 1), 1 / 6, 1e-12);
        const [b, h] = [6, 4];
        close(simpson((x) => h * (1 - (4 * x * x) / (b * b)), -b / 2, b / 2), (2 / 3) * b * h, 1e-12);
    });

    it('disc, washer, shell and cross-section methods agree with known solids', () => {
        const r = 2; const hh = 5;
        close(PI * simpson((x) => (r * (1 - x / hh)) ** 2, 0, hh), (PI * r * r * hh) / 3, 1e-9); // cone, discs
        close(PI * simpson((x) => r * r - x * x, -r, r), (4 / 3) * PI * r ** 3, 1e-9); // sphere, discs
        // The region under y = x² on [0, 1] about the y-axis, by shells and by washers.
        const shells = 2 * PI * simpson((x) => x * x * x, 0, 1);
        const washers = PI * simpson((y) => 1 - y, 0, 1); // R = 1, r = √y
        close(shells, washers, 1e-9);
        // Square cross-sections on a disc of radius 1: V = 16/3.
        close(simpson((x) => (2 * sqrt(1 - x * x)) ** 2, -1, 1), 16 / 3, 1e-6);
    });
});

describe('Arc length and surface area', () => {
    it('polar arc length (cardioid 8a), parametric surface (sphere 4πr²)', () => {
        const a = 1.5;
        close(simpson((t) => hypot(a * (1 + cos(t)), -a * sin(t)), 0, 2 * PI), 8 * a, 1e-6);
        const r = 2;
        close(2 * PI * simpson((t) => r * sin(t) * hypot(-r * sin(t), r * cos(t)), 0, PI), 4 * PI * r * r, 1e-9);
    });
});

describe('Centroids and moments of inertia', () => {
    it('centroids of a region and of common shapes, by integrating', () => {
        // Under y = x² on [0, 1]: x̄ = 3/4, ȳ = 3/10.
        const A = simpson((x) => x * x, 0, 1);
        close(simpson((x) => x * x * x, 0, 1) / A, 0.75, 1e-9);
        close(simpson((x) => x ** 4, 0, 1) / (2 * A), 0.3, 1e-9);
        const r = 3; const hh = 6;
        // Triangle with base on y = 0: width at height y is b(1 − y/h).
        close(simpson((y) => y * (1 - y / hh), 0, hh) / simpson((y) => 1 - y / hh, 0, hh), hh / 3, 1e-9);
        close(simpson((y) => y * 2 * sqrt(r * r - y * y), 0, r, 200000) / ((PI * r * r) / 2), (4 * r) / (3 * PI), 1e-5); // semicircle
        close(simpson((t) => r * sin(t) * r, 0, PI) / (PI * r), (2 * r) / PI, 1e-9); // semicircular arc
        close(simpson((y) => y * PI * (r * r - y * y), 0, r) / ((2 / 3) * PI * r ** 3), (3 * r) / 8, 1e-9); // hemisphere
        close(simpson((y) => y * PI * (r * (1 - y / hh)) ** 2, 0, hh) / ((PI * r * r * hh) / 3), hh / 4, 1e-9); // cone
    });

    it('moments of inertia, the parallel-axis theorem, the radius of gyration', () => {
        const [b, h, r] = [4, 6, 2];
        close(simpson((y) => y * y * b, -h / 2, h / 2), (b * h ** 3) / 12, 1e-9);
        close(simpson((y) => y * y * b, 0, h), (b * h ** 3) / 3, 1e-9);
        close(simpson((y) => y * y * b * (1 - y / h), 0, h), (b * h ** 3) / 12, 1e-9); // triangle about its base
        close((b * h ** 3) / 12 - ((b * h) / 2) * (h / 3) ** 2, (b * h ** 3) / 36, 1e-9); // and about its centroid
        close(simpson((y) => y * y * 2 * sqrt(r * r - y * y), -r, r, 200000), (PI * r ** 4) / 4, 1e-5);
        close((b * h ** 3) / 12 + b * h * (h / 2) ** 2, (b * h ** 3) / 3, 1e-12);
        close(sqrt(((b * h ** 3) / 12) / (b * h)), h / sqrt(12), 1e-12);
    });
});

describe('Work and fluid pressure', () => {
    it('spring work, pumping work, fluid force, centre of pressure', () => {
        const k = 300; const [x1, x2] = [0.1, 0.3];
        close(simpson((x) => k * x, x1, x2), 0.5 * k * (x2 * x2 - x1 * x1), 1e-12);
        // A full cylinder (r = 1, depth 4) emptied over its top: slices lifted (4 − y).
        const wg = 9.81; const area = PI;
        close(simpson((y) => wg * area * (4 - y), 0, 4), wg * (area * 4) * 2, 1e-9);
        // A 2 × 3 rectangle, top at the surface: force and centre of pressure.
        const [w, depth] = [2, 3];
        const force = simpson((y) => wg * y * w, 0, depth);
        close(force, wg * (depth / 2) * (w * depth), 1e-9);
        const centre = simpson((y) => y * wg * y * w, 0, depth) / force;
        const Ibar = (w * depth ** 3) / 12;
        close(centre, depth / 2 + Ibar / ((depth / 2) * w * depth), 1e-9);
        close(centre, (2 / 3) * depth, 1e-9);
    });
});

describe('Multiple integrals', () => {
    it('iterated, polar, spherical and the Jacobian', () => {
        // ∫₀¹ ∫₀^x xy dy dx = 1/8.
        close(simpson((x) => simpson((y) => x * y, 0, x, 200), 0, 1, 200), 1 / 8, 1e-9);
        // Area of a disc in polar coordinates: ∫∫ r dr dθ.
        const a = 3;
        close(simpson(() => simpson((r) => r, 0, a, 200), 0, 2 * PI, 200), PI * a * a, 1e-9);
        // Sphere: ∫∫∫ ρ² sin φ.
        close(2 * PI * simpson((phi) => sin(phi) * simpson((rho) => rho * rho, 0, a, 200), 0, PI, 200), (4 / 3) * PI * a ** 3, 1e-6);
        // Jacobian of polar coordinates is r.
        const [r0, t0] = [1.7, 0.6];
        const xr = cos(t0); const xt = -r0 * sin(t0); const yr = sin(t0); const yt = r0 * cos(t0);
        close(xr * yt - xt * yr, r0, 1e-12);
    });
});
