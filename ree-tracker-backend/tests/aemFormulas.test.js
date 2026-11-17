import { describe, it, expect } from 'vitest';

// Advanced Engineering Mathematics' formula cards, checked with numbers
// (Library round, 2026-11-17): matrix rules on concrete matrices, transforms
// and series coefficients by numerical integration, contour integrals around
// real circles, and PDE solutions put back into their equations.

const close = (a, b, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sin, cos, exp, sqrt, PI, log, abs } = Math;
const simpson = (f, a, b, n = 20000) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i += 1) s += f(a + i * h) * (i % 2 ? 4 : 2); return (s * h) / 3; };
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));

// ---- matrices ----
const mm = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
const tr = (A) => A[0].map((_, j) => A.map((row) => row[j]));
const det = (A) => (A.length === 1 ? A[0][0] : A[0].reduce((s, a, j) => s + (j % 2 ? -1 : 1) * a * det(A.slice(1).map((row) => row.filter((_, k) => k !== j))), 0));
const minor = (A, i, j) => A.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j));
const adj = (A) => tr(A.map((row, i) => row.map((_, j) => ((i + j) % 2 ? -1 : 1) * det(minor(A, i, j)))));
const inv = (A) => adj(A).map((row) => row.map((x) => x / det(A)));
const eqM = (A, B, tol = 1e-9) => A.forEach((row, i) => row.forEach((x, j) => close(x, B[i][j], tol)));
const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const A = [[2, -1, 3], [0, 4, 1], [5, 2, -2]];
const B = [[1, 2, 0], [-3, 1, 4], [2, 0, 1]];

describe('Matrices and determinants', () => {
    it('products, transposes and inverses of products', () => {
        expect(mm(A, B)).not.toEqual(mm(B, A));
        eqM(tr(mm(A, B)), mm(tr(B), tr(A)));
        eqM(inv(mm(A, B)), mm(inv(B), inv(A)));
        eqM(mm(A, inv(A)), I3);
    });

    it('determinant properties and cofactor expansion along a column', () => {
        close(det(mm(A, B)), det(A) * det(B));
        close(det(tr(A)), det(A));
        close(det(A.map((row) => row.map((x) => 3 * x))), 27 * det(A));
        close(det(inv(A)), 1 / det(A));
        close(det([A[1], A[0], A[2]]), -det(A)); // a row swap
        const col1 = [0, 1, 2].reduce((s, i) => s + A[i][1] * ((i + 1) % 2 ? -1 : 1) * det(minor(A, i, 1)), 0);
        close(col1, det(A));
    });

    it('trace, and a singular system', () => {
        expect(A[0][0] + A[1][1] + A[2][2]).toBe(4);
        // det = 0 (rank 2), so AX = 0 has a nontrivial solution: X = (1, 1, −1).
        const S = [[1, 2, 3], [2, 4, 6], [1, 0, 1]];
        close(det(S), 0);
        expect(mm(S, [[1], [1], [-1]]).flat()).toEqual([0, 0, 0]);
    });

    it('X = A⁻¹B solves AX = B', () => {
        const rhs = [[1], [2], [3]];
        eqM(mm(A, mm(inv(A), rhs)), rhs);
    });
});

describe('Eigenvalues and eigenvectors', () => {
    const M = [[4, 1], [2, 3]]; // λ = 5, 2
    const ev = [[5, [1, 1]], [2, [1, -2]]];

    it('the characteristic equation, the eigenvectors, sum and product', () => {
        for (const [lam, vec] of ev) {
            close(det([[4 - lam, 1], [2, 3 - lam]]), 0);
            eqM(mm(M, vec.map((x) => [x])), vec.map((x) => [lam * x]));
        }
        close(5 + 2, 4 + 3);
        close(5 * 2, det(M));
        // The live 2×2 card's formula.
        const [a, b, c, d] = [4, 1, 2, 3];
        close(((a + d) + sqrt((a - d) ** 2 + 4 * b * c)) / 2, 5);
    });

    it('related matrices, Cayley-Hamilton and diagonalization', () => {
        const M3 = mm(M, mm(M, M));
        for (const [lam, vec] of ev) {
            eqM(mm(M3, vec.map((x) => [x])), vec.map((x) => [lam ** 3 * x]));
            eqM(mm(inv(M), vec.map((x) => [x])), vec.map((x) => [x / lam]));
        }
        const M2 = mm(M, M);
        eqM(M2.map((row, i) => row.map((x, j) => x - 7 * M[i][j] + 10 * (i === j ? 1 : 0))), [[0, 0], [0, 0]]);
        const P = [[1, 1], [1, -2]]; const D = [[5, 0], [0, 2]];
        eqM(mm(P, mm(D, inv(P))), M);
        eqM(mm(P, mm([[125, 0], [0, 8]], inv(P))), M3);
    });
});

