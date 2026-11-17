import { describe, it, expect } from 'vitest';

// ESAS › Fluid Mechanics formula cards, checked with numbers (Library round,
// 2026-11-17). Hydrostatic forces and their lines of action by integrating
// pressure over the surface; floating and rotating bodies by volume
// integrals; a draining tank by stepping Torricelli's law; meters, bends and
// jumps by conservation of mass, momentum and energy; laminar flow by
// integrating its velocity profile.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, sin, cos, tan, PI, log10, abs, cbrt } = Math;
const simpson = (f, a, b, n = 2000) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i += 1) s += f(a + i * h) * (i % 2 ? 4 : 2); return (s * h) / 3; };
const g = 9.81; const rho = 1000; const gam = rho * g;

describe('Fluid properties and pressure', () => {
    it('γ = ρg; viscosity of a film; droplet and bubble pressures from a force balance', () => {
        close(gam, 9810); close(0.85 * 9.81, 8.3385);
        const mu = 0.4; const V = 2; const t = 0.001; close((mu * V) / t, 800);
        // half a droplet: Δp πr² balances σ 2πr
        const sigma = 0.0728; const r = 0.001; close((sigma * 2 * PI * r) / (PI * r * r), (2 * sigma) / r);
        close((2 * sigma * 2 * PI * r) / (PI * r * r), (4 * sigma) / r);
        close(sqrt(2.2e9 / 1000), 1483.2, 1e-4);
    });

    it('pressure head, equivalent columns, manometer walk, barometer', () => {
        close(101325 / gam, 10.329, 1e-4); close(10.329 / 13.6, 0.7595, 1e-3);
        // A (water) down 0.3 m to the mercury, mercury up 0.25 m to open air: pA + γw·0.3 − γHg·0.25 = 0
        const pA = 13.6 * gam * 0.25 - gam * 0.3; close(pA, 30410.9, 1e-4);
        close(13.6 * 9.81, 133.416, 1e-5);
    });
});

describe('Hydrostatic forces', () => {
    it('plane surface: F = γ h̄ A and the centre of pressure, by integrating p dA over an inclined gate', () => {
        const b = 2; const L = 3; const theta = (60 * PI) / 180; const y0 = 1; // gate top 1 m along the plane from the surface
        const F = simpson((y) => gam * y * sin(theta) * b, y0, y0 + L);
        const ybar = y0 + L / 2; const A = b * L;
        close(F, gam * ybar * sin(theta) * A);
        const yp = simpson((y) => gam * y * sin(theta) * b * y, y0, y0 + L) / F;
        close(yp, ybar + (b * L ** 3) / 12 / (ybar * A));
        // vertical rectangle from the surface: 2/3 down
        close(simpson((y) => y * y, 0, 3) / simpson((y) => y, 0, 3), 2);
    });

    it('curved gate (quarter circle): F_H on the projection, F_V the water above, by integrating pressure', () => {
        const R = 2; const w = 1; // quarter circle, water above and to the side, top at the surface
        const FH = simpson((t) => gam * (R * sin(t)) * cos(t) * R * w, 0, PI / 2);
        const FV = simpson((t) => gam * (R * sin(t)) * sin(t) * R * w, 0, PI / 2);
        close(FH, gam * (R / 2) * R * w); // projection: depth of centroid R/2, area R·w
        close(FV, gam * ((PI * R * R) / 4) * w); // weight of the quarter-circle of water
    });

    it('a dam: overturning and sliding factors from the forces', () => {
        const H = 10; const wc = 2.4 * gam; const top = 2; const base = 8; // trapezoid dam per metre
        const P = (gam * H * H) / 2; const Mo = P * (H / 3);
        const W1 = wc * top * H; const W2 = wc * 0.5 * (base - top) * H;
        const Mr = W1 * (base - top / 2) + W2 * ((2 / 3) * (base - top));
        expect(Mr / Mo).toBeGreaterThan(1.5); expect((0.6 * (W1 + W2)) / P).toBeGreaterThan(1);
    });
});

