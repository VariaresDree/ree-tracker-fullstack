// Focus time from the Pomodoro: a finished focus block is logged in full, one
// stopped early only after five minutes and for what ran, a break never, and
// one that ran out while the app was closed is still counted, dated when it
// ended. Pauses don't restart a block.
import { describe, it, expect } from 'vitest';
import { startTimer, pauseTimer, resetTimer, switchMode, migratePomodoro, focusBlockFor } from './pomodoroLogic';

const T0 = 1_760_000_000_000;
const MIN = 60_000;
const base = (over = {}) => ({
  workDuration: 25, breakDuration: 5, isWork: true, isRunning: false, endsAt: null, pausedRemaining: 25 * 60,
  subject: 'EE', focusStartedAt: null, pendingFocusLogs: [], ...over,
});

describe('focus blocks', () => {
  it('logs a finished block in full, with its subject, dated from its first start', () => {
    let p = startTimer(base(), T0);
    expect(p.focusStartedAt).toBe(T0);
    p = pauseTimer(p, T0 + 10 * MIN);
    p = startTimer(p, T0 + 20 * MIN); // resumed: same block
    expect(p.focusStartedAt).toBe(T0);
    p = switchMode(p, p.endsAt + 500); // ran out
    expect(p.pendingFocusLogs).toEqual([{
      clientId: `focus-${T0}`, subject: 'EE', minutes: 25, startedAt: T0, endedAt: T0 + 35 * MIN, completed: true,
    }]);
    expect(p).toMatchObject({ isWork: false, focusStartedAt: null });
  });

  it('logs what ran of a block reset after five minutes, nothing under five', () => {
    const running = startTimer(base(), T0);
    expect(resetTimer(running, T0 + 3 * MIN).pendingFocusLogs).toEqual([]);
    const p = resetTimer(running, T0 + 12 * MIN + 30_000);
    expect(p.pendingFocusLogs).toEqual([expect.objectContaining({ minutes: 12, completed: false, endedAt: T0 + 12.5 * MIN })]);
    expect(p.focusStartedAt).toBeNull();
    // A second reset logs nothing more.
    expect(resetTimer(p, T0 + 13 * MIN).pendingFocusLogs).toHaveLength(1);
  });

  it('never logs a break', () => {
    const brk = startTimer(base({ isWork: false, pausedRemaining: 5 * 60 }), T0);
    expect(brk.focusStartedAt).toBeNull();
    expect(switchMode(brk, brk.endsAt + 1).pendingFocusLogs).toEqual([]);
    expect(focusBlockFor(brk, T0 + 10 * MIN)).toBeNull();
  });

  it('counts a block that ran out while the app was closed, once', () => {
    const closed = { ...startTimer(base(), T0), endsAt: T0 + 25 * MIN };
    const reopened = migratePomodoro(closed); // Date.now() is far past T0
    expect(reopened.pendingFocusLogs).toEqual([expect.objectContaining({ minutes: 25, completed: true, endedAt: T0 + 25 * MIN })]);
    expect(reopened).toMatchObject({ isRunning: false, pausedRemaining: 0, focusStartedAt: null });
    // Resetting it, or starting the next block, doesn't count it again.
    expect(resetTimer(reopened, Date.now()).pendingFocusLogs).toHaveLength(1);
    expect(startTimer(reopened, T0 + 60 * MIN).focusStartedAt).toBe(T0 + 60 * MIN);
  });

  it('keeps the subject and anything waiting through a reload, defaulting to General', () => {
    expect(migratePomodoro({ workDuration: 25 }).subject).toBe('General');
    expect(migratePomodoro({ subject: 'Chemistry' }).subject).toBe('General');
    const waiting = [{ clientId: 'focus-1', minutes: 25 }];
    expect(migratePomodoro({ subject: 'ESAS', pendingFocusLogs: waiting })).toMatchObject({ subject: 'ESAS', pendingFocusLogs: waiting });
  });
});
