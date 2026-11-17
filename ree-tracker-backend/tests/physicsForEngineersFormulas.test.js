import { describe, it, expect } from 'vitest';

// ESAS › Physics for Engineers formula cards, checked with numbers (Library
// round, 2026-11-17). Where a formula is a consequence of something more
// basic, the test takes that route instead: equations of motion by stepping
// a simulation, energy and momentum by conservation, moments of inertia by
// integrating over the body, fields and EMFs by summing or differentiating.

const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const { sqrt, sin, cos, PI, exp, log, log10, abs } = Math;
const simpson = (f, a, b, n = 2000) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i += 1) s += f(a + i * h) * (i % 2 ? 4 : 2); return (s * h) / 3; };
const g = 9.81; const G = 6.6743e-11; const ME = 5.972e24; const RE = 6.371e6;
const k = 8.988e9; const eps0 = 8.854e-12; const mu0 = 4 * PI * 1e-7; const c = 299792458; const h = 6.62607015e-34; const e = 1.602176634e-19;

// Velocity-Verlet integrator for x'' = acc(x, v).
function simulate(x0, v0, acc, dt, steps) {
    let x = [...x0]; let vel = [...v0]; let a = acc(x, vel);
    for (let i = 0; i < steps; i += 1) {
        x = x.map((xi, j) => xi + vel[j] * dt + 0.5 * a[j] * dt * dt);
        const aNew = acc(x, vel);
        vel = vel.map((vj, j) => vj + 0.5 * (a[j] + aNew[j]) * dt);
        a = aNew;
    }
    return { x, v: vel };
}

describe('Kinematics', () => {
    it('free fall and projectile flight time and height, against a simulation', () => {
        const t = 2.5; const fall = simulate([0], [0], () => [-g], 1e-3, 2500);
        close(-fall.x[0], 0.5 * g * t * t, 1e-6); close(-fall.v[0], g * t, 1e-6);
        close(sqrt(2 * g * (0.5 * g * t * t)), g * t);
        const v0 = 30; const th = (40 * PI) / 180; const T = (2 * v0 * sin(th)) / g; const H = (v0 * sin(th)) ** 2 / (2 * g);
        const top = simulate([0, 0], [v0 * cos(th), v0 * sin(th)], () => [0, -g], 1e-4, Math.round(T / 2 / 1e-4));
        close(top.x[1], H, 1e-6); close(top.v[1], 0, 1e-3);
        const land = simulate([0, 0], [v0 * cos(th), v0 * sin(th)], () => [0, -g], 1e-4, Math.round(T / 1e-4));
        close(land.x[1], 0, 1e-3);
        close(land.x[0], (v0 * v0 * sin(2 * th)) / g, 1e-5); // agrees with Mechanics' range card
    });

    it('relative velocity; a round trip at two speeds averages the harmonic mean', () => {
        const boat = [0, 4]; const river = [3, 0]; const ground = [boat[0] + river[0], boat[1] + river[1]];
        close(Math.hypot(...ground), 5);
        const d = 60; const v1 = 40; const v2 = 60;
        close((2 * d) / (d / v1 + d / v2), 48);
        expect((v1 + v2) / 2).not.toBe(48);
    });
});

describe('Dynamics and gravitation', () => {
    it('weight, gravity at altitude, and g from G M / R²', () => {
        close((G * ME) / RE ** 2, 9.82, 2e-3);
        close(g * (RE / (RE + RE)) ** 2, g / 4);
        expect(70 * g).toBeCloseTo(686.7, 1);
    });

    it('orbital speed keeps a circular orbit circular; Kepler III gives its period; escape speed = √2 × orbital', () => {
        const r = RE + 400e3; const GM = G * ME; const vo = sqrt(GM / r);
        const T = sqrt((4 * PI * PI * r ** 3) / GM);
        const acc = (x) => { const d = Math.hypot(...x); return x.map((xi) => (-GM * xi) / d ** 3); };
        const quarter = simulate([r, 0], [0, vo], acc, 0.05, Math.round(T / 4 / 0.05));
        close(Math.hypot(...quarter.x), r, 1e-6);
        expect(Math.abs(quarter.x[0])).toBeLessThan(1e-4 * r); // a quarter period later it is a quarter of the way round
        close(sqrt((2 * GM) / RE), sqrt(2) * sqrt(GM / RE));
        close(sqrt((2 * GM) / RE), 11186, 2e-3);
        // Energy: ½v_e² − GM/R = 0
        close(0.5 * ((2 * GM) / RE) - GM / RE, 0, 1e-9);
    });

    it('apparent weight: a scale under an accelerating mass', () => {
        const m = 60;
        close(m * (g + 2), 708.6); close(m * (g - g), 0);
    });
});

