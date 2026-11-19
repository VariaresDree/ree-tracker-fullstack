import { describe, it, expect } from 'vitest';

// EE › Power System Analysis formula cards, checked with numbers (Library
// round, 2026-11-19): bundle GMR from the distances between subconductors;
// line ABCD constants by multiplying matrices and by integrating the line
// equations along a long line; the power circle from S = V I*; Y-bus and Kron
// reduction against nodal solutions; faults rebuilt as phase currents and
// voltages; equal area and critical clearing from a simulated swing;
// dispatch, with and without losses, by search; sag against the catenary.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, sin, cos, PI, log, abs, acos, exp, cosh, sinh, tanh, hypot, atan2 } = Math;
const C = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
    mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
    div: (a, b) => { const d = b[0] ** 2 + b[1] ** 2; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; },
    abs: (a) => hypot(a[0], a[1]), arg: (a) => atan2(a[1], a[0]), conj: (a) => [a[0], -a[1]], polar: (m, t) => [m * cos(t), m * sin(t)], s: (k, a) => [k * a[0], k * a[1]],
    sqrt: (a) => { const m = sqrt(hypot(a[0], a[1])); const t = atan2(a[1], a[0]) / 2; return [m * cos(t), m * sin(t)]; },
    exp: (a) => [exp(a[0]) * cos(a[1]), exp(a[0]) * sin(a[1])],
};
C.cosh = (z) => C.s(0.5, C.add(C.exp(z), C.exp(C.s(-1, z))));
C.sinh = (z) => C.s(0.5, C.sub(C.exp(z), C.exp(C.s(-1, z))));
C.tanh = (z) => C.div(C.sinh(z), C.cosh(z));
const near = (a, b, tol = 1e-9) => { close(a[0], b[0], tol); close(a[1], b[1], tol); };
const mm = (P, Q) => [[C.add(C.mul(P[0][0], Q[0][0]), C.mul(P[0][1], Q[1][0])), C.add(C.mul(P[0][0], Q[0][1]), C.mul(P[0][1], Q[1][1]))], [C.add(C.mul(P[1][0], Q[0][0]), C.mul(P[1][1], Q[1][0])), C.add(C.mul(P[1][0], Q[0][1]), C.mul(P[1][1], Q[1][1]))]];
const det = (T) => C.sub(C.mul(T[0][0], T[1][1]), C.mul(T[0][1], T[1][0]));
const ONE = [1, 0];
// Solve a complex linear system by Gaussian elimination.
const solve = (A, b) => { const n = b.length; const M = A.map((row, i) => [...row.map((x) => [...x]), [...b[i]]]);
    for (let c = 0; c < n; c += 1) { for (let r = c + 1; r < n; r += 1) { const f = C.div(M[r][c], M[c][c]); for (let k = c; k <= n; k += 1) M[r][k] = C.sub(M[r][k], C.mul(f, M[c][k])); } }
    const x = Array(n); for (let r = n - 1; r >= 0; r -= 1) { let s = M[r][n]; for (let k = r + 1; k < n; k += 1) s = C.sub(s, C.mul(M[r][k], x[k])); x[r] = C.div(s, M[r][r]); } return x; };

