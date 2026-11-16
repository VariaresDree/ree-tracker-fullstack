import { describe, it, expect } from 'vitest';

// Analytic Geometry's formula cards, checked with numbers (Library round,
// 2026-11-16). Each is set against something it doesn't come from: points
// found by walking along a segment, conics built from their focus-directrix or
// two-focus definitions, rotations done to points one by one, and areas by
// integration.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sin, cos, tan, sqrt, PI, atan2, abs, hypot } = Math;
const integrate = (f, a, b, n = 20000) => { const h = (b - a) / n; let s = 0; for (let i = 0; i < n; i += 1) s += f(a + (i + 0.5) * h); return s * h; };
const shoelace = (pts) => abs(pts.reduce((s, [x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return s + x * y2 - x2 * y; }, 0)) / 2;
/** Distance from (x, y) to the line ax + by + c = 0, by dropping a perpendicular. */
const footDistance = (a, b, c, x, y) => {
    const t = -(a * x + b * y + c) / (a * a + b * b);
    return hypot(a * t, b * t);
};

describe('Coordinates and distance', () => {
    const [x1, y1, x2, y2] = [-2, 5, 7, -1];

    it('midpoint and a point dividing a segment, against walking along it', () => {
        close((x1 + x2) / 2, x1 + 0.5 * (x2 - x1));
        const [m, n] = [2, 3];
        const t = m / (m + n);
        close((m * x2 + n * x1) / (m + n), x1 + t * (x2 - x1));
        close((m * y2 + n * y1) / (m + n), y1 + t * (y2 - y1));
        // P1P : PP2 really is m : n.
        const P = [(m * x2 + n * x1) / (m + n), (m * y2 + n * y1) / (m + n)];
        close(hypot(P[0] - x1, P[1] - y1) / hypot(x2 - P[0], y2 - P[1]), m / n);
    });

    it('triangle area, the shoelace, the centroid on the medians, distance in space', () => {
        const T = [[1, 2], [8, 3], [4, 9]];
        const [[a1, b1], [a2, b2], [a3, b3]] = T;
        close(0.5 * abs(a1 * (b2 - b3) + a2 * (b3 - b1) + a3 * (b1 - b2)), shoelace(T));
        // Heron as an independent check of the shoelace.
        const sides = [hypot(a2 - a1, b2 - b1), hypot(a3 - a2, b3 - b2), hypot(a1 - a3, b1 - b3)];
        const s = sides.reduce((p, q) => p + q) / 2;
        close(shoelace(T), sqrt(s * (s - sides[0]) * (s - sides[1]) * (s - sides[2])));
        const G = [(a1 + a2 + a3) / 3, (b1 + b2 + b3) / 3];
        const M = [(a2 + a3) / 2, (b2 + b3) / 2]; // G is 2/3 of the way from vertex 1 to M
        close(G[0], a1 + (2 / 3) * (M[0] - a1));
        close(G[1], b1 + (2 / 3) * (M[1] - b1));
        close(sqrt(3 ** 2 + 4 ** 2 + 12 ** 2), 13);
    });
});

describe('Lines', () => {
    it('slope from inclination; parallel and perpendicular; the line forms agree', () => {
        const th = 2.2;
        close(tan(th), (sin(th) * 5) / (cos(th) * 5));
        const m = 0.75;
        close(m * (-1 / m), -1);
        // y = mx + b, intercept form and general form describe the same points.
        const [a, b] = [4, -3]; // intercepts
        for (const x of [-2, 0, 1.5, 4]) {
            const y = b * (1 - x / a);
            close(x / a + y / b, 1);
            close(y, (-b / a) * x + b);
        }
        const [A, B, C] = [3, -2, 7];
        for (const x of [-1, 0, 2]) close(A * x + B * (-(A / B) * x - C / B) + C, 0);
    });

    it('angle between two lines, against their direction angles', () => {
        const [m1, m2] = [0.5, 3];
        close(atan2(m2 - m1, 1 + m1 * m2), Math.atan(m2) - Math.atan(m1));
    });

    it('distance from a point to a line, and between parallel lines, by dropping perpendiculars', () => {
        const [A, B, C] = [3, 4, -12];
        close(abs(A * 5 + B * 6 + C) / hypot(A, B), footDistance(A, B, C, 5, 6));
        // A point on the first line, measured to the second.
        const [C1, C2] = [-12, 8];
        const onFirst = [4, 0]; // 3*4 + 0 - 12 = 0
        close(abs(C2 - C1) / hypot(A, B), footDistance(A, B, C2, ...onFirst));
    });
});

describe('Circles', () => {
    it('general form: centre and radius by expanding the standard form', () => {
        const [h, k, rr] = [3, -2, 5];
        const [D, E, F] = [-2 * h, -2 * k, h * h + k * k - rr * rr];
        close(-D / 2, h);
        close(-E / 2, k);
        close(0.5 * sqrt(D * D + E * E - 4 * F), rr);
        // Tangent at a point of the circle is perpendicular to the radius there.
        const t = 0.9; const [px, py] = [h + rr * cos(t), k + rr * sin(t)];
        const tangent = (x, y) => (px - h) * (x - h) + (py - k) * (y - k) - rr * rr;
        close(tangent(px, py), 0);
        const along = [-(py - k), px - h]; // direction square to the radius
        close(tangent(px + 2 * along[0], py + 2 * along[1]), 0);
        // Tangent length from an outside point, against Pythagoras.
        const [qx, qy] = [12, 7];
        close(sqrt(qx * qx + qy * qy + D * qx + E * qy + F), sqrt((qx - h) ** 2 + (qy - k) ** 2 - rr * rr));
    });
});

describe('Conics from their definitions', () => {
    it('parabola: every point is as far from the focus as from the directrix', () => {
        const a = 1.7;
        for (const y of [-4, -1, 0.5, 3]) {
            const x = (y * y) / (4 * a);
            close(hypot(x - a, y), x + a);
        }
        // Latus rectum: the chord through the focus at x = a.
        close(2 * sqrt(4 * a * a), 4 * a);
        // y = Ax² + Bx + C: vertex and focus by completing the square.
        const [A, B, C] = [2, -8, 3];
        const h = -B / (2 * A); const k = C - (B * B) / (4 * A); const p = 1 / (4 * A);
        for (const x of [-1, 0, 2.5]) close(A * x * x + B * x + C, (x - h) ** 2 / (4 * p) + k);
    });

    it('ellipse: focal distances add to 2a; c² = a² − b²; latus rectum; directrix ratio e', () => {
        const [a, b] = [5, 3]; const c = sqrt(a * a - b * b); const e = c / a;
        for (const t of [0.2, 1.1, 2.5, 4]) {
            const [x, y] = [a * cos(t), b * sin(t)];
            close(x * x / (a * a) + y * y / (b * b), 1);
            close(hypot(x - c, y) + hypot(x + c, y), 2 * a);
            close(hypot(x - c, y) / abs(a / e - x), e);
        }
        // Latus rectum: the chord through a focus, at x = c.
        close(2 * b * sqrt(1 - (c * c) / (a * a)), (2 * b * b) / a);
    });

    it('hyperbola: focal distances differ by 2a; c² = a² + b²; asymptotes; latus rectum; rectangular', () => {
        const [a, b] = [3, 4]; const c = sqrt(a * a + b * b);
        for (const t of [-1.5, -0.3, 0.8, 2]) {
            const [x, y] = [a * Math.cosh(t), b * Math.sinh(t)];
            close(x * x / (a * a) - y * y / (b * b), 1);
            close(abs(hypot(x - c, y) - hypot(x + c, y)), 2 * a);
        }
        // Far out, the branch hugs y = (b/a) x.
        const x = 1e4; close(b * sqrt(x * x / (a * a) - 1), (b / a) * x, 1e-7);
        close(2 * b * sqrt((c * c) / (a * a) - 1), (2 * b * b) / a);
        close(sqrt(2 * 9) / 3, sqrt(2)); // a = b: c = a√2
        // xy = k is x² − y² = a² turned 45°, with k = a²/2.
        const k = 4.5; const ra = sqrt(2 * k);
        const [u, w] = [ra * Math.cosh(0.7), ra * Math.sinh(0.7)];
        const [xx, yy] = [(u - w) / sqrt(2), (u + w) / sqrt(2)];
        close(xx * yy, k);
    });

    it('the discriminant and eccentricity name the conic', () => {
        const kind = (A, B, C) => (B * B - 4 * A * C < 0 ? 'ellipse' : B * B - 4 * A * C === 0 ? 'parabola' : 'hyperbola');
        expect(kind(9, 0, 25)).toBe('ellipse');
        expect(kind(0, 0, 1)).toBe('parabola');
        expect(kind(16, 0, -9)).toBe('hyperbola');
        expect(kind(1, 2, 1)).toBe('parabola');
    });
});

describe('Translation and rotation', () => {
    const rotate = ([x, y], t) => [x * cos(t) - y * sin(t), x * sin(t) + y * cos(t)];

    it('rotation formulas move points rigidly, and back', () => {
        const t = 0.6; const p = [2, 5];
        const q = rotate(p, t);
        close(hypot(...q), hypot(...p));
        const back = [q[0] * cos(t) + q[1] * sin(t), -q[0] * sin(t) + q[1] * cos(t)];
        close(back[0], p[0]); close(back[1], p[1]);
    });

    it('cot 2θ = (A − C)/B removes the xy term, and A + C, B² − 4AC stay', () => {
        const [A, B, C] = [5, 4, 2];
        const t = 0.5 * Math.atan2(B, A - C); // cot 2θ = (A − C)/B
        close(1 / tan(2 * t), (A - C) / B);
        // Substitute x = x'cos − y'sin, y = x'sin + y'cos into Ax² + Bxy + Cy².
        const c = cos(t); const s = sin(t);
        const A2 = A * c * c + B * c * s + C * s * s;
        const B2 = 2 * (C - A) * s * c + B * (c * c - s * s);
        const C2 = A * s * s - B * s * c + C * c * c;
        close(B2, 0);
        close(A2 + C2, A + C);
        close(B2 * B2 - 4 * A2 * C2, B * B - 4 * A * C);
        close(A2 * C2, A * C - (B * B) / 4);
    });
});

describe('Polar coordinates', () => {
    it('conversion, distance by the cosine law, conic and rose', () => {
        const [r, t] = [4, 2.3];
        const [x, y] = [r * cos(t), r * sin(t)];
        close(hypot(x, y), r);
        close(atan2(y, x), t);
        const [r2, t2] = [6, 0.4];
        close(sqrt(r * r + r2 * r2 - 2 * r * r2 * cos(t2 - t)), hypot(x - r2 * cos(t2), y - r2 * sin(t2)));
        // r = ed/(1 − e cos θ): distance to the pole over distance to the directrix x = −d is e.
        const [e, d] = [0.6, 5];
        for (const th of [0.3, 1.5, 3, 4.4]) {
            const rr = (e * d) / (1 - e * cos(th));
            close(rr / (rr * cos(th) + d), e);
        }
        // r = 2a cos θ is the circle of radius a centred at (a, 0).
        const a = 3;
        for (const th of [0.2, 0.9, 1.3]) {
            const rr = 2 * a * cos(th);
            close(hypot(rr * cos(th) - a, rr * sin(th)), a);
        }
    });

    it('area in polar coordinates: a circle, and one petal of a rose', () => {
        const a = 3;
        close(0.5 * integrate((th) => (2 * a * cos(th)) ** 2, -PI / 2, PI / 2), PI * a * a, 1e-8);
        // r = cos 3θ: three petals, total area π/4.
        close(3 * 0.5 * integrate((th) => cos(3 * th) ** 2, -PI / 6, PI / 6), PI / 4, 1e-8);
    });
});

describe('Parametric equations', () => {
    it('line, ellipse, slope', () => {
        const [x1, y1, x2, y2] = [1, 2, 7, -4];
        close(x1 + 0.5 * (x2 - x1), (x1 + x2) / 2);
        const [h, k, a, b] = [2, -1, 5, 3];
        for (const t of [0.4, 2, 5]) close(((h + a * cos(t) - h) / a) ** 2 + ((k + b * sin(t) - k) / b) ** 2, 1);
        // dy/dx of the ellipse at t, against the implicit derivative.
        const t = 0.7; const [x, y] = [a * cos(t), b * sin(t)];
        close((b * cos(t)) / (-a * sin(t)), -(b * b * x) / (a * a * y));
    });

    it('cycloid: one arch is 8r long and encloses 3πr²', () => {
        const r = 2;
        close(integrate((t) => hypot(r * (1 - cos(t)), r * sin(t)), 0, 2 * PI), 8 * r, 1e-8);
        close(integrate((t) => r * (1 - cos(t)) * r * (1 - cos(t)), 0, 2 * PI), 3 * PI * r * r, 1e-8);
    });

    it('projectile: the path is y = x tan α − g x² / (2 v₀² cos² α), and the range', () => {
        const [v0, al, g] = [20, 0.6, 9.81];
        for (const t of [0.3, 1, 1.7]) {
            const x = v0 * t * cos(al); const y = v0 * t * sin(al) - 0.5 * g * t * t;
            close(y, x * tan(al) - (g * x * x) / (2 * v0 * v0 * cos(al) ** 2));
        }
        const tFlight = (2 * v0 * sin(al)) / g;
        close(v0 * tFlight * cos(al), (v0 * v0 * sin(2 * al)) / g);
    });
});

describe('Lines and planes in space', () => {
    it('direction cosines square to 1; a line in space passes through its points', () => {
        const [a, b, c] = [2, -3, 6]; const n = hypot(a, b, c);
        close((a / n) ** 2 + (b / n) ** 2 + (c / n) ** 2, 1);
        const P0 = [1, 4, -2];
        for (const t of [-1, 0.5, 2]) {
            const [x, y, z] = [P0[0] + a * t, P0[1] + b * t, P0[2] + c * t];
            close((x - P0[0]) / a, (y - P0[1]) / b);
            close((y - P0[1]) / b, (z - P0[2]) / c);
        }
    });

    it('plane forms, point-to-plane distance by projection, angle between planes, sphere', () => {
        const [A, B, C] = [2, -1, 2]; const P = [1, 1, 1];
        const D = -(A * P[0] + B * P[1] + C * P[2]);
        // Intercept form: (a,0,0), (0,b,0), (0,0,c) are on the plane.
        const [ia, ib, ic] = [-D / A, -D / B, -D / C];
        close(ia / ia + 0 + 0, 1); close(A * ia + D, 0); close(B * ib + D, 0); close(C * ic + D, 0);
        // Distance: project Q − P onto the unit normal.
        const Q = [4, -2, 6]; const nl = hypot(A, B, C);
        close(abs(A * Q[0] + B * Q[1] + C * Q[2] + D) / nl, abs(((Q[0] - P[0]) * A + (Q[1] - P[1]) * B + (Q[2] - P[2]) * C) / nl));
        // Two planes at a known angle: normals (0,0,1) and (0, sin θ, cos θ).
        const th = 0.8; const n2 = [0, sin(th), cos(th)];
        close(Math.acos(abs(0 * n2[0] + 0 * n2[1] + 1 * n2[2]) / (1 * hypot(...n2))), th);
        // Sphere: a point at distance r from the centre satisfies it.
        const [h, k, l, r] = [1, -2, 3, 4];
        const S = [h + (2 / 7) * r, k + (3 / 7) * r, l + (6 / 7) * r]; // r from the centre along a unit direction
        close((S[0] - h) ** 2 + (S[1] - k) ** 2 + (S[2] - l) ** 2, r * r);
        // General form: centre (−D/2, −E/2, −F/2).
        const [Dg, Eg, Fg] = [-2 * h, -2 * k, -2 * l];
        close(-Dg / 2, h); close(-Eg / 2, k); close(-Fg / 2, l);
        const G = h * h + k * k + l * l - r * r;
        close(S[0] ** 2 + S[1] ** 2 + S[2] ** 2 + Dg * S[0] + Eg * S[1] + Fg * S[2] + G, 0);
    });
});
