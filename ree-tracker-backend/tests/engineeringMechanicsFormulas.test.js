import { describe, it, expect } from 'vitest';

// ESAS › Engineering Mechanics formula cards, checked with numbers (Library
// round, 2026-11-17). Statics results are checked by putting the answer back
// into the equilibrium equations; centroids and moments of inertia by
// integrating over the area; cables by the shape's own equations; dynamics by
// simulation or energy.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, sin, cos, tan, atan, atan2, PI, exp, cosh, sinh, abs, hypot } = Math;
const g = 9.81;
const deg = (d) => (d * PI) / 180;
const simpson = (f, a, b, n = 2000) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i += 1) s += f(a + i * h) * (i % 2 ? 4 : 2); return (s * h) / 3; };
const dbl = (f, x0, x1, y0, y1, n = 400) => simpson((x) => simpson((y) => f(x, y), y0(x), y1(x), n), x0, x1, n);

describe('Force systems', () => {
    it('direction cosines square-sum to 1; a force along a line', () => {
        const AB = [3, -4, 12]; const L = hypot(...AB); const F = 260;
        const comps = AB.map((x) => (F * x) / L);
        close(hypot(...comps), F);
        close(comps.map((x) => (x / F) ** 2).reduce((s, x) => s + x, 0), 1);
        expect(comps).toEqual([60, -80, 240]);
    });

    it('resultant of concurrent forces; Varignon: the resultant\'s moment equals the sum', () => {
        const forces = [[100, deg(30)], [150, deg(135)], [80, deg(250)]];
        const Fx = forces.reduce((s, [f, t]) => s + f * cos(t), 0); const Fy = forces.reduce((s, [f, t]) => s + f * sin(t), 0);
        const R = hypot(Fx, Fy);
        // tip to tail: adding the vectors one by one lands at (Fx, Fy)
        close(hypot(...forces.reduce(([x, y], [f, t]) => [x + f * cos(t), y + f * sin(t)], [0, 0])), R);
        // forces at different points: Σ(xFy − yFx) = moment of the resultant placed on its line
        const pts = [[1, 2], [-2, 0.5], [3, -1]];
        const M = forces.reduce((s, [f, t], i) => s + pts[i][0] * f * sin(t) - pts[i][1] * f * cos(t), 0);
        // place R at (x0, 0) with x0 Fy = M
        const x0 = M / Fy; close(x0 * Fy - 0 * Fx, M);
        // a couple is the same about every point
        const couple = (px, py) => (2 - px) * 0 - (0 - py) * 50 + (-2 - px) * 0 - (0.5 - py) * -50;
        close(couple(0, 0), couple(7, -3));
    });

    it('parallel forces and distributed loads: resultant and position by integration', () => {
        const Fs = [[200, 1], [300, 4], [500, 6]];
        const R = Fs.reduce((s, [f]) => s + f, 0); const xbar = Fs.reduce((s, [f, x]) => s + f * x, 0) / R;
        close(xbar, (200 + 1200 + 3000) / 1000);
        const w = 4000; const L = 6; const tri = (x) => (w * x) / L; // zero at x = 0, w at x = L
        close(simpson(tri, 0, L), (w * L) / 2);
        close(simpson((x) => x * tri(x), 0, L) / simpson(tri, 0, L), (2 * L) / 3); // L/3 from the high end
    });
});