describe('Per unit and line parameters', () => {
    it('base current, voltage bases through a transformer, load impedance from its rating', () => {
        close(100 / (sqrt(3) * 13.8), 4.1837, 1e-4); close(13.8 * (138 / 13.2), 144.27, 1e-4);
        const V = 13.8e3; const S = C.polar(10e6, acos(0.8)); const Z = C.div([V * V, 0], C.conj(S));
        near(C.mul([V * V, 0], C.conj(C.div(ONE, Z))), S, 1e-9); // V²/Z* gives back S
        near(Z, C.s((V * V) / 10e6, [0.8, 0.6]), 1e-12);
    });

    it('bundle GMR from the product of all distances; GMD; reactance per km', () => {
        const Ds = 0.0122; const d = 0.45; const gmr = (pts) => { let p = 1; let n = 0;
            for (const a of pts) for (const b of pts) { p *= a === b ? Ds : hypot(a[0] - b[0], a[1] - b[1]); n += 1; } return p ** (1 / n); };
        close(gmr([[0, 0], [d, 0]]), sqrt(Ds * d), 1e-12);
        close(gmr([[0, 0], [d, 0], [d / 2, (d * sqrt(3)) / 2]]), Math.cbrt(Ds * d * d), 1e-12);
        close(gmr([[0, 0], [d, 0], [d, d], [0, d]]), 1.0905 * (Ds * d ** 3) ** 0.25, 1e-4);
        close(Math.cbrt(8 * 8 * 16), 8 * Math.cbrt(2), 1e-12);
        close(2 * PI * 60 * 2e-7 * 1000, 0.0754, 1e-3);
    });

    it('single-phase capacitance: two capacitances to neutral in series; charging current and vars', () => {
        const e0 = 8.854e-12; const D = 2; const r = 0.01; const Cab = (PI * e0) / log(D / r); const Cn = (2 * PI * e0) / log(D / r);
        close(1 / (1 / Cn + 1 / Cn), Cab, 1e-12);
        const Vll = 230e3; const l = 100e3; const Ic = 2 * PI * 60 * 8.8e-12 * (Vll / sqrt(3)) * l; close(3 * (Vll / sqrt(3)) * Ic, 2 * PI * 60 * 8.8e-12 * Vll * Vll * l, 1e-9);
    });
});

