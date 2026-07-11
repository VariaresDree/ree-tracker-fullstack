// Tests for the timestamp-based Pomodoro model. The invariant under test:
// remaining time is derived from `endsAt`, so NOTHING about mounting,
// unmounting, or navigation can reset a running timer.
import { describe, it, expect } from 'vitest';
import { remainingSecs, startTimer, pauseTimer, resetTimer, switchMode, migratePomodoro } from './pomodoroLogic';

const base = { workDuration: 25, breakDuration: 5, isWork: true, isRunning: false, endsAt: null, pausedRemaining: 25 * 60 };
const T0 = 1_700_000_000_000;

describe('pomodoroLogic transitions', () => {
  it('start anchors endsAt from the paused remaining', () => {
    const p = startTimer({ ...base, pausedRemaining: 600 }, T0);
    expect(p.isRunning).toBe(true);
    expect(p.endsAt).toBe(T0 + 600_000);
    expect(remainingSecs(p, T0)).toBe(600);
  });

  it('remaining is derived from the clock — elapsed wall time just works', () => {
    const p = startTimer(base, T0);
    expect(remainingSecs(p, T0 + 5 * 60_000)).toBe(20 * 60); // 5 min later
    expect(remainingSecs(p, T0 + 26 * 60_000)).toBe(0);      // clamped at 0
  });

  it('pause captures the exact remaining — nothing lost on unmount-then-pause', () => {
    const p = pauseTimer(startTimer(base, T0), T0 + 10 * 60_000);
    expect(p.isRunning).toBe(false);
    expect(p.pausedRemaining).toBe(15 * 60);
    expect(remainingSecs(p, T0 + 999_999_999)).toBe(15 * 60); // frozen while paused
  });

  it('restarting a finished block restarts the full duration', () => {
    const done = pauseTimer(startTimer(base, T0), T0 + 30 * 60_000); // remaining 0
    expect(done.pausedRemaining).toBe(0);
    const p = startTimer(done, T0);
    expect(remainingSecs(p, T0)).toBe(25 * 60);
  });

  it('reset returns the CURRENT mode to full duration, paused', () => {
    const p = resetTimer(startTimer({ ...base, isWork: false }, T0));
    expect(p).toMatchObject({ isRunning: false, pausedRemaining: 5 * 60 });
  });

  it('switchMode flips focus/break and loads the new duration, paused', () => {
    const p = switchMode(startTimer(base, T0));
    expect(p).toMatchObject({ isWork: false, isRunning: false, pausedRemaining: 5 * 60 });
    expect(switchMode(p)).toMatchObject({ isWork: true, pausedRemaining: 25 * 60 });
  });
});

describe('migratePomodoro (rehydrate)', () => {
  it('maps the legacy timeLeft counter shape onto pausedRemaining', () => {
    const p = migratePomodoro({ workDuration: 25, breakDuration: 5, isWork: true, isRunning: false, timeLeft: 432 });
    expect(p.pausedRemaining).toBe(432);
    expect(p.endsAt).toBeNull();
  });

  it('a block that expired while the app was closed lands paused at 0', () => {
    const p = migratePomodoro({ ...base, isRunning: true, endsAt: Date.now() - 60_000 });
    expect(p.isRunning).toBe(false);
    expect(p.pausedRemaining).toBe(0);
  });

  it('a still-running future block survives rehydration untouched', () => {
    const endsAt = Date.now() + 10 * 60_000;
    const p = migratePomodoro({ ...base, isRunning: true, endsAt, pausedRemaining: null });
    expect(p.isRunning).toBe(true);
    expect(p.endsAt).toBe(endsAt);
  });

  it('fills sane defaults from an empty/corrupt persisted shape', () => {
    const p = migratePomodoro(undefined);
    expect(p).toMatchObject({ workDuration: 25, breakDuration: 5, isWork: true, isRunning: false });
  });
});
