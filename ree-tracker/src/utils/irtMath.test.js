// Unit tests for the local-side IRT/stats updater. This function is the heart
// of the optimistic UI: after every answered question it rebuilds the user's
// theta, matrix buckets, daily quotas, streak, microTopics, and theta history
// from the previous Zustand snapshot. A regression here silently desyncs the
// dashboard from reality, which is exactly the class of bug PR #16 fought.

import { describe, it, expect } from 'vitest';
import { calculateUpdatedStats } from './irtMath.js';
import { todayManila } from './manilaDate';

// Match the code under test: calculateUpdatedStats keys every date on Asia/Manila
// (via todayManila), so the reference date MUST too. Computing it in the runner's
// local TZ (new Date().toLocaleDateString) made this suite fail whenever the
// runner's date differed from Manila's — e.g. a UTC CI runner in the evening.
const TODAY = todayManila();

const emptyStats = () => ({
  globalStreak: 0,
  lastActiveDate: null,
  dailyMath: 0,
  dailyESAS: 0,
  dailyEE: 0,
  matrix: { hc: 0, hw: 0, lc: 0, lw: 0 },
  blindSpots: [],
  microTopics: {},
  activityCalendar: {},
  thetaHistory: [],
  totalAnswered: 0,
  totalCorrect: 0,
  irt: { theta: 0, consecutiveCorrect: 0, consecutiveWrong: 0 },
});