describe('Work, energy, momentum', () => {
    it('work-energy theorem and conservation of energy on a frictionless curved track', () => {
        // A bead on y = H cos(πx/L)²… simpler: slide down any path; speed at the bottom √(2gh)
        const H = 5; const path = (s) => H * (1 - s) ** 3; // height along a parameter s from 0 to 1
        // Energy: ½v² = g (H − y) at every point, independent of the shape
        for (const s of [0.2, 0.5, 1]) close(sqrt(2 * g * (H - path(s))), sqrt(2 * g * H * (1 - (1 - s) ** 3)));
        const m = 2; const F = 10; const d = 3; const vi = 1;
        const vf = sqrt(vi * vi + (2 * F * d) / m);
        close(F * d, 0.5 * m * vf * vf - 0.5 * m * vi * vi);
    });

    it('spring energy by integrating F = kx; springs in series and parallel by the force on each', () => {
        const kk = 400; const x = 0.15;
        close(simpson((s) => kk * s, 0, x), 0.5 * kk * x * x);
        const k1 = 300; const k2 = 600; const Fload = 90;
        close(Fload / (Fload / k1 + Fload / k2), 1 / (1 / k1 + 1 / k2)); // series: same force, extensions add
        close((k1 * 0.1 + k2 * 0.1) / 0.1, k1 + k2); // parallel: same extension, forces add
        close(0.9 * 0.8 * 0.95, 0.684); // efficiencies in a chain multiply
    });

    it('impulse; collisions conserve momentum; elastic also energy; e from a bounce', () => {
        const m1 = 2; const m2 = 3; const v1 = 5; const v2 = -1;
        const a = ((m1 - m2) / (m1 + m2)) * v1 + ((2 * m2) / (m1 + m2)) * v2;
        const b = ((2 * m1) / (m1 + m2)) * v1 + ((m2 - m1) / (m1 + m2)) * v2;
        close(m1 * a + m2 * b, m1 * v1 + m2 * v2);
        close(0.5 * m1 * a * a + 0.5 * m2 * b * b, 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2);
        close((b - a) / (v1 - v2), 1);
        const vs = (m1 * v1 + m2 * v2) / (m1 + m2);
        close((m1 + m2) * vs, m1 * v1 + m2 * v2);
        expect(0.5 * (m1 + m2) * vs * vs).toBeLessThan(0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2);
        // equal masses swap
        close(((2 - 2) / 4) * 7 + ((2 * 2) / 4) * 1, 1);
        // dropped ball: v = √(2gh), rebound √(2gh'), e = √(h'/h)
        const hh = 2; const h2 = 1.28; close(sqrt(2 * g * h2) / sqrt(2 * g * hh), sqrt(h2 / hh)); close(sqrt(h2 / hh), 0.8);
        close(0.8 ** (2 * 3) * hh, hh * 0.262144);
        const mBall = 0.15; close(mBall * (30 - (-20)), 7.5); // impulse = Δp
    });
});

describe('Rotation', () => {
    it('angular kinematics and the rpm conversion', () => {
        const w0 = 2; const al = 1.5; const t = 4;
        const w = w0 + al * t; const th = w0 * t + 0.5 * al * t * t;
        close(w * w, w0 * w0 + 2 * al * th);
        close((2 * PI * 1800) / 60, 188.4956, 1e-6);
    });

    it('moments of inertia by integrating over the body, and the parallel-axis theorem', () => {
        const M = 3; const L = 2; const R = 0.5;
        close(simpson((x) => (M / L) * x * x, -L / 2, L / 2), (M * L * L) / 12);
        close(simpson((x) => (M / L) * x * x, 0, L), (M * L * L) / 3);
        close((M * L * L) / 12 + M * (L / 2) ** 2, (M * L * L) / 3);
        // disc: rings of mass (2M/R²) r dr at radius r
        close(simpson((rr) => ((2 * M) / (R * R)) * rr * rr * rr, 0, R), (M * R * R) / 2);
        // solid sphere: discs of radius √(R² − z²)
        const rho = M / ((4 / 3) * PI * R ** 3);
        close(simpson((z) => 0.5 * rho * PI * (R * R - z * z) ** 2, -R, R), 0.4 * M * R * R);
    });

    it('rolling down a slope: a disc beats a ring; angular momentum conservation raises ω', () => {
        const hh = 2; const roll = (beta) => sqrt((2 * g * hh) / (1 + beta));
        expect(roll(0.5)).toBeGreaterThan(roll(1));
        // energy check for the disc: ½mv² + ½(½mr²)(v/r)² = mgh
        const vd = roll(0.5); close(0.5 * vd * vd + 0.25 * vd * vd, g * hh);
        const I1 = 4; const w1 = 2; const I2 = 1.6; close((I1 * w1) / I2, 5);
        close(0.5 * I1 * w1 * w1, 8);
        // τ = Iα: a 2 kg disc, r = 0.3 m, 6 N at the rim
        close((6 * 0.3) / (0.5 * 2 * 0.3 * 0.3), 20);
    });
});

