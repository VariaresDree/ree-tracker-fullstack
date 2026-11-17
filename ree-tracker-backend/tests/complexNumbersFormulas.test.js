import { describe, it, expect } from 'vitest';

// Complex Numbers' formula cards, checked with numbers (Library round,
// 2026-11-17). Complex arithmetic is done from scratch on [re, im] pairs:
// multiplication by its definition, powers by repeated multiplication, the
// exponential by its power series. The cards' closed forms are then set
// against those, never against themselves.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const closeC = (z, w, tol = 1e-9) => { close(z[0], w[0], tol); close(z[1], w[1], tol); };
const { sin, cos, sinh, cosh, sqrt, PI, atan2, hypot, log, exp } = Math;
const deg = (d) => (d * PI) / 180;
const C = (re, im = 0) => [re, im];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const pow = (z, n) => { let out = C(1); for (let i = 0; i < n; i += 1) out = mul(out, z); return out; };
/** z / w as the z' that w · z' = z, by solving the real 2×2 system. */
const div = (z, w) => { const det = w[0] * w[0] + w[1] * w[1]; return [(z[0] * w[0] + z[1] * w[1]) / det, (z[1] * w[0] - z[0] * w[1]) / det]; };
const conj = (z) => [z[0], -z[1]];
const abs = (z) => hypot(z[0], z[1]);
/** e^z by its power series. */
const expS = (z) => { let term = C(1); let sum = C(1); for (let k = 1; k < 60; k += 1) { term = mul(term, [z[0] / k, z[1] / k]); sum = add(sum, term); } return sum; };
const polar = (r, t) => [r * cos(t), r * sin(t)];
const J = C(0, 1);

describe('Forms', () => {
    it('rectangular to polar, the argument by quadrant, exponential form', () => {
        const z = C(-3, -4);
        close(hypot(-3, -4), 5);
        // atan(y/x) alone lands in QI; adding 180° puts it in QIII, where z is.
        const theta = Math.atan(-4 / -3) + PI;
        closeC(polar(5, theta), z);
        close(theta, atan2(-4, -3) + 2 * PI);
        closeC(expS(C(0, PI / 6)), polar(1, PI / 6));
        closeC(mul(C(5), expS(C(0, PI / 6))), polar(5, deg(30)));
    });
});

describe('Powers of j', () => {
    it('cycle by four; 1/j = −j; four in a row cancel', () => {
        for (const n of [0, 1, 2, 3, 4, 7, 10, 2027 % 4 + 4]) {
            const want = [C(1), J, C(-1), C(0, -1)][n % 4];
            closeC(pow(J, n), want);
        }
        closeC(div(C(1), J), C(0, -1));
        for (const n of [0, 3, 6]) closeC(add(add(pow(J, n), pow(J, n + 1)), add(pow(J, n + 2), pow(J, n + 3))), C(0));
    });
});

describe('Arithmetic, conjugate and modulus', () => {
    const z1 = C(3, -2); const z2 = C(-1, 4);

    it('rectangular product and quotient, polar product and quotient', () => {
        const [a, b] = z1; const [c, d] = z2;
        closeC(mul(z1, z2), C(a * c - b * d, a * d + b * c));
        closeC(div(z1, z2), C((a * c + b * d) / (c * c + d * d), (b * c - a * d) / (c * c + d * d)));
        closeC(mul(div(z1, z2), z2), z1);
        const [r1, t1] = [abs(z1), atan2(z1[1], z1[0])]; const [r2, t2] = [abs(z2), atan2(z2[1], z2[0])];
        closeC(polar(r1 * r2, t1 + t2), mul(z1, z2));
        closeC(polar(r1 / r2, t1 - t2), div(z1, z2));
    });

    it('conjugate identities, modulus rules, the triangle inequality', () => {
        closeC(add(z1, conj(z1)), C(2 * z1[0]));
        closeC(add(z1, [-conj(z1)[0], -conj(z1)[1]]), C(0, 2 * z1[1]));
        closeC(mul(z1, conj(z1)), C(abs(z1) ** 2));
        close(abs(mul(z1, z2)), abs(z1) * abs(z2));
        close(abs(div(z1, z2)), abs(z1) / abs(z2));
        close(abs(pow(z1, 5)), abs(z1) ** 5);
        expect(abs(add(z1, z2))).toBeLessThanOrEqual(abs(z1) + abs(z2));
        closeC(conj(polar(2, 0.7)), polar(2, -0.7));
    });
});