describe('calculateUpdatedStats', () => {
  it('increments theta on a correct answer and decrements on a wrong one', () => {
    const correct = calculateUpdatedStats(emptyStats(), true, 'high', 'Algebra', 'Mathematics', 'q1');
    const wrong = calculateUpdatedStats(emptyStats(), false, 'high', 'Algebra', 'Mathematics', 'q1');
    expect(correct.irt.theta).toBeCloseTo(0.05, 5);
    expect(wrong.irt.theta).toBeCloseTo(-0.05, 5);
  });

  it('scales the theta shift by confidence', () => {
    const high = calculateUpdatedStats(emptyStats(), true, 'high', 't', 'EE', 'q1').irt.theta;
    const med = calculateUpdatedStats(emptyStats(), true, 'med', 't', 'EE', 'q1').irt.theta;
    const low = calculateUpdatedStats(emptyStats(), true, 'low', 't', 'EE', 'q1').irt.theta;
    expect(high).toBeGreaterThan(med);
    expect(med).toBeGreaterThan(low);
    expect(low).toBeGreaterThan(0);
  });

  it('clamps theta to [-4, 4] (3PL scale)', () => {
    const high = { ...emptyStats(), irt: { ...emptyStats().irt, theta: 3.99 } };
    const next = calculateUpdatedStats(high, true, 'high', 't', 'EE', 'q1');
    expect(next.irt.theta).toBeLessThanOrEqual(4.0);

    const low = { ...emptyStats(), irt: { ...emptyStats().irt, theta: -3.99 } };
    const nextLow = calculateUpdatedStats(low, false, 'high', 't', 'EE', 'q1');
    expect(nextLow.irt.theta).toBeGreaterThanOrEqual(-4.0);
  });

  it('routes daily quotas by subject', () => {
    const m = calculateUpdatedStats(emptyStats(), true, 'med', 't', 'Mathematics', 'q1');
    const m2 = calculateUpdatedStats(emptyStats(), true, 'med', 't', 'Math', 'q2');
    const e = calculateUpdatedStats(emptyStats(), true, 'med', 't', 'ESAS', 'q3');
    const ee = calculateUpdatedStats(emptyStats(), true, 'med', 't', 'EE', 'q4');
    expect(m.dailyMath).toBe(1);
    expect(m2.dailyMath).toBe(1); // 'Math' alias accepted
    expect(e.dailyESAS).toBe(1);
    expect(ee.dailyEE).toBe(1);
  });

  it('puts correct + high into the mastery bucket and wrong + high into the blind-spot bucket', () => {
    const mastery = calculateUpdatedStats(emptyStats(), true, 'high', 't', 'EE', 'q1');
    const blind = calculateUpdatedStats(emptyStats(), false, 'high', 't', 'EE', 'q1');
    const imposter = calculateUpdatedStats(emptyStats(), true, 'low', 't', 'EE', 'q1');
    const deficient = calculateUpdatedStats(emptyStats(), false, 'low', 't', 'EE', 'q1');
    expect(mastery.matrix).toMatchObject({ hc: 1, hw: 0, lc: 0, lw: 0 });
    expect(blind.matrix).toMatchObject({ hc: 0, hw: 1, lc: 0, lw: 0 });
    expect(imposter.matrix).toMatchObject({ hc: 0, hw: 0, lc: 1, lw: 0 });
    expect(deficient.matrix).toMatchObject({ hc: 0, hw: 0, lc: 0, lw: 1 });
  });

  it('treats MED-confidence answers as low-confidence in the matrix (only HIGH counts as high)', () => {
    // matrixConf = confidence === 'high' ? 'high' : 'low'  — verifies the
    // 2-tier collapse the matrix uses (separate from IRT's 3-tier shift).
    const med = calculateUpdatedStats(emptyStats(), true, 'med', 't', 'EE', 'q1');
    expect(med.matrix).toMatchObject({ hc: 0, lc: 1 });
  });

  it('adds a high-confidence-wrong question to blindSpots and removes it when later answered correctly', () => {
    const after1 = calculateUpdatedStats(emptyStats(), false, 'high', 't', 'EE', 'q-bad');
    expect(after1.blindSpots).toContain('q-bad');
    const after2 = calculateUpdatedStats(after1, true, 'med', 't', 'EE', 'q-bad');
    expect(after2.blindSpots).not.toContain('q-bad');
  });

  it('resets the consecutive counters when correctness flips', () => {
    let s = emptyStats();
    s = calculateUpdatedStats(s, true, 'high', 't', 'EE', 'q1');
    s = calculateUpdatedStats(s, true, 'high', 't', 'EE', 'q2');
    expect(s.irt.consecutiveCorrect).toBe(2);
    expect(s.irt.consecutiveWrong).toBe(0);
    s = calculateUpdatedStats(s, false, 'high', 't', 'EE', 'q3');
    expect(s.irt.consecutiveCorrect).toBe(0);
    expect(s.irt.consecutiveWrong).toBe(1);
  });

  it('upserts the activity calendar for today by 1', () => {
    const next = calculateUpdatedStats(emptyStats(), true, 'high', 't', 'EE', 'q1');
    expect(next.activityCalendar[TODAY]).toBe(1);
    const after2 = calculateUpdatedStats(next, true, 'high', 't', 'EE', 'q2');
    expect(after2.activityCalendar[TODAY]).toBe(2);
  });

  it('aggregates microTopics by topic (times in ms, plausibility-bounded)', () => {
    let s = emptyStats();
    s = calculateUpdatedStats(s, true, 'high', 'AC Circuits', 'EE', 'q1', 12000);
    s = calculateUpdatedStats(s, false, 'med', 'AC Circuits', 'EE', 'q2', 8000);
    s = calculateUpdatedStats(s, true, 'low', 'Algebra', 'Mathematics', 'q3', 4000);
    expect(s.microTopics['AC Circuits']).toMatchObject({
      attempts: 2,
      correct: 1,
      totalTime: 20000,
      timedAttempts: 2,
      subject: 'EE',
    });
    expect(s.microTopics['Algebra']).toMatchObject({
      attempts: 1,
      correct: 1,
      totalTime: 4000,
      timedAttempts: 1,
      subject: 'Mathematics',
    });
  });

  it('excludes implausible times (0ms / >30min) from the speed average', () => {
    let s = emptyStats();
    s = calculateUpdatedStats(s, true, 'high', 'Algebra', 'Mathematics', 'q1', 0);          // instant — excluded
    s = calculateUpdatedStats(s, true, 'high', 'Algebra', 'Mathematics', 'q2', 5_000);       // real
    s = calculateUpdatedStats(s, true, 'high', 'Algebra', 'Mathematics', 'q3', 2_000_000);   // >30min — excluded
    expect(s.microTopics['Algebra']).toMatchObject({
      attempts: 3,          // every answer still counts toward accuracy
      correct: 3,
      totalTime: 5_000,     // only the plausible one contributes time
      timedAttempts: 1,
    });
  });

  it('starts a streak at 1 for a brand-new user (no lastActiveDate)', () => {
    const next = calculateUpdatedStats(emptyStats(), true, 'high', 't', 'EE', 'q1');
    expect(next.globalStreak).toBe(1);
    expect(next.lastActiveDate).toBe(TODAY);
  });

  it('does not mutate the input state (Zustand-safe)', () => {
    const input = emptyStats();
    const snapshot = JSON.stringify(input);
    calculateUpdatedStats(input, true, 'high', 'AC Circuits', 'EE', 'q1', 100);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('merges the same-day theta-history entry instead of pushing a duplicate', () => {
    let s = emptyStats();
    s = calculateUpdatedStats(s, true, 'high', 't', 'EE', 'q1');
    s = calculateUpdatedStats(s, true, 'high', 't', 'EE', 'q2');
    expect(s.thetaHistory).toHaveLength(1);
    expect(s.thetaHistory[0].date).toBe(TODAY);
    expect(s.thetaHistory[0].theta).toBeCloseTo(0.1, 5);
  });

  it('keeps theta history bounded at 30 entries', () => {
    // Pre-seed with 30 prior days; one more answer today must keep the array ≤ 30.
    const history = Array.from({ length: 30 }, (_, i) => ({ date: `2024-01-${String(i + 1).padStart(2, '0')}`, theta: 0 }));
    const s = { ...emptyStats(), thetaHistory: history };
    const next = calculateUpdatedStats(s, true, 'high', 't', 'EE', 'q1');
    expect(next.thetaHistory.length).toBeLessThanOrEqual(30);
    expect(next.thetaHistory[next.thetaHistory.length - 1].date).toBe(TODAY);
  });
});