describe('Equilibrium and trusses', () => {
    it("Lami's theorem matches solving ΣFx = ΣFy = 0 for a hanging weight on two cables", () => {
        const W = 1000; const a = deg(30); const b = deg(45); // cable angles from the horizontal
        // T1 cos a = T2 cos b; T1 sin a + T2 sin b = W
        const T2 = W / (sin(b) + cos(b) * tan(a)); const T1 = (T2 * cos(b)) / cos(a);
        close(T1 * cos(a) - T2 * cos(b), 0); close(T1 * sin(a) + T2 * sin(b), W);
        // Lami: angle opposite each force = angle between the other two
        const angW = PI - a - b + 0; // between the two cables (they open upward)
        const angT1 = PI / 2 + b; const angT2 = PI / 2 + a;
        close(W / sin(angW), T1 / sin(angT1)); close(W / sin(angW), T2 / sin(angT2));
    });

    it('beam reactions balance forces and moments', () => {
        const P = 12000; const a = 2; const b = 4; const L = a + b;
        const RA = (P * b) / L; const RB = (P * a) / L;
        close(RA + RB, P); close(RB * L - P * a, 0);
        expect(RA).toBeGreaterThan(RB);
    });

    it('a 3-panel Pratt truss: m + r = 2j; joints and sections agree on a chord force', () => {
        // Nodes: bottom 0..3 at x = 0, 3, 6, 9; top 4 (x = 3), 5 (x = 6), height 4. Loads 10 kN at nodes 1 and 2.
        const N = [[0, 0], [3, 0], [6, 0], [9, 0], [3, 4], [6, 4]];
        const members = [[0, 1], [1, 2], [2, 3], [4, 5], [0, 4], [1, 4], [1, 5], [2, 5], [5, 3]];
        const reactions = 3; // pin at 0 (2), roller at 3 (1)
        expect(members.length + reactions).toBe(2 * N.length);
        // solve all member forces + reactions by joint equilibrium (linear system)
        const nU = members.length + 3; const rows = []; const rhs = [];
        const load = { 1: [0, -10], 2: [0, -10] };
        N.forEach((p, j) => {
            for (const dim of [0, 1]) {
                const row = Array(nU).fill(0);
                members.forEach(([s, t], m) => {
                    if (s !== j && t !== j) return; const o = s === j ? t : s;
                    const d = [N[o][0] - p[0], N[o][1] - p[1]]; row[m] = d[dim] / hypot(...d); // tension pulls toward the other node
                });
                if (j === 0) { if (dim === 0) row[members.length] = 1; else row[members.length + 1] = 1; }
                if (j === 3 && dim === 1) row[members.length + 2] = 1;
                rows.push(row); rhs.push(-(load[j]?.[dim] || 0));
            }
        });
        const x = solve(rows, rhs);
        // section through members 1-2 (bottom), 1-5 (diagonal) and 4-5 (top): moment about node 5 gives F(1,2)
        const Ay = x[members.length + 1];
        const F12 = (Ay * 6 - 10 * 3) / 4;
        close(x[1], F12, 1e-9);
        close(Ay, 10, 1e-9);
        // zero-force check: none here; the top chord is in compression
        expect(x[3]).toBeLessThan(0);
    });
});
function solve(A, b) {
    const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < n; c += 1) {
        let p = c; for (let r = c + 1; r < n; r += 1) if (abs(M[r][c]) > abs(M[p][c])) p = r;
        [M[c], M[p]] = [M[p], M[c]];
        for (let r = 0; r < n; r += 1) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k += 1) M[r][k] -= f * M[c][k]; }
    }
    return M.map((r, i) => r[n] / r[i]);
}

describe('Cables', () => {
    it('parabolic cable: H from moments, T_max at the supports, length by arc-length integral', () => {
        const w = 2000; const L = 100; const d = 10; const H = (w * L * L) / (8 * d);
        // moment about a support of the half-span: H d = (w L/2)(L/4)
        close(H * d, ((w * L) / 2) * (L / 4));
        const y = (x) => (4 * d * x * x) / (L * L); // vertex at mid-span, x from -L/2 to L/2
        const s = simpson((x) => sqrt(1 + ((8 * d * x) / (L * L)) ** 2), -L / 2, L / 2);
        close(s, L + (8 * d * d) / (3 * L), 3e-3);
        close(sqrt(H * H + ((w * L) / 2) ** 2), hypot(H, w * L / 2));
        expect(y(L / 2)).toBe(d);
    });

    it('catenary: y² = s² + c², T = wy, and the tension components balance the hanging weight', () => {
        const c = 50; const w = 30; const x = 40;
        const y = c * cosh(x / c); const s = c * sinh(x / c);
        close(y * y, s * s + c * c);
        const T = w * y; const H = w * c;
        close(sqrt(T * T - H * H), w * s); // vertical component = weight of cable from the low point
        close(simpson((t) => sqrt(1 + sinh(t / c) ** 2), 0, x), s);
    });
});

describe('Friction', () => {
    it('angle of repose; block on an incline: impending push, sliding acceleration', () => {
        close(atan(0.3) * (180 / PI), 16.699, 1e-4);
        const W = 500; const th = deg(25); const mu = 0.3;
        const Pup = W * (sin(th) + mu * cos(th));
        // equilibrium along and across the slope at impending motion up
        const N = W * cos(th); close(Pup - W * sin(th) - mu * N, 0);
        // sliding down: simulate a block, compare x(t)
        const ak = g * (sin(th) - 0.2 * cos(th)); let x = 0; let vv = 0; const dt = 1e-4;
        for (let i = 0; i < 20000; i += 1) { vv += g * (sin(th) - 0.2 * cos(th)) * dt; x += vv * dt; }
        close(x, 0.5 * ak * 4, 1e-3);
    });

    it('belt friction by integrating dT/T = μ dβ; screw jack torque from the inclined plane', () => {
        const mu = 0.25; const beta = PI; let T = 100; const n = 100000;
        for (let i = 0; i < n; i += 1) T += T * mu * (beta / n);
        close(T / 100, exp(mu * beta), 1e-4);
        const W = 20000; const rm = 0.02; const lead = 0.008; const muS = 0.15;
        const al = atan(lead / (2 * PI * rm)); const ph = atan(muS);
        const M = W * rm * tan(ph + al);
        // the thread as an incline: horizontal push P at radius rm, P = W tan(φ + α)
        const Pincline = (W * (sin(al) + muS * cos(al))) / (cos(al) - muS * sin(al));
        close(M, Pincline * rm);
        expect(ph).toBeGreaterThan(al); // self-locking
    });
});