describe("De Moivre and roots", () => {
    it('powers of 1 + j, and the triple-angle formulas', () => {
        for (const n of [2, 3, 5, 8]) closeC(pow(C(1, 1), n), polar(2 ** (n / 2), deg(45 * n)));
        closeC(pow(C(1, 1), 8), C(16));
        for (const t of [0.4, 1.1, 2.5]) {
            const c3 = pow(C(cos(t), sin(t)), 3);
            close(c3[0], 4 * cos(t) ** 3 - 3 * cos(t));
            close(c3[1], 3 * sin(t) - 4 * sin(t) ** 3);
        }
    });

    it('nth roots really are roots; roots of unity sum to zero; the cube root ω', () => {
        const z = C(-8, 8); const [r, t] = [abs(z), atan2(8, -8)];
        for (let k = 0; k < 3; k += 1) closeC(pow(polar(r ** (1 / 3), (t + 2 * PI * k) / 3), 3), z);
        for (const n of [3, 5, 8]) {
            let sum = C(0);
            for (let k = 0; k < n; k += 1) sum = add(sum, polar(1, (2 * PI * k) / n));
            closeC(sum, C(0));
        }
        const w = C(-0.5, sqrt(3) / 2);
        closeC(add(add(C(1), w), mul(w, w)), C(0));
        closeC(pow(w, 3), C(1));
    });
});

describe("Euler's formula and logarithms", () => {
    it('sine and cosine from exponentials; Euler’s identity; j^j', () => {
        for (const t of [0.3, 1.7, -2.2]) {
            const ep = expS(C(0, t)); const em = expS(C(0, -t));
            closeC([(ep[0] + em[0]) / 2, (ep[1] + em[1]) / 2], C(cos(t)));
            closeC(div([ep[0] - em[0], ep[1] - em[1]], C(0, 2)), C(sin(t)));
        }
        closeC(add(expS(C(0, PI)), C(1)), C(0));
        closeC(expS(C(0, PI / 2)), J);
        // j^j = e^{j ln j}, ln j = jπ/2.
        closeC(expS(mul(J, C(0, PI / 2))), C(exp(-PI / 2)));
        close(exp(-PI / 2), 0.2078795763507619);
    });

    it('ln z inverts e^z; ln of a negative; a complex power', () => {
        const z = C(-2, 3); const [r, t] = [abs(z), atan2(3, -2)];
        closeC(expS(C(log(r), t)), z);
        closeC(expS(C(log(r), t + 2 * PI)), z); // any branch k
        closeC(expS(C(log(5), PI)), C(-5));
        // (1 + j)^2 by z^w = e^{w ln z}, against multiplication.
        const lnZ = C(log(sqrt(2)), PI / 4);
        closeC(expS(mul(C(2), lnZ)), mul(C(1, 1), C(1, 1)));
    });
});

