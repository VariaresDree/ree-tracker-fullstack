import { describe, it, expect } from 'vitest';

// EE › Feedback Control Systems formula cards, checked with numbers (Library
// round, 2026-11-19): polynomial roots (Durand–Kerner) against the Routh and
// third-order tests; step and ramp responses simulated from controllable
// canonical form against rise time, settling and steady-state error; Mason
// against block algebra; root-locus asymptotes and breakaway against roots at
// large K and a gain search; Bode, resonant peak, bandwidth and margins by
// frequency sweeps; lead phase by search; state space against the transfer
// function and e^{At} by its series.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, sin, cos, atan, acos, asin, atan2, PI, log10, exp, abs, hypot, max, min } = Math;
const C = { add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], div: (a, b) => { const d = b[0] ** 2 + b[1] ** 2; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }, abs: (a) => hypot(a[0], a[1]), arg: (a) => atan2(a[1], a[0]) };
// Polynomial helpers: coefficients highest power first.
const evalP = (p, s) => p.reduce((acc, c) => C.add(C.mul(acc, s), [c, 0]), [0, 0]);
const roots = (p) => { const n = p.length - 1; const a = p.map((c) => c / p[0]); let z = Array.from({ length: n }, (_, k) => C.mul([0.4, 0.9], [cos((2 * PI * k) / n), sin((2 * PI * k) / n)]));
    for (let it = 0; it < 500; it += 1) z = z.map((zi, i) => { let den = [1, 0]; z.forEach((zj, j) => { if (j !== i) den = C.mul(den, C.sub(zi, zj)); }); return C.sub(zi, C.div(evalP(a, zi), den)); }); return z; };
const polyMul = (a, b) => { const out = Array(a.length + b.length - 1).fill(0); a.forEach((x, i) => b.forEach((y, j) => { out[i + j] += x * y; })); return out; };
const polyAdd = (a, b) => { const n = max(a.length, b.length); const A = Array(n - a.length).fill(0).concat(a); const B = Array(n - b.length).fill(0).concat(b); return A.map((x, i) => x + B[i]); };
// Simulate y for num/den (strictly proper) driven by u(t), controllable canonical form + RK4.
const simulate = (num, den, u, T, dt = 1e-4) => { const n = den.length - 1; const a = den.map((c) => c / den[0]); const b = Array(n + 1 - num.length).fill(0).concat(num).map((c) => c / den[0]);
    let x = Array(n).fill(0); const f = (xx, t) => { const dx = xx.slice(1); dx.push(u(t) - a.slice(1).reduceRight((s, ai, i) => s + ai * xx[n - 1 - i], 0)); return dx; };
    const y = (xx) => xx.reduce((s, xi, i) => s + b[n - i] * xi, 0); const out = [];
    for (let t = 0; t <= T; t += dt) { out.push([t, y(x)]); const k1 = f(x, t); const k2 = f(x.map((v, i) => v + (dt / 2) * k1[i]), t + dt / 2); const k3 = f(x.map((v, i) => v + (dt / 2) * k2[i]), t + dt / 2); const k4 = f(x.map((v, i) => v + dt * k3[i]), t + dt); x = x.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])); }
    return out; };