describe('Laplace transforms', () => {
    const laplace = (f, s) => simpson((t) => exp(-s * t) * f(t), 0, 60, 60000);
    const s = 2.5;

    it('tⁿeᵃᵗ, damped sinusoids, convolution, periodic functions', () => {
        close(laplace((t) => t ** 3 * exp(0.6 * t), s), fact(3) / (s - 0.6) ** 4, 1e-6);
        close(laplace((t) => exp(-0.5 * t) * sin(2 * t), s), 2 / ((s + 0.5) ** 2 + 4), 1e-7);
        close(laplace((t) => exp(-0.5 * t) * cos(2 * t), s), (s + 0.5) / ((s + 0.5) ** 2 + 4), 1e-7);
        // f = 1, g = sin t: (f*g)(t) = 1 − cos t; F·G = (1/s)(1/(s² + 1)).
        close(laplace((t) => 1 - cos(t), s), (1 / s) * (1 / (s * s + 1)), 1e-7);
        // Square wave, 1 on (0, a), 0 on (a, 2a): F = 1/(s(1 + e^{−as})).
        const a = 0.7;
        const square = (t) => ((t % (2 * a)) < a ? 1 : 0);
        close(laplace(square, s), 1 / (s * (1 + exp(-a * s))), 1e-3);
        close((1 / (1 - exp(-2 * a * s))) * simpson((t) => exp(-s * t), 0, a), 1 / (s * (1 + exp(-a * s))), 1e-9);
    });

    it('inverse: Heaviside expansion and a repeated pole', () => {
        // (s + 3)/((s + 1)(s + 2)): P(a)/Q'(a) at a = −1 is 2, at −2 is −1.
        const f = (t) => 2 * exp(-t) - exp(-2 * t);
        close(laplace(f, s), (s + 3) / ((s + 1) * (s + 2)), 1e-7);
        close(laplace((t) => (t * t * exp(0.4 * t)) / 2, s), 1 / (s - 0.4) ** 3, 1e-7);
    });
});

describe('Fourier series and transforms', () => {
    it('coefficients of a square wave, symmetry, the sawtooth, Parseval', () => {
        const T = 2 * PI; const w = 1; const Amp = 3;
        const sq = (t) => (((t % T) + T) % T < PI ? Amp : -Amp);
        for (const n of [1, 2, 3, 5]) {
            const an = (2 / T) * simpson((t) => sq(t) * cos(n * w * t), 0, T, 40000);
            const bn = (2 / T) * simpson((t) => sq(t) * sin(n * w * t), 0, T, 40000);
            close(an, 0, 1e-3); // odd function
            close(bn, n % 2 ? (4 * Amp) / (PI * n) : 0, 1e-3);
        }
        for (const n of [1, 2, 4]) {
            close((1 / PI) * simpson((x) => x * sin(n * x), -PI, PI), (2 * (-1) ** (n + 1)) / n, 1e-9);
        }
        // Parseval on f = 1 + 2cos t + 3sin 2t: mean square 1 + (4 + 9)/2.
        const f = (t) => 1 + 2 * cos(t) + 3 * sin(2 * t);
        close((1 / T) * simpson((t) => f(t) ** 2, 0, T), 1 + 0.5 * (4 + 9), 1e-9);
    });

    it('the complex coefficients are (aₙ − jbₙ)/2', () => {
        const T = 2 * PI;
        const f = (t) => 2 * cos(3 * t) + 4 * sin(3 * t);
        const re = (1 / T) * simpson((t) => f(t) * cos(3 * t), 0, T);
        const im = -(1 / T) * simpson((t) => f(t) * sin(3 * t), 0, T);
        close(re, 2 / 2); close(im, -4 / 2);
    });

    it('a pulse, a decaying exponential, a time shift', () => {
        const [Amp, tau] = [2, 1.5];
        for (const w of [0.7, 2, 5]) {
            const re = simpson((t) => Amp * cos(w * t), -tau / 2, tau / 2);
            close(re, (2 * Amp * sin((w * tau) / 2)) / w, 1e-9);
            const a = 1.2;
            const Fre = simpson((t) => exp(-a * t) * cos(w * t), 0, 50, 50000);
            const Fim = -simpson((t) => exp(-a * t) * sin(w * t), 0, 50, 50000);
            close(Fre, a / (a * a + w * w), 1e-7);
            close(Fim, -w / (a * a + w * w), 1e-7);
        }
        // Shifting changes only the phase: |F| of the shifted pulse is unchanged.
        const w = 2; const t0 = 0.8;
        const re = simpson((t) => Amp * cos(w * t), t0 - tau / 2, t0 + tau / 2);
        const im = -simpson((t) => Amp * sin(w * t), t0 - tau / 2, t0 + tau / 2);
        close(Math.hypot(re, im), abs((2 * Amp * sin((w * tau) / 2)) / w), 1e-9);
    });
});

