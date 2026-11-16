import { describe, it, expect } from 'vitest';

// Trigonometry's formula cards, checked with numbers (Library round,
// 2026-11-16): every identity at many angles, every law on built triangles.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const deg = (d) => (d * Math.PI) / 180;
// Angles that avoid the poles of tan and cot.
const ANGLES = [0.3, 0.7, 1.1, 2.0, 2.6, -0.9, 4.0, 5.5];
const PAIRS = [[0.3, 1.1], [0.7, -0.4], [2.0, 0.5], [-1.2, 2.6]];
const { sin, cos, tan, sqrt, PI, atan, asin, acos, sinh, cosh, tanh, log, exp } = Math;

describe('Angle measure and the functions', () => {
    it('units, arcs, sectors and speed', () => {
        close(PI, deg(180));
        close((2 * PI) / (2 * PI), 400 / 400);
        close(deg(90) / (2 * PI) * 6400, 1600);
        const [r, th] = [5, 1.2];
        close(r * th, (2 * PI * r) * (th / (2 * PI)));
        close(0.5 * r * r * th, PI * r * r * (th / (2 * PI)));
        close(0.5 * r * (r * th), 0.5 * r * r * th);
        close(3 * ((2 * PI * 1200) / 60), 3 * 125.66370614359172, 1e-9);
    });

    it('reciprocals, quadrants, reference angles, special angles, cofunctions, even and odd', () => {
        for (const t of ANGLES) {
            close(1 / sin(t) * sin(t), 1);
            close(sin(PI / 2 - t), cos(t));
            close(tan(PI / 2 - t), 1 / tan(t));
            close(sin(-t), -sin(t));
            close(cos(-t), cos(t));
            close(tan(-t), -tan(t));
        }
        expect(sin(deg(120))).toBeGreaterThan(0);
        expect(cos(deg(120))).toBeLessThan(0);
        expect(tan(deg(225))).toBeGreaterThan(0);
        expect(sin(deg(300))).toBeLessThan(0);
        close(sin(deg(150)), sin(deg(30)));
        close(Math.abs(cos(deg(210))), cos(deg(30)));
        close(Math.abs(tan(deg(315))), tan(deg(45)));
        close(sin(deg(30)), 0.5);
        close(sin(deg(45)), sqrt(2) / 2);
        close(sin(deg(60)), sqrt(3) / 2);
        close(tan(deg(30)), 1 / sqrt(3));
        close(tan(deg(60)), sqrt(3));
    });

    it('amplitude, period and phase shift of A sin(Bx + C)', () => {
        const [A, B, C] = [3, 2, 0.6];
        const y = (x) => A * sin(B * x + C);
        const period = (2 * PI) / B;
        for (const x of [0.1, 1, 2.5]) close(y(x + period), y(x));
        close(y(-C / B), 0);
        close(Math.max(...Array.from({ length: 2000 }, (_, i) => y((i / 2000) * period))), A, 1e-4);
    });
});

describe('Identities', () => {
    it('fundamental: quotient and Pythagorean', () => {
        for (const t of ANGLES) {
            close(tan(t), sin(t) / cos(t));
            close(sin(t) ** 2 + cos(t) ** 2, 1);
            close(1 + tan(t) ** 2, 1 / cos(t) ** 2);
            close(1 + 1 / tan(t) ** 2, 1 / sin(t) ** 2);
        }
    });

    it('sums and differences', () => {
        for (const [a, b] of PAIRS) {
            close(sin(a + b), sin(a) * cos(b) + cos(a) * sin(b));
            close(sin(a - b), sin(a) * cos(b) - cos(a) * sin(b));
            close(cos(a + b), cos(a) * cos(b) - sin(a) * sin(b));
            close(cos(a - b), cos(a) * cos(b) + sin(a) * sin(b));
            close(tan(a + b), (tan(a) + tan(b)) / (1 - tan(a) * tan(b)), 1e-8);
            close(tan(a - b), (tan(a) - tan(b)) / (1 + tan(a) * tan(b)), 1e-8);
        }
        close(tan(deg(75)), 2 + sqrt(3));
    });

    it('double, half, triple angle and power reduction', () => {
        for (const t of ANGLES) {
            close(sin(2 * t), 2 * sin(t) * cos(t));
            close(cos(2 * t), cos(t) ** 2 - sin(t) ** 2);
            close(cos(2 * t), 2 * cos(t) ** 2 - 1);
            close(tan(2 * t), (2 * tan(t)) / (1 - tan(t) ** 2), 1e-8);
            close(Math.abs(sin(t / 2)), sqrt((1 - cos(t)) / 2));
            close(Math.abs(cos(t / 2)), sqrt((1 + cos(t)) / 2));
            close(tan(t / 2), (1 - cos(t)) / sin(t));
            close(tan(t / 2), sin(t) / (1 + cos(t)));
            close(sin(t) ** 2, (1 - cos(2 * t)) / 2);
            close(cos(t) ** 2, (1 + cos(2 * t)) / 2);
            close(sin(3 * t), 3 * sin(t) - 4 * sin(t) ** 3);
            close(cos(3 * t), 4 * cos(t) ** 3 - 3 * cos(t));
        }
        close(cos(deg(15)), 0.9659258262890683);
    });

    it('product to sum and sum to product', () => {
        for (const [a, b] of PAIRS) {
            close(sin(a) * cos(b), 0.5 * (sin(a + b) + sin(a - b)));
            close(2 * cos(a) * cos(b), cos(a - b) + cos(a + b));
            close(2 * sin(a) * sin(b), cos(a - b) - cos(a + b));
            close(sin(a) + sin(b), 2 * sin((a + b) / 2) * cos((a - b) / 2));
            close(cos(a) + cos(b), 2 * cos((a + b) / 2) * cos((a - b) / 2));
            close(cos(a) - cos(b), -2 * sin((a + b) / 2) * sin((a - b) / 2));
        }
    });
});