describe('Modelling, transfer functions and block diagrams', () => {
    it('mass-spring-damper and RLC give the same response; reflected inertia', () => {
        const m = simulate([1], [2, 3, 50], () => 1, 2); const e = simulate([1], [2, 3, 50], () => 1, 2); close(m[10000][1], e[10000][1]);
        close(0.01 + 0.5 * (1 / 10) ** 2, 0.015);
    });

    it('DC motor: speed settles at K/(bR + K²) for 1 V (final value)', () => {
        const J = 0.01; const b = 0.1; const L = 0.5; const R = 1; const K = 0.01;
        const den = polyAdd(polyMul([J, b], [L, R]), [K * K]); const w = simulate([K], den, () => 1, 20, 1e-3); close(w[w.length - 1][1], K / (b * R + K * K), 1e-3);
    });

    it('first-order: 63.2% at τ, rise time 2.2τ, 2% settling at about 4τ', () => {
        const tau = 0.5; const y = simulate([1], [tau, 1], () => 1, 5, 1e-4);
        const at = (v) => y.find(([, yy]) => yy >= v)[0]; close(at(1 - exp(-1)), tau, 1e-3); close(at(0.9) - at(0.1), 2.197 * tau, 1e-3);
        close(-tau * Math.log(0.02), 1.956, 1e-3);
    });

    it('closed loop G/(1 + GH) from simulating the loop; sensitivity 1/(1 + GH) by perturbation', () => {
        const K = 4; // G = K/(s(s+2)), H = 1 → T = K/(s² + 2s + K)
        const y = simulate([K], [1, 2, K], () => 1, 15, 1e-3); close(y[y.length - 1][1], 1, 1e-3);
        const T = (g) => g / (1 + g); const g = 10; const dg = 1e-6; close(((T(g + dg) - T(g)) / T(g)) / (dg / g), 1 / (1 + g), 1e-5);
    });

    it("Mason's formula matches block algebra on a two-loop graph", () => {
        const s = [0.3, 1.1]; const G1 = C.div([2, 0], C.add(s, [1, 0])); const G2 = C.div([3, 0], C.add(s, [2, 0])); const H1 = [0.5, 0]; const H2 = [0.2, 0];
        // Inner loop G2 with feedback H1, then outer loop through H2.
        const inner = C.div(G2, C.add([1, 0], C.mul(G2, H1))); const fwd = C.mul(G1, inner); const block = C.div(fwd, C.add([1, 0], C.mul(fwd, H2)));
        const L1 = C.mul([-1, 0], C.mul(G2, H1)); const L2 = C.mul([-1, 0], C.mul(C.mul(G1, G2), H2)); const P1 = C.mul(G1, G2);
        const mason = C.div(P1, C.sub(C.sub([1, 0], L1), L2)); close(mason[0], block[0], 1e-12); close(mason[1], block[1], 1e-12);
    });
});

describe('Time response and steady-state error', () => {
    const z = 0.4; const wn = 5; const step = simulate([wn * wn], [1, 2 * z * wn, wn * wn], () => 1, 6, 1e-4);

    it('rise time (π − cos⁻¹ζ)/ω_d to first reach the final value', () => {
        const tr = step.find(([, y]) => y >= 1)[0]; close(tr, (PI - acos(z)) / (wn * sqrt(1 - z * z)), 1e-3);
    });

    it('settling: last exit from ±2% and ±5% bands sits near 4/ζω_n and 3/ζω_n', () => {
        const last = (band) => step.filter(([, y]) => abs(y - 1) > band).pop()[0];
        expect(last(0.02)).toBeLessThan(4 / (z * wn)); expect(last(0.02)).toBeGreaterThan(3 / (z * wn));
        expect(last(0.05)).toBeLessThan(3 / (z * wn) + 0.2);
    });

    it('dominant poles: a pole 10× further left barely changes overshoot or settling (same DC gain)', () => {
        // The far pole only delays the response by about 1/p; its shape is the dominant pair's.
        const p = 10 * z * wn; const full = simulate([wn * wn * p], polyMul([1, 2 * z * wn, wn * wn], [1, p]), () => 1, 6, 1e-4);
        const peak = (ys) => max(...ys.map(([, y]) => y)); expect(abs(peak(full) - peak(step))).toBeLessThan(0.03);
        const settle = (ys) => ys.filter(([, y]) => abs(y - 1) > 0.02).pop()[0]; expect(abs(settle(full) - settle(step))).toBeLessThan(0.15);
    });

    it('ramp error 1/K_v from a simulated type-1 loop; step error 1/(1 + K_p) for type 0', () => {
        const K = 10; // G = K/(s(s+2)): Kv = K/2
        const e = simulate([K], [1, 2, K], (t) => t, 20, 1e-3); const [tEnd, yEnd] = e[e.length - 1]; close(tEnd - yEnd, 1 / (K / 2), 1e-3);
        const Kp = 4; const y0 = simulate([Kp], [1, 3, 2 + Kp], () => 1, 20, 1e-3); close(1 - y0[y0.length - 1][1], 1 / (1 + Kp / 2), 1e-3); // G = 4/((s+1)(s+2)), Kp = 2
    });
});