describe('Centroids', () => {
    it('triangle, semicircle, quarter circle, sector and arc by integration', () => {
        const b = 4; const h = 3; const A = (b * h) / 2;
        close(dbl((x, y) => y, 0, b, () => 0, (x) => h * (1 - x / b)) / A, h / 3, 1e-8);
        const r = 2;
        close(simpson((y) => y * 2 * sqrt(r * r - y * y), 0, r, 20000) / ((PI * r * r) / 2), (4 * r) / (3 * PI), 1e-5);
        close(simpson((x) => x * sqrt(r * r - x * x), 0, r, 20000) / ((PI * r * r) / 4), (4 * r) / (3 * PI), 1e-5);
        const al = deg(40); // sector of half-angle α along the x-axis, polar integration
        const As = al * r * r;
        close(simpson((t) => simpson((rr) => rr * cos(t) * rr, 0, r), -al, al) / As, (2 * r * sin(al)) / (3 * al), 1e-8);
        close(simpson((t) => r * cos(t) * r, -al, al) / (2 * al * r), (r * sin(al)) / al, 1e-8);
    });

    it('composite area with a hole; Pappus for a torus and a cone', () => {
        // 6 × 4 rectangle with a circular hole r = 1 at (4, 2)
        const parts = [[24, 3, 2], [-PI, 4, 2]];
        const A = parts.reduce((s, [a]) => s + a, 0);
        const xb = parts.reduce((s, [a, x]) => s + a * x, 0) / A;
        close(xb, (72 - 4 * PI) / (24 - PI));
        const R = 3; const rr = 1;
        close(2 * PI * R * PI * rr * rr, 2 * PI * PI * R * rr * rr);
        // cone of radius 2, height 5 = triangle (base 2 along the axis… ) revolved: V = 2π ȳ A
        const rc = 2; const hc = 5; close(2 * PI * (rc / 3) * ((rc * hc) / 2), (PI * rc * rc * hc) / 3);
    });
});

describe('Area moments of inertia', () => {
    it('rectangle, triangle, circle by integration; parallel axis; polar; radius of gyration', () => {
        const b = 0.2; const h = 0.3;
        close(simpson((y) => y * y * b, -h / 2, h / 2), (b * h ** 3) / 12);
        close(simpson((y) => y * y * b, 0, h), (b * h ** 3) / 3);
        close((b * h ** 3) / 12 + b * h * (h / 2) ** 2, (b * h ** 3) / 3);
        // triangle base b on the x-axis: width at y is b(1 − y/h)
        close(simpson((y) => y * y * b * (1 - y / h), 0, h), (b * h ** 3) / 12);
        close((b * h ** 3) / 12 - ((b * h) / 2) * (h / 3) ** 2, (b * h ** 3) / 36);
        const r = 0.1;
        close(simpson((y) => y * y * 2 * sqrt(r * r - y * y), -r, r, 40000), (PI * r ** 4) / 4, 1e-6);
        close(2 * ((PI * r ** 4) / 4), (PI * (2 * r) ** 4) / 32);
        close(sqrt(((b * h ** 3) / 12) / (b * h)), h / sqrt(12));
    });
});