describe('Lines and ABCD constants', () => {
    const z = [0.03e-3, 0.35e-3]; const y = [0, 4.4e-9]; // per metre at 60 Hz
    const ser = (Z) => [[ONE, Z], [[0, 0], ONE]]; const sh = (Y) => [[ONE, [0, 0]], [Y, ONE]];

    it('nominal π and T by multiplying matrices; AD − BC = 1', () => {
        const l = 150e3; const Z = C.s(l, z); const Y = C.s(l, y);
        const pi = mm(mm(sh(C.s(0.5, Y)), ser(Z)), sh(C.s(0.5, Y)));
        const YZ2 = C.add(ONE, C.s(0.5, C.mul(Y, Z)));
        near(pi[0][0], YZ2); near(pi[0][1], Z); near(pi[1][0], C.mul(Y, C.add(ONE, C.s(0.25, C.mul(Y, Z))))); near(det(pi), ONE);
        const T = mm(mm(ser(C.s(0.5, Z)), sh(Y)), ser(C.s(0.5, Z)));
        near(T[0][0], YZ2); near(T[0][1], C.mul(Z, C.add(ONE, C.s(0.25, C.mul(Y, Z))))); near(T[1][0], Y); near(det(T), ONE);
    });

    it('long line: integrating dV/dx = zI, dI/dx = yV from the receiving end gives cosh and sinh', () => {
        const l = 500e3; const g = C.sqrt(C.mul(z, y)); const Zc = C.sqrt(C.div(z, y)); const gl = C.s(l, g);
        // State (V, I) at distance x from the receiving end, starting from V_r = 1, I_r = 0 (gives A, C) and V_r = 0, I_r = 1 (gives B, D).
        const run = (V0, I0) => { let V = V0; let I = I0; const n = 20000; const h = l / n;
            const f = (Vv, Ii) => [C.mul(z, Ii), C.mul(y, Vv)];
            for (let k = 0; k < n; k += 1) {
                const [a1, b1] = f(V, I); const [a2, b2] = f(C.add(V, C.s(h / 2, a1)), C.add(I, C.s(h / 2, b1)));
                const [a3, b3] = f(C.add(V, C.s(h / 2, a2)), C.add(I, C.s(h / 2, b2))); const [a4, b4] = f(C.add(V, C.s(h, a3)), C.add(I, C.s(h, b3)));
                V = C.add(V, C.s(h / 6, C.add(C.add(a1, C.s(2, a2)), C.add(C.s(2, a3), a4)))); I = C.add(I, C.s(h / 6, C.add(C.add(b1, C.s(2, b2)), C.add(C.s(2, b3), b4))));
            } return [V, I]; };
        const [A, Cc] = run(ONE, [0, 0]); const [B, D] = run([0, 0], ONE);
        near(A, C.cosh(gl), 1e-9); near(B, C.mul(Zc, C.sinh(gl)), 1e-9); near(Cc, C.div(C.sinh(gl), Zc), 1e-9); near(D, A, 1e-9);
        // The equivalent π reproduces the same A and B.
        const Z = C.s(l, z); const Y = C.s(l, y);
        const Zp = C.mul(Z, C.div(C.sinh(gl), gl)); const Yp2 = C.mul(C.s(0.5, Y), C.div(C.tanh(C.s(0.5, gl)), C.s(0.5, gl)));
        const eq = mm(mm(sh(Yp2), ser(Zp)), sh(Yp2)); near(eq[0][0], A, 1e-9); near(eq[0][1], B, 1e-9);
    });

    it('Ferranti: an open lossless line rises to V_s/cos βℓ ≈ V_s(1 + ω²LCℓ²/2)', () => {
        const L = 1e-6; const Cp = 11e-9 / 1000; const w = 2 * PI * 60; const l = 300e3; const b = w * sqrt(L * Cp);
        const A = C.cosh([0, b * l]); close(1 / C.abs(A), 1 / cos(b * l), 1e-12); close(1 / cos(b * l), 1 + (w * w * L * Cp * l * l) / 2, 5e-3); // the series form, 0.4% low at 300 km
        close((2 * PI) / (w * sqrt(L * Cp)) / 1000, 5025, 1e-3); // about 5000 km
    });

    it('ABCD regulation; cascade keeps AD − BC = 1; receiving power circle equals V I*', () => {
        const T1 = [[ONE, [0.5, 8]], [[0, 0], ONE]]; const T2 = [[[0.98, 0.002], [10, 80]], [[0, 0.0004], [0.98, 0.002]]];
        T2[1][0] = C.div(C.sub(C.mul(T2[0][0], T2[1][1]), ONE), T2[0][1]); near(det(mm(T1, T2)), ONE, 1e-12);
        const A = T2[0][0]; const B = T2[0][1]; const Vr = 127e3; const d = 20 * (PI / 180); const Vs = C.polar(135e3, d);
        const Ir = C.div(C.sub(Vs, C.mul(A, [Vr, 0])), B); const S = C.mul([Vr, 0], C.conj(Ir));
        const be = C.arg(B); const al = C.arg(A);
        const circle = C.sub(C.polar((C.abs(Vs) * Vr) / C.abs(B), be - d), C.polar((C.abs(A) * Vr * Vr) / C.abs(B), be - al));
        near(S, circle, 1e-9);
        close(135e3 / C.abs(A), 135e3 / C.abs(A)); expect(135e3 / C.abs(A)).toBeGreaterThan(135e3);
    });
});