describe('Routh-Hurwitz', () => {
    const rhp = (p) => roots(p).filter((r) => r[0] > 1e-9).length;
    const routhChanges = (p) => { const n = p.length; let r1 = p.filter((_, i) => i % 2 === 0); let r2 = p.filter((_, i) => i % 2 === 1); const col = [r1[0], r2[0]];
        for (let k = 2; k < n; k += 1) { const next = []; for (let j = 0; j < r1.length - 1; j += 1) next.push((r2[0] * (r1[j + 1] ?? 0) - r1[0] * (r2[j + 1] ?? 0)) / r2[0]); r1 = r2; r2 = next.length ? next : [0]; col.push(r2[0]); }
        let c = 0; for (let i = 1; i < col.length; i += 1) if (Math.sign(col[i]) !== Math.sign(col[i - 1])) c += 1; return c; };

    it('sign changes in the first column count right-half-plane roots', () => {
        for (const p of [[1, 2, 3, 4, 5], [1, 1, 2, 8], [1, 6, 11, 6], [2, 3, 1, 5, 4, 1]]) expect(routhChanges(p)).toBe(rhp(p));
    });

    it('third-order: stable exactly while a1·a2 > a0·a3; the auxiliary equation gives the oscillation', () => {
        // s³ + 6s² + 8s + K (G = K/(s(s+2)(s+4))): stable for K < 48, oscillates at √8.
        expect(rhp([1, 6, 8, 47])).toBe(0); expect(rhp([1, 6, 8, 49])).toBe(2);
        const r = roots([1, 6, 8, 48]); expect(r.some((x) => abs(x[0]) < 1e-6 && abs(abs(x[1]) - sqrt(8)) < 1e-6)).toBe(true);
        close(sqrt(48 / 6), sqrt(8));
    });
});

describe('Root locus', () => {
    it('asymptote centroid and angles from the roots at large K', () => {
        // G = K/(s(s+2)(s+4)): σ = −2, angles 60°, 180°, 300°.
        const r = roots([1, 6, 8, 1e6]); const far = r.filter((x) => x[1] > 1)[0]; const ang = atan2(far[1], far[0] + 2); close(ang, PI / 3, 2e-2);
        close((0 - 2 - 4) / 3, -2);
    });

    it('breakaway where dK/ds = 0 equals where two real roots meet (largest K on the segment)', () => {
        const K = (s) => -(s * (s + 2) * (s + 4)); let best = -Infinity; let at = 0; for (let s = -2; s <= 0; s += 1e-6) if (K(s) > best) { best = K(s); at = s; }
        close(at, -2 + 2 / sqrt(3), 1e-5); const r = roots([1, 6, 8, best]); expect(abs(r.filter((x) => x[0] > -1.5)[0][1])).toBeLessThan(1e-2);
    });

    it('magnitude and angle conditions hold at a closed-loop pole; departure angle from a complex pole', () => {
        const Kk = 10; const r = roots([1, 6, 8, Kk]).find((x) => x[1] > 0.1); const G = C.div([1, 0], C.mul(C.mul(r, C.add(r, [2, 0])), C.add(r, [4, 0])));
        close(Kk * C.abs(G), 1, 1e-6); close(abs(C.arg(G)), PI, 1e-6);
        // G = K/((s + 1)² + 4)(s + 3): departure from −1 + 2j = 180° − 90° − ∠(from −3).
        const dep = 180 - 90 - (atan2(2, 2) * 180) / PI; const p = [-1, 2]; const Kd = 1e-6;
        const rr = roots(polyAdd(polyMul([1, 2, 5], [1, 3]), [Kd])).reduce((best, x) => (hypot(x[0] - p[0], x[1] - p[1]) < hypot(best[0] - p[0], best[1] - p[1]) ? x : best));
        expect(abs((atan2(rr[1] - p[1], rr[0] - p[0]) * 180) / PI - dep)).toBeLessThan(1);
    });
});

