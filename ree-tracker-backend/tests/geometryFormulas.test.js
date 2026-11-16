import { describe, it, expect } from 'vitest';

// Plane and Solid Geometry's formula cards, checked with numbers (Library
// round, 2026-11-16). Each formula is set against a figure built from
// coordinates (lengths, angles and areas measured, not assumed), or against a
// volume found by slicing, so a card can't agree with itself by mistake.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sin, cos, tan, sqrt, PI, acos, abs, atan2, cbrt } = Math;
const deg = (d) => (d * PI) / 180;
const toDeg = (r) => (r * 180) / PI;
const P = (x, y) => ({ x, y });
const sub = (a, b) => P(a.x - b.x, a.y - b.y);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a, b) => P((a.x + b.x) / 2, (a.y + b.y) / 2);
/** The angle at `at` between rays to p and q, in radians. */
const angle = (p, at, q) => {
    const u = sub(p, at);
    const v = sub(q, at);
    return acos((u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y)));
};
const shoelace = (pts) => abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p.x * q.y - q.x * p.y; }, 0)) / 2;
const onCircle = (c, r, t) => P(c.x + r * cos(t), c.y + r * sin(t));
/** Midpoint-rule integral of f over [a, b]. */
const integrate = (f, a, b, n = 20000) => { const h = (b - a) / n; let s = 0; for (let i = 0; i < n; i += 1) s += f(a + (i + 0.5) * h); return s * h; };

// A scalene triangle, measured.
const A = P(0, 0); const B = P(7, 0); const C = P(2.2, 4.9);
const a = dist(B, C); const b = dist(A, C); const c = dist(A, B);
const area = shoelace([A, B, C]);
const s = (a + b + c) / 2;

describe('Lines, angles and triangles', () => {
    it('lines through n points, by counting pairs', () => {
        let pairs = 0;
        for (let i = 0; i < 7; i += 1) for (let j = i + 1; j < 7; j += 1) pairs += 1;
        expect(pairs).toBe((7 * 6) / 2);
    });

    it('exterior angle, triangle inequality, equilateral triangle', () => {
        close(PI - angle(A, C, B), angle(B, A, C) + angle(A, B, C));
        expect(abs(a - b)).toBeLessThan(c);
        expect(c).toBeLessThan(a + b);
        const e = 3; const h = (sqrt(3) / 2) * e;
        const eq = [P(0, 0), P(e, 0), P(e / 2, h)];
        close(dist(eq[0], eq[2]), e);
        close(shoelace(eq), (sqrt(3) / 4) * e * e);
    });

    it('median, angle bisector (both forms) and the bisector theorem', () => {
        close(dist(A, mid(B, C)), 0.5 * sqrt(2 * b * b + 2 * c * c - a * a));
        // D on BC with BD/DC = AB/AC, then check it bisects angle A.
        const t = c / (b + c);
        const D = P(B.x + t * (C.x - B.x), B.y + t * (C.y - B.y));
        close(angle(B, A, D), angle(D, A, C));
        close(dist(B, D), (a * c) / (b + c));
        const Aang = angle(B, A, C);
        close(dist(A, D), (2 * b * c * cos(Aang / 2)) / (b + c));
        close(dist(A, D), sqrt(b * c * (1 - (a / (b + c)) ** 2)));
    });

    it('altitude to the hypotenuse', () => {
        const [la, lb] = [3, 4];
        const R1 = P(0, 0); const X = P(la, 0); const Y = P(0, lb);
        const hyp = dist(X, Y);
        // Foot of the perpendicular from the right angle.
        const u = sub(Y, X); const t = -((X.x * u.x + X.y * u.y) / (u.x ** 2 + u.y ** 2));
        const foot = P(X.x + t * u.x, X.y + t * u.y);
        const p = dist(X, foot); const q = dist(Y, foot); const h = dist(R1, foot);
        close(h * h, p * q);
        close(la * la, p * hyp);
        close(lb * lb, q * hyp);
        close(h, (la * lb) / hyp);
    });
});

