import { describe, it, expect } from 'vitest';

// ESAS › Fundamentals of Deformable Bodies formula cards, checked with
// numbers (Library round, 2026-11-17). Deflections and slopes by integrating
// EIy'' = M numerically; beam shear by summing the stress over the section;
// Mohr's circle against the transformation equations swept over every angle;
// buckling by solving the column's differential equation; energy by
// integrating load against deformation.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, sin, cos, PI, abs, cbrt, max, min } = Math;
const simpson = (f, a, b, n = 2000) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i += 1) s += f(a + i * h) * (i % 2 ? 4 : 2); return (s * h) / 3; };
const E = 200e9; const nu = 0.3;

// Integrate EI y'' = M(x) with y(0), y'(0) given, by the trapezoid rule on a fine grid.
function elastic(M, EI, L, y0, slope0, n = 200000) {
    const h = L / n; let y = y0; let s = slope0; const ys = [y]; const ss = [s];
    for (let i = 0; i < n; i += 1) {
        const x = i * h; const k1 = M(x) / EI; const k2 = M(x + h) / EI;
        y += s * h + ((2 * k1 + k2) / 6) * h * h; s += ((k1 + k2) / 2) * h;
        ys.push(y); ss.push(s);
    }
    return { y: ys, s: ss, h };
}

describe('Simple stress and strain', () => {
    it('double shear halves the stress; bearing on t × d; inclined planes peak at 45°', () => {
        const V = 30e3; const d = 0.02; const A = (PI * d * d) / 4;
        close(V / (2 * A), 47.746e6, 1e-4);
        close(60e3 / (0.012 * 0.02), 250e6);
        const P = 100e3; const Ab = 0.001;
        let best = 0; let at = 0;
        for (let t = 0; t <= 90; t += 0.5) { const tau = (P / (2 * Ab)) * sin(2 * (t * PI) / 180); if (tau > best) { best = tau; at = t; } }
        close(best, P / (2 * Ab)); expect(at).toBe(45);
        close((P / Ab) * cos(0) ** 2, P / Ab);
    });

    it('G = E/(2(1+ν)); generalized Hooke; own weight is half the end load; composite bars share by stiffness', () => {
        close(E / (2 * (1 + nu)), 76.923e9, 1e-4);
        const sx = 100e6; const sy = 50e6; const ex = (sx - nu * sy) / E;
        close(ex * E, sx - nu * sy);
        // own weight: integrate the strain of each slice, carrying the weight below it
        const rho = 7850; const g = 9.81; const L = 100;
        close(simpson((x) => (rho * g * (L - x)) / E, 0, L), (rho * g * L * L) / (2 * E));
        const P = 200e3; const E1A1 = 200e9 * 1e-3; const E2A2 = 70e9 * 2e-3;
        const P1 = (P * E1A1) / (E1A1 + E2A2); const P2 = P - P1;
        close((P1 * 1) / E1A1, (P2 * 1) / E2A2); // equal stretch
        // strain energy by integrating the load-deformation line
        const Aa = 5e-4; const La = 2; const Pa = 80e3; const delta = (Pa * La) / (Aa * E);
        close(simpson((dd) => (Aa * E * dd) / La, 0, delta), (Pa * Pa * La) / (2 * Aa * E));
    });
});

describe('Thermal stress', () => {
    it('a gap closes before stress builds; bars in series share one force', () => {
        const alpha = 11.7e-6; const L = 10; const dT = 50; const gap = 0.002;
        const free = alpha * L * dT; expect(free).toBeGreaterThan(gap);
        const sigma = (E * (free - gap)) / L; close(sigma, 77e6, 1e-3);
        expect(alpha * L * 15 < gap).toBe(true); // a 15 °C rise doesn't close the gap: no stress
        // steel 1 m (A 500 mm²) + aluminium 1.5 m (A 800 mm², E 70 GPa, α 23e-6), ΔT = 40
        const segs = [[1, 5e-4, 200e9, 11.7e-6], [1.5, 8e-4, 70e9, 23e-6]];
        const P = (segs.reduce((s, [Ll, , , a]) => s + a * Ll, 0) * 40) / segs.reduce((s, [Ll, A, Ee]) => s + Ll / (A * Ee), 0);
        // total length change zero: thermal growth minus elastic shortening of each segment
        close(segs.reduce((s, [Ll, A, Ee, a]) => s + a * Ll * 40 - (P * Ll) / (A * Ee), 0), 0, 1e-9);
    });
});