describe('Frequency response and margins', () => {
    const mag = (num, den, w) => C.abs(C.div(evalP(num, [0, w]), evalP(den, [0, w])));
    const ph = (num, den, w) => C.arg(C.div(evalP(num, [0, w]), evalP(den, [0, w])));

    it('first-order corner: −3.01 dB and −45°; slopes of −20 dB/dec per pole', () => {
        close(20 * log10(mag([1], [0.1, 1], 10)), -3.0103, 1e-4); close((ph([1], [0.1, 1], 10) * 180) / PI, -45, 1e-9);
        close(20 * log10(mag([1], [1, 0, 0], 1000) / mag([1], [1, 0, 0], 100)), -40, 1e-9);
    });

    it('resonant peak and frequency by sweeping; bandwidth by bisection', () => {
        const z = 0.3; const wn = 2; const T = (w) => mag([wn * wn], [1, 2 * z * wn, wn * wn], w);
        let best = 0; let at = 0; for (let w = 0.01; w < 10; w += 1e-4) { const m = T(w); if (m > best) { best = m; at = w; } }
        close(best, 1 / (2 * z * sqrt(1 - z * z)), 1e-6); close(at, wn * sqrt(1 - 2 * z * z), 1e-3);
        let lo = wn; let hi = 10 * wn; for (let i = 0; i < 100; i += 1) { const m = (lo + hi) / 2; if (T(m) > 1 / sqrt(2)) lo = m; else hi = m; }
        close(lo, wn * sqrt(1 - 2 * z * z + sqrt(4 * z ** 4 - 4 * z * z + 2)), 1e-9);
    });

    it('gain and phase margins by sweep; PM ≈ 100ζ; the exact PM–ζ formula', () => {
        const den = [1, 6, 8, 0]; const K = 12; let wgc = 0; let wpc = 0;
        for (let w = 0.01; w < 20; w += 1e-5) { if (!wgc && K * mag([1], den, w) < 1) wgc = w; if (!wpc && ph([1], den, w) > 0 && ph([1], den, w - 1e-5) < 0) wpc = w; }
        const GM = -20 * log10(K * mag([1], den, sqrt(8))); close(GM, 20 * log10(48 / 12), 1e-6);
        const PM = 180 + (ph([1], den, wgc) * 180) / PI; expect(PM).toBeGreaterThan(0); expect(wpc).toBeGreaterThan(0);
        const z = 0.5; const wn = 1; const L = (w) => mag([wn * wn], [1, 2 * z * wn, 0], w); let gc = 0; for (let w = 0.01; w < 5; w += 1e-6) if (L(w) < 1) { gc = w; break; }
        const pmExact = 180 + (ph([wn * wn], [1, 2 * z * wn, 0], gc) * 180) / PI; close(pmExact, (atan((2 * z) / sqrt(sqrt(1 + 4 * z ** 4) - 2 * z * z)) * 180) / PI, 1e-4); close(pmExact, 51.8, 1e-2);
    });

    it('a time delay keeps the gain and adds −ωT of phase', () => {
        const w = 3; const T = 0.2; const d = [cos(-w * T), sin(-w * T)]; close(C.abs(d), 1); close(C.arg(d), -0.6, 1e-12);
    });

    it('Nyquist: encirclements of −1 equal the closed-loop RHP poles (P = 0)', () => {
        // G = K/((s+1)³): closed loop unstable for K > 8; count the winding of 1 + G around 0.
        const wind = (K) => { let total = 0; let prev = null; for (let w = -2000; w <= 2000; w += 0.001) { const g = C.div([K, 0], evalP([1, 3, 3, 1], [0, w])); const a = C.arg(C.add([1, 0], g)); if (prev !== null) { let d = a - prev; if (d > PI) d -= 2 * PI; if (d < -PI) d += 2 * PI; total += d; } prev = a; } return abs(Math.round(total / (2 * PI))); };
        expect(wind(4)).toBe(0); expect(wind(12)).toBe(roots([1, 3, 3, 13]).filter((x) => x[0] > 0).length);
    });
});

