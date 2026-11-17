import { describe, it, expect } from 'vitest';

// Vector Analysis' formula cards, checked with numbers (Library round,
// 2026-11-17): identities on concrete vectors, calculus on concrete fields with
// numerical derivatives, and the integral theorems by computing both sides.

const close = (a, b, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sin, cos, sqrt, PI, exp, hypot, acos } = Math;
const add = (a, b) => a.map((x, i) => x + b[i]);
const sub = (a, b) => a.map((x, i) => x - b[i]);
const sc = (k, a) => a.map((x) => k * x);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => hypot(...a);
const eqV = (a, b, tol = 1e-9) => a.forEach((x, i) => close(x, b[i], tol));
const det3 = (r) => dot(r[0], cross(r[1], r[2]));
const simpson = (f, a, b, n = 400) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i += 1) s += f(a + i * h) * (i % 2 ? 4 : 2); return (s * h) / 3; };
const A = [3, -2, 5]; const B = [1, 4, -2]; const C = [-2, 1, 3];

describe('Vector algebra, dot and cross products', () => {
    it('resultant by the cosine law, a dividing point, the angle', () => {
        const th = acos(dot(A, B) / (norm(A) * norm(B)));
        close(norm(add(A, B)), sqrt(dot(A, A) + dot(B, B) + 2 * norm(A) * norm(B) * cos(th)));
        const [m, n] = [2, 3]; const P = sc(1 / (m + n), add(sc(n, A), sc(m, B)));
        close(norm(sub(P, A)) / norm(sub(B, P)), m / n);
        close(dot(A, A), norm(A) ** 2);
    });

    it('projection, work, cross product, areas, torque', () => {
        const proj = sc(dot(A, B) / dot(B, B), B);
        close(dot(sub(A, proj), B), 0); // the rest is square to B
        close(norm(proj), Math.abs(dot(A, B)) / norm(B));
        const X = cross(A, B);
        close(dot(X, A), 0); close(dot(X, B), 0);
        eqV(cross(B, A), sc(-1, X));
        eqV(cross([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
        const th = acos(dot(A, B) / (norm(A) * norm(B)));
        close(norm(X), norm(A) * norm(B) * sin(th));
        // A triangle's area by Heron, against ½|A × B|.
        const [a, b, c] = [norm(A), norm(B), norm(sub(A, B))]; const s = (a + b + c) / 2;
        close(0.5 * norm(X), sqrt(s * (s - a) * (s - b) * (s - c)));
        const r = [0.5, 0, 0]; const Fz = [0, 10, 0];
        close(norm(cross(r, Fz)), 0.5 * 10);
    });

    it('triple products: volume, coplanarity, BAC − CAB', () => {
        close(det3([A, B, C]), dot(A, cross(B, C)));
        close(det3([A, B, add(sc(2, A), sc(-3, B))]), 0); // coplanar
        eqV(cross(A, cross(B, C)), sub(sc(dot(A, C), B), sc(dot(A, B), C)));
        // Tetrahedron with edges A, B, C: a sixth of the parallelepiped (unit cube corner: 1/6).
        close(Math.abs(det3([[1, 0, 0], [0, 1, 0], [0, 0, 1]])) / 6, 1 / 6);
    });
});

describe('Lines and planes', () => {
    it('plane through three points; point-to-line and skew distances by minimisation', () => {
        const [P, Q, R] = [[1, 0, 2], [3, 1, -1], [0, 2, 1]];
        const n = cross(sub(Q, P), sub(R, P));
        for (const X of [P, Q, R]) close(dot(n, sub(X, P)), 0);
        // Point to line: brute-force the closest point on r0 + t d.
        const r0 = [1, 2, 0]; const d = [2, -1, 2]; const X = [4, 4, 3];
        let best = Infinity;
        for (let t = -5; t <= 5; t += 1e-4) best = Math.min(best, norm(sub(X, add(r0, sc(t, d)))));
        close(norm(cross(sub(X, r0), d)) / norm(d), best, 1e-6);
        // Skew lines: the formula against the analytic closest pair.
        const [p1, d1, p2, d2] = [[0, 0, 0], [1, 0, 0], [0, 1, 3], [0, 1, 0]]; // x-axis and a line at z = 3
        close(Math.abs(dot(sub(p2, p1), cross(d1, d2))) / norm(cross(d1, d2)), 3);
        // Two planes x + y + z = 1 and x − y = 0 meet along direction n₁ × n₂.
        const dir = cross([1, 1, 1], [1, -1, 0]);
        const pt = [0.5, 0.5, 0]; // on both
        for (const t of [-1, 2]) { const pp = add(pt, sc(t, dir)); close(pp[0] + pp[1] + pp[2], 1); close(pp[0] - pp[1], 0); }
    });
});

describe('Derivatives of vector functions', () => {
    const H = 1e-5;
    const helix = (t) => [2 * cos(t), 2 * sin(t), 0.5 * t];
    const d1 = (f, t) => sub(f(t + H), f(t - H)).map((x) => x / (2 * H));
    const d2 = (f, t) => add(sub(f(t + H), sc(2, f(t))), f(t - H)).map((x) => x / (H * H));

    it('curvature of a circle and a helix; tangential and normal acceleration', () => {
        const circle = (t) => [3 * cos(t), 3 * sin(t), 0];
        const k = (f, t) => norm(cross(d1(f, t), d2(f, t))) / norm(d1(f, t)) ** 3;
        close(k(circle, 0.7), 1 / 3, 1e-4);
        close(k(helix, 1.1), 2 / (4 + 0.25), 1e-4); // a/(a² + b²)
        const t = 0.9; const v = d1(helix, t); const a = d2(helix, t);
        const aT = dot(v, a) / norm(v); const aN = norm(cross(v, a)) / norm(v);
        close(aT * aT + aN * aN, dot(a, a), 1e-3);
        close(aT, 0, 1e-4); // constant speed
        close(aN, k(helix, t) * dot(v, v), 1e-3);
    });

    it('product rules for dot and cross', () => {
        const U = (t) => [t, t * t, sin(t)]; const W = (t) => [cos(t), 1, t ** 3];
        const t = 0.6;
        close((dot(U(t + H), W(t + H)) - dot(U(t - H), W(t - H))) / (2 * H), dot(d1(U, t), W(t)) + dot(U(t), d1(W, t)), 1e-6);
        eqV(sub(cross(U(t + H), W(t + H)), cross(U(t - H), W(t - H))).map((x) => x / (2 * H)), add(cross(d1(U, t), W(t)), cross(U(t), d1(W, t))), 1e-6);
    });
});

describe('Gradient, divergence and curl', () => {
    const H = 1e-4;
    const f = (x, y, z) => x * x * y + sin(y * z);
    const grad = (g, p) => [0, 1, 2].map((i) => { const e = [0, 0, 0]; e[i] = H; return (g(...add(p, e)) - g(...sub(p, e))) / (2 * H); });
    const field = ([x, y, z]) => [x * y, y * z * z, exp(x) * z];
    const comp = (i) => (x, y, z) => field([x, y, z])[i];
    const div = (F, p) => [0, 1, 2].reduce((s, i) => s + grad(comp(i), p)[i], 0);
    const curl = (Fc, p) => { const g = [0, 1, 2].map((i) => grad(Fc(i), p)); return [g[2][1] - g[1][2], g[0][2] - g[2][0], g[1][0] - g[0][1]]; };
    const P = [0.7, -0.4, 1.3];

    it('the directional derivative is ∇f·u; the tangent plane is square to ∇F', () => {
        const u = [2 / 3, -1 / 3, 2 / 3]; const h = 1e-5;
        close((f(...add(P, sc(h, u))) - f(...sub(P, sc(h, u)))) / (2 * h), dot(grad(f, P), u), 1e-5);
        // Sphere x² + y² + z² = 9 at (1, 2, 2): normal (2, 4, 4), and a tangent direction is square to it.
        const n = grad((x, y, z) => x * x + y * y + z * z, [1, 2, 2]);
        eqV(n, [2, 4, 4], 1e-6);
        close(dot(n, cross([1, 2, 2], [0, 1, -1])), 0, 1e-6);
    });

    it('divergence and curl identities', () => {
        close(div(field, P), P[1] + P[2] ** 2 + exp(P[0]), 1e-5);
        const fF = (i) => (x, y, z) => f(x, y, z) * field([x, y, z])[i];
        close([0, 1, 2].reduce((s, i) => s + grad(fF(i), P)[i], 0), f(...P) * div(field, P) + dot(field(P), grad(f, P)), 1e-5);
        close([0, 1, 2].reduce((s, i) => s + grad((x, y, z) => [x, y, z][i], P)[i], 0), 3, 1e-6); // ∇·r = 3
        const gradComp = (i) => (x, y, z) => grad(f, [x, y, z])[i];
        eqV(curl(gradComp, P), [0, 0, 0], 1e-3); // curl grad = 0
        const curlComp = (i) => (x, y, z) => curl(comp, [x, y, z])[i];
        close([0, 1, 2].reduce((s, i) => s + grad(curlComp(i), P)[i], 0), 0, 1e-2); // div curl = 0
        eqV(curl(comp, P), [-2 * P[1] * P[2], -exp(P[0]) * P[2], -P[0]], 1e-5);
    });
});

describe('Line and surface integrals', () => {
    it('work along a path; the fundamental theorem; a scalar line integral', () => {
        // F = (y, x, 1) = ∇(xy + z): along r(t) = (t, t², t³), 0 → 1, work = f(end) − f(start) = 2.
        const r = (t) => [t, t * t, t ** 3]; const rp = (t) => [1, 2 * t, 3 * t * t];
        const F = ([x, y]) => [y, x, 1];
        close(simpson((t) => dot(F(r(t)), rp(t)), 0, 1), (1 * 1 + 1) - 0, 1e-9);
        // ∮ ds of a circle of radius 2 is its length.
        close(simpson((t) => norm([-2 * sin(t), 2 * cos(t), 0]), 0, 2 * PI), 4 * PI, 1e-9);
    });

    it('surface area of a hemisphere and flux of r through a sphere', () => {
        const R = 2; const h = 1e-5;
        // r(φ, θ) on the sphere; dS = |r_φ × r_θ| dφ dθ, the cross product taken numerically.
        const s = (ph, th) => [R * sin(ph) * cos(th), R * sin(ph) * sin(th), R * cos(ph)];
        const rph = (ph, th) => sub(s(ph + h, th), s(ph - h, th)).map((x) => x / (2 * h));
        const rth = (ph, th) => sub(s(ph, th + h), s(ph, th - h)).map((x) => x / (2 * h));
        const area = simpson((ph) => simpson((th) => norm(cross(rph(ph, th), rth(ph, th))), 0, 2 * PI, 40), 0, PI / 2);
        close(area, 2 * PI * R * R, 1e-6);
        // Flux of F = r out of the whole sphere, against ∭ ∇·r dV = 3 · (4/3)πR³.
        const flux = simpson((ph) => simpson((th) => dot(s(ph, th), cross(rph(ph, th), rth(ph, th))), 0, 2 * PI, 40), 0, PI);
        close(flux, 3 * (4 / 3) * PI * R ** 3, 1e-6);
    });
});

describe('The integral theorems', () => {
    it("Green: circulation of (−y, x²) round the unit square both ways; area from the boundary", () => {
        // ∮ P dx + Q dy over the square [0,1]², counterclockwise, P = −y, Q = x².
        const Pf = (x, y) => -y; const Qf = (x) => x * x;
        const line = simpson((t) => Pf(t, 0), 0, 1) + simpson((t) => Qf(1), 0, 1) - simpson((t) => Pf(t, 1), 0, 1) - simpson(() => Qf(0), 0, 1);
        const double = simpson((x) => simpson(() => 2 * x - -1, 0, 1, 20), 0, 1, 20); // Q_x − P_y = 2x + 1
        close(line, double, 1e-9);
        const [a, b] = [3, 2]; // ellipse area from ½∮(x dy − y dx)
        close(0.5 * simpson((t) => a * cos(t) * b * cos(t) + b * sin(t) * a * sin(t), 0, 2 * PI), PI * a * b, 1e-9);
    });

    it('Gauss: flux of (x, y², z) out of the unit cube equals the integral of its divergence', () => {
        const F = ([x, y, z]) => [x, y * y, z];
        // ∬ F·n over each face: axis i fixed at 0 (n = −eᵢ) or 1 (n = +eᵢ), the other two from 0 to 1.
        let flux = 0;
        for (let i = 0; i < 3; i += 1) for (const side of [0, 1]) {
            const [j, k] = [0, 1, 2].filter((m) => m !== i);
            flux += (side ? 1 : -1) * simpson((u) => simpson((w) => { const p = [0, 0, 0]; p[i] = side; p[j] = u; p[k] = w; return F(p)[i]; }, 0, 1, 20), 0, 1, 20);
        }
        const vol = simpson((x) => simpson((y) => simpson(() => 1 + 2 * y + 1, 0, 1, 20), 0, 1, 20), 0, 1, 20); // ∇·F = 2 + 2y
        close(flux, vol, 1e-12);
    });

    it("Stokes: circulation of (−y, x, 0) round the unit circle equals the curl's flux (2, over area π)", () => {
        const circ = simpson((t) => dot([-sin(t), cos(t), 0], [-sin(t), cos(t), 0]), 0, 2 * PI);
        close(circ, 2 * PI, 1e-9); // curl = (0, 0, 2), flux through the disc = 2π
        // Any surface with the same edge: the upper unit hemisphere, curl·n = 2z, ∬ 2z dS = 2π.
        const hemi = simpson((ph) => simpson(() => 2 * cos(ph) * sin(ph), 0, 2 * PI, 20), 0, PI / 2);
        close(hemi, 2 * PI, 1e-6);
    });
});