describe('Elasticity', () => {
    it("Young's, shear and bulk moduli; G = Y / (2(1 + ν))", () => {
        const F = 50e3; const L = 2; const A = 2e-4; const Y = 200e9;
        const dL = (F * L) / (A * Y); close(dL, 2.5e-3);
        close((F / A) / (dL / L), Y);
        close(200e9 / (2 * (1 + 0.3)), 76.923e9, 1e-4);
        close(-(-2e6) / (-(-0.001)), 2e9); // 1 % … ΔV/V = −0.001 under +2 MPa: K = 2 GPa
    });
});

describe('Oscillations and waves', () => {
    it('SHM: a spring simulation matches A cos(ωt), T = 2π√(m/k), v_max = Aω, and the energy', () => {
        const m = 0.5; const kk = 50; const A = 0.1; const w = sqrt(kk / m);
        const sim = simulate([A], [0], (x) => [(-kk / m) * x[0]], 1e-4, 3000);
        close(sim.x[0], A * cos(w * 0.3), 1e-5);
        close(2 * PI * sqrt(m / kk), (2 * PI) / w);
        const quarter = simulate([A], [0], (x) => [(-kk / m) * x[0]], 1e-5, Math.round((PI / 2 / w) / 1e-5));
        close(abs(quarter.v[0]), A * w, 1e-4);
        close(0.5 * m * (A * w) ** 2, 0.5 * kk * A * A);
        const x = A / 2; close(0.5 * m * (w * sqrt(A * A - x * x)) ** 2 / (0.5 * kk * A * A), 0.75);
    });

    it('pendulums: simple (small swings, simulated) and a rod as a physical pendulum', () => {
        const L = 1.2; const th0 = 0.05; const T = 2 * PI * sqrt(L / g);
        const sim = simulate([th0], [0], (x) => [(-g / L) * sin(x[0])], 1e-4, Math.round(T / 1e-4));
        close(sim.x[0], th0, 1e-3);
        const Lr = 1; const Irod = Lr * Lr / 3; // per unit mass, about the end
        close(2 * PI * sqrt(Irod / (g * (Lr / 2))), 2 * PI * sqrt((2 * Lr) / (3 * g)));
    });

    it('waves: string speed, standing-wave harmonics', () => {
        const T = 100; const mu = 0.01; const vv = sqrt(T / mu); close(vv, 100);
        close(sqrt((4 * T) / mu), 2 * vv);
        const L = 0.5; close((3 * vv) / (2 * L), 300); close(vv / ((3 * vv) / (2 * L)), (2 * L) / 3);
    });
});

describe('Sound', () => {
    it('speed of sound two ways, intensity level, Doppler, pipes, beats', () => {
        close(331 + 0.6 * 20, 343);
        close(sqrt((1.4 * 8.314 * 293.15) / 0.029), 343, 3e-3);
        const P = 0.1; const I = (r) => P / (4 * PI * r * r); const beta = (x) => 10 * log10(x / 1e-12);
        close(beta(I(5)) - beta(I(10)), 6.0206, 1e-4);
        close(beta(10 * I(5)) - beta(I(5)), 10);
        const f = 500; const vs = 343;
        const toward = f * (vs / (vs - 30)); const away = f * (vs / (vs + 30));
        expect(toward).toBeGreaterThan(f); expect(away).toBeLessThan(f);
        close(f * ((vs + 20) / vs), 529.155, 1e-5);
        const L = 0.85; close(vs / (4 * L), 100.882, 1e-5); close((3 * vs) / (4 * L), 3 * (vs / (4 * L)));
        close(abs(440 - 444), 4);
        // beats: sum of two tones has an envelope at |f1 − f2|
        const s = (t) => sin(2 * PI * 440 * t) + sin(2 * PI * 444 * t);
        close(s(0.125), 2 * cos(2 * PI * 2 * 0.125) * sin(2 * PI * 442 * 0.125), 1e-9);
    });
});