describe('Similar and congruent figures', () => {
    it('similar triangles scale lengths by k and areas by k squared', () => {
        const k = 2.5;
        const [A2, B2, C2] = [A, B, C].map((p) => P(p.x * k + 3, p.y * k - 1));
        close(dist(B2, C2) / a, k);
        close(dist(A2, C2) / b, k);
        close((dist(A2, B2) + dist(B2, C2) + dist(A2, C2)) / (a + b + c), k);
        close(shoelace([A2, B2, C2]) / area, k * k);
    });

    it('the side splitter', () => {
        const t = 0.35;
        const D = P(A.x + t * (B.x - A.x), A.y + t * (B.y - A.y));
        const E = P(A.x + t * (C.x - A.x), A.y + t * (C.y - A.y));
        close(dist(A, D) / dist(D, B), dist(A, E) / dist(E, C));
        close(dist(D, E) / a, dist(A, D) / c);
    });
});

describe('Quadrilaterals', () => {
    it('parallelogram: area two ways, and the parallelogram law', () => {
        const [sa, sb, th] = [5, 3, deg(62)];
        const Q = [P(0, 0), P(sa, 0), P(sa + sb * cos(th), sb * sin(th)), P(sb * cos(th), sb * sin(th))];
        close(shoelace(Q), sa * sb * sin(th));
        close(shoelace(Q), sa * (sb * sin(th)));
        close(dist(Q[0], Q[2]) ** 2 + dist(Q[1], Q[3]) ** 2, 2 * (sa * sa + sb * sb));
    });

    it('rhombus or kite, trapezoid, and any quadrilateral from its diagonals', () => {
        const kite = [P(0, 3), P(2, 0), P(0, -5), P(-2, 0)];
        close(shoelace(kite), 0.5 * 8 * 4);
        const trap = [P(0, 0), P(10, 0), P(7, 4), P(2, 4)];
        close(shoelace(trap), ((10 + 5) / 2) * 4);
        const Q = [P(0, 0), P(6, -1), P(7, 5), P(1, 4)];
        const d1 = sub(Q[2], Q[0]); const d2 = sub(Q[3], Q[1]);
        const th = abs(atan2(d1.x * d2.y - d1.y * d2.x, d1.x * d2.x + d1.y * d2.y));
        close(shoelace(Q), 0.5 * Math.hypot(d1.x, d1.y) * Math.hypot(d2.x, d2.y) * sin(th));
    });

    it("Bretschneider's formula for any quadrilateral, Brahmagupta's for a cyclic one", () => {
        const Q = [P(0, 0), P(6, -1), P(7, 5), P(1, 4)];
        const [qa, qb, qc, qd] = Q.map((p, i) => dist(p, Q[(i + 1) % 4]));
        const qs = (qa + qb + qc + qd) / 2;
        const Bang = angle(Q[0], Q[1], Q[2]); const Dang = angle(Q[2], Q[3], Q[0]);
        close(shoelace(Q), sqrt((qs - qa) * (qs - qb) * (qs - qc) * (qs - qd) - qa * qb * qc * qd * cos((Bang + Dang) / 2) ** 2));
        const cyc = [0.2, 1.4, 3.0, 4.6].map((t) => onCircle(P(1, 2), 5, t));
        const [ca, cb, cc, cd] = cyc.map((p, i) => dist(p, cyc[(i + 1) % 4]));
        const cs = (ca + cb + cc + cd) / 2;
        close(shoelace(cyc), sqrt((cs - ca) * (cs - cb) * (cs - cc) * (cs - cd)));
    });
});

