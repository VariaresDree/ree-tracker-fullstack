import { describe, it, expect } from 'vitest';

// Numerical Methods & Analysis formula cards, checked with numbers (Library
// round, 2026-11-17): every method runs on a problem with a known answer, and
// each error formula is checked against the error the method actually makes.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sin, cos, exp, log, sqrt, abs, PI } = Math;

// ── Linear algebra helpers ─────────────────────────────────────────────────
const matVec = (A, x) => A.map((row) => row.reduce((s, a, j) => s + a * x[j], 0));
function gauss(A0, b0, { pivot = true } = {}) {
    const A = A0.map((r) => [...r]); const b = [...b0]; const n = b.length; let swaps = 0;
    for (let k = 0; k < n; k += 1) {
        if (pivot) {
            let p = k;
            for (let i = k + 1; i < n; i += 1) if (abs(A[i][k]) > abs(A[p][k])) p = i;
            if (p !== k) { [A[p], A[k]] = [A[k], A[p]]; [b[p], b[k]] = [b[k], b[p]]; swaps += 1; }
        }
        for (let i = k + 1; i < n; i += 1) {
            const m = A[i][k] / A[k][k];
            for (let j = k; j < n; j += 1) A[i][j] -= m * A[k][j];
            b[i] -= m * b[k];
        }
    }
    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i -= 1) {
        let s = b[i];
        for (let j = i + 1; j < n; j += 1) s -= A[i][j] * x[j];
        x[i] = s / A[i][i];
    }
    return { x, U: A, swaps };
}
function doolittle(A) {
    const n = A.length; const L = A.map(() => Array(n).fill(0)); const U = A.map(() => Array(n).fill(0));
    for (let i = 0; i < n; i += 1) {
        for (let k = i; k < n; k += 1) { let s = 0; for (let j = 0; j < i; j += 1) s += L[i][j] * U[j][k]; U[i][k] = A[i][k] - s; }
        L[i][i] = 1;
        for (let k = i + 1; k < n; k += 1) { let s = 0; for (let j = 0; j < i; j += 1) s += L[k][j] * U[j][i]; L[k][i] = (A[k][i] - s) / U[i][i]; }
    }
    return { L, U };
}
const det3 = (M) => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);

// A diagonally dominant system with the answer (1, 2, 3).
const A = [[10, -1, 2], [-1, 11, -1], [2, -1, 10]];
const X = [1, 2, 3];
const Bv = matVec(A, X);

// ── Integration helpers ────────────────────────────────────────────────────
const trap = (f, a, b, n) => { const h = (b - a) / n; let s = (f(a) + f(b)) / 2; for (let i = 1; i < n; i += 1) s += f(a + i * h); return s * h; };
const simp13 = (f, a, b, n) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i += 1) s += f(a + i * h) * (i % 2 ? 4 : 2); return (s * h) / 3; };
const simp38 = (f, a, b, n) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i += 1) s += f(a + i * h) * (i % 3 ? 3 : 2); return (3 * h * s) / 8; };
const midpoint = (f, a, b, n) => { const h = (b - a) / n; let s = 0; for (let i = 0; i < n; i += 1) s += f(a + (i + 0.5) * h); return s * h; };

describe('Errors and approximation', () => {
    it('true and approximate relative error, and the n-significant-figure tolerance', () => {
        const truth = PI; const approx = 22 / 7;
        close((abs(truth - approx) / truth) * 100, 0.04025, 1e-3);
        // e by its Maclaurin series: stop when εa < εs for 3 figures; the answer is then right to 3 figures.
        const es = 0.5 * 10 ** (2 - 3);
        close(es, 0.05);
        let sum = 1; let term = 1; let k = 0; let ea = 100;
        while (ea >= es) { k += 1; term /= k; const old = sum; sum += term; ea = abs((sum - old) / sum) * 100; }
        expect(abs(sum - Math.E) / Math.E * 100).toBeLessThan(es);
    });

    it('machine epsilon of IEEE double is 2^(1-53) with chopping, half that with rounding', () => {
        close(2 ** (1 - 53), Number.EPSILON, 0);
        expect(1 + Number.EPSILON / 2).toBe(1); // rounding: a relative change of ε/2 or less is lost
        expect(1 + Number.EPSILON).toBeGreaterThan(1);
    });

    it('propagation of error and the condition number', () => {
        // f = x^3 at 2.5 ± 0.01: first-order bound against the real spread.
        const f = (x) => x ** 3; const x = 2.5; const dx = 0.01;
        const bound = 3 * x ** 2 * dx;
        close(Math.max(abs(f(x + dx) - f(x)), abs(f(x - dx) - f(x))), bound, 0.01);
        // Product: the relative errors add.
        const [u, du, w, dw] = [4, 0.02, 7, 0.03];
        close(abs(w) * du + abs(u) * dw, u * w * (du / u + dw / w));
        // √x has CN ½ everywhere; a relative input change of δ gives about δ/2 out.
        const CN = (g, dg, t) => abs((t * dg(t)) / g(t));
        close(CN(sqrt, (t) => 1 / (2 * sqrt(t)), 7.3), 0.5);
        const t = 3; const delta = 1e-6;
        close(((sqrt(t * (1 + delta)) - sqrt(t)) / sqrt(t)) / delta, 0.5, 1e-5);
        // tan near π/2 is ill-conditioned.
        expect(CN(Math.tan, (s) => 1 / cos(s) ** 2, 1.57)).toBeGreaterThan(1000);
    });
});