describe('Torsion', () => {
    it('hollow vs solid by integrating τ over the section; shaft size for power', () => {
        const T = 5000; const do_ = 0.08; const di = 0.06;
        const J = (PI * (do_ ** 4 - di ** 4)) / 32;
        // torque from integrating τ(r) r dA with τ = τmax r/c
        const tmax = (T * (do_ / 2)) / J;
        close(simpson((rr) => tmax * (rr / (do_ / 2)) * rr * 2 * PI * rr, di / 2, do_ / 2), T, 1e-9);
        const P = 75e3; const f = 1500 / 60; const Tq = P / (2 * PI * f); const tauA = 60e6;
        const d = cbrt((16 * Tq) / (PI * tauA)); close((16 * Tq) / (PI * d ** 3), tauA);
        close(d, 0.03435, 1e-3); // T = 477.5 N·m
    });

    it('shaft fixed at both ends: both parts twist equally; series angles add', () => {
        const T = 1000; const G = 80e9; const J = (PI * 0.05 ** 4) / 32; const LA = 0.4; const LB = 0.6;
        const TA = (T * LB) / (LA + LB); const TB = T - TA;
        close((TA * LA) / (G * J), (TB * LB) / (G * J)); expect(TA).toBeGreaterThan(TB);
    });

    it('helical spring: k from δ, and the energy ½Pδ equals the twisting energy of the wire', () => {
        const P = 500; const R = 0.04; const d = 0.008; const n = 10; const G = 80e9;
        const delta = (64 * P * R ** 3 * n) / (G * d ** 4);
        const Jw = (PI * d ** 4) / 32; const Lw = 2 * PI * R * n; const Tw = P * R;
        close(0.5 * P * delta, (Tw * Tw * Lw) / (2 * G * Jw), 1e-12);
    });
});

describe('Shear, moment, flexure', () => {
    it('dM/dx = V and maximum moments, by building the diagrams numerically', () => {
        const w = 10e3; const L = 6;
        const V = (x) => (w * L) / 2 - w * x; const M = (x) => ((w * L) / 2) * x - (w * x * x) / 2;
        close(simpson(V, 0, L / 2), M(L / 2)); close(M(L / 2), (w * L * L) / 8);
        const P = 20e3; const a = 2; const b = 4; const Lp = a + b;
        const Mp = (x) => (x < a ? ((P * b) / Lp) * x : ((P * a) / Lp) * (Lp - x));
        close(Mp(a), (P * a * b) / Lp); close(Mp(Lp / 2 - 1) <= Mp(a) ? Mp(a) : 0, (P * a * b) / Lp);
        close(((P * 3) / 6) * 3, (P * 6) / 4);
        close(w * L * (L / 2), (w * L * L) / 2); // cantilever uniform
    });

    it('section modulus; σ = Ey/ρ; the flexure stresses integrate back to M', () => {
        const b = 0.1; const h = 0.3; const I = (b * h ** 3) / 12; close(I / (h / 2), (b * h * h) / 6);
        const M = 40e3; const sigma = (y) => (M * y) / I;
        close(simpson((y) => sigma(y) * y * b, -h / 2, h / 2), M);
        close(simpson((y) => sigma(y) * b, -h / 2, h / 2), 0, 1e-9); // no net axial force
        const flat = (h * b ** 3) / 12 / (b / 2); expect((b * h * h) / 6 / flat).toBeCloseTo(3, 9);
        const rho = (E * I) / M; close(sigma(h / 2), (E * (h / 2)) / rho);
    });

    it('transformed section: steel plates on timber carry n times the timber stress at the same level', () => {
        const Ew = 10e9; const Es = 200e9; const n = Es / Ew;
        const strain = 0.0004; close(Es * strain, n * Ew * strain);
    });

    it('beam shear: VQ/(Ib) peaks at 1.5V/A (rectangle) and 4V/3A (circle); it integrates to V', () => {
        const b = 0.1; const h = 0.3; const V = 50e3; const I = (b * h ** 3) / 12;
        const tau = (y) => (V * (b * (h / 2 - y) * ((h / 2 + y) / 2))) / (I * b);
        close(tau(0), (1.5 * V) / (b * h)); close(simpson((y) => tau(y) * b, -h / 2, h / 2), V);
        const r = 0.05; const Ic = (PI * r ** 4) / 4; const Q = (2 / 3) * r ** 3;
        close((V * Q) / (Ic * 2 * r), (4 * V) / (3 * PI * r * r));
        const q = (V * (b * 0.05 * 0.125)) / I; close(2000 / q, 2000 / q); expect(q).toBeGreaterThan(0);
    });
});