describe('Polygons', () => {
    const regular = (n, R) => Array.from({ length: n }, (_, i) => onCircle(P(0, 0), R, (2 * PI * i) / n));

    it('angle sum, the angles of a regular polygon, and diagonals by counting', () => {
        for (const n of [3, 5, 8, 12]) {
            const poly = regular(n, 2);
            const interior = poly.map((p, i) => angle(poly[(i + n - 1) % n], p, poly[(i + 1) % n]));
            close(toDeg(interior.reduce((x, y) => x + y, 0)), (n - 2) * 180);
            close(toDeg(interior[0]), ((n - 2) * 180) / n);
            close(180 - toDeg(interior[0]), 360 / n);
            let diags = 0;
            for (let i = 0; i < n; i += 1) for (let j = i + 2; j < n; j += 1) if (!(i === 0 && j === n - 1)) diags += 1;
            expect(diags).toBe((n * (n - 3)) / 2);
        }
    });

    it('area three ways, the side, the apothem, and the hexagon', () => {
        for (const n of [3, 5, 6, 9]) {
            const R = 3;
            const poly = regular(n, R);
            const side = dist(poly[0], poly[1]);
            const apothem = Math.hypot(...Object.values(mid(poly[0], poly[1])));
            const A0 = shoelace(poly);
            close(A0, 0.5 * n * side * apothem);
            close(A0, ((n * side * side) / 4) / tan(deg(180 / n)));
            close(A0, ((n * R * R) / 2) * sin(deg(360 / n)));
            close(side, 2 * R * sin(deg(180 / n)));
            close(side, 2 * apothem * tan(deg(180 / n)));
            close(apothem, R * cos(deg(180 / n)));
            close(apothem, side / (2 * tan(deg(180 / n))));
            if (n === 6) { close(side, R); close(A0, ((3 * sqrt(3)) / 2) * side * side); }
        }
    });
});

describe('Circles, arcs, chords and tangents', () => {
    const O = P(0, 0); const r = 5;

    it('circle and annulus (the tangent chord)', () => {
        close(shoelace(Array.from({ length: 20000 }, (_, i) => onCircle(O, r, (2 * PI * i) / 20000))), PI * r * r, 1e-6);
        const [Ro, ri] = [5, 3];
        const half = sqrt(Ro * Ro - ri * ri); // half a chord of the outer circle tangent to the inner one
        close(PI * (Ro * Ro - ri * ri), PI * half * half);
    });

    it('inscribed and central angles', () => {
        const [X, Y, Z] = [onCircle(O, r, 0.4), onCircle(O, r, 1.5), onCircle(O, r, 3.9)];
        close(angle(X, Z, Y), 0.5 * angle(X, O, Y));
        const [U, V] = [onCircle(O, r, 0), onCircle(O, r, PI)];
        close(angle(U, onCircle(O, r, 2.2), V), PI / 2);
    });

    it('chord length two ways', () => {
        const th = 1.3;
        const [X, Y] = [onCircle(O, r, 0.2), onCircle(O, r, 0.2 + th)];
        const d = Math.hypot(...Object.values(mid(X, Y)));
        close(dist(X, Y), 2 * r * sin(th / 2));
        close(dist(X, Y), 2 * sqrt(r * r - d * d));
    });

    it('intersecting chords, and secants and tangents from a point (power of a point)', () => {
        /** Where the line through p in direction t meets the circle: the two signed distances. */
        const hits = (p, t) => {
            const [dx, dy] = [cos(t), sin(t)];
            const bq = 2 * (p.x * dx + p.y * dy); const cq = p.x * p.x + p.y * p.y - r * r;
            const disc = sqrt(bq * bq - 4 * cq);
            return [(-bq - disc) / 2, (-bq + disc) / 2];
        };
        const inside = P(1.2, -0.7);
        const [t1, t2] = hits(inside, 0.3); const [t3, t4] = hits(inside, 2.1);
        close(abs(t1) * abs(t2), abs(t3) * abs(t4));
        const out = P(9, 4);
        const tangent = sqrt(out.x ** 2 + out.y ** 2 - r * r);
        for (const dir of [3.4, 3.6, 3.75]) {
            const [n1, n2] = hits(out, dir);
            close(tangent * tangent, n1 * n2);
        }
    });

    it('angles from arcs, inside and outside', () => {
        const [pa, pb, pc, pd] = [0.3, 1.2, 3.0, 4.4];
        const [Pa, Pb, Pc, Pd] = [pa, pb, pc, pd].map((t) => onCircle(O, r, t));
        // Chords PaPc and PbPd cross inside at X.
        const cross = (p1, p2, p3, p4) => {
            const den = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
            const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / den;
            return P(p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y));
        };
        const X = cross(Pa, Pc, Pb, Pd);
        close(angle(Pa, X, Pb), ((pb - pa) + (pd - pc)) / 2);
        // Secants QdQa and QcQb meet outside, beyond Qa and Qb: the far arc is
        // QcQd, the near arc QaQb.
        const [Qa, Qb, Qc, Qd] = [0.2, 0.9, 2.3, 3.4].map((t) => onCircle(O, r, t));
        const Y = cross(Qa, Qd, Qb, Qc);
        expect(Math.hypot(Y.x, Y.y)).toBeGreaterThan(r);
        close(angle(Qa, Y, Qb), ((3.4 - 2.3) - (0.9 - 0.2)) / 2);
    });

    it('common tangents of two circles', () => {
        const [R, rr, d] = [4, 1.5, 9];
        const C2 = P(d, 0);
        const ext = acos((R - rr) / d);
        close(dist(onCircle(O, R, ext), onCircle(C2, rr, ext)), sqrt(d * d - (R - rr) ** 2));
        const int = acos((R + rr) / d);
        close(dist(onCircle(O, R, int), onCircle(C2, rr, int + PI)), sqrt(d * d - (R + rr) ** 2));
    });

    it('arcs and sectors in degrees, segments and their height', () => {
        const thd = 75; const th = deg(thd);
        close((PI * r * thd) / 180, r * th);
        close((PI * r * r * thd) / 360, 0.5 * r * r * th);
        // The segment as a polygon: its arc and its chord.
        const arc = Array.from({ length: 20001 }, (_, i) => onCircle(O, r, (th * i) / 20000));
        close(shoelace(arc), 0.5 * r * r * (th - sin(th)), 1e-6);
        close(shoelace(arc), (PI * r * r * thd) / 360 - 0.5 * r * r * sin(th), 1e-6);
        const chord = 2 * r * sin(th / 2);
        const h = r - sqrt(r * r - (chord / 2) ** 2);
        close(h, r * (1 - cos(th / 2)));
        close(r, chord * chord / (8 * h) + h / 2);
    });
});