describe('Power series', () => {
    it('the ratio test, common Maclaurin series, the alternating error bound', () => {
        // Σ n/2ⁿ: ratio → 1/2.
        const n = 1e6; close(((n + 1) / 2 ** (n + 1 - n)) / n, 0.5, 1e-5);
        const x = 0.4; let s = 0; let c = 0; let l = 0; let g = 0; let e = 0;
        for (let k = 0; k < 30; k += 1) {
            s += ((-1) ** k * x ** (2 * k + 1)) / fact(2 * k + 1);
            c += ((-1) ** k * x ** (2 * k)) / fact(2 * k);
            if (k > 0) l += ((-1) ** (k + 1) * x ** k) / k;
            g += x ** k;
            e += x ** k / fact(k);
        }
        close(s, sin(x)); close(c, cos(x)); close(l, log(1 + x), 1e-9); close(g, 1 / (1 - x), 1e-9); close(e, exp(x));
        // ln 2 by its alternating series: the error after N terms is below the next term.
        let sum = 0; const N = 50;
        for (let k = 1; k <= N; k += 1) sum += (-1) ** (k + 1) / k;
        expect(abs(log(2) - sum)).toBeLessThanOrEqual(1 / (N + 1));
        // Stirling: within 1% at n = 10.
        expect(abs(sqrt(2 * PI * 10) * (10 / Math.E) ** 10 / fact(10) - 1)).toBeLessThan(0.01);
    });
});

describe('Z-transforms', () => {
    const Zsum = (x, z, N = 4000) => { let sum = 0; for (let k = 0; k < N; k += 1) sum += x(k) * z ** -k; return sum; };

    it('the table, a shift, the final value', () => {
        const z = 1.7; const a = 0.6;
        close(Zsum(() => 1, z), z / (z - 1), 1e-9);
        close(Zsum((k) => a ** k, z), z / (z - a), 1e-9);
        close(Zsum((k) => k, z), z / (z - 1) ** 2, 1e-9);
        close(Zsum((k) => (k >= 2 ? a ** (k - 2) : 0), z), z ** -2 * (z / (z - a)), 1e-9);
        // x[n] = 1 − aⁿ settles at 1: (z − 1)X(z) → 1 as z → 1.
        const X = (zz) => zz / (zz - 1) - zz / (zz - a);
        close((1 + 1e-7 - 1) * X(1 + 1e-7), 1, 1e-5);
    });
});

describe('Bessel and Legendre functions', () => {
    const J = (n, x) => { let s = 0; for (let k = 0; k < 40; k += 1) s += ((-1) ** k / (fact(k) * fact(n + k))) * (x / 2) ** (2 * k + n); return s; };
    const d = (f, x, h = 1e-4) => (f(x + h) - f(x - h)) / (2 * h);
    const d2 = (f, x, h = 1e-4) => (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);

    it("the series solves Bessel's equation; the recurrences hold", () => {
        for (const n of [0, 1, 2]) for (const x of [0.8, 2.5, 4]) {
            const y = (t) => J(n, t);
            close(x * x * d2(y, x) + x * d(y, x) + (x * x - n * n) * y(x), 0, 1e-5);
        }
        for (const x of [1.3, 3.7]) {
            close(J(1, x) + J(3, x), ((2 * 2) / x) * J(2, x), 1e-12);
            close(d((t) => J(0, t), x), -J(1, x), 1e-6);
            close(d((t) => t * t * J(2, t), x), x * x * J(1, x), 1e-6);
        }
        close(J(0, 2.404825557695773), 0, 1e-9); // its first zero
    });

    it('Legendre polynomials solve their equation, match Rodrigues, and are orthogonal', () => {
        const P = [() => 1, (x) => x, (x) => (3 * x * x - 1) / 2, (x) => (5 * x ** 3 - 3 * x) / 2];
        for (let n = 0; n < 4; n += 1) for (const x of [-0.6, 0.2, 0.9]) {
            close((1 - x * x) * d2(P[n], x) - 2 * x * d(P[n], x) + n * (n + 1) * P[n](x), 0, 1e-5);
        }
        // Rodrigues for n = 2: (1/8) d²/dx² (x² − 1)² = (3x² − 1)/2.
        for (const x of [0.3, 0.7]) close((1 / 8) * d2((t) => (t * t - 1) ** 2, x), P[2](x), 1e-5);
        for (let m = 0; m < 4; m += 1) for (let n = 0; n < 4; n += 1) {
            close(simpson((x) => P[m](x) * P[n](x), -1, 1), m === n ? 2 / (2 * n + 1) : 0, 1e-9);
        }
    });
});