describe('Buoyancy and relative equilibrium', () => {
    it('floating fraction; apparent weight gives SG; metacentric height of a box barge', () => {
        close(0.92 / 1.03, 0.8932, 1e-4);
        const V = 0.002; const SGb = 2.7; const W = SGb * gam * V; const Wp = W - gam * V;
        close(W / (W - Wp), SGb);
        // barge 10 m × 4 m, draft 1.5 m (with G 2 m up it would capsize: GM < 0)
        const L = 10; const B = 4; const d = 1.5; const Vd = L * B * d; const BM = ((L * B ** 3) / 12) / Vd;
        const GM = d / 2 + BM - 1.2; close(BM, B * B / (12 * d)); expect(GM).toBeGreaterThan(0); // G 1.2 m above the keel
        // rolling period from a small-angle simulation of θ'' = −(g GM / k²) θ
        const k = 1.6; let th = 0.05; let om = 0; const dt = 1e-4; let tCross = null; let prev = th;
        for (let i = 0; i < 200000; i += 1) { om += -(g * GM / (k * k)) * th * dt; th += om * dt; if (prev > 0 && th <= 0 && tCross === null) tCross = (i + 1) * dt; prev = th; }
        close(4 * tCross, (2 * PI * k) / sqrt(g * GM), 2e-3);
    });

    it('accelerating tank surface; vertical acceleration; rotating paraboloid holds half its cylinder', () => {
        close(tan(Math.atan(3 / g)), 3 / g);
        close(gam * 2 * (1 + 4.9 / g), 2 * gam + 2 * rho * 4.9);
        const w = 10; const R = 0.3; const h = (w * w * R * R) / (2 * g);
        close(simpson((r) => (w * w * r * r) / (2 * g) * 2 * PI * r, 0, R), 0.5 * PI * R * R * h); // volume under the paraboloid rim-to-surface
    });
});

describe('Continuity, Bernoulli and meters', () => {
    it('a venturi and a pitot tube agree with Bernoulli + continuity', () => {
        const D1 = 0.3; const D2 = 0.15; const A1 = (PI * D1 * D1) / 4; const A2 = (PI * D2 * D2) / 4;
        const Q = 0.1; const v1 = Q / A1; const v2 = Q / A2; const dh = (v2 * v2 - v1 * v1) / (2 * g);
        close(A2 * sqrt((2 * g * dh) / (1 - (A2 / A1) ** 2)), Q);
        close(sqrt(2 * g * ((v1 * v1) / (2 * g))), v1);
        close((4 * Q) / (PI * D1 * D1), v1);
        // mercury manometer reading R in water: Δh = R(13.6 − 1)
        const Rm = dh / 12.6; close(Rm * (13.6 - 1), dh);
    });

    it('energy equation with a pump; HGL and EGL; jet power', () => {
        const z1 = 0; const z2 = 40; const hL = 6; const hA = z2 - z1 + hL; expect(hA).toBe(46);
        const v = 3; const p = 200e3; const z = 5;
        close(p / gam + z + (v * v) / (2 * g) - (p / gam + z), (v * v) / (2 * g));
        const Q = 0.05; const vj = 30; close(gam * Q * ((vj * vj) / (2 * g)), 0.5 * rho * Q * vj * vj);
    });
});

describe('Momentum', () => {
    it('a 90° bend: momentum and pressure forces on a control volume', () => {
        const D = 0.2; const A = (PI * D * D) / 4; const Q = 0.1; const vv = Q / A; const p = 150e3; const th = PI / 2;
        const Fx = p * A - p * A * cos(th) + rho * Q * (vv - vv * cos(th)); const Fy = (p * A + rho * Q * vv) * sin(th);
        close(Fx, p * A + rho * Q * vv); close(Fy, p * A + rho * Q * vv);
    });

    it('moving vane: single-vane force; a wheel of vanes peaks at u = v/2', () => {
        const A = 0.002; const v = 40; const th = PI; // turned back 180°
        const F = (u) => rho * A * (v - u) ** 2 * (1 - cos(th));
        close(F(0), 2 * rho * A * v * v);
        const Pwheel = (u) => rho * A * v * (v - u) * (1 - cos(th)) * u;
        let best = 0; let at = 0; for (let u = 0; u <= v; u += 0.01) { if (Pwheel(u) > best) { best = Pwheel(u); at = u; } }
        close(at, v / 2, 1e-3);
        const h = 4; const Ao = 0.001; close(rho * (Ao * sqrt(2 * g * h)) * sqrt(2 * g * h), 2 * gam * h * Ao);
    });
});

