import { describe, it, expect } from 'vitest';
const { bktPosterior, bktUpdate, bktSequence, pCorrectNext } = require('../src/engine/bkt');
const { DEFAULT_BKT } = require('../src/config/bktParams');

// Hand-computed reference (like irtReference.test.js), params = DEFAULT_BKT
// (pInit .25, pLearn .12, pSlip .10, pGuess .25).
describe('bktPosterior — Bayes step (hand-computed)', () => {
  it('raises the estimate after a correct answer', () => {
    // pL=.25, correct: num=.25*.9=.225, den=.225+.75*.25=.4125 → .545454…
    expect(bktPosterior(0.25, true)).toBeCloseTo(0.2250 / 0.4125, 6);
  });

  it('lowers the estimate after a wrong answer', () => {
    // pL=.25, wrong: num=.25*.1=.025, den=.025+.75*.75=.5875 → .042553…
    expect(bktPosterior(0.25, false)).toBeCloseTo(0.025 / 0.5875, 6);
  });

  it('falls back to the prior when the denominator degenerates', () => {
    // guess=0, wrong-from-certain-mastery: den=0 → returns prior.
    expect(bktPosterior(1, false, { pSlip: 0, pGuess: 0 })).toBe(1);
  });
});

describe('bktUpdate — posterior then learning transition', () => {
  it('equals posterior + (1-posterior)*pLearn', () => {
    const post = bktPosterior(0.25, true);
    expect(bktUpdate(0.25, true)).toBeCloseTo(post + (1 - post) * DEFAULT_BKT.pLearn, 6);
  });

  it('a correct answer raises P(mastery), a wrong one lowers it', () => {
    expect(bktUpdate(0.5, true)).toBeGreaterThan(0.5);
    expect(bktUpdate(0.5, false)).toBeLessThan(0.5);
  });

  it('stays within (0,1) and asymptotes toward 1 on a long correct streak', () => {
    let p = DEFAULT_BKT.pInit;
    for (let i = 0; i < 40; i++) p = bktUpdate(p, true);
    expect(p).toBeGreaterThan(0.95);
    expect(p).toBeLessThanOrEqual(1);
  });

  it('drops toward the low floor on a long wrong streak but stays >= 0', () => {
    let p = 0.9;
    for (let i = 0; i < 40; i++) p = bktUpdate(p, false);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThan(0.2);
  });
});

describe('bktSequence — ordered fold', () => {
  it('equals iterated bktUpdate from pInit', () => {
    const obs = [true, false, true, true];
    let p = DEFAULT_BKT.pInit;
    for (const c of obs) p = bktUpdate(p, c);
    expect(bktSequence(obs).pMastery).toBeCloseTo(p, 12);
    expect(bktSequence(obs).n).toBe(4);
  });

  it('is order-sensitive (a late correct differs from an early correct)', () => {
    const a = bktSequence([true, false, false]).pMastery;
    const b = bktSequence([false, false, true]).pMastery;
    expect(a).not.toBeCloseTo(b, 4);
  });

  it('accepts a custom prior seed and {correct} object form', () => {
    const fromSeed = bktSequence([{ correct: true }], DEFAULT_BKT, 0.8).pMastery;
    expect(fromSeed).toBeCloseTo(bktUpdate(0.8, true), 12);
  });

  it('empty sequence returns the prior (pInit by default), n=0', () => {
    expect(bktSequence([]).pMastery).toBeCloseTo(DEFAULT_BKT.pInit, 12);
    expect(bktSequence([]).n).toBe(0);
  });
});

describe('pCorrectNext', () => {
  it('is bounded within [pGuess, 1-pSlip]', () => {
    expect(pCorrectNext(0)).toBeCloseTo(DEFAULT_BKT.pGuess, 6);
    expect(pCorrectNext(1)).toBeCloseTo(1 - DEFAULT_BKT.pSlip, 6);
    const mid = pCorrectNext(0.5);
    expect(mid).toBeGreaterThan(DEFAULT_BKT.pGuess);
    expect(mid).toBeLessThan(1 - DEFAULT_BKT.pSlip);
  });
});

describe('decayedMastery — forgetting between practice', () => {
  const { decayedMastery } = require('../src/engine/bkt');
  const { DEFAULT_BKT } = require('../src/config/bktParams');

  it('does not decay inside the grace day', () => {
    expect(decayedMastery(0.9, 0, 5)).toBe(0.9);
    expect(decayedMastery(0.9, 1, 5)).toBe(0.9);
  });

  it('decays exponentially toward pInit — τ = 21 days for a topic seen once', () => {
    // 22 days, 1 of grace: 0.25 + 0.65·e^(−21/21) = 0.25 + 0.65·0.367879 = 0.4891
    expect(decayedMastery(0.9, 22, 0)).toBeCloseTo(0.4891, 3);
  });

  it('decays more slowly the more evidence stands behind it', () => {
    // τ = 21·(1 + ln 11) = 71.356 → 0.25 + 0.65·e^(−21/71.356) = 0.7343
    expect(decayedMastery(0.9, 22, 10)).toBeCloseTo(0.7343, 3);
    expect(decayedMastery(0.9, 22, 10)).toBeGreaterThan(decayedMastery(0.9, 22, 0));
  });

  it('never decays below pInit, and leaves a sub-floor estimate alone', () => {
    expect(decayedMastery(0.9, 10_000, 0)).toBeCloseTo(DEFAULT_BKT.pInit, 6);
    expect(decayedMastery(0.1, 100, 0)).toBe(0.1);
  });

  it('passes "no estimate" and "unknown last practice" straight through', () => {
    expect(decayedMastery(null, 30, 3)).toBeNull();
    expect(decayedMastery(0.7, null, 3)).toBe(0.7);
  });
});