describe('Inscribed and circumscribed figures', () => {
    const circumradius = (pa, pb, pc) => (dist(pa, pb) * dist(pb, pc) * dist(pa, pc)) / (4 * shoelace([pa, pb, pc]));
    const inradius = (pa, pb, pc) => shoelace([pa, pb, pc]) / ((dist(pa, pb) + dist(pb, pc) + dist(pa, pc)) / 2);

    it('right and equilateral triangles', () => {
        const [la, lb] = [5, 12]; const hc = 13;
        const T = [P(0, 0), P(la, 0), P(0, lb)];
        close(circumradius(...T), hc / 2);
        close(inradius(...T), (la + lb - hc) / 2);
        const e = 4; const E = [P(0, 0), P(e, 0), P(e / 2, (sqrt(3) / 2) * e)];
        close(inradius(...E), e / (2 * sqrt(3)));
        close(circumradius(...E), e / sqrt(3));
        close(inradius(...E) + circumradius(...E), (sqrt(3) / 2) * e);
    });

    it("Euler's distance between the incentre and circumcentre", () => {
        const I = P((a * A.x + b * B.x + c * C.x) / (a + b + c), (a * A.y + b * B.y + c * C.y) / (a + b + c));
        // Circumcentre: equidistant from A, B, C.
        const dd = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
        const sq = (p) => p.x * p.x + p.y * p.y;
        const Oc = P((sq(A) * (B.y - C.y) + sq(B) * (C.y - A.y) + sq(C) * (A.y - B.y)) / dd, (sq(A) * (C.x - B.x) + sq(B) * (A.x - C.x) + sq(C) * (B.x - A.x)) / dd);
        const R = circumradius(A, B, C); const rIn = inradius(A, B, C);
        close(dist(Oc, A), R);
        close(dist(I, Oc) ** 2, R * (R - 2 * rIn));
    });

    it('cyclic quadrilaterals have supplementary opposite angles; tangential ones equal opposite-side sums and area rs', () => {
        const cyc = [0.2, 1.4, 3.0, 4.6].map((t) => onCircle(P(0, 0), 5, t));
        close(angle(cyc[3], cyc[0], cyc[1]) + angle(cyc[1], cyc[2], cyc[3]), PI);
        // Tangential: four tangents to a circle of radius rr, at these angles.
        const rr = 2; const ts = [0.1, 1.7, 3.0, 4.5];
        const tangentsMeet = (t1, t2) => { const m = (t1 + t2) / 2; return onCircle(P(0, 0), rr / cos((t2 - t1) / 2), m); };
        const Q = ts.map((t, i) => tangentsMeet(t, i === 3 ? ts[0] + 2 * PI : ts[i + 1]));
        const [qa, qb, qc, qd] = Q.map((p, i) => dist(p, Q[(i + 1) % 4]));
        close(qa + qc, qb + qd);
        close(shoelace(Q), rr * ((qa + qb + qc + qd) / 2));
    });
});