describe('Beam deflection by integrating the elastic curve', () => {
    const EI = 200e9 * 8e-6; const L = 4; const P = 10e3; const w = 5e3;

    it('cantilever: end load and uniform load, deflection and slope', () => {
        // x from the fixed end; M(x) = −P(L − x)
        const c1 = elastic((x) => -P * (L - x), EI, L, 0, 0);
        close(-c1.y.at(-1), (P * L ** 3) / (3 * EI), 1e-6); close(-c1.s.at(-1), (P * L * L) / (2 * EI), 1e-6);
        const c2 = elastic((x) => (-w * (L - x) ** 2) / 2, EI, L, 0, 0);
        close(-c2.y.at(-1), (w * L ** 4) / (8 * EI), 1e-6); close(-c2.s.at(-1), (w * L ** 3) / (6 * EI), 1e-6);
    });

    it('simple beam: centre load and uniform load (shoot for y(L) = 0)', () => {
        const solve = (M) => {
            const a = elastic(M, EI, L, 0, 0, 20000); const bb = elastic(M, EI, L, 0, 1, 20000);
            const s0 = -a.y.at(-1) / (bb.y.at(-1) - a.y.at(-1));
            return elastic(M, EI, L, 0, s0, 200000);
        };
        const centre = solve((x) => (x < L / 2 ? (P / 2) * x : (P / 2) * (L - x)));
        close(-lowest(centre.y), (P * L ** 3) / (48 * EI), 1e-5); close(abs(centre.s[0]), (P * L * L) / (16 * EI), 1e-5);
        const unif = solve((x) => ((w * L) / 2) * x - (w * x * x) / 2);
        close(-lowest(unif.y), (5 * w * L ** 4) / (384 * EI), 1e-5); close(abs(unif.s[0]), (w * L ** 3) / (24 * EI), 1e-5);
    });

    it('moment-area: the cantilever tip deflection is the M/EI area\'s moment about the tip', () => {
        const area = simpson((x) => (P * (L - x)) / EI, 0, L); close(area, (P * L * L) / (2 * EI));
        close(simpson((x) => ((P * (L - x)) / EI) * (L - x), 0, L), (P * L ** 3) / (3 * EI));
    });
});

describe("Combined stresses and Mohr's circle", () => {
    it('eccentric load: no tension within the middle third', () => {
        const P = 100e3; const b = 0.3; const d = 0.2; const A = b * d; const I = (d * b ** 3) / 12;
        const edge = (e) => P / A - (P * e * (b / 2)) / I;
        close(edge(b / 6), 0, 1e-9); expect(edge(b / 8)).toBeGreaterThan(0); expect(edge(b / 4)).toBeLessThan(0);
    });

    it('sweeping θ through the transformation equations finds Mohr\'s principal stresses and τmax', () => {
        const sx = 80e6; const sy = -20e6; const txy = 30e6;
        const sig = (t) => (sx + sy) / 2 + ((sx - sy) / 2) * cos(2 * t) + txy * sin(2 * t);
        const tau = (t) => -((sx - sy) / 2) * sin(2 * t) + txy * cos(2 * t);
        let smax = -Infinity; let smin = Infinity; let tmax = 0; let tp = 0;
        for (let i = 0; i <= 36000; i += 1) { const t = (i / 36000) * PI; const s = sig(t); if (s > smax) { smax = s; tp = t; } smin = min(smin, s); tmax = max(tmax, abs(tau(t))); }
        const C = (sx + sy) / 2; const R = sqrt(((sx - sy) / 2) ** 2 + txy ** 2);
        close(smax, C + R, 1e-6); close(smin, C - R, 1e-6); close(tmax, R, 1e-6);
        close(tan2(tp), (2 * txy) / (sx - sy), 1e-3); expect(abs(tau(tp))).toBeLessThan(1e-4 * R); // no shear on a principal plane
        close(sig(0.3) + sig(0.3 + PI / 2), sx + sy); // invariant
    });

    it('shaft under M and T: the formulas are Mohr\'s circle of σ = 32M/πd³, τ = 16T/πd³', () => {
        const M = 3000; const T = 4000; const d = 0.06;
        const s = (32 * M) / (PI * d ** 3); const t = (16 * T) / (PI * d ** 3);
        const R = sqrt((s / 2) ** 2 + t * t);
        close(R, (16 / (PI * d ** 3)) * sqrt(M * M + T * T)); close(s / 2 + R, (16 / (PI * d ** 3)) * (M + sqrt(M * M + T * T)));
    });
});
function tan2(t) { return Math.tan(2 * t); }
function lowest(a) { return a.reduce((m, x) => (x < m ? x : m), Infinity); }