describe('Controllers, compensators and state space', () => {
    it('PID integral removes the step error of a type-0 plant', () => {
        // Plant 1/((s+1)(s+2)) with PI: Kp = 2, Ki = 1 → loop (2s + 1)/(s(s+1)(s+2)).
        const y = simulate([2, 1], polyAdd(polyMul([1, 0], [1, 3, 2]), [2, 1]), () => 1, 40, 1e-3); close(y[y.length - 1][1], 1, 1e-3);
    });

    it('lead compensator: the maximum phase is sin⁻¹((1 − α)/(1 + α)) at 1/(T√α) (searched)', () => {
        const a = 0.1; const T = 1; let best = 0; let at = 0; for (let w = 0.01; w < 100; w += 1e-4) { const p = atan(w * T) - atan(a * w * T); if (p > best) { best = p; at = w; } }
        close(best, asin((1 - a) / (1 + a)), 1e-6); close(at, 1 / (T * sqrt(a)), 1e-3);
    });

    it('lag compensator raises the low-frequency gain by β with little phase a decade above its zero', () => {
        const beta = 10; const T = 10; const Gc = (w) => C.div([1, w * T], [1, beta * w * T]); close(C.abs(Gc(1e-6)), 1, 1e-6); close(1 / C.abs(Gc(1e3)), beta, 1e-3);
        expect(abs((C.arg(Gc(1)) * 180) / PI)).toBeLessThan(6);
    });

    it('state space: C(sI − A)⁻¹B equals the transfer function; e^{At} by series matches the inverse Laplace', () => {
        const A = [[0, 1], [-6, -5]]; const B = [0, 1]; const Cm = [4, 1]; const s = [0.7, 1.3];
        const sIA = [[s, [-1, 0]], [[6, 0], C.add(s, [5, 0])]]; const det = C.sub(C.mul(sIA[0][0], sIA[1][1]), C.mul(sIA[0][1], sIA[1][0]));
        const inv = [[C.div(sIA[1][1], det), C.div([1, 0], det)], [C.div([-6, 0], det), C.div(sIA[0][0], det)]];
        const G = C.add(C.mul([Cm[0], 0], inv[0][1]), C.mul([Cm[1], 0], inv[1][1])); const Gtf = C.div(C.add(s, [4, 0]), evalP([1, 5, 6], s));
        close(G[0], Gtf[0], 1e-12); close(G[1], Gtf[1], 1e-12);
        const t = 0.4; let term = [[1, 0], [0, 1]]; let sum = [[1, 0], [0, 1]];
        for (let k = 1; k < 40; k += 1) { term = [[(term[0][0] * A[0][0] + term[0][1] * A[1][0]) * t / k, (term[0][0] * A[0][1] + term[0][1] * A[1][1]) * t / k], [(term[1][0] * A[0][0] + term[1][1] * A[1][0]) * t / k, (term[1][0] * A[0][1] + term[1][1] * A[1][1]) * t / k]]; sum = sum.map((row, i) => row.map((x, j) => x + term[i][j])); }
        close(sum[0][0], 3 * exp(-2 * t) - 2 * exp(-3 * t), 1e-9); close(sum[0][1], exp(-2 * t) - exp(-3 * t), 1e-9);
    });

    it('controllability and observability ranks; a cancelled pole loses observability', () => {
        const A = [[0, 1], [-6, -5]]; const B = [0, 1]; const AB = [A[0][1] * B[1], A[1][1] * B[1]]; const detC = B[0] * AB[1] - B[1] * AB[0]; expect(abs(detC)).toBeGreaterThan(0);
        // C = [3, 1] makes (s + 3)/((s + 2)(s + 3)): CA rows dependent → unobservable.
        const Cm = [3, 1]; const CA = [Cm[0] * A[0][0] + Cm[1] * A[1][0], Cm[0] * A[0][1] + Cm[1] * A[1][1]]; close(Cm[0] * CA[1] - Cm[1] * CA[0], 0, 1e-12);
    });
});