describe('Bracketing methods', () => {
    const f = (x) => x ** 3 - x - 2; // root 1.5213797068045676
    const root = 1.5213797068045676;

    it('bisection (live card) meets the error bound (b - a)/2^n and the step count', () => {
        let [a, b] = [1, 2];
        const eps = 1e-3; const n = Math.ceil(log((b - a) / eps) / log(2));
        expect(n).toBe(10);
        for (let i = 0; i < n; i += 1) { const c = (a + b) / 2; if (f(a) * f(c) <= 0) b = c; else a = c; }
        expect(abs((a + b) / 2 - root)).toBeLessThanOrEqual(1 / 2 ** (n + 1));
        expect(b - a).toBeCloseTo(1 / 2 ** n, 12);
    });

    it('false position converges to the root, and c is where the chord crosses', () => {
        let [a, b] = [1, 2];
        const chord = (p, q) => (p * f(q) - q * f(p)) / (f(q) - f(p));
        const c0 = chord(a, b);
        // On the line through (a, f(a)) and (b, f(b)), c is the zero.
        close(f(a) + ((f(b) - f(a)) / (b - a)) * (c0 - a), 0, 1e-12);
        for (let i = 0; i < 60; i += 1) { const c = chord(a, b); if (f(a) * f(c) <= 0) b = c; else a = c; }
        close(chord(a, b), root, 1e-10);
    });
});

describe('Open methods', () => {
    it('Newton-Raphson and secant (live cards) find a root; Newton for √N', () => {
        const f = (x) => x ** 3 - x - 2; const df = (x) => 3 * x ** 2 - 1;
        let x = 1.5; for (let i = 0; i < 8; i += 1) x -= f(x) / df(x);
        close(x, 1.5213797068045676, 1e-14);
        let [x0, x1] = [1, 2];
        for (let i = 0; i < 12 && x1 !== x0; i += 1) { const x2 = x1 - f(x1) * ((x1 - x0) / (f(x1) - f(x0))); [x0, x1] = [x1, x2]; }
        close(x1, 1.5213797068045676, 1e-12);
        let s = 10; for (let i = 0; i < 10; i += 1) s = 0.5 * (s + 2 / s);
        close(s, Math.SQRT2, 1e-15);
    });

    it('Newton is quadratic with constant f″/2f′; secant has order about 1.618', () => {
        const f = (x) => x * x - 2; const df = (x) => 2 * x; const r = Math.SQRT2;
        let x = 1.5; const E = [];
        for (let i = 0; i < 3; i += 1) { E.push(x - r); x -= f(x) / df(x); }
        E.push(x - r);
        // E_{n+1} / E_n^2 → f''(r) / (2 f'(r)) = 2 / (4√2)
        close(E[3] / E[2] ** 2, 2 / (2 * 2 * r), 1e-3);
        // Secant: log-ratio of successive errors tends to the golden ratio.
        const g = (t) => exp(t) - 3; const rg = log(3);
        let [a, b] = [0, 2]; const e = [abs(a - rg), abs(b - rg)];
        for (let i = 0; i < 6; i += 1) { const c = b - g(b) * ((b - a) / (g(b) - g(a))); [a, b] = [b, c]; e.push(abs(b - rg)); }
        const k = e.length - 2;
        const p = log(e[k + 1] / e[k]) / log(e[k] / e[k - 1]);
        expect(p).toBeGreaterThan(1.5); expect(p).toBeLessThan(1.75);
    });

    it('fixed-point iteration settles at x = cos x, with error ratio |g′(r)|', () => {
        let x = 1; const xs = [];
        for (let i = 0; i < 200; i += 1) { x = cos(x); xs.push(x); }
        close(x, 0.7390851332151607, 1e-12);
        const r = 0.7390851332151607;
        close(abs((xs[30] - r) / (xs[29] - r)), abs(-sin(r)), 1e-3);
        // |g'| > 1 diverges: x = 2x − 1 has the fixed point 1 but runs away from it.
        let y = 1.001; for (let i = 0; i < 20; i += 1) y = 2 * y - 1;
        expect(abs(y - 1)).toBeGreaterThan(1);
    });

    it('Newton for two equations: x² + y² = 4, xy = 1', () => {
        let [x, y] = [2, 0.5];
        for (let i = 0; i < 10; i += 1) {
            const F = [x * x + y * y - 4, x * y - 1];
            const J = [[2 * x, 2 * y], [y, x]];
            const { x: d } = gauss(J, [-F[0], -F[1]]);
            x += d[0]; y += d[1];
        }
        close(x * x + y * y, 4, 1e-14); close(x * y, 1, 1e-14);
        close(x, sqrt(2 + sqrt(3)), 1e-12);
    });
});

