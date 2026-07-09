import { describe, it, expect } from 'vitest';
const { replay } = require('../scripts/recomputeTheta');

// The backfill replays a user's attempt history through the 3PL estimator from a
// neutral prior. It must be deterministic (idempotent re-runs), directionally
// correct, and produce a bounded per-Manila-day ThetaHistory.
const Q = { irtA: 1, irtB: 0, irtC: 0.2, difficulty: 0 };
const mk = (isCorrect, date) => ({ isCorrect, createdAt: date, question: Q });

describe('recomputeTheta.replay', () => {
  it('is deterministic — same history yields the same posterior', () => {
    const hist = [
      mk(true, new Date('2026-07-01T02:00:00Z')),
      mk(false, new Date('2026-07-01T03:00:00Z')),
      mk(true, new Date('2026-07-02T02:00:00Z')),
    ];
    const a = replay(hist);
    const b = replay(hist);
    expect(a.theta).toBe(b.theta);
    expect(a.se).toBe(b.se);
  });

  it('raises theta for all-correct and lowers it for all-wrong', () => {
    const days = Array.from({ length: 20 }, (_, i) => new Date(2026, 0, i + 1));
    const up = replay(days.map((d) => mk(true, d)));
    const down = replay(days.map((d) => mk(false, d)));
    expect(up.theta).toBeGreaterThan(0);
    expect(down.theta).toBeLessThan(0);
  });

  it('respects the se floor and caps history at one point per Manila day (≤30)', () => {
    const attempts = Array.from({ length: 40 }, (_, i) => mk(true, new Date(2026, 0, i + 1)));
    const out = replay(attempts);
    expect(out.se).toBeGreaterThanOrEqual(0.35);
    expect(out.history.length).toBeLessThanOrEqual(30);
    expect(out.history.every((h) => Number.isFinite(h.theta) && h.recordedAt instanceof Date)).toBe(true);
  });
});