describe('Fluids', () => {
    it("Pascal's press conserves work; gauge and absolute pressure; capillary rise; terminal velocity", () => {
        const F1 = 200; const A1 = 0.001; const A2 = 0.05; const F2 = (F1 * A2) / A1; close(F2, 10000);
        const d1 = 0.5; close(F1 * d1, F2 * (d1 * A1 / A2));
        close(101.325 + 200, 301.325);
        const hcap = (2 * 0.0728 * cos(0)) / (1000 * g * 0.0005); close(hcap, 0.02968, 1e-3);
        close((2 * 0.0728) / (1000 * g * 0.00025), 2 * hcap);
        // terminal velocity: Stokes drag balances weight − buoyancy
        const r = 1e-4; const rs = 2500; const rf = 1000; const eta = 1e-3;
        const vt = (2 * r * r * (rs - rf) * g) / (9 * eta);
        close(6 * PI * eta * r * vt, (4 / 3) * PI * r ** 3 * (rs - rf) * g);
    });
});

describe('Heat transfer', () => {
    it('latent heat and calorimetry; ice to steam', () => {
        const m = 1;
        const Q = m * 334 + m * 4.186 * 100 + m * 2257; close(Q, 3009.6, 1e-4);
        const Tf = (2 * 4186 * 80 + 3 * 4186 * 20) / (2 * 4186 + 3 * 4186); close(Tf, 44);
        close(2 * 4186 * (80 - Tf), 3 * 4186 * (Tf - 20));
    });

    it('a composite wall: the same heat through each layer, resistances add', () => {
        const A = 10; const layers = [[0.2, 0.8], [0.05, 0.04]]; const hin = 10; const hout = 25;
        const R = layers.reduce((s, [L, kk]) => s + L / (kk * A), 0) + 1 / (hin * A) + 1 / (hout * A);
        const q = (20 - -5) / R;
        // temperature drop across each layer = q × its R; they add up to the whole
        const drops = [1 / (hin * A), ...layers.map(([L, kk]) => L / (kk * A)), 1 / (hout * A)].map((Ri) => q * Ri);
        close(drops.reduce((s, x) => s + x, 0), 25);
        close((layers[0][1] * A * drops[1]) / layers[0][0], q);
    });

    it('radiation needs kelvin; expansion β ≈ 3α; temperature conversions', () => {
        const s = 5.67e-8; close(s * (600 ** 4) / (s * 300 ** 4), 16);
        const al = 12e-6; const dT = 100; close((1 + al * dT) ** 3 - 1, 3 * al * dT, 1e-2);
        close((1 + al * dT) ** 2 - 1, 2 * al * dT, 1e-2);
        close((9 / 5) * -40 + 32, -40); close(100 + 273.15, 373.15); close((9 / 5) * 100 + 32 + 459.67, 671.67);
    });
});

describe('Electrostatics', () => {
    it('Coulomb, the field, the potential as the integral of the field, k = 1/(4πε₀)', () => {
        close(1 / (4 * PI * eps0), k, 1e-3);
        const q1 = 2e-6; const q2 = -3e-6; const r = 0.3;
        close(k * abs(q1 * q2) / r ** 2, 0.5992, 1e-3);
        const V = (x) => (k * q1) / x;
        close(simpson((x) => (k * q1) / (x * x), r, 50, 200000), V(r) - V(50), 1e-6);
        const hstep = 1e-6; close(-(V(r + hstep) - V(r - hstep)) / (2 * hstep), (k * q1) / (r * r), 1e-6);
        // gravity vs Coulomb between two protons
        const mp = 1.6726e-27; expect((k * e * e) / (G * mp * mp)).toBeGreaterThan(1e36);
    });

    it('capacitors: C = ε₀A/d, energy by integrating V dq, combinations', () => {
        const C = (eps0 * 0.02) / 0.001; close(C, 1.7708e-10, 1e-4);
        const Vb = 12; const Q = C * Vb;
        close(simpson((q) => q / C, 0, Q), 0.5 * C * Vb * Vb, 1e-9);
        close(0.5 * C * Vb * Vb, (Q * Q) / (2 * C));
        const C1 = 2e-6; const C2 = 3e-6; const Cs = 1 / (1 / C1 + 1 / C2);
        close((Cs * 10) / C1 + (Cs * 10) / C2, 10); // series: same charge, voltages add
    });
});

