import { describe, it, expect } from 'vitest';
const {
  p3pl,
  fisherInfo,
  updateTheta,
  selectNextItem,
  calibrateItem,
} = require('../src/engine/irt');

describe('3PL probability', () => {
  it('returns the guess parameter when theta is far below difficulty', () => {
    const p = p3pl(-4, { a: 1, b: 2, c: 0.2 });
    expect(p).toBeGreaterThanOrEqual(0.2);
    expect(p).toBeLessThan(0.22);
  });

  it('asymptotes to 1 when theta is far above difficulty', () => {
    const p = p3pl(4, { a: 1.5, b: -1, c: 0.2 });
    expect(p).toBeGreaterThan(0.99);
  });

  it('passes through (1+c)/2 at theta = b', () => {
    const item = { a: 1.2, b: 0.7, c: 0.2 };
    const p = p3pl(item.b, item);
    expect(p).toBeCloseTo((1 + item.c) / 2, 4);
  });
});

describe('updateTheta — Bayesian Newton-Raphson', () => {
  const easy = { a: 1.2, b: -1.0, c: 0.2 };
  const medium = { a: 1.2, b: 0.0, c: 0.2 };
  const hard = { a: 1.2, b: 1.5, c: 0.2 };

  it('returns prior unchanged when no attempts are given', () => {
    const out = updateTheta({ theta: 0.3, se: 0.8 }, []);
    expect(out.theta).toBe(0.3);
    expect(out.se).toBe(0.8);
  });

  it('raises theta after a correct hard answer, drops it after a wrong easy one', () => {
    const upHard = updateTheta({ theta: 0, se: 1 }, [{ item: hard, correct: true }]);
    const downEasy = updateTheta({ theta: 0, se: 1 }, [{ item: easy, correct: false }]);
    expect(upHard.theta).toBeGreaterThan(0);
    expect(downEasy.theta).toBeLessThan(0);
  });

  it('reduces SE as more items are answered', () => {
    const after1 = updateTheta({ theta: 0, se: 1 }, [{ item: medium, correct: true }]);
    const many = Array(15).fill(0).map((_, i) => ({
      item: i % 2 ? medium : hard,
      correct: i % 3 !== 0,
    }));
    const after15 = updateTheta({ theta: 0, se: 1 }, many);
    expect(after15.se).toBeLessThan(after1.se);
  });

  it('keeps theta inside the [-4, 4] range under extreme runs', () => {
    const all = Array(40).fill({ item: hard, correct: true });
    const out = updateTheta({ theta: 0, se: 1 }, all);
    expect(out.theta).toBeLessThanOrEqual(4);
    expect(out.theta).toBeGreaterThanOrEqual(-4);
  });
});

describe('selectNextItem — maximum Fisher information', () => {
  it('picks the item whose difficulty is closest to theta', () => {
    const pool = [
      { id: 'far-low', a: 1, b: -2.5, c: 0.2 },
      { id: 'just-right', a: 1.2, b: 0.4, c: 0.2 },
      { id: 'far-high', a: 1, b: 2.5, c: 0.2 },
    ];
    const out = selectNextItem({ theta: 0.4 }, pool);
    expect(out.id).toBe('just-right');
    expect(out.fallback).toBe(false);
  });

  it('honors the recentIds exclusion', () => {
    const pool = [
      { id: 'a', a: 1, b: 0, c: 0.2 },
      { id: 'b', a: 1, b: 0.1, c: 0.2 },
    ];
    const out = selectNextItem({ theta: 0, recentIds: new Set(['a']) }, pool);
    expect(out.id).toBe('b');
  });

  it('falls back gracefully when no item has IRT params', () => {
    const pool = [{ id: 'x' }, { id: 'y' }];
    const out = selectNextItem({ theta: 0 }, pool);
    expect(out.id).not.toBeNull();
    expect(out.fallback).toBe(true);
  });
});

describe('calibrateItem — grid-search MLE', () => {
  it('recovers difficulty within ±0.5 of the seed when given enough samples', () => {
    // simulate 200 attempts against an item with known params at varying thetas
    const true_ = { a: 1.2, b: 0.5, c: 0.2 };
    const samples = [];
    for (let i = 0; i < 200; i++) {
      const theta = -2 + (4 * i) / 199;
      const p = p3pl(theta, true_);
      samples.push({ theta, correct: Math.random() < p });
    }
    const est = calibrateItem(samples);
    expect(est).not.toBeNull();
    expect(Math.abs(est.b - true_.b)).toBeLessThan(0.5);
  });

  it('returns null when fewer than minN samples are provided', () => {
    const samples = Array(5).fill({ theta: 0, correct: true });
    expect(calibrateItem(samples)).toBeNull();
  });
});

describe('fisherInfo', () => {
  it('peaks near theta = b for moderate discrimination', () => {
    const item = { a: 1.2, b: 0.7, c: 0.2 };
    const atB = fisherInfo(item.b, item);
    const farLow = fisherInfo(item.b - 3, item);
    const farHigh = fisherInfo(item.b + 3, item);
    expect(atB).toBeGreaterThan(farLow);
    expect(atB).toBeGreaterThan(farHigh);
  });
});

describe('updateTheta — non-finite prior guard', () => {
  const item = { a: 1, b: 0, c: 0.2 };
  it('returns a finite estimate when prior.se is missing', () => {
    const out = updateTheta({ theta: 0 }, [{ item, correct: true }]);
    expect(Number.isFinite(out.theta)).toBe(true);
    expect(Number.isFinite(out.se)).toBe(true);
  });
  it('returns a finite estimate when prior.theta is NaN and there are no attempts', () => {
    const out = updateTheta({ theta: NaN, se: NaN }, []);
    expect(Number.isFinite(out.theta)).toBe(true);
    expect(Number.isFinite(out.se)).toBe(true);
  });
});