describe('Trigonometric and hyperbolic functions of a complex number', () => {
    /** sin, cos, sinh, cosh of z from the exponential series alone. */
    const sinZ = (z) => { const a = expS(mul(J, z)); const b = expS(mul(C(0, -1), z)); return div([a[0] - b[0], a[1] - b[1]], C(0, 2)); };
    const cosZ = (z) => { const a = expS(mul(J, z)); const b = expS(mul(C(0, -1), z)); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
    const sinhZ = (z) => { const a = expS(z); const b = expS([-z[0], -z[1]]); return [(a[0] - b[0]) / 2, (a[1] - b[1]) / 2]; };
    const coshZ = (z) => { const a = expS(z); const b = expS([-z[0], -z[1]]); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };

    it('the split into circular and hyperbolic parts, and the exchange rules', () => {
        for (const [x, y] of [[0.4, 1.2], [2, -0.7], [-1.1, 0.3]]) {
            closeC(sinZ(C(x, y)), C(sin(x) * cosh(y), cos(x) * sinh(y)));
            closeC(cosZ(C(x, y)), C(cos(x) * cosh(y), -sin(x) * sinh(y)));
            closeC(sinhZ(C(x, y)), C(sinh(x) * cos(y), cosh(x) * sin(y)));
            closeC(coshZ(C(x, y)), C(cosh(x) * cos(y), sinh(x) * sin(y)));
            closeC(sinZ(C(0, y)), C(0, sinh(y)));
            closeC(cosZ(C(0, y)), C(cosh(y)));
            closeC(sinhZ(C(0, x)), C(0, sin(x)));
            closeC(coshZ(C(0, x)), C(cos(x)));
        }
        close(abs(sinZ(C(0, 2))), sinh(2)); // |sin(j2)| ≈ 3.63 > 1
    });
});

describe('Complex equations', () => {
    it('a quadratic with a negative discriminant, and conjugate pairs of a real cubic', () => {
        const [a, b, c] = [2, 3, 5];
        const root = C(-b / (2 * a), sqrt(4 * a * c - b * b) / (2 * a));
        const P2 = (x) => add(add(mul(C(a), mul(x, x)), mul(C(b), x)), C(c));
        closeC(P2(root), C(0));
        closeC(P2(conj(root)), C(0));
        closeC(add(root, conj(root)), C(-b / a));
        closeC(mul(root, conj(root)), C(c / a));
        // x³ − x² + 4x − 4 = (x − 1)(x² + 4): roots 1, ±j2.
        const P3 = (x) => add(add(mul(x, mul(x, x)), mul(C(-1), mul(x, x))), add(mul(C(4), x), C(-4)));
        closeC(P3(C(0, 2)), C(0));
        closeC(P3(C(0, -2)), C(0));
    });

    it('loci: a circle and a perpendicular bisector', () => {
        const z0 = C(1, -2); const rr = 3;
        // |z − z0| = r squared out is (x − 1)² + (y + 2)² = 9: points of that circle satisfy the modulus form.
        for (const x of [-1.5, 1, 3.2]) {
            const y = -2 + sqrt(rr * rr - (x - 1) ** 2);
            close(abs(add(C(x, y), [-z0[0], -z0[1]])), rr);
        }
        // Points equidistant from a = 0 and b = 4 + j2 lie on 2x + y = 5.
        const A = C(0); const B = C(4, 2);
        for (const x of [-1, 0.5, 3]) { const p = C(x, 5 - 2 * x); close(abs(add(p, [-A[0], -A[1]])), abs(add(p, [-B[0], -B[1]]))); }
    });
});

describe('Phasors', () => {
    it('impedances, parallel combination, admittance, complex power', () => {
        const w = 2 * PI * 60; const [R, L, Cap] = [10, 0.05, 200e-6];
        const ZL = C(0, w * L); const ZC = div(C(1), C(0, w * Cap));
        closeC(ZC, C(0, -1 / (w * Cap)));
        const Z1 = add(C(R), ZL); const Z2 = ZC;
        const par = div(mul(Z1, Z2), add(Z1, Z2));
        // Parallel by admittances, independently.
        const Y = add(div(C(1), Z1), div(C(1), Z2));
        closeC(par, div(C(1), Y));
        // S = V I*: with V = 120∠0 across Z1, P = I²R and Q = I²X_L.
        const V = C(120); const I = div(V, Z1);
        const S = mul(V, conj(I));
        close(S[0], abs(I) ** 2 * R);
        close(S[1], abs(I) ** 2 * w * L);
        close(abs(S), 120 * abs(I));
    });

    it('a sinusoid’s phasor gives back the sinusoid', () => {
        const [Vm, phi, w] = [170, 0.5, 377];
        const V = polar(Vm / sqrt(2), phi); // rms phasor
        for (const t of [0, 0.003, 0.011]) {
            const back = mul(C(sqrt(2)), mul(V, polar(1, w * t)));
            close(back[0], Vm * cos(w * t + phi));
        }
    });
});