describe('Pipe flow and losses', () => {
    it('laminar profile: integrating u(r) gives v = v_max/2 and Hagen-Poiseuille', () => {
        const mu = 0.1; const D = 0.02; const R = D / 2; const L = 10; const dp = 2000;
        const u = (r) => (dp / (4 * mu * L)) * (R * R - r * r);
        const Q = simpson((r) => u(r) * 2 * PI * r, 0, R); const vbar = Q / (PI * R * R);
        close(u(0), 2 * vbar);
        close(dp / gam, (32 * mu * L * vbar) / (gam * D * D));
        const Re = (rho * vbar * D) / mu; close((dp / gam) / ((L / D) * (vbar * vbar) / (2 * g)), 64 / Re);
    });

    it('sudden enlargement loss from momentum + energy; Manning pipe loss ∝ D^(−16/3)', () => {
        const v1 = 4; const v2 = 1; // A2 = 4 A1
        const dpm = rho * v2 * (v1 - v2); // momentum: (p2 − p1) A2 = ρ Q (v1 − v2)
        const hL = (v1 * v1 - v2 * v2) / (2 * g) - dpm / gam;
        close(hL, (v1 - v2) ** 2 / (2 * g));
        close(2 ** (16 / 3), 40.3175, 1e-5);
    });

    it('Swamee-Jain stays within 3% of Colebrook over its whole stated range', () => {
        let worst = 0;
        for (const eD of [1e-6, 1e-5, 1e-4, 1e-3, 3e-3, 1e-2]) {
            for (let lr = log10(5000); lr <= 8; lr += 0.1) {
                const Re = 10 ** lr;
                let f = 0.02; for (let i = 0; i < 80; i += 1) f = (1 / (-2 * log10(eD / 3.7 + 2.51 / (Re * sqrt(f))))) ** 2;
                const sj = 0.25 / log10(eD / 3.7 + 5.74 / Re ** 0.9) ** 2;
                worst = Math.max(worst, abs(sj - f) / f);
            }
        }
        expect(worst).toBeLessThan(0.03);
        expect(worst).toBeGreaterThan(0.01); // so "within 1%" would have been wrong
    });

    it('Hazen-Williams and Darcy give similar losses for clean steel at ordinary flow', () => {
        const D = 0.3; const Q = 0.1; const v = Q / ((PI * D * D) / 4); const R = D / 4;
        const S = (v / (0.849 * 120 * R ** 0.63)) ** (1 / 0.54);
        expect(S * 1000).toBeGreaterThan(1); expect(S * 1000).toBeLessThan(10); // m per km, plausible
    });
});

describe('Pipe networks', () => {
    it('parallel pipes share flow by √(D⁵/L) with equal f; an equivalent pipe has the same loss', () => {
        const f = 0.02; const hf = (L, D, Q) => (8 * f * L * Q * Q) / (g * PI * PI * D ** 5);
        const p1 = [500, 0.3]; const p2 = [800, 0.2]; const Q = 0.2;
        const k1 = sqrt(p1[1] ** 5 / p1[0]); const k2 = sqrt(p2[1] ** 5 / p2[0]);
        const Q1 = (Q * k1) / (k1 + k2); const Q2 = Q - Q1;
        close(hf(...p1, Q1), hf(...p2, Q2));
        const Le = 800 * (0.3 / 0.2) ** 5; close(hf(Le, 0.3, 0.05), hf(800, 0.2, 0.05));
    });

    it('three reservoirs: the junction head that balances the flows', () => {
        const z = [100, 80, 50]; const pipes = [[1000, 0.3], [800, 0.25], [1200, 0.2]]; const f = 0.02;
        const q = (i, P) => Math.sign(z[i] - P) * sqrt((abs(z[i] - P) * g * PI * PI * pipes[i][1] ** 5) / (8 * f * pipes[i][0]));
        let lo = 50; let hi = 100; for (let i = 0; i < 200; i += 1) { const m = (lo + hi) / 2; if (q(0, m) + q(1, m) + q(2, m) > 0) lo = m; else hi = m; }
        const P = (lo + hi) / 2; close(q(0, P) + q(1, P) + q(2, P), 0, 1e-9);
        expect(P).toBeGreaterThan(50); expect(P).toBeLessThan(100);
    });
});