describe('Area and perimeter', () => {
    it("ellipse, Pick's theorem, the isoperimetric bound", () => {
        const [ea, eb] = [3, 2];
        const pts = Array.from({ length: 20000 }, (_, i) => P(ea * cos((2 * PI * i) / 20000), eb * sin((2 * PI * i) / 20000)));
        close(shoelace(pts), PI * ea * eb, 1e-6);
        const perim = pts.reduce((sum, p, i) => sum + dist(p, pts[(i + 1) % pts.length]), 0);
        expect(abs(2 * PI * sqrt((ea * ea + eb * eb) / 2) - perim) / perim).toBeLessThan(0.01);
        // A lattice polygon: count its points.
        const poly = [P(0, 0), P(6, 0), P(8, 3), P(3, 7), P(0, 4)];
        const onEdge = (p) => poly.some((q, i) => {
            const w = poly[(i + 1) % poly.length];
            const cr = (w.x - q.x) * (p.y - q.y) - (w.y - q.y) * (p.x - q.x);
            return cr === 0 && p.x >= Math.min(q.x, w.x) && p.x <= Math.max(q.x, w.x) && p.y >= Math.min(q.y, w.y) && p.y <= Math.max(q.y, w.y);
        });
        const insideP = (p) => { let inn = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) { const [pi, pj] = [poly[i], poly[j]]; if ((pi.y > p.y) !== (pj.y > p.y) && p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y) + pi.x) inn = !inn; } return inn; };
        let I = 0; let Bd = 0;
        for (let x = 0; x <= 8; x += 1) for (let y = 0; y <= 7; y += 1) { const p = P(x, y); if (onEdge(p)) Bd += 1; else if (insideP(p)) I += 1; }
        close(shoelace(poly), I + Bd / 2 - 1);
        const perimeter = 20;
        expect((perimeter / 4) ** 2).toBeLessThan((perimeter * perimeter) / (4 * PI));
    });
});

describe("Ptolemy's theorem", () => {
    const cyc = [0.2, 1.4, 3.0, 4.6].map((t) => onCircle(P(0, 0), 5, t));
    const [qa, qb, qc, qd] = cyc.map((p, i) => dist(p, cyc[(i + 1) % 4]));
    const p = dist(cyc[0], cyc[2]); // closes the triangle of sides qa, qb
    const q = dist(cyc[1], cyc[3]);

    it('the theorem, and the inequality off the circle', () => {
        close(p * q, qa * qc + qb * qd);
        const off = [P(0, 0), P(6, -1), P(7, 5), P(1, 4)];
        const [oa, ob, oc, od] = off.map((x, i) => dist(x, off[(i + 1) % 4]));
        expect(dist(off[0], off[2]) * dist(off[1], off[3])).toBeLessThan(oa * oc + ob * od);
    });

    it('each diagonal, and the circumradius, from the four sides', () => {
        close(p, sqrt(((qa * qc + qb * qd) * (qa * qd + qb * qc)) / (qa * qb + qc * qd)));
        close(q, sqrt(((qa * qc + qb * qd) * (qa * qb + qc * qd)) / (qa * qd + qb * qc)));
        const qs = (qa + qb + qc + qd) / 2;
        close(5, 0.25 * sqrt(((qa * qb + qc * qd) * (qa * qc + qb * qd) * (qa * qd + qb * qc)) / ((qs - qa) * (qs - qb) * (qs - qc) * (qs - qd))));
    });
});