describe('Electricity', () => {
    it("resistance, Ohm, power, Kirchhoff on a two-loop circuit, internal resistance, max power at R = r", () => {
        const R = (1.72e-8 * 100) / 1e-6; close(R, 1.72);
        close(1.72 * (1 + 0.00393 * 50), 2.0580, 1e-4);
        close(1.72 * 4, (1.72e-8 * 200) / 0.5e-6); // stretched to 2×: R × 4
        const V = 12; const R1 = 4; const R2 = 6; const Rp = (R1 * R2) / (R1 + R2);
        close(V / R1 + V / R2, V / Rp);
        close(V * V / Rp, (V / R1) ** 2 * R1 + (V / R2) ** 2 * R2);
        // Two loops: E1 = 10 V with R1 = 2, E2 = 5 V with R3 = 1, shared R2 = 3
        // Unknowns I1, I2 (loop currents): 10 = 2I1 + 3(I1 − I2); −5 = 1·I2 + 3(I2 − I1)
        const a11 = 5; const a12 = -3; const a21 = -3; const a22 = 4; const b1 = 10; const b2 = -5;
        const det = a11 * a22 - a12 * a21; const I1 = (b1 * a22 - a12 * b2) / det; const I2 = (a11 * b2 - b1 * a21) / det;
        close(10 - 2 * I1 - 3 * (I1 - I2), 0); close(-5 - I2 - 3 * (I2 - I1), 0);
        const emf = 12; const rint = 0.5; const p = (RL) => (emf / (RL + rint)) ** 2 * RL;
        expect(p(0.5)).toBeGreaterThan(p(0.4)); expect(p(0.5)).toBeGreaterThan(p(0.6));
        close(emf - (emf / (2 + rint)) * rint, 9.6);
        close(3.6e6, 1000 * 3600);
    });

    it('an RC circuit, stepped numerically, charges as 1 − e^(−t/RC)', () => {
        const R = 1000; const C = 1e-3; const E = 10; const dt = 1e-5; let vc = 0;
        for (let t = 0; t < 1; t += dt) vc += ((E - vc) / (R * C)) * dt;
        close(vc, E * (1 - exp(-1)), 1e-4);
        close(1 - exp(-1), 0.6321, 1e-4);
    });
});

describe('Magnetism and induction', () => {
    it('a charge in a field: simulated circle radius mv/qB; cyclotron frequency independent of speed', () => {
        const q = e; const m = 9.109e-31; const Bz = 1e-3; const vx = 1e6;
        const T = (2 * PI * m) / (q * Bz);
        const acc = (x, vv) => [(q / m) * (vv[1] * Bz), (q / m) * (-vv[0] * Bz)];
        const half = simulate([0, 0], [vx, 0], acc, T / 20000, 10000);
        close(Math.hypot(...half.x), (2 * m * vx) / (q * Bz), 1e-4);
        expect(q * Bz / (2 * PI * m)).toBe(q * Bz / (2 * PI * m));
    });

    it('wire, solenoid and loop fields; force between wires; Biot-Savart summed for a long wire', () => {
        const I = 10; const r = 0.05;
        close((mu0 * I) / (2 * PI * r), 4e-5, 1e-6);
        // Biot-Savart over a long wire: ∫ μ₀I r dz / (4π (r² + z²)^{3/2})
        close(simpson((z) => (mu0 * I * r) / (4 * PI * (r * r + z * z) ** 1.5), -200, 200, 400000), (mu0 * I) / (2 * PI * r), 1e-5);
        close(mu0 * 1000 * 2, 2.5133e-3, 1e-4);
        close((mu0 * 5 * 5) / (2 * PI * 0.1), 5e-5, 1e-6);
        close(1 / sqrt(mu0 * eps0), c, 1e-4);
    });

    it("Faraday's law: −NΔΦ/Δt; the generator EMF is the derivative of NBA cos ωt; BLv; transformers; inductor energy", () => {
        const N = 200; const B = 0.2; const A = 0.01; const w = 2 * PI * 60;
        const flux = (t) => N * B * A * cos(w * t); const t0 = 0.0013; const dt = 1e-8;
        close(-(flux(t0 + dt) - flux(t0 - dt)) / (2 * dt), N * B * A * w * sin(w * t0), 1e-5);
        close(N * B * A * w, 150.796, 1e-5);
        // a rod sliding on rails: flux B·L·x grows at B·L·v
        close((0.5 * 0.4 * (2 + 3 * 1e-3) - 0.5 * 0.4 * 2) / 1e-3, 0.5 * 0.4 * 3, 1e-9);
        const Vp = 240; const Np = 1200; const Ns = 60; const Vs = (Vp * Ns) / Np; close(Vs, 12);
        close(Vp * 0.5, Vs * (0.5 * Np / Ns));
        const L = 0.2; const Ifinal = 3; close(simpson((i) => L * i, 0, Ifinal), 0.5 * L * Ifinal * Ifinal);
    });
});