describe('Gaussian elimination and LU', () => {
    it('elimination with back substitution solves the system', () => {
        gauss(A, Bv).x.forEach((v, i) => close(v, X[i]));
    });

    it('partial pivoting rescues a tiny pivot', () => {
        const T = [[1e-20, 1], [1, 1]]; const b = [1, 2]; // answer ≈ (1, 1)
        const without = gauss(T, b, { pivot: false }).x;
        const withP = gauss(T, b).x;
        expect(abs(without[0] - 1)).toBeGreaterThan(0.5);
        close(withP[0], 1, 1e-12); close(withP[1], 1, 1e-12);
    });

    it('Doolittle LU: L unit lower, U upper, LU = A, two triangular solves, det = Π u_ii', () => {
        const { L, U } = doolittle(A);
        for (let i = 0; i < 3; i += 1) {
            close(L[i][i], 1);
            for (let j = 0; j < 3; j += 1) {
                if (j > i) close(L[i][j], 0);
                if (j < i) close(U[i][j], 0);
                close(L[i].reduce((s, l, k) => s + l * U[k][j], 0), A[i][j]);
            }
        }
        const y = []; for (let i = 0; i < 3; i += 1) y[i] = Bv[i] - L[i].slice(0, i).reduce((s, l, k) => s + l * y[k], 0);
        const x = []; for (let i = 2; i >= 0; i -= 1) x[i] = (y[i] - U[i].slice(i + 1).reduce((s, u, k) => s + u * x[i + 1 + k], 0)) / U[i][i];
        x.forEach((v, i) => close(v, X[i]));
        close(U[0][0] * U[1][1] * U[2][2], det3(A));
        // With swaps: the sign flips per swap.
        const M = [[0, 2, 1], [1, 1, 1], [3, 0, 2]];
        const { U: Um, swaps } = gauss(M, [0, 0, 0]);
        close((-1) ** swaps * Um[0][0] * Um[1][1] * Um[2][2], det3(M));
    });

    it('the elimination work is about 2n³/3 flops', () => {
        const count = (n) => { let flops = 0; for (let k = 0; k < n; k += 1) for (let i = k + 1; i < n; i += 1) { flops += 1; flops += 2 * (n - k); } return flops; };
        const n = 300;
        close(count(n) / ((2 * n ** 3) / 3), 1, 0.01);
    });
});