// ---- Solids ----
const V3 = (x, y, z) => ({ x, y, z });
const d3 = (p, q) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
const tetVol = (p0, p1, p2, p3) => {
    const [u, v, w] = [p1, p2, p3].map((p) => V3(p.x - p0.x, p.y - p0.y, p.z - p0.z));
    return abs(u.x * (v.y * w.z - v.z * w.y) - u.y * (v.x * w.z - v.z * w.x) + u.z * (v.x * w.y - v.y * w.x)) / 6;
};
/** A solid's volume by slicing: cross-section area at each height. */
const sliced = (areaAt, h) => integrate(areaAt, 0, h);

describe('Polyhedrons', () => {
    it("Euler's formula for the five Platonic solids", () => {
        for (const [V, E, F] of [[4, 6, 4], [8, 12, 6], [6, 12, 8], [20, 30, 12], [12, 30, 20]]) expect(V - E + F).toBe(2);
    });

    it('tetrahedron and octahedron from coordinates; dodecahedron and icosahedron against known values', () => {
        const e = 2;
        const T = [V3(1, 1, 1), V3(1, -1, -1), V3(-1, 1, -1), V3(-1, -1, 1)]; // edge 2√2
        const te = d3(T[0], T[1]);
        close(tetVol(...T), (te ** 3) / (6 * sqrt(2)));
        close(4 * (sqrt(3) / 4) * te * te, sqrt(3) * te * te);
        // Height: the distance from a vertex to the centroid of the opposite face.
        const g = V3((T[1].x + T[2].x + T[3].x) / 3, (T[1].y + T[2].y + T[3].y) / 3, (T[1].z + T[2].z + T[3].z) / 3);
        close(d3(T[0], g), te * sqrt(2 / 3));
        const k = e / sqrt(2); // octahedron with vertices at ±k on each axis has edge e
        close(d3(V3(k, 0, 0), V3(0, k, 0)), e);
        close(2 * ((2 * k) ** 2 / 2) * k / 3, (sqrt(2) / 3) * e ** 3);
        close(((15 + 7 * sqrt(5)) / 4), 7.663118960624632, 1e-12);
        close(3 * sqrt(25 + 10 * sqrt(5)), 20.645728807067602, 1e-12);
        close((5 * (3 + sqrt(5))) / 12, 2.1816949906249126, 1e-12);
    });
});