describe('Y-bus, load flow and faults', () => {
    // Three buses: lines 1-2, 1-3, 2-3 and charging at each bus.
    const y12 = C.div(ONE, [0.02, 0.06]); const y13 = C.div(ONE, [0.08, 0.24]); const y23 = C.div(ONE, [0.06, 0.18]); const ysh = [0, 0.03];
    const Y = [[C.add(C.add(y12, y13), ysh), C.s(-1, y12), C.s(-1, y13)], [C.s(-1, y12), C.add(C.add(y12, y23), ysh), C.s(-1, y23)], [C.s(-1, y13), C.s(-1, y23), C.add(C.add(y13, y23), ysh)]];
    const V = [[1.05, 0], C.polar(1.02, -0.05), C.polar(0.98, -0.08)];

    it('Y-bus injections equal the sum of branch currents (KCL)', () => {
        const I1 = C.add(C.add(C.mul(y12, C.sub(V[0], V[1])), C.mul(y13, C.sub(V[0], V[2]))), C.mul(ysh, V[0]));
        near(C.add(C.add(C.mul(Y[0][0], V[0]), C.mul(Y[0][1], V[1])), C.mul(Y[0][2], V[2])), I1, 1e-12);
    });

    it('Kron reduction keeps the same terminal behaviour as solving the full network', () => {
        // Remove bus 3 (no injection): solve for V3 from the full network, then compare.
        const V3 = C.div(C.s(-1, C.add(C.mul(Y[2][0], V[0]), C.mul(Y[2][1], V[1]))), Y[2][2]);
        const Ifull = C.add(C.add(C.mul(Y[0][0], V[0]), C.mul(Y[0][1], V[1])), C.mul(Y[0][2], V3));
        const red = (i, j) => C.sub(Y[i][j], C.div(C.mul(Y[i][2], Y[2][j]), Y[2][2]));
        near(C.add(C.mul(red(0, 0), V[0]), C.mul(red(0, 1), V[1])), Ifull, 1e-12);
    });

    it('power-flow polar form equals V I*; Gauss-Seidel holds at the solution; DC flow close to exact', () => {
        const I = Y.map((row) => row.reduce((s, yij, j) => C.add(s, C.mul(yij, V[j])), [0, 0]));
        const S2 = C.mul(V[1], C.conj(I[1]));
        const P2 = [0, 1, 2].reduce((s, j) => s + C.abs(V[1]) * C.abs(V[j]) * C.abs(Y[1][j]) * cos(C.arg(Y[1][j]) - C.arg(V[1]) + C.arg(V[j])), 0);
        close(S2[0], P2, 1e-12);
        const Vgs = C.div(C.sub(C.div(C.conj(S2), C.conj(V[1])), C.add(C.mul(Y[1][0], V[0]), C.mul(Y[1][2], V[2]))), Y[1][1]); near(Vgs, V[1], 1e-12);
        const Va = [1, 0]; const Vb = C.polar(1, -0.03); const X = 0.1; const exact = C.mul(Va, C.conj(C.div(C.sub(Va, Vb), [0, X])))[0];
        close(0.03 / X, exact, 2e-4);
    });

    it('Z-bus fault: I_f = V_f/Z_kk and V_i = V_f − Z_ik I_f match a direct nodal solution', () => {
        const Yg = Y.map((row, i) => row.map((x, j) => (i === j ? C.add(x, [0, -5]) : x))); // generator admittance to ground
        // Z-bus column k = 2 by solving Y z = e_k.
        const zk = solve(Yg, [[0, 0], [0, 0], ONE]); const If = C.div(ONE, zk[2]);
        const Vafter = zk.map((zik) => C.sub(ONE, C.mul(zik, If)));
        // Direct: prefault 1∠0 everywhere (no load), then inject −I_f at bus 2 by superposition.
        const dV = solve(Yg, [[0, 0], [0, 0], C.s(-1, If)]); Vafter.forEach((vv, i) => near(vv, C.add(ONE, dV[i]), 1e-12));
        near(Vafter[2], [0, 0], 1e-12);
        close(1 / 0.25, 4); close(1.1 / (0.15 + 0.1), 4.4);
    });

    it('unsymmetrical faults: the sequence formulas give the right phase currents and voltages', () => {
        const a = C.polar(1, (2 * PI) / 3); const a2 = C.mul(a, a); const Z1 = [0, 0.25]; const Z2 = [0, 0.35]; const Z0 = [0, 0.1]; const Zn = [0, 0.05];
        const Z0n = C.add(Z0, C.s(3, Zn));
        const phase = (I0, I1, I2) => [C.add(C.add(I0, I1), I2), C.add(C.add(I0, C.mul(a2, I1)), C.mul(a, I2)), C.add(C.add(I0, C.mul(a, I1)), C.mul(a2, I2))];
        // SLG: phase b and c carry nothing, I_f = 3I0.
        const I0 = C.div(ONE, C.add(C.add(Z1, Z2), Z0n)); const [Ia, Ib, Ic] = phase(I0, I0, I0);
        near(Ib, [0, 0], 1e-12); near(Ic, [0, 0], 1e-12); near(Ia, C.s(3, I0), 1e-12);
        // LL: I_a = 0, I_b = −I_c = −j√3 I_a1.
        const I1 = C.div(ONE, C.add(Z1, Z2)); const ll = phase([0, 0], I1, C.s(-1, I1));
        near(ll[0], [0, 0], 1e-12); near(ll[1], C.mul([0, -sqrt(3)], I1), 1e-12); near(C.add(ll[1], ll[2]), [0, 0], 1e-12);
        close(sqrt(3) / 2, 0.866, 1e-3);
        // DLG (bolted): I_a = 0 and V_b = V_c = 0.
        const Zp = C.div(C.mul(Z2, Z0), C.add(Z2, Z0)); const J1 = C.div(ONE, C.add(Z1, Zp));
        const J2 = C.s(-1, C.mul(J1, C.div(Z0, C.add(Z2, Z0)))); const J0 = C.s(-1, C.mul(J1, C.div(Z2, C.add(Z2, Z0))));
        near(phase(J0, J1, J2)[0], [0, 0], 1e-12);
        const Vs1 = C.sub(ONE, C.mul(J1, Z1)); const Vs2 = C.s(-1, C.mul(J2, Z2)); const Vs0 = C.s(-1, C.mul(J0, Z0));
        const Vph = phase(Vs0, Vs1, Vs2); near(Vph[1], [0, 0], 1e-12); near(Vph[2], [0, 0], 1e-12);
    });

    it('power from sequence components equals the phase sum', () => {
        const a = C.polar(1, (2 * PI) / 3); const a2 = C.mul(a, a); const phase = (x0, x1, x2) => [C.add(C.add(x0, x1), x2), C.add(C.add(x0, C.mul(a2, x1)), C.mul(a, x2)), C.add(C.add(x0, C.mul(a, x1)), C.mul(a2, x2))];
        const Vq = [[0.05, 0.01], [1, 0.1], [0.1, -0.02]]; const Iq = [[0.2, 0], [0.8, -0.3], [-0.1, 0.05]];
        const Vp = phase(...Vq); const Ip = phase(...Iq);
        const Sp = Vp.reduce((s, vv, i) => C.add(s, C.mul(vv, C.conj(Ip[i]))), [0, 0]); const Ss = C.s(3, Vq.reduce((s, vv, i) => C.add(s, C.mul(vv, C.conj(Iq[i]))), [0, 0]));
        near(Sp, Ss, 1e-12);
    });
});

