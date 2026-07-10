import { describe, it, expect } from 'vitest';
const { p3pl, fitItem2pl, jmleCalibrate } = require('../src/engine/irt');

// Deterministic PRNG (mulberry32) — the recovery fixtures must be exactly
// reproducible so tolerances can be tight without flakiness.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function linspace(a, b, n) {
  return Array.from({ length: n }, (_, i) => a + (i * (b - a)) / (n - 1));
}

describe('fitItem2pl', () => {
  it('returns null under minN', () => {
    const samples = Array.from({ length: 9 }, (_, i) => ({ theta: i - 4, correct: i > 4 }));
    expect(fitItem2pl(samples, { minN: 10 })).toBeNull();
    expect(fitItem2pl(null)).toBeNull();
  });

  it('recovers b within tolerance on a clean simulated sample', () => {
    const rng = mulberry32(42);
    const item = { a: 1.2, b: 0.5, c: 0.2 };
    const samples = linspace(-3, 3, 240).map((theta) => ({
      theta,
      correct: rng() < p3pl(theta, item),
    }));
    const fit = fitItem2pl(samples, { minN: 10 });
    expect(fit).not.toBeNull();
    expect(Math.abs(fit.b - item.b)).toBeLessThan(0.35);
    expect(fit.a).toBeGreaterThanOrEqual(0.4);
    expect(fit.a).toBeLessThanOrEqual(2.5);
    expect(fit.c).toBe(0.2);
  });

  it('orders an easy item below a hard one and respects bounds', () => {
    const rng = mulberry32(7);
    const mk = (b) => linspace(-3, 3, 160).map((theta) => ({
      theta,
      correct: rng() < p3pl(theta, { a: 1, b, c: 0.2 }),
    }));
    const easy = fitItem2pl(mk(-1.5), { minN: 10 });
    const hard = fitItem2pl(mk(1.5), { minN: 10 });
    expect(easy.b).toBeLessThan(hard.b);
    for (const f of [easy, hard]) {
      expect(f.b).toBeGreaterThanOrEqual(-3.5);
      expect(f.b).toBeLessThanOrEqual(3.5);
    }
  });

  it('is deterministic — same samples, same fit', () => {
    const rng = mulberry32(99);
    const samples = linspace(-2, 2, 80).map((theta) => ({ theta, correct: rng() < 0.6 }));
    expect(fitItem2pl(samples)).toEqual(fitItem2pl(samples));
  });
});

describe('jmleCalibrate — parameter recovery (Bayesian-anchored)', () => {
  // 60 persons × 12 items with known params; responses simulated through the
  // same 3PL the estimator assumes. Person priors are centered near (not at)
  // the truth with se 0.8 — the anchoring assumption is "live thetas are
  // roughly right", not "exactly right".
  const TRUE_B = linspace(-2, 2, 12);
  const TRUE_A = TRUE_B.map((_, i) => (i % 2 === 0 ? 0.8 : 1.3));
  const THETAS = linspace(-2.5, 2.5, 60);

  function buildFixture(seed) {
    const rng = mulberry32(seed);
    const responses = [];
    const personPriors = {};
    const itemSeeds = {};
    THETAS.forEach((theta, pi) => {
      const personId = `p${pi}`;
      personPriors[personId] = { theta: theta + (rng() - 0.5) * 0.6, se: 0.8 };
      TRUE_B.forEach((b, qi) => {
        const itemId = `q${qi}`;
        itemSeeds[itemId] = { a: 1, b: 0 };
        responses.push({
          personId,
          itemId,
          correct: rng() < p3pl(theta, { a: TRUE_A[qi], b, c: 0.2 }),
        });
      });
    });
    return { responses, personPriors, itemSeeds };
  }

  it('recovers item difficulties and their ordering', () => {
    const { items } = jmleCalibrate(buildFixture(1234), { minItemN: 10 });
    expect(Object.keys(items)).toHaveLength(12);

    const errors = TRUE_B.map((b, qi) => Math.abs(items[`q${qi}`].b - b));
    const mae = errors.reduce((s, e) => s + e, 0) / errors.length;
    expect(mae).toBeLessThan(0.45);
    for (const e of errors) expect(e).toBeLessThan(0.9);

    // Well-separated items (Δb ≥ 1.1) must come out in the right order.
    for (let i = 0; i < 12; i++) {
      for (let j = i + 3; j < 12; j++) {
        expect(items[`q${i}`].b).toBeLessThan(items[`q${j}`].b);
      }
    }
    for (const { a, n } of Object.values(items)) {
      expect(a).toBeGreaterThanOrEqual(0.4);
      expect(a).toBeLessThanOrEqual(2.5);
      expect(n).toBe(60);
    }
  });

  it('tracks person abilities toward the truth with floored se', () => {
    const { persons } = jmleCalibrate(buildFixture(1234), { minItemN: 10 });
    expect(Object.keys(persons)).toHaveLength(60);
    // Extremes stay ordered and finite; se respects the engine floor.
    expect(persons.p0.theta).toBeLessThan(persons.p59.theta);
    for (const p of Object.values(persons)) {
      expect(Number.isFinite(p.theta)).toBe(true);
      expect(p.se).toBeGreaterThanOrEqual(0.35);
    }
  });

  it('excludes items under minItemN but still uses their responses for persons', () => {
    const fixture = buildFixture(555);
    // Add one item answered by only 3 persons.
    for (let pi = 0; pi < 3; pi++) {
      fixture.responses.push({ personId: `p${pi}`, itemId: 'rare', correct: true });
    }
    fixture.itemSeeds.rare = { a: 1, b: 0 };
    const { items, persons } = jmleCalibrate(fixture, { minItemN: 10 });
    expect(items.rare).toBeUndefined();
    expect(Object.keys(persons)).toHaveLength(60);
  });

  it('is deterministic — identical input yields identical output', () => {
    const a = jmleCalibrate(buildFixture(2024), { minItemN: 10 });
    const b = jmleCalibrate(buildFixture(2024), { minItemN: 10 });
    expect(a).toEqual(b);
  });
});