describe('Triangles', () => {
    // A triangle from two sides and the angle between them; the third side by
    // coordinates, so the laws are checked against geometry, not themselves.
    const tri = (b, c, Adeg) => {
        const P = [0, 0];
        const Q = [c, 0];
        const R = [b * cos(deg(Adeg)), b * sin(deg(Adeg))];
        const d = (u, w) => Math.hypot(u[0] - w[0], u[1] - w[1]);
        const a = d(Q, R);
        const ang = (o, u, w) => acos(((u[0] - o[0]) * (w[0] - o[0]) + (u[1] - o[1]) * (w[1] - o[1])) / (d(o, u) * d(o, w)));
        return { a, b, c, A: ang(P, Q, R), B: ang(Q, P, R), C: ang(R, P, Q), area: 0.5 * Math.abs(c * R[1]) };
    };
    const T = [tri(5, 7, 40), tri(3, 3, 100), tri(8, 4, 25)];

    it('angle sum, sine law, both cosine laws, law of tangents', () => {
        for (const { a, b, c, A, B, C } of T) {
            close(A + B + C, PI);
            close(a / sin(A), b / sin(B));
            close(b / sin(B), c / sin(C));
            close(c * c, a * a + b * b - 2 * a * b * cos(C));
            close(cos(C), (a * a + b * b - c * c) / (2 * a * b));
            close((a - b) / (a + b), tan((A - B) / 2) / tan((A + B) / 2), 1e-8);
        }
    });

    it('areas, in- and circumradius', () => {
        for (const { a, b, c, A, B, C, area } of T) {
            const s = (a + b + c) / 2;
            close(0.5 * a * b * sin(C), area);
            close(sqrt(s * (s - a) * (s - b) * (s - c)), area);
            close((a * a * sin(B) * sin(C)) / (2 * sin(A)), area);
            close((a * b * c) / (4 * area), a / (2 * sin(A)));
            // The incircle: area = r·s, and r is the distance to each side.
            const r = area / s;
            close(r, (s - a) * tan(A / 2));
        }
        // Right triangle 3-4-5: r = (a + b − c)/2 = 1, R = 5/2.
        close(6 / 6, (3 + 4 - 5) / 2);
        close((3 * 4 * 5) / (4 * 6), 2.5);
    });

    it('special right triangles, and the ambiguous case', () => {
        close(sin(deg(30)) * 2, 1);
        close(cos(deg(30)) * 2, sqrt(3));
        close(1 / cos(deg(45)), sqrt(2));
        // A = 30°, b = 10: h = 5. a = 7 gives two triangles (5 < 7 < 10).
        const [A, b, a] = [deg(30), 10, 7];
        const h = b * sin(A);
        close(h, 5);
        const B1 = asin((b * sin(A)) / a);
        const B2 = PI - B1;
        expect(A + B2).toBeLessThan(PI);
        expect(B1).not.toBeCloseTo(B2);
    });

    it('elevation: one angle, and two along a line', () => {
        const h = 50;
        const [near, far] = [40, 90];
        const [alpha, beta] = [atan(h / far), atan(h / near)];
        close(near * tan(beta), h);
        close((far - near) / (1 / tan(alpha) - 1 / tan(beta)), h);
    });
});