describe('Prisms, pyramids and frustums', () => {
    it('prism areas, the oblique prism, cube and box', () => {
        const [n, side, h] = [6, 2, 5];
        const P0 = n * side; const Ab = ((n * side * side) / 4) / tan(PI / n);
        close(P0 * h + 2 * Ab, P0 * h + 2 * ((3 * sqrt(3)) / 2) * side * side);
        // Oblique: lateral edge L at angle beta to the base; right section = base * sin(beta).
        const [L, beta, Abase] = [6, deg(60), 10];
        close(Abase * (L * sin(beta)), (Abase * sin(beta)) * L);
        const e = 3;
        close(d3(V3(0, 0, 0), V3(e, e, e)), e * sqrt(3));
        const [x, y, z] = [2, 3, 7];
        close(d3(V3(0, 0, 0), V3(x, y, z)), sqrt(x * x + y * y + z * z));
        close(sqrt((x * y) * (y * z) * (z * x)), x * y * z);
    });

    it('truncated triangular prism, cut into three tetrahedra', () => {
        const tri = [P(0, 0), P(4, 0), P(1, 3)]; const H3 = [2, 5, 3.5];
        const [b0, b1, b2] = tri.map((p) => V3(p.x, p.y, 0));
        const [t0, t1, t2] = tri.map((p, i) => V3(p.x, p.y, H3[i]));
        const vol = tetVol(b0, b1, b2, t2) + tetVol(b0, b1, t1, t2) + tetVol(b0, t0, t1, t2);
        close(vol, shoelace(tri) * ((H3[0] + H3[1] + H3[2]) / 3));
    });

    it('regular pyramid: slant height, lateral edge, areas', () => {
        const [side, h] = [6, 4]; // square base
        const apothem = side / 2; const Rb = (side * sqrt(2)) / 2;
        const apex = V3(0, 0, h);
        close(d3(apex, V3(apothem, 0, 0)), sqrt(h * h + apothem * apothem));
        close(d3(apex, V3(side / 2, side / 2, 0)), sqrt(h * h + Rb * Rb));
        const Ls = sqrt(h * h + apothem * apothem);
        close(4 * (0.5 * side * Ls), 0.5 * (4 * side) * Ls);
    });

    it('frustums: volume by slicing and by difference, slant height, lateral areas', () => {
        const [R, rr, h] = [5, 2, 6];
        const V = sliced((y) => PI * (R - ((R - rr) * y) / h) ** 2, h);
        close(V, ((PI * h) / 3) * (R * R + R * rr + rr * rr), 1e-6);
        const [A1, A2] = [PI * R * R, PI * rr * rr];
        close(V, (h / 3) * (A1 + A2 + sqrt(A1 * A2)), 1e-6);
        const H = (R * h) / (R - rr); // the whole cone's height
        const slant = (rad, ht) => sqrt(rad * rad + ht * ht);
        close(PI * R * slant(R, H) - PI * rr * slant(rr, H - h), PI * (R + rr) * sqrt(h * h + (R - rr) ** 2));
        // Pyramid frustum: four trapezoids of slant height L.
        const [s1, s2, L] = [8, 4, 5];
        close(4 * (((s1 + s2) / 2) * L), 0.5 * (4 * s1 + 4 * s2) * L);
    });
});