describe('Jacobi, Gauss-Seidel and SOR', () => {
    const iterate = (step, tol = 1e-12) => { let x = [0, 0, 0]; let k = 0; for (; k < 200; k += 1) { const nx = step(x); const done = nx.every((v, i) => abs(v - x[i]) < tol); x = nx; if (done) break; } return { x, k }; };
    const jacobi = (x) => x.map((_, i) => (Bv[i] - A[i].reduce((s, a, j) => (j === i ? s : s + a * x[j]), 0)) / A[i][i]);
    const seidel = (omega) => (x0) => { const x = [...x0]; for (let i = 0; i < 3; i += 1) { const gs = (Bv[i] - A[i].reduce((s, a, j) => (j === i ? s : s + a * x[j]), 0)) / A[i][i]; x[i] = omega * gs + (1 - omega) * x[i]; } return x; };

    it('the system is diagonally dominant, and all three converge to (1, 2, 3)', () => {
        A.forEach((row, i) => expect(abs(row[i])).toBeGreaterThan(row.reduce((s, a, j) => (j === i ? s : s + abs(a)), 0)));
        const J = iterate(jacobi); const G = iterate(seidel(1)); const S = iterate(seidel(1.1));
        [J, G, S].forEach(({ x }) => x.forEach((v, i) => close(v, X[i], 1e-10)));
        expect(G.k).toBeLessThan(J.k); // Gauss-Seidel uses new values at once
    });

    it('Gauss-Seidel uses the new value straight away (one sweep by hand)', () => {
        const x = seidel(1)([0, 0, 0]);
        close(x[0], Bv[0] / 10);
        close(x[1], (Bv[1] + x[0]) / 11);
        close(x[2], (Bv[2] - 2 * x[0] + x[1]) / 10);
    });
});

describe("Newton's and Lagrange's interpolation", () => {
    const xs = [1, 2, 4, 5]; const p3 = (x) => 2 * x ** 3 - 3 * x + 1; const ys = xs.map(p3);
    const lagrange = (px, py, x) => py.reduce((s, y, i) => s + y * px.reduce((m, xj, j) => (j === i ? m : (m * (x - xj)) / (px[i] - xj)), 1), 0);
    function dividedTop(px, py) {
        const col = [...py]; const top = [col[0]];
        for (let level = 1; level < px.length; level += 1) {
            for (let i = 0; i < px.length - level; i += 1) col[i] = (col[i + 1] - col[i]) / (px[i + level] - px[i]);
            top.push(col[0]);
        }
        return top;
    }
    const newtonP = (px, top, x) => top.reduce((s, c, k) => s + c * px.slice(0, k).reduce((m, xi) => m * (x - xi), 1), 0);

    it('linear interpolation reads the chord', () => {
        close(10 + ((20 - 10) / (3 - 1)) * (2.4 - 1), 17);
    });

    it('divided differences: the first is a slope, the top of a cubic is its leading coefficient', () => {
        const top = dividedTop(xs, ys);
        close(top[1], (ys[1] - ys[0]) / (xs[1] - xs[0]));
        close(top[3], 2);
        [0.5, 3, 4.7].forEach((x) => close(newtonP(xs, top, x), p3(x)));
    });

    it('Lagrange gives the same polynomial; basis is 1 at its node, 0 elsewhere, sums to 1', () => {
        [0.5, 3, 4.7].forEach((x) => close(lagrange(xs, ys, x), p3(x)));
        const L = (i, x) => xs.reduce((m, xj, j) => (j === i ? m : (m * (x - xj)) / (xs[i] - xj)), 1);
        xs.forEach((xj, j) => xs.forEach((_, i) => close(L(i, xj), i === j ? 1 : 0)));
        close([0, 1, 2, 3].reduce((s, i) => s + L(i, 3.3), 0), 1);
    });

    it('forward and backward difference formulas on equal steps', () => {
        const h = 0.5; const x0 = 1; const px = [0, 1, 2, 3].map((i) => x0 + i * h); const py = px.map(p3);
        const diffs = (arr) => arr.slice(1).map((v, i) => v - arr[i]);
        const d1 = diffs(py); const d2 = diffs(d1); const d3 = diffs(d2);
        const x = 1.3; const s = (x - x0) / h;
        close(py[0] + s * d1[0] + ((s * (s - 1)) / 2) * d2[0] + ((s * (s - 1) * (s - 2)) / 6) * d3[0], p3(x));
        const xn = px[3]; const t = (2.2 - xn) / h;
        close(py[3] + t * d1[2] + ((t * (t + 1)) / 2) * d2[1] + ((t * (t + 1) * (t + 2)) / 6) * d3[0], p3(2.2));
    });

    it('the interpolation error bound holds for sin on three points', () => {
        const px = [0, 0.5, 1]; const py = px.map(sin);
        for (let x = 0; x <= 1; x += 0.05) {
            const err = abs(sin(x) - lagrange(px, py, x));
            const bound = (1 / 6) * abs(px.reduce((m, xi) => m * (x - xi), 1)); // |f'''| ≤ 1
            expect(err).toBeLessThanOrEqual(bound + 1e-15);
        }
    });

    it('inverse interpolation estimates a root from a table', () => {
        const f = (x) => exp(x) - 2; const px = [0.6, 0.7, 0.8]; const py = px.map(f);
        close(lagrange(py, px, 0), log(2), 1e-4);
    });
});