describe('Inverse functions and equations', () => {
    it('ranges and identities of the inverses', () => {
        for (const x of [-0.9, -0.2, 0.4, 1]) {
            expect(asin(x)).toBeGreaterThanOrEqual(-PI / 2);
            expect(acos(x)).toBeGreaterThanOrEqual(0);
            close(asin(x) + acos(x), PI / 2);
        }
        close(atan(0.5) + atan(1 / 3), PI / 4);
        for (const [x, y] of [[0.2, 0.7], [-1.5, 0.3]]) close(atan(x) + atan(y), atan((x + y) / (1 - x * y)));
        close(atan(3) + atan(1 / 3), PI / 2);
        close(atan(-3) + atan(-1 / 3), -PI / 2);
    });

    it('general solutions give the same function value', () => {
        const a = 0.6;
        for (const n of [-3, -1, 0, 2, 5]) {
            close(sin(n * PI + (-1) ** n * a), sin(a));
            close(cos(2 * n * PI + a), cos(a));
            close(cos(2 * n * PI - a), cos(a));
            close(tan(n * PI + a), tan(a), 1e-8);
        }
    });
});

describe('Hyperbolic functions', () => {
    it('definitions, identity, double argument and inverses', () => {
        for (const x of [-2, -0.3, 0, 0.8, 3]) {
            close(sinh(x), (exp(x) - exp(-x)) / 2);
            close(cosh(x), (exp(x) + exp(-x)) / 2);
            close(tanh(x), sinh(x) / cosh(x));
            close(cosh(x) ** 2 - sinh(x) ** 2, 1, 1e-8);
            close(sinh(2 * x), 2 * sinh(x) * cosh(x));
            close(cosh(2 * x), cosh(x) ** 2 + sinh(x) ** 2);
            close(Math.asinh(x), log(x + sqrt(x * x + 1)));
        }
        for (const x of [1, 1.5, 10]) close(Math.acosh(x), log(x + sqrt(x * x - 1)));
    });
});

describe('Spherical trigonometry', () => {
    // Three points on the unit sphere: the sides are the angles between them,
    // the angles come from the tangent planes, so the laws check against geometry.
    const unit = (lat, lon) => [cos(lat) * cos(lon), cos(lat) * sin(lon), sin(lat)];
    const dot = (u, w) => u[0] * w[0] + u[1] * w[1] + u[2] * w[2];
    const cross = (u, w) => [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const norm = (u) => Math.hypot(...u);
    const angleAt = (P, Q, R) => {
        const n1 = cross(P, Q);
        const n2 = cross(P, R);
        return acos(dot(n1, n2) / (norm(n1) * norm(n2)));
    };
    const [P, Q, R] = [unit(0.9, 0.1), unit(0.2, -0.4), unit(0.3, 0.8)];
    const a = acos(dot(Q, R));
    const b = acos(dot(P, R));
    const c = acos(dot(P, Q));
    const [A, B, C] = [angleAt(P, Q, R), angleAt(Q, P, R), angleAt(R, P, Q)];

    it('the sine law and both cosine laws', () => {
        close(sin(a) / sin(A), sin(b) / sin(B));
        close(sin(b) / sin(B), sin(c) / sin(C));
        close(cos(a), cos(b) * cos(c) + sin(b) * sin(c) * cos(A));
        close(cos(A), -cos(B) * cos(C) + sin(B) * sin(C) * cos(a));
    });

    it('excess and area: the octant triangle is an eighth of the sphere', () => {
        // Three right angles: E = 90°, area = 4πR²/8.
        const R2 = 3;
        const E = 90 + 90 + 90 - 180;
        close((PI * R2 * R2 * E) / 180, (4 * PI * R2 * R2) / 8);
        expect(A + B + C).toBeGreaterThan(PI);
    });

    it("Napier's rules on a right spherical triangle", () => {
        // C = 90° at Q, where a meridian meets the equator. A at P (on the
        // meridian), B at R (on the equator); a, b opposite them, c the hypotenuse.
        const [Pp, Qq, Rr] = [unit(PI / 2 - 0.5, 0), unit(0, 0), unit(0, 0.7)];
        const aa = acos(dot(Qq, Rr));
        const bb = acos(dot(Pp, Qq));
        const cc = acos(dot(Pp, Rr));
        const AA = angleAt(Pp, Qq, Rr);
        const BB = angleAt(Rr, Pp, Qq);
        close(angleAt(Qq, Pp, Rr), PI / 2, 1e-9);
        // Middle part a: adjacent b and co-B; opposite co-A and co-c.
        close(sin(aa), tan(bb) * tan(PI / 2 - BB));
        close(sin(aa), cos(PI / 2 - AA) * cos(PI / 2 - cc));
    });
});
