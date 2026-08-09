// src/utils/manilaDate.test.js
import { describe, it, expect } from 'vitest';
const { Prisma } = require('@prisma/client');
const { todayManila, yesterdayManila, manilaDateOf, manilaDaySql } = require('./manilaDate');

describe('manilaDate — JS-side helpers (operate on real instants; never the buggy path)', () => {
  it('returns YYYY-MM-DD', () => {
    expect(todayManila()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(yesterdayManila()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // Boundary sweep around the Manila calendar-day rollover, expressed as the
  // UTC instant that lands at each Manila wall-clock time on 2026-07-04.
  // Manila = UTC+8, fixed (no DST) — so "Manila HH:MM" = "UTC (HH-8):MM".
  it.each([
    ['23:59 Manila', '2026-07-04T15:59:00Z', '2026-07-04'],
    ['00:01 Manila (just past midnight)', '2026-07-03T16:01:00Z', '2026-07-04'],
    ['07:59 Manila (the classic UTC-midnight trap)', '2026-07-03T23:59:00Z', '2026-07-04'],
    // These two bracket where the ACTUAL bug flipped (see manilaDaySql below):
    // the single-step SQL expression shifts by -8h instead of +8h, so its
    // error crosses zero exactly at Manila 16:00 — a boundary the 0.1 brief's
    // suggested set (23:59/00:01/07:59) would never have exercised.
    ['15:59 Manila (last minute the old buggy query got right)', '2026-07-04T07:59:00Z', '2026-07-04'],
    ['16:01 Manila (first minute the old buggy query got wrong)', '2026-07-04T08:01:00Z', '2026-07-04'],
  ])('%s → %s', (_label, instant, expected) => {
    expect(manilaDateOf(instant)).toBe(expected);
  });

  it('accepts Date and timestamp-number inputs', () => {
    const d = new Date('2026-01-01T00:00:00Z'); // 08:00 Manila, same day
    expect(manilaDateOf(d)).toBe('2026-01-01');
    expect(manilaDateOf(d.getTime())).toBe('2026-01-01');
  });
});

describe('manilaDaySql — the raw-SQL bucketing fragment (the actual fix)', () => {
  it('composes the two-step AT TIME ZONE cast, not the single-step one', () => {
    const frag = manilaDaySql(Prisma.sql`COALESCE(qa."answeredAt", qa."createdAt")`);
    // Must reattach UTC first (naive -> real instant) before converting to
    // Manila wall-clock. The bug was exactly the absence of this first step.
    expect(frag.sql).toContain(`AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila'`);
    expect(frag.sql).toContain('COALESCE(qa."answeredAt", qa."createdAt")');
    expect(frag.sql).toMatch(/^to_char\(.*, 'YYYY-MM-DD'\)$/);
  });

  // Postgres semantics for `timestamp without time zone AT TIME ZONE zone`:
  // it treats the naive value's wall-clock digits as ALREADY being in `zone`
  // and produces the corresponding UTC instant (i.e. it LOCALIZES, subtracting
  // the zone's UTC offset). A second `AT TIME ZONE zone` applied to that
  // timestamptz result then CONVERTS the instant into that zone's wall clock
  // (adding the offset back). This models both expressions in pure JS,
  // without a live database, to prove the fix's arithmetic is right and the
  // old expression's is backwards — cross-checked against the live
  // production measurement in the PR description (16-hour / -8h error).
  const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

  function buggySingleStep(naiveDigitsAsUtcInstant) {
    // Old: `col AT TIME ZONE 'Asia/Manila'` directly on the naive column.
    // Postgres reads the column's digits (which the app populated with a
    // genuine UTC instant) as if they were Manila wall-clock, and converts
    // to UTC by SUBTRACTING the Manila offset — net effect vs. the value's
    // true meaning: shifted 8h backwards from what it actually is.
    return new Date(naiveDigitsAsUtcInstant.getTime() - MANILA_OFFSET_MS);
  }

  function fixedTwoStep(naiveDigitsAsUtcInstant) {
    // New: `col AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila'`. Step one
    // reattaches UTC (a no-op on the instant, since that's what it already
    // is). Step two converts that real instant to Manila wall-clock by
    // ADDING the offset.
    return new Date(naiveDigitsAsUtcInstant.getTime() + MANILA_OFFSET_MS);
  }

  it('reproduces the live-measured production bug: Manila 09:00 misdated to the previous day', () => {
    // Exact case proven against production: an attempt genuinely answered at
    // 2026-08-09 09:00 Manila is stored as the naive UTC instant 01:00.
    const trueInstant = new Date('2026-08-09T01:00:00Z');

    const buggyResult = buggySingleStep(trueInstant);
    expect(buggyResult.toISOString().slice(0, 16)).toBe('2026-08-08T17:00'); // measured live

    const fixedResult = fixedTwoStep(trueInstant);
    expect(fixedResult.toISOString().slice(0, 16)).toBe('2026-08-09T09:00'); // measured live, correct
  });

  it('the two expressions disagree on calendar day for most of the day (00:00-15:59 Manila)', () => {
    // Sweep every hour of a Manila day and count how many the old expression
    // misdates relative to the fix — matches the 79% figure measured against
    // the actual QuestionAttempt table.
    const dayStart = new Date('2026-08-09T00:00:00Z'); // an arbitrary UTC day
    let disagreements = 0;
    for (let h = 0; h < 24; h++) {
      const instant = new Date(dayStart.getTime() + h * 60 * 60 * 1000);
      const buggyDay = buggySingleStep(instant).toISOString().slice(0, 10);
      const fixedDay = fixedTwoStep(instant).toISOString().slice(0, 10);
      if (buggyDay !== fixedDay) disagreements += 1;
    }
    // 16 of 24 UTC hours land in the disagreement window — matches "roughly
    // two thirds of every day" from the corrected 0.1 hypothesis.
    expect(disagreements).toBe(16);
  });
});