describe('Orifices and weirs', () => {
    it('a draining tank, stepped with the orifice law, matches the time formula', () => {
        const As = 2; const Ao = 0.002; const Cd = 0.61; let h = 4; let t = 0; const dt = 0.01;
        while (h > 1) { h -= ((Cd * Ao * sqrt(2 * g * h)) / As) * dt; t += dt; }
        close(t, (2 * As * (sqrt(4) - sqrt(1))) / (Cd * Ao * sqrt(2 * g)), 1e-3);
        // the last quarter of the depth takes half the total time
        close((sqrt(1) - 0) / (sqrt(4) - 0), 0.5);
        const Cv = 0.98; close(4 * (1 / Cv ** 2 - 1), 0.16493, 1e-4);
    });

    it('rectangular and V-notch weirs by integrating the orifice law over the opening', () => {
        const Cd = 0.62; const L = 1.5; const H = 0.4;
        close(Cd * simpson((y) => L * sqrt(2 * g * y), 0, H, 20000), (2 / 3) * Cd * sqrt(2 * g) * L * H ** 1.5, 1e-4);
        const th = PI / 2;
        close(Cd * simpson((y) => 2 * tan(th / 2) * (H - y) * sqrt(2 * g * y), 0, H, 20000), (8 / 15) * Cd * sqrt(2 * g) * tan(th / 2) * H ** 2.5, 1e-4);
        close((8 / 15) * 0.584 * sqrt(2 * g), 1.38, 1e-3);
        close(2 ** 2.5, 5.657, 1e-4);
    });
});

describe('Open channels', () => {
    it('Manning and Chezy agree; best rectangular section has R = y/2', () => {
        const n = 0.013; const b = 3; const y = 1.5; const S = 0.001;
        const A = b * y; const R = A / (b + 2 * y);
        close((1 / n) * R ** (2 / 3) * sqrt(S), (R ** (1 / 6) / n) * sqrt(R * S));
        close(R, y / 2);
        let best = 0; let at = 0; const Ar = 6; for (let yy = 0.5; yy <= 5; yy += 0.001) { const Rr = Ar / (Ar / yy + 2 * yy); if (Rr > best) { best = Rr; at = yy; } }
        close(Ar / at, 2 * at, 1e-3);
    });

    it('critical depth minimises specific energy; Fr = 1 there', () => {
        const q = 3; const yc = cbrt((q * q) / g);
        let best = Infinity; let at = 0; for (let y = 0.3; y < 5; y += 0.0001) { const E = y + (q / y) ** 2 / (2 * g); if (E < best) { best = E; at = y; } }
        close(at, yc, 1e-3); close(best, 1.5 * yc, 1e-6);
        close(q / yc / sqrt(g * yc), 1, 1e-9);
    });

    it('hydraulic jump conserves momentum; its head loss formula matches the energy difference', () => {
        const y1 = 0.3; const v1 = 8; const q = y1 * v1; const Fr1 = v1 / sqrt(g * y1);
        const y2 = 0.5 * y1 * (sqrt(1 + 8 * Fr1 * Fr1) - 1); const v2 = q / y2;
        close((g * y1 * y1) / 2 + q * v1, (g * y2 * y2) / 2 + q * v2);
        close(y1 + (v1 * v1) / (2 * g) - (y2 + (v2 * v2) / (2 * g)), (y2 - y1) ** 3 / (4 * y1 * y2));
    });
});

describe('Pumps and turbines', () => {
    it('affinity laws keep the specific speed; efficiencies; NPSH', () => {
        const N1 = 1750; const Q1 = 0.05; const H1 = 30; const N2 = 1450;
        const Q2 = Q1 * (N2 / N1); const H2 = H1 * (N2 / N1) ** 2;
        close((N1 * sqrt(Q1)) / H1 ** 0.75, (N2 * sqrt(Q2)) / H2 ** 0.75);
        const P1 = gam * Q1 * H1; close(gam * Q2 * H2, P1 * (N2 / N1) ** 3);
        close(P1 / 0.75, 19620); close(0.9 * gam * 2 * 50, 882900);
        const npsh = 101325 / gam - 3 - 0.5 - 2340 / gam; close(npsh, 6.590, 1e-3);
    });
});