describe('Partial differential equations', () => {
    const H = 1e-4;
    it('heat and wave solutions satisfy their equations; the classification', () => {
        const [c, L, nn] = [0.8, 2, 3];
        const u = (x, t) => sin((nn * PI * x) / L) * exp(-(((nn * PI * c) / L) ** 2) * t);
        const [x, t] = [0.7, 0.3];
        const ut = (u(x, t + H) - u(x, t - H)) / (2 * H);
        const uxx = (u(x + H, t) - 2 * u(x, t) + u(x - H, t)) / (H * H);
        close(ut, c * c * uxx, 1e-5);
        const cw = 1.5; const f = (s) => exp(-s * s); const g = (s) => sin(s);
        const w = (xx, tt) => f(xx - cw * tt) + g(xx + cw * tt);
        const wtt = (w(x, t + H) - 2 * w(x, t) + w(x, t - H)) / (H * H);
        const wxx = (w(x + H, t) - 2 * w(x, t) + w(x - H, t)) / (H * H);
        close(wtt, cw * cw * wxx, 1e-4);
        // A string's modes sin(nπx/L)cos(nπct/L) have frequency nc/(2L).
        close((nn * PI * cw) / L / (2 * PI), (nn * cw) / (2 * L));
        // Laplace: u = eˣ sin y is harmonic.
        const lap = (xx, yy) => exp(xx) * sin(yy);
        close((lap(x + H, t) - 2 * lap(x, t) + lap(x - H, t)) / (H * H) + (lap(x, t + H) - 2 * lap(x, t) + lap(x, t - H)) / (H * H), 0, 1e-5);
    });
});

describe('Functions of a complex variable', () => {
    // Contour integrals on the circle |z − c| = R, as sums over the parameter.
    const loop = (f, c = [0, 0], R = 1, N = 4000) => {
        let re = 0; let im = 0;
        for (let k = 0; k < N; k += 1) {
            const th = (2 * PI * (k + 0.5)) / N;
            const z = [c[0] + R * cos(th), c[1] + R * sin(th)];
            const dz = [-R * sin(th) * ((2 * PI) / N), R * cos(th) * ((2 * PI) / N)];
            const [a, b] = f(z);
            re += a * dz[0] - b * dz[1]; im += a * dz[1] + b * dz[0];
        }
        return [re, im];
    };
    const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
    const div = (a, b) => { const q = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / q, (a[1] * b[0] - a[0] * b[1]) / q]; };

    it('Cauchy-Riemann for z², and Cauchy’s theorem and formula', () => {
        const u = (x, y) => x * x - y * y; const v = (x, y) => 2 * x * y; const H = 1e-5; const [x, y] = [0.7, -1.2];
        close((u(x + H, y) - u(x - H, y)) / (2 * H), (v(x, y + H) - v(x, y - H)) / (2 * H), 1e-6);
        close((u(x, y + H) - u(x, y - H)) / (2 * H), -(v(x + H, y) - v(x - H, y)) / (2 * H), 1e-6);
        const zz = (z) => mul(z, z);
        const [r0, i0] = loop(zz);
        close(r0, 0, 1e-9); close(i0, 0, 1e-9);
        // f(z0) = (1/2πj)∮ f/(z − z0) with f = z², z0 = 0.3 + 0.2j.
        const z0 = [0.3, 0.2];
        const [re, im] = loop((z) => div(zz(z), [z[0] - z0[0], z[1] - z0[1]]));
        const val = div([re, im], [0, 2 * PI]);
        const want = zz(z0);
        close(val[0], want[0], 1e-6); close(val[1], want[1], 1e-6);
    });

    it('the residue theorem, with residues P(a)/Q′(a)', () => {
        // f = 1/(z² + 1): poles ±j. A circle round +j only: 2πj · 1/(2j) = π.
        const f = (z) => div([1, 0], [z[0] * z[0] - z[1] * z[1] + 1, 2 * z[0] * z[1]]);
        const [re, im] = loop(f, [0, 1], 0.5);
        close(re, PI, 1e-6); close(im, 0, 1e-6);
        // Both poles inside |z| = 2: residues cancel.
        const [r2, i2] = loop(f, [0, 0], 2);
        close(r2, 0, 1e-6); close(i2, 0, 1e-6);
    });
});