describe('Columns', () => {
    it('Euler: the pinned column\'s equation y\'\' = −(P/EI) y first has a solution at P = π²EI/L²', () => {
        const EI = 200e9 * 2e-6; const L = 3;
        const endY = (P) => { const k = sqrt(P / EI); return sin(k * L); }; // y = sin(kx) with y(0)=0
        let lo = 0.5 * (PI * PI * EI) / (L * L); let hi = 1.5 * (PI * PI * EI) / (L * L);
        for (let i = 0; i < 100; i += 1) { const mid = (lo + hi) / 2; if (endY(mid) > 0) lo = mid; else hi = mid; }
        close((lo + hi) / 2, (PI * PI * EI) / (L * L), 1e-9);
        close((PI * PI * EI) / (2 * L) ** 2, (PI * PI * EI) / (L * L) / 4); // fixed-free is a quarter
    });

    it('slenderness limit ~100 for steel; Johnson meets Euler tangentially', () => {
        close(sqrt((PI * PI * E) / 200e6), 99.35, 1e-3);
        const sy = 250e6; const Cc = sqrt((2 * PI * PI * E) / sy);
        const euler = (s) => (PI * PI * E) / (s * s); const johnson = (s) => sy - ((sy * sy) / (4 * PI * PI * E)) * s * s;
        close(johnson(Cc), euler(Cc), 1e-9);
        const h = 1e-4; close((johnson(Cc + h) - johnson(Cc - h)) / (2 * h), (euler(Cc + h) - euler(Cc - h)) / (2 * h), 1e-6);
    });
});

describe('Pressure vessels and joints', () => {
    it('free-body halves give hoop, longitudinal and sphere stresses; Lamé tends to pD/2t', () => {
        const p = 2e6; const D = 1; const t = 0.01; const L = 2;
        close((p * D * L) / (2 * t * L), (p * D) / (2 * t));
        close((p * (PI * D * D) / 4) / (PI * D * t), (p * D) / (4 * t));
        const ri = 0.5; const ro = 0.5001;
        close(p * ((ro ** 2 + ri ** 2) / (ro ** 2 - ri ** 2)), (p * (2 * ri)) / (2 * (ro - ri)), 1e-3);
        const thick = p * ((0.15 ** 2 + 0.1 ** 2) / (0.15 ** 2 - 0.1 ** 2)); close(thick, 2.6 * p);
    });

    it('riveted joint: capacity is the least of shear, bearing and tearing; efficiency; fillet weld', () => {
        const n = 4; const d = 0.02; const t = 0.012; const b = 0.2;
        const Ps = n * 1 * ((PI * d * d) / 4) * 100e6; const Pb = n * d * t * 200e6; const Pt = (b - 2 * d) * t * 140e6;
        const cap = min(Ps, Pb, Pt); close(cap, Ps); close(cap / (b * t * 140e6), 0.37400, 1e-4);
        close(0.707 * 0.01 * 0.2 * 100e6, 141.4e3);
    });
});