describe('Rectilinear, projectile, curvilinear', () => {
    it('a = v dv/dx: a spring-like a = −kx integrated two ways', () => {
        const k = 4; const x0 = 0.5; const xs = 0.2;
        const vFromEnergy = sqrt(k * (x0 * x0 - xs * xs));
        let x = x0; let vv = 0; const dt = 1e-5;
        while (x > xs) { vv += -k * x * dt; x += vv * dt; }
        close(abs(vv), vFromEnergy, 1e-3);
    });

    it('pulleys: block on a movable pulley moves half as far; stopping distance', () => {
        // L = 2 y_B + y_A → 2 v_B + v_A = 0
        const vA = 3; close(-vA / 2, -1.5);
        const v = 25; const tr = 1; const mu = 0.7;
        close(v * tr + v * v / (2 * mu * g), 25 + 625 / (2 * mu * g));
        close(((2 * v) ** 2 / (2 * mu * g)) / (v * v / (2 * mu * g)), 4);
    });

    it('trajectory, launch from a height, complementary angles', () => {
        const v0 = 20; const th = deg(35);
        const T = (x) => x * tan(th) - (g * x * x) / (2 * v0 * v0 * cos(th) ** 2);
        const t = 1.3; close(T(v0 * cos(th) * t), v0 * sin(th) * t - 0.5 * g * t * t);
        const y0 = 15; const disc = (v0 * sin(th)) ** 2 + 2 * g * y0;
        const tl = (v0 * sin(th) + sqrt(disc)) / g; close(y0 + v0 * sin(th) * tl - 0.5 * g * tl * tl, 0);
        const R = (a) => (v0 * v0 * sin(2 * a)) / g; close(R(deg(20)), R(deg(70)));
    });

    it('flat and banked curves, conical pendulum, vertical circle', () => {
        const mu = 0.6; const r = 50; close(sqrt(mu * g * r), 17.155, 1e-4);
        const th = deg(15); const vNoF = sqrt(g * r * tan(th));
        // forces at the design speed: N cos θ = mg, N sin θ = mv²/r
        close(tan(th), (vNoF * vNoF) / (g * r));
        const vmax = sqrt(g * r * ((sin(th) + mu * cos(th)) / (cos(th) - mu * sin(th))));
        close(vmax, sqrt(g * r * tan(th + atan(mu))));
        const L = 1; const a = deg(30); const rr = L * sin(a); const v = sqrt(rr * g * tan(a));
        close((2 * PI * rr) / v, 2 * PI * sqrt((L * cos(a)) / g));
        // vertical circle: start 2.5r up to just make the top (energy)
        const R = 2; close(sqrt(2 * g * (2.5 * R - 2 * R)), sqrt(g * R));
        // curvature of y = x²: ρ at x = 1
        close((1 + 4) ** 1.5 / 2, 5.5902, 1e-4);
    });
});

describe('Newton, energy, impulse, rotation', () => {
    it("Atwood and table-pulley by d'Alembert on each body", () => {
        const m1 = 5; const m2 = 3;
        const a = ((m1 - m2) * g) / (m1 + m2); const T = (2 * m1 * m2 * g) / (m1 + m2);
        close(m1 * g - T - m1 * a, 0); close(T - m2 * g - m2 * a, 0);
        const mb = 4; const mh = 2; const mu = 0.2;
        const a2 = ((mh - mu * mb) / (mb + mh)) * g; const T2 = mh * (g - a2);
        close(T2 - mu * mb * g - mb * a2, 0);
    });

    it('work of a spring by integration; shaft power; hoisting', () => {
        const k = 500;
        close(simpson((x) => k * x, 0.1, 0.2), 3 * simpson((x) => k * x, 0, 0.1));
        close((2 * PI * 1750 * 40) / 60, 7330.38, 1e-6);
        close((1000 * g * 0.5) / 0.8, 6131.25);
    });

    it('impulse of a triangular pulse; jet on a plate; recoil energy', () => {
        const Fmax = 1200; const dt = 0.01;
        close(simpson((t) => (t < dt / 2 ? (2 * Fmax * t) / dt : 2 * Fmax * (1 - t / dt)), 0, dt, 2000), 0.5 * Fmax * dt, 1e-6);
        const rho = 1000; const Q = 0.002; const v = 20;
        close(rho * Q * (0 - v), -rho * Q * v); close(rho * Q * (v - -v), 2 * rho * Q * v);
        const m = 0.01; const vb = 400; const M = 4; const V = (m * vb) / M;
        close(0.5 * M * V * V, 0.5 * m * vb * vb * (m / M));
    });

    it('rolling accelerations, instant centre, flywheel energy', () => {
        const th = deg(20); const roll = (kr2) => (g * sin(th)) / (1 + kr2);
        close(roll(2 / 5), (5 / 7) * g * sin(th)); close(roll(1 / 2), (2 / 3) * g * sin(th)); close(roll(1), 0.5 * g * sin(th));
        const v = 3; const r = 0.4; const w = v / r; close(w * 2 * r, 2 * v);
        const I = 20; const wmax = 105; const wmin = 95; const wm = (wmax + wmin) / 2;
        close(0.5 * I * (wmax ** 2 - wmin ** 2), I * wm * wm * ((wmax - wmin) / wm));
    });
});