describe('Optics', () => {
    it('refraction: n = c/v, Snell, the critical angle, wavelength in the medium', () => {
        const n = 1.5; close(c / n, 1.99862e8, 1e-5);
        close((Math.asin(1 / 1.5) * 180) / PI, 41.81, 1e-3);
        const th1 = (30 * PI) / 180; const th2 = Math.asin(sin(th1) / 1.33); close(1 * sin(th1), 1.33 * sin(th2));
    });

    it('mirror and lens equations, magnification, lensmaker, Fermat for a flat surface', () => {
        const f = 0.1; const dobj = 0.3; const di = 1 / (1 / f - 1 / dobj); close(di, 0.15); close(-di / dobj, -0.5);
        close(0.2 / 2, 0.1);
        const fl = 1 / ((1.5 - 1) * (1 / 0.2 - 1 / -0.2)); close(fl, 0.2); close(1 / fl, 5);
        close(1 / 0.2 + 1 / 0.5, 7); // powers add
        // Snell from Fermat: minimise travel time across a flat interface
        const n1 = 1; const n2 = 1.5; const time = (x) => n1 * Math.hypot(x, 1) + n2 * Math.hypot(2 - x, 1);
        let lo = 0; let hi = 2; for (let i = 0; i < 200; i += 1) { const m1 = lo + (hi - lo) / 3; const m2 = hi - (hi - lo) / 3; if (time(m1) < time(m2)) hi = m2; else lo = m1; }
        const x = (lo + hi) / 2; close(n1 * (x / Math.hypot(x, 1)), n2 * ((2 - x) / Math.hypot(2 - x, 1)), 1e-6);
    });

    it('double slit: path difference mλ at the bright fringes', () => {
        const d = 0.25e-3; const lam = 600e-9; const L = 2; const y = (1 * lam * L) / d; close(y, 4.8e-3);
        const pathDiff = Math.hypot(L, y + d / 2) - Math.hypot(L, y - d / 2); close(pathDiff, lam, 1e-3);
    });
});

describe('Atomic and nuclear', () => {
    it('photon energy and 1240 eV·nm; photoelectric threshold; de Broglie; Bohr', () => {
        close((h * c) / e / 1e-9, 1239.84, 1e-5);
        close((h * c) / (500e-9) / e, 2.48, 1e-3);
        const phi = 2.3; const f = c / 400e-9; close((h * f) / e - phi, 0.7996, 1e-3); // 3.0996 eV − 2.3 eV
        expect((h * (phi * e / h)) / e - phi).toBeCloseTo(0, 12);
        const me = 9.109e-31; const V = 100; const p = sqrt(2 * me * e * V);
        close(h / p / 1e-9, 1.226 / sqrt(V), 1e-3);
        close(13.6 * (1 / 4 - 1 / 9), 1.8889, 1e-4);
        close(1239.84 / (13.6 * (1 / 4 - 1 / 9)), 656.4, 1e-3); // Hα, the red Balmer line
    });

    it('E = mc² and 931.5 MeV per u; decay law, half-life and activity', () => {
        const u = 1.66054e-27; close((u * c * c) / e / 1e6, 931.49, 1e-4);
        const lam = log(2) / 5730; close(exp(-lam * 3 * 5730), 0.125);
        close(0.5 ** (11460 / 5730), exp(-lam * 11460));
        const N = 1e20; const lamS = log(2) / (8 * 86400); close(lamS * N, 1.0029e14, 1e-4);
    });
});