describe('Least squares', () => {
    const xs = [1, 2, 3, 4, 5, 6]; const ys = [2.1, 3.9, 6.2, 7.8, 10.1, 12.2];
    const n = xs.length;
    const S = (f) => xs.reduce((s, x, i) => s + f(x, ys[i]), 0);
    const b = (n * S((x, y) => x * y) - S((x) => x) * S((x, y) => y)) / (n * S((x) => x * x) - S((x) => x) ** 2);
    const a = S((x, y) => y) / n - (b * S((x) => x)) / n;

    it('the line minimises the squared misses, and solves the normal equations', () => {
        const Sr = (aa, bb) => xs.reduce((s, x, i) => s + (ys[i] - aa - bb * x) ** 2, 0);
        [[0.01, 0], [-0.01, 0], [0, 0.01], [0, -0.01]].forEach(([da, db]) => expect(Sr(a + da, b + db)).toBeGreaterThan(Sr(a, b)));
        close(S((x, y) => y), n * a + b * S((x) => x));
        close(S((x, y) => x * y), a * S((x) => x) + b * S((x) => x * x));
    });

    it('r² = 1 − Sr/St equals the squared correlation; the standard error uses n − 2', () => {
        const ybar = S((x, y) => y) / n; const xbar = S((x) => x) / n;
        const Sr = xs.reduce((s, x, i) => s + (ys[i] - a - b * x) ** 2, 0);
        const St = ys.reduce((s, y) => s + (y - ybar) ** 2, 0);
        const sxy = S((x, y) => (x - xbar) * (y - ybar)); const sxx = S((x) => (x - xbar) ** 2);
        close(1 - Sr / St, sxy ** 2 / (sxx * St));
        const se = sqrt(Sr / (n - 2));
        expect(se).toBeGreaterThan(0); expect(se).toBeLessThan(0.3);
    });

    it('a parabola by the normal equations AᵀA c = Aᵀy recovers exact data', () => {
        const px = [-1, 0, 1, 2, 3]; const py = px.map((x) => 1 - 2 * x + 0.5 * x * x);
        const M = px.map((x) => [1, x, x * x]);
        const AtA = [0, 1, 2].map((i) => [0, 1, 2].map((j) => M.reduce((s, r) => s + r[i] * r[j], 0)));
        const Aty = [0, 1, 2].map((i) => M.reduce((s, r, k) => s + r[i] * py[k], 0));
        const c = gauss(AtA, Aty).x;
        [1, -2, 0.5].forEach((v, i) => close(c[i], v, 1e-10));
    });

    it('exponential and power fits through logarithms recover a and b', () => {
        const fitLine = (X, Y) => { const m = X.length; const sx = X.reduce((s, v) => s + v, 0); const sy = Y.reduce((s, v) => s + v, 0); const sxy = X.reduce((s, v, i) => s + v * Y[i], 0); const sxx = X.reduce((s, v) => s + v * v, 0); const bb = (m * sxy - sx * sy) / (m * sxx - sx * sx); return [sy / m - (bb * sx) / m, bb]; };
        const X = [1, 2, 3, 4];
        const [la, be] = fitLine(X, X.map((x) => log(3 * exp(0.4 * x))));
        close(exp(la), 3); close(be, 0.4);
        const [lpa, pb] = fitLine(X.map(Math.log10), X.map((x) => Math.log10(5 * x ** 1.5)));
        close(10 ** lpa, 5); close(pb, 1.5);
    });
});

describe('Numerical differentiation', () => {
    const f = exp; const x = 0.7; const d1 = exp(x);

    it('one-sided differences are O(h) with error about (h/2) f″', () => {
        const h = 1e-3;
        close((f(x + h) - f(x)) / h - d1, (h / 2) * exp(x), 2e-3);
        close((f(x) - f(x - h)) / h - d1, -(h / 2) * exp(x), 2e-3);
    });

    it('central differences are O(h²): halving h quarters the error', () => {
        const D = (h) => (f(x + h) - f(x - h)) / (2 * h);
        close((D(0.1) - d1) / (D(0.05) - d1), 4, 1e-2);
        const D2 = (h) => (f(x + h) - 2 * f(x) + f(x - h)) / h ** 2;
        close((D2(0.1) - d1) / (D2(0.05) - d1), 4, 1e-2);
    });

    it('Richardson extrapolation beats both of its inputs by far', () => {
        const D = (h) => (f(x + h) - f(x - h)) / (2 * h);
        const R = (4 * D(0.05) - D(0.1)) / 3;
        expect(abs(R - d1)).toBeLessThan(abs(D(0.05) - d1) / 100);
    });
});