describe('Stability, dispatch and voltage', () => {
    it('critical clearing angle by equal area; the simulated swing is stable just before t_cr, not after', () => {
        const Pmax = 2; const Pm = 1; const d0 = Math.asin(Pm / Pmax); const H = 5; const ws = 2 * PI * 60;
        const dcr = acos((PI - 2 * d0) * sin(d0) - cos(d0));
        // Equal areas: accelerating (P_e = 0) from δ0 to δcr; decelerating from δcr to π − δ0.
        const acc = Pm * (dcr - d0); const dec = Pmax * (cos(dcr) - cos(PI - d0)) - Pm * (PI - d0 - dcr); close(acc, dec, 1e-12);
        const tcr = sqrt((4 * H * (dcr - d0)) / (ws * Pm));
        const swing = (tc) => { let d = d0; let w = 0; const dt = 1e-5; for (let t = 0; t < 3; t += dt) { const Pe = t < tc ? 0 : Pmax * sin(d); w += ((ws / (2 * H)) * (Pm - Pe)) * dt; d += w * dt; if (d > PI) return false; } return true; };
        expect(swing(tcr * 0.98)).toBe(true); expect(swing(tcr * 1.02)).toBe(false);
    });

    it('equal incremental cost is the cheapest split (searched); losses add the penalty factor', () => {
        const u = [[8, 0.004], [7.5, 0.006]]; const cost = (P) => P.reduce((s, p, i) => s + u[i][0] * p + u[i][1] * p * p, 0); const D = 500;
        let best = Infinity; let at = 0; for (let p = 0; p <= D; p += 0.01) { const c = cost([p, D - p]); if (c < best) { best = c; at = p; } }
        const lam = (D + u.reduce((s, [b, c]) => s + b / (2 * c), 0)) / u.reduce((s, [, c]) => s + 1 / (2 * c), 0);
        close(at, (lam - u[0][0]) / (2 * u[0][1]), 1e-4);
        // Losses P_L = B·P1²: minimise cost with P1 + P2 = D + P_L, then compare with L₁ dC₁/dP₁ = dC₂/dP₂.
        const B = 1e-4; let best2 = Infinity; let p1 = 0; for (let p = 0; p <= 500; p += 0.01) { const P2 = D + B * p * p - p; if (P2 < 0) continue; const c = cost([p, P2]); if (c < best2) { best2 = c; p1 = p; } }
        const lhs = (u[0][0] + 2 * u[0][1] * p1) / (1 - 2 * B * p1); const rhs = u[1][0] + 2 * u[1][1] * (D + B * p1 * p1 - p1); close(lhs, rhs, 2e-3);
    });

    it('voltage drop ≈ (RP + XQ)/V; vars for a voltage change; series compensation', () => {
        const R = 2; const X = 20; const Vr = 66e3 / sqrt(3); const P = 10e6 / 3; const Q = 5e6 / 3;
        const I = C.conj(C.div([P, Q], [Vr, 0])); const Vs = C.add([Vr, 0], C.mul(I, [R, X]));
        close(C.abs(Vs) - Vr, (R * P + X * Q) / Vr, 4e-2); // the quadrature drop adds ~3% here
        close((1.0 * 0.01) / 0.001, 10); close(1 / (1 - 0.5), 2);
    });

    it('corona: δ = 1 at 76 cmHg, 25 °C; visual voltage above disruptive; loss zero below V_d', () => {
        const dl = (3.92 * 76) / (273 + 25); close(dl, 1, 1e-3);
        const r = 1; const D = 200; const Vd = 21.1 * 0.85 * dl * r * log(D / r); close(Vd, 95.0, 1e-2);
        const Vv = 21.1 * 0.82 * dl * r * (1 + 0.3 / sqrt(dl * r)) * log(D / r); expect(Vv).toBeGreaterThan(Vd * 0.82 / 0.85);
        const loss = (V) => (V <= Vd ? 0 : (242.2 / dl) * (60 + 25) * sqrt(r / D) * (V - Vd) ** 2 * 1e-5); close(loss(90), 0); close(loss(115) / loss(105), ((115 - Vd) / (105 - Vd)) ** 2, 1e-12);
    });

    it('sag: parabola vs catenary, unequal supports, ice and wind, conductor length by arc integral', () => {
        const w = 6; const T = 20000; const L = 300; const c = T / w;
        close((w * L * L) / (8 * T), c * (cosh(L / 2 / c) - 1), 2e-3);
        const h = 5; const x1 = L / 2 - (T * h) / (w * L); const x2 = L / 2 + (T * h) / (w * L);
        close(x1 + x2, L); close((w * x2 * x2) / (2 * T) - (w * x1 * x1) / (2 * T), h, 1e-12);
        const t = 0.01; const d = 0.025; const wi = 8900 * PI * t * (d + t); const ww = 380 * (d + 2 * t); close(hypot(w + wi, ww), sqrt((w + wi) ** 2 + ww ** 2));
        const S = (w * L * L) / (8 * T); let len = 0; const n = 100000; for (let k = 0; k < n; k += 1) { const x = -L / 2 + ((k + 0.5) * L) / n; len += sqrt(1 + ((w * x) / T) ** 2) * (L / n); }
        close(len, L + (8 * S * S) / (3 * L), 1e-6);
    });
});