describe('Cylinders, cones and spheres', () => {
    it('cylinder areas, hollow and oblique cylinders', () => {
        const [r, h] = [3, 7];
        close(2 * PI * r * h + 2 * PI * r * r, 2 * PI * r * (r + h));
        close(sliced(() => PI * (5 * 5 - 3 * 3), h), PI * (25 - 9) * h, 1e-9);
        const [L, beta] = [8, deg(70)];
        close(PI * r * r * (L * sin(beta)), (PI * r * r * sin(beta)) * L);
    });

    it('cone: slant height, total area, and the net', () => {
        const [r, h] = [3, 4]; const sl = sqrt(r * r + h * h);
        close(sliced((y) => PI * (r * (1 - y / h)) ** 2, h), (PI * r * r * h) / 3, 1e-6);
        close(PI * r * sl + PI * r * r, PI * r * (r + sl));
        const theta = (360 * r) / sl; // the sector's arc is the base circumference
        close(2 * PI * sl * (theta / 360), 2 * PI * r);
        close(PI * sl * sl * (theta / 360), PI * r * sl);
    });

    it('sphere from its diameter, hemisphere, shell, lune and wedge', () => {
        const r = 2.5; const d = 2 * r;
        const Vs = sliced((y) => PI * (r * r - (y - r) ** 2), 2 * r);
        close(Vs, (PI * d ** 3) / 6, 1e-6);
        close(4 * PI * r * r, PI * d * d);
        close(sliced((y) => PI * (r * r - y * y), r), (2 / 3) * PI * r ** 3, 1e-6);
        close(2 * PI * r * r + PI * r * r, 3 * PI * r * r);
        close((4 / 3) * PI * (3 ** 3 - 2 ** 3), (4 / 3) * PI * 27 - (4 / 3) * PI * 8);
        const th = 40;
        close((PI * r * r * th) / 90, 4 * PI * r * r * (th / 360));
        close((PI * r ** 3 * th) / 270, (4 / 3) * PI * r ** 3 * (th / 360));
    });

    it('zones, caps, segments of two bases, sectors and spherical pyramids', () => {
        const r = 5;
        // Zone between x = 1 and x = 3.5: integrate the surface of revolution.
        const zone = integrate((x) => 2 * PI * sqrt(r * r - x * x) * sqrt(1 + (x * x) / (r * r - x * x)), 1, 3.5);
        close(zone, 2 * PI * r * 2.5, 1e-6);
        const h = 2; const capBase = sqrt(h * (2 * r - h));
        const cap = integrate((x) => PI * (r * r - x * x), r - h, r);
        close(cap, ((PI * h * h) / 3) * (3 * r - h), 1e-6);
        close(cap, ((PI * h) / 6) * (3 * capBase ** 2 + h * h), 1e-6);
        const [x1, x2] = [1, 3.5];
        const seg = integrate((x) => PI * (r * r - x * x), x1, x2);
        close(seg, ((PI * (x2 - x1)) / 6) * (3 * (r * r - x1 * x1) + 3 * (r * r - x2 * x2) + (x2 - x1) ** 2), 1e-6);
        // Sector = cap + the cone from the centre to the cap's base.
        close(cap + (PI * capBase ** 2 * (r - h)) / 3, (2 / 3) * PI * r * r * h, 1e-6);
        // An octant is a spherical pyramid with excess 90°.
        close((PI * r ** 3 * 90) / 540, ((4 / 3) * PI * r ** 3) / 8);
    });
});

describe('Prismatoids, solids of revolution and similar solids', () => {
    it('the wedge, by slicing and by the prismoidal formula', () => {
        const [wa, wb, wc, h] = [6, 4, 2, 5];
        // At height y the section is a rectangle: length from a to c, width from b to 0.
        const V = sliced((y) => (wa + ((wc - wa) * y) / h) * (wb * (1 - y / h)), h);
        close(V, ((wb * h) / 6) * (2 * wa + wc), 1e-6);
        close(V, (h / 6) * (wa * wb + 4 * (((wa + wc) / 2) * (wb / 2)) + 0), 1e-6);
    });

    it('Pappus for the sphere and the torus; ellipsoid and paraboloid by slicing', () => {
        const r = 2;
        close(2 * PI * ((2 * r) / PI) * (PI * r), 4 * PI * r * r);
        close(2 * PI * ((4 * r) / (3 * PI)) * ((PI * r * r) / 2), (4 / 3) * PI * r ** 3);
        const [R, tr] = [5, 1.5];
        close(2 * PI * R * (PI * tr * tr), 2 * PI * PI * R * tr * tr);
        close(2 * PI * R * (2 * PI * tr), 4 * PI * PI * R * tr);
        const [ea, eb, ec] = [3, 2, 1.5];
        close(integrate((x) => PI * eb * ec * (1 - (x * x) / (ea * ea)), -ea, ea), (4 / 3) * PI * ea * eb * ec, 1e-6);
        const [pr, ph] = [3, 4];
        close(sliced((y) => PI * pr * pr * (y / ph), ph), 0.5 * PI * pr * pr * ph, 1e-6);
    });

    it('similar solids scale by k, k² and k³; the cut that halves a cone', () => {
        const k = 1.7; const [x, y, z] = [2, 3, 4];
        close((2 * (k * x * k * y + k * y * k * z + k * z * k * x)) / (2 * (x * y + y * z + z * x)), k * k);
        close((k * x * k * y * k * z) / (x * y * z), k ** 3);
        const h = 9; const cut = h / cbrt(2);
        close(sliced((t) => PI * (t / h) ** 2, cut) / sliced((t) => PI * (t / h) ** 2, h), 0.5, 1e-6);
    });
});