describe('Integration rules', () => {
    const exact = 1 - cos(1); // ∫0^1 sin x dx

    it('trapezoidal and Simpson (live cards) converge; 3/8 rule and Simpson are exact for cubics', () => {
        close(trap(sin, 0, 1, 1000), exact, 1e-7);
        close(simp13(sin, 0, 1, 20), exact, 1e-7);
        const cubic = (x) => 4 * x ** 3 - x + 2; const I = 1 - 0.5 + 2;
        close(simp13(cubic, 0, 1, 2), I, 1e-14);
        close(simp38(cubic, 0, 1, 3), I, 1e-14);
        close(simp38(sin, 0, 1, 30), exact, 1e-7);
    });

    it('the error formulas are exact when f″ or f⁗ is constant', () => {
        // x²: f'' = 2 → E_T = −(b − a)h²/12 · 2
        const n = 4; const h = 1 / n;
        close((1 / 3) - trap((x) => x * x, 0, 1, n), -(1 * h * h / 12) * 2, 1e-12);
        // x⁴: f'''' = 24 → E_S = −(b − a)h⁴/180 · 24
        close(0.2 - simp13((x) => x ** 4, 0, 1, n), -(1 * h ** 4 / 180) * 24, 1e-12);
    });

    it('midpoint error is about −½ of the trapezoidal error', () => {
        const n = 50;
        close((exact - midpoint(sin, 0, 1, n)) / (exact - trap(sin, 0, 1, n)), -0.5, 1e-3);
    });

    it("Romberg's first level is Simpson's rule, and the next is better still", () => {
        const I1 = (4 * trap(exp, 0, 1, 8) - trap(exp, 0, 1, 4)) / 3;
        close(I1, simp13(exp, 0, 1, 8), 1e-13);
        const I2 = (16 * ((4 * trap(exp, 0, 1, 16) - trap(exp, 0, 1, 8)) / 3) - I1) / 15;
        expect(abs(I2 - (Math.E - 1))).toBeLessThan(abs(I1 - (Math.E - 1)) / 50);
    });

    it('two-point Gauss-Legendre is exact for cubics, on any interval', () => {
        const g = (f, a, b) => { const m = (b + a) / 2; const r = (b - a) / 2; const t = 1 / sqrt(3); return r * (f(m - r * t) + f(m + r * t)); };
        const cubic = (x) => x ** 3 - 2 * x * x + 5;
        const F = (x) => x ** 4 / 4 - (2 * x ** 3) / 3 + 5 * x;
        close(g(cubic, 1, 4), F(4) - F(1), 1e-12);
        expect(abs(g((x) => x ** 4, -1, 1) - 0.4)).toBeGreaterThan(0.1); // not exact past degree 3
    });
});

describe('ODE steppers', () => {
    // y' = y − x² + 1, y(0) = 0.5: y = (x + 1)² − 0.5eˣ
    const f = (x, y) => y - x * x + 1; const yTrue = (x) => (x + 1) ** 2 - 0.5 * exp(x);
    const run = (step, h) => { let x = 0; let y = 0.5; const n = Math.round(2 / h); for (let i = 0; i < n; i += 1) { y = step(x, y, h); x += h; } return y; };
    const euler = (x, y, h) => y + h * f(x, y);
    const heun = (x, y, h) => y + (h / 2) * (f(x, y) + f(x + h, y + h * f(x, y)));
    const mid = (x, y, h) => y + h * f(x + h / 2, y + (h / 2) * f(x, y));
    const rk4 = (x, y, h) => { const k1 = f(x, y); const k2 = f(x + h / 2, y + (h / 2) * k1); const k3 = f(x + h / 2, y + (h / 2) * k2); const k4 = f(x + h, y + h * k3); return y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4); };
    const ratio = (step, h) => (run(step, h) - yTrue(2)) / (run(step, h / 2) - yTrue(2));

    it('all four reach y(2); RK4 with h = 0.2 is within 1e-4', () => {
        close(run(rk4, 0.2), yTrue(2), 1e-4);
        close(run(heun, 0.01), yTrue(2), 1e-4);
        close(run(mid, 0.01), yTrue(2), 1e-4);
        close(run(euler, 0.0005), yTrue(2), 1e-3);
    });

    it('halving h cuts the error by about 2, 4 and 16', () => {
        close(ratio(euler, 0.01), 2, 0.02);
        close(ratio(heun, 0.01), 4, 0.02);
        close(ratio(mid, 0.01), 4, 0.02);
        close(ratio(rk4, 0.1), 16, 0.05);
    });
});

