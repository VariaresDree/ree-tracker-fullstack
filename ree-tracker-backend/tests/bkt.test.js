import { describe, it, expect } from 'vitest';
const { masterySequence, accuracyOf, masteryOf } = require('../src/engine/bkt');
const { DEFAULT_BKT } = require('../src/config/bktParams');

// Params = DEFAULT_BKT (pInit .25, pSlip .10, pGuess .25, priorAnswers 4,
// minStep .05): mastery = (accuracy − .25) / .65.
const seq = (bits) => [...bits].map((b) => b === '1');
const repeat = (bits, n) => seq(bits.repeat(n));

describe('accuracyOf / masteryOf — the BKT answer model and its inverse', () => {
  it('25% right is no mastery, 90% right is full mastery', () => {
    expect(masteryOf(0.25)).toBe(0);
    expect(masteryOf(0.9)).toBeCloseTo(1, 12);
    expect(accuracyOf(0.25)).toBeCloseTo(0.4125, 12);
  });

  it('stays within [0, 1] outside the model range', () => {
    expect(masteryOf(0.1)).toBe(0);
    expect(masteryOf(1)).toBe(1);
  });
});

describe('masterySequence', () => {
  it('starts at pInit and counts as an average with four prior answers', () => {
    expect(masterySequence([]).pMastery).toBeCloseTo(DEFAULT_BKT.pInit, 12);
    expect(masterySequence([]).n).toBe(0);
    // (4·.4125 + 3) / 7 = .66429 → (.66429 − .25) / .65 = .63736
    expect(masterySequence(seq('111')).pMastery).toBeCloseTo(0.63736, 4);
  });

  it('four right of four reads Proficient, not Mastered; ten of ten reads Mastered', () => {
    expect(masterySequence(seq('1111')).pMastery).toBeGreaterThan(0.65);
    expect(masterySequence(seq('1111')).pMastery).toBeLessThan(0.85);
    expect(masterySequence(repeat('1', 10)).pMastery).toBeGreaterThan(0.85);
  });

  // The bug it replaces: classic BKT drifted to exactly 1.0 for any topic right
  // more than ~57% of the time (Calculus 1 at 58% right read "Mastered").
  it('tracks steady accuracy instead of climbing to 1', () => {
    expect(masterySequence(repeat('10', 100)).pMastery).toBeCloseTo((0.5 - 0.25) / 0.65, 1); // 50% right ≈ .38
    expect(masterySequence(repeat('1110', 50)).pMastery).toBeCloseTo((0.75 - 0.25) / 0.65, 1); // 75% right ≈ .77
    expect(masterySequence(repeat('1110', 50)).pMastery).toBeLessThan(0.9);
  });

  it('comes back down when a mastered topic starts going wrong', () => {
    const mastered = masterySequence(repeat('1', 60));
    expect(mastered.pMastery).toBe(1);
    const after = masterySequence(repeat('0', 20), DEFAULT_BKT, mastered.pMastery, mastered.n).pMastery;
    expect(after).toBeLessThan(0.45);
  });

  it('weighs recent answers more once past the prior: order matters over 16 answers', () => {
    const early = masterySequence(seq('1'.repeat(20) + '0'.repeat(20))).pMastery;
    const late = masterySequence(seq('0'.repeat(20) + '1'.repeat(20))).pMastery;
    expect(late).toBeGreaterThan(early);
    // Within 16 it is a plain average: order doesn't matter.
    expect(masterySequence(seq('1100')).pMastery).toBeCloseTo(masterySequence(seq('0011')).pMastery, 12);
  });

  it('continuing from a stored estimate equals one fold over everything (telemetry batches)', () => {
    const all = repeat('1101', 30);
    const first = masterySequence(all.slice(0, 50));
    const cont = masterySequence(all.slice(50), DEFAULT_BKT, first.pMastery, first.n);
    expect(cont.pMastery).toBeCloseTo(masterySequence(all).pMastery, 12);
    expect(cont.n).toBe(70);
  });

  it('accepts the {correct} object form', () => {
    expect(masterySequence([{ correct: true }, { correct: false }]).pMastery)
      .toBeCloseTo(masterySequence([true, false]).pMastery, 12);
  });
});

describe('decayedMastery — forgetting between practice', () => {
  const { decayedMastery } = require('../src/engine/bkt');

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