describe('Optimization', () => {
    const f = (x) => (x - 2) ** 2 + 1 + 0.1 * (x - 2) ** 4; // minimum at x = 2

    it('golden-section search keeps 61.8% each step and finds the minimum', () => {
        const R = (sqrt(5) - 1) / 2;
        close(R * R, 1 - R); // why one point is reused
        let [a, b] = [0, 5];
        let x1 = a + R * (b - a); let x2 = b - R * (b - a);
        for (let i = 0; i < 60; i += 1) {
            if (f(x2) < f(x1)) { b = x1; x1 = x2; x2 = b - R * (b - a); } else { a = x2; x2 = x1; x1 = a + R * (b - a); }
        }
        close((a + b) / 2, 2, 1e-8);
    });

    it("Newton's method for an optimum and parabolic interpolation", () => {
        const df = (x) => 2 * (x - 2) + 0.4 * (x - 2) ** 3; const d2f = (x) => 2 + 1.2 * (x - 2) ** 2;
        let x = 3.5; for (let i = 0; i < 30; i += 1) x -= df(x) / d2f(x);
        close(x, 2, 1e-12);
        const q = (t) => 3 * t * t - 12 * t + 7; // vertex at 2
        const [x0, xa, xb] = [0, 1, 4]; const [f0, fa, fb] = [q(x0), q(xa), q(xb)];
        const x3 = (f0 * (xa ** 2 - xb ** 2) + fa * (xb ** 2 - x0 ** 2) + fb * (x0 ** 2 - xa ** 2)) / (2 * (f0 * (xa - xb) + fa * (xb - x0) + fb * (x0 - xa)));
        close(x3, 2, 1e-12);
    });

    it('steepest descent finds the minimum of a bowl', () => {
        const grad = ([x, y]) => [2 * (x - 1), 8 * (y + 2)]; // f = (x − 1)² + 4(y + 2)²
        let p = [5, 5];
        for (let i = 0; i < 500; i += 1) { const g = grad(p); p = [p[0] - 0.1 * g[0], p[1] - 0.1 * g[1]]; }
        close(p[0], 1, 1e-9); close(p[1], -2, 1e-9);
    });

    it('Lagrange multipliers: max of xy on x + y = 10 is at (5, 5), gradients parallel', () => {
        // ∇(xy) = (y, x), ∇g = (1, 1) → y = λ, x = λ, x + y = 10 → (5, 5)
        const [x, y] = [5, 5];
        close(y / 1, x / 1);
        let best = -Infinity; for (let t = 0; t <= 10; t += 0.001) best = Math.max(best, t * (10 - t));
        close(best, x * y, 1e-6);
    });

    it('corner-point rule: the LP optimum is at a vertex', () => {
        // max z = 3x + 5y, x ≤ 4, 2y ≤ 12, 3x + 2y ≤ 18, x, y ≥ 0 → (2, 6), z = 36
        const ok = (x, y) => x >= 0 && y >= 0 && x <= 4 && 2 * y <= 12 && 3 * x + 2 * y <= 18 + 1e-12;
        const corners = [[0, 0], [4, 0], [4, 3], [2, 6], [0, 6]];
        corners.forEach(([x, y]) => expect(ok(x, y)).toBe(true));
        const zc = Math.max(...corners.map(([x, y]) => 3 * x + 5 * y));
        let zg = -Infinity;
        for (let x = 0; x <= 4; x += 0.05) for (let y = 0; y <= 6; y += 0.05) if (ok(x, y)) zg = Math.max(zg, 3 * x + 5 * y);
        expect(zc).toBe(36);
        expect(zg).toBeLessThanOrEqual(zc + 1e-9);
    });
});
