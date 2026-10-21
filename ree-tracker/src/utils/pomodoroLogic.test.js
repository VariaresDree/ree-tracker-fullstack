// Tests for the timestamp-based focus timer. The invariant under test:
// remaining time is derived from `endsAt`, so NOTHING about mounting,
// unmounting, or navigation can reset a running timer. And the modes: focus,
// short and long breaks every `longEvery` blocks, and the paper exam timed at
// the PRC section's length.
import { describe, it, expect } from 'vitest';
import {
  remainingSecs, progressOf, modeDurationSecs, isInProgress, freshPomodoro,
  startTimer, pauseTimer, resetTimer, completeTimer, skipTimer, setMode, setExamSection, setExamFullBoard,
  updateSettings, resetForSignOut, completionMessage, migratePomodoro, clampMinutes, clampLongEvery,
  MIN_MINUTES, MAX_MINUTES,
} from './pomodoroLogic';

const T0 = 1_700_000_000_000;
const MIN = 60_000;
const base = (over = {}) => freshPomodoro(over);
/** Run the current block to its end and complete it there. */
const runOut = (p, at = T0, opts) => {
  const running = startTimer(p, at);
  return completeTimer(running, running.endsAt, opts);
};

describe('lengths', () => {
  it('each mode has its length; a paper exam is the PRC section', () => {
    const p = base({ workDuration: 50, breakDuration: 10, longBreakDuration: 20 });
    expect(modeDurationSecs(p, 'focus')).toBe(50 * 60);
    expect(modeDurationSecs(p, 'short')).toBe(10 * 60);
    expect(modeDurationSecs(p, 'long')).toBe(20 * 60);
    expect(modeDurationSecs({ ...p, examSection: 'Mathematics' }, 'exam')).toBe(300 * 60);
    expect(modeDurationSecs({ ...p, examSection: 'ESAS' }, 'exam')).toBe(240 * 60);
    expect(modeDurationSecs({ ...p, examSection: 'EE' }, 'exam')).toBe(360 * 60);
  });

  it('a fresh timer is paused at the full focus length', () => {
    expect(base()).toMatchObject({ mode: 'focus', cycle: 0, isRunning: false, pausedRemaining: 25 * 60, sound: true });
    expect(base({ workDuration: 40 }).pausedRemaining).toBe(40 * 60);
  });

  it('clamps typed minutes to 1–120 and ignores a cleared field', () => {
    expect([MIN_MINUTES, MAX_MINUTES]).toEqual([1, 120]);
    expect(clampMinutes('0', 25)).toBe(25);
    expect(clampMinutes('', 25)).toBe(25);
    expect(clampMinutes('500', 25)).toBe(120);
    expect(clampMinutes('45', 25)).toBe(45);
    expect(clampMinutes('-3', 25)).toBe(25);
    expect(clampLongEvery('1', 4)).toBe(2);
    expect(clampLongEvery('12', 4)).toBe(8);
    expect(clampLongEvery('x', 4)).toBe(4);
  });
});

describe('the clock', () => {
  it('start anchors endsAt from the paused remaining', () => {
    const p = startTimer(base({ pausedRemaining: 600 }), T0);
    expect(p.isRunning).toBe(true);
    expect(p.endsAt).toBe(T0 + 600_000);
    expect(remainingSecs(p, T0)).toBe(600);
  });

  it('remaining is derived from the clock — elapsed wall time just works', () => {
    const p = startTimer(base(), T0);
    expect(remainingSecs(p, T0 + 5 * MIN)).toBe(20 * 60);
    expect(remainingSecs(p, T0 + 26 * MIN)).toBe(0);
    expect(progressOf(p, T0)).toBe(0);
    expect(progressOf(p, T0 + 5 * MIN)).toBeCloseTo(0.2);
    expect(progressOf(p, T0 + 99 * MIN)).toBe(1);
  });

  it('starting a running block changes nothing', () => {
    const p = startTimer(base(), T0);
    expect(startTimer(p, T0 + 1500)).toBe(p);
  });

  it('pause captures the exact remaining — nothing lost on unmount-then-pause', () => {
    const p = pauseTimer(startTimer(base(), T0), T0 + 10 * MIN);
    expect(p.isRunning).toBe(false);
    expect(p.pausedRemaining).toBe(15 * 60);
    expect(remainingSecs(p, T0 + 999_999_999)).toBe(15 * 60);
    expect(isInProgress(p)).toBe(true);
    expect(isInProgress(base())).toBe(false);
  });

  it('restarting a finished block restarts the full length', () => {
    const done = pauseTimer(startTimer(base(), T0), T0 + 30 * MIN);
    expect(done.pausedRemaining).toBe(0);
    expect(remainingSecs(startTimer(done, T0), T0)).toBe(25 * 60);
  });

  it('reset returns the CURRENT mode to full length, paused', () => {
    const p = resetTimer(startTimer(base({ mode: 'short', pausedRemaining: 300 }), T0), T0 + MIN);
    expect(p).toMatchObject({ mode: 'short', isRunning: false, pausedRemaining: 5 * 60 });
  });
});

describe('the focus cycle', () => {
  it('a long break every longEvery (4) blocks, short breaks between, and the count starts over after it', () => {
    let p = base();
    const seen = [];
    for (let i = 0; i < 9; i += 1) {
      p = runOut(p);
      seen.push(`${p.mode}:${p.cycle}`);
    }
    expect(seen).toEqual(['short:1', 'focus:1', 'short:2', 'focus:2', 'short:3', 'focus:3', 'long:0', 'focus:0', 'short:1']);
  });

  it('a long break follows the setting', () => {
    let p = base({ longEvery: 2 });
    p = runOut(p);
    p = runOut(p);
    p = runOut(p);
    expect(p).toMatchObject({ mode: 'long', cycle: 0, pausedRemaining: 15 * 60 });
  });

  it('auto-start breaks starts the break; auto-start focus starts the next block; otherwise paused', () => {
    expect(runOut(base())).toMatchObject({ mode: 'short', isRunning: false });
    const brk = runOut(base({ autoStartBreaks: true }));
    expect(brk).toMatchObject({ mode: 'short', isRunning: true });
    expect(remainingSecs(brk, brk.endsAt - 5 * MIN)).toBe(5 * 60);
    expect(runOut(base({ mode: 'short', autoStartFocus: true }))).toMatchObject({ mode: 'focus', isRunning: true });
    expect(runOut(base({ mode: 'short', autoStartFocus: false }))).toMatchObject({ mode: 'focus', isRunning: false });
    // autoStart: false (a block that ran out while the app was closed) wins.
    expect(runOut(base({ autoStartBreaks: true }), T0, { autoStart: false })).toMatchObject({ mode: 'short', isRunning: false });
  });

  it('skipping focus under five minutes logs nothing and does not count toward the long break', () => {
    const p = skipTimer(startTimer(base({ cycle: 3 }), T0), T0 + 3 * MIN);
    expect(p).toMatchObject({ mode: 'short', cycle: 3, pendingFocusLogs: [] });
  });

  it('skipping focus after five minutes logs what ran and counts it', () => {
    const p = skipTimer(startTimer(base({ cycle: 3, subject: 'EE' }), T0), T0 + 12 * MIN);
    expect(p).toMatchObject({ mode: 'long', cycle: 0 });
    expect(p.pendingFocusLogs).toEqual([expect.objectContaining({ minutes: 12, completed: false, subject: 'EE' })]);
  });

  it('skipping a break goes back to focus; a long break starts the count over', () => {
    expect(skipTimer(base({ mode: 'short', cycle: 2 }), T0)).toMatchObject({ mode: 'focus', cycle: 2, isRunning: false });
    expect(skipTimer(base({ mode: 'long', cycle: 2 }), T0)).toMatchObject({ mode: 'focus', cycle: 0 });
    expect(skipTimer(base({ mode: 'short', autoStartFocus: true }), T0)).toMatchObject({ mode: 'focus', isRunning: true });
  });

  it('changing mode logs what ran and lands paused at the new length', () => {
    const p = setMode(startTimer(base(), T0), 'long', T0 + 8 * MIN);
    expect(p).toMatchObject({ mode: 'long', isRunning: false, pausedRemaining: 15 * 60, focusStartedAt: null });
    expect(p.pendingFocusLogs).toEqual([expect.objectContaining({ minutes: 8 })]);
    expect(setMode(p, 'long', T0)).toBe(p);
    expect(setMode(p, 'nap', T0)).toBe(p);
  });
});

describe('the paper exam', () => {
  const exam = (section, over = {}) => base({ mode: 'exam', examSection: section, ...over });

  it.each([['Mathematics', 300], ['ESAS', 240], ['EE', 360]])('a finished %s section is logged in full under it, and never starts the next', (section, minutes) => {
    const running = startTimer(exam(section, { autoStartBreaks: true, autoStartFocus: true }), T0);
    const p = completeTimer(running, running.endsAt);
    expect(p.pendingFocusLogs).toEqual([{
      clientId: `focus-${T0}`, subject: section, minutes, startedAt: T0, endedAt: T0 + minutes * MIN, completed: true,
    }]);
    expect(p).toMatchObject({ mode: 'exam', examSection: section, isRunning: false });
  });

  it('full board in order moves to the next section, and stays on EE at the end', () => {
    let p = exam('Mathematics', { examFullBoard: true });
    p = runOut(p);
    expect(p).toMatchObject({ mode: 'exam', examSection: 'ESAS', isRunning: false, pausedRemaining: 240 * 60 });
    p = runOut(p);
    expect(p.examSection).toBe('EE');
    p = runOut(p);
    expect(p.examSection).toBe('EE');
    expect(p.pendingFocusLogs.map((b) => [b.subject, b.minutes])).toEqual([['Mathematics', 300], ['ESAS', 240], ['EE', 360]]);
  });

  it('pausing and resuming a 6-hour section keeps its start', () => {
    let p = startTimer(exam('EE'), T0);
    p = pauseTimer(p, T0 + 60 * MIN);
    p = startTimer(p, T0 + 90 * MIN);
    expect(p.focusStartedAt).toBe(T0);
    expect(remainingSecs(p, T0 + 90 * MIN)).toBe(300 * 60);
  });

  it('ending a section early logs what ran (five minutes or more)', () => {
    const p = skipTimer(startTimer(exam('ESAS'), T0), T0 + 95 * MIN);
    expect(p.pendingFocusLogs).toEqual([expect.objectContaining({ subject: 'ESAS', minutes: 95, completed: false })]);
    expect(p).toMatchObject({ mode: 'exam', isRunning: false });
  });

  it('picking a section: in exam mode it ends the one in progress; otherwise it only remembers', () => {
    const p = setExamSection(startTimer(exam('Mathematics'), T0), 'EE', T0 + 10 * MIN);
    expect(p).toMatchObject({ examSection: 'EE', isRunning: false, pausedRemaining: 360 * 60 });
    expect(p.pendingFocusLogs).toEqual([expect.objectContaining({ subject: 'Mathematics', minutes: 10 })]);
    const focus = startTimer(base(), T0);
    expect(setExamSection(focus, 'ESAS', T0)).toMatchObject({ examSection: 'ESAS', isRunning: true });
    expect(setExamSection(focus, 'Chemistry', T0)).toBe(focus);
    expect(setExamFullBoard(focus, 1).examFullBoard).toBe(true);
  });
});

describe('updateSettings', () => {
  it('a length for another mode leaves the running block alone', () => {
    const running = startTimer(base(), T0);
    const p = updateSettings(running, { breakDuration: 10, longBreakDuration: 30 }, T0 + 9 * MIN);
    expect(p).toMatchObject({ isRunning: true, endsAt: running.endsAt, breakDuration: 10, longBreakDuration: 30 });
    expect(p.pendingFocusLogs).toEqual([]);
  });

  it('a new length for the current block restarts it, logging what ran on the old length', () => {
    const running = startTimer(base(), T0);
    const p = updateSettings(running, { workDuration: 50 }, T0 + 9 * MIN);
    expect(p).toMatchObject({ isRunning: false, workDuration: 50, pausedRemaining: 50 * 60, focusStartedAt: null });
    expect(p.pendingFocusLogs).toEqual([expect.objectContaining({ minutes: 9 })]);
  });

  it('clamps everything it is given', () => {
    const p = updateSettings(base({ cycle: 3 }), { workDuration: 999, breakDuration: 0, longEvery: 1, sound: 0, subject: 'Chemistry', autoStartFocus: 'yes' });
    expect(p).toMatchObject({ workDuration: 120, breakDuration: 5, longEvery: 2, cycle: 1, sound: false, subject: 'General', autoStartFocus: true });
  });
});

describe('resetForSignOut', () => {
  it('keeps the lengths and toggles; drops the block, its logs and the subject', () => {
    const mine = {
      ...startTimer(base({ workDuration: 50, breakDuration: 10, longBreakDuration: 20, longEvery: 3, autoStartBreaks: true, sound: false, subject: 'EE', mode: 'exam', examSection: 'EE', cycle: 2 }), T0),
      pendingFocusLogs: [{ clientId: 'focus-1', minutes: 25, ownerUid: 'A' }],
    };
    const p = resetForSignOut(mine);
    expect(p).toMatchObject({
      workDuration: 50, breakDuration: 10, longBreakDuration: 20, longEvery: 3, autoStartBreaks: true, sound: false,
      mode: 'focus', cycle: 0, subject: 'General', examSection: 'Mathematics', isRunning: false, endsAt: null,
      focusStartedAt: null, pendingFocusLogs: [], pausedRemaining: 50 * 60,
    });
  });
});

describe('completionMessage', () => {
  it('says what just ended and what is next', () => {
    expect(completionMessage(base(), runOut(base()))).toBe('Focus block done. Take a 5-minute break.');
    const fourth = base({ cycle: 3 });
    expect(completionMessage(fourth, runOut(fourth))).toBe('Four blocks done. Take a 15-minute break.');
    const brk = base({ mode: 'long' });
    expect(completionMessage(brk, runOut(brk))).toBe('Break over. Back to focus.');
    const math = base({ mode: 'exam', examSection: 'Mathematics', examFullBoard: true });
    expect(completionMessage(math, runOut(math))).toBe('Mathematics section over. Pencils down. Next: ESAS (4 hours).');
    const ee = base({ mode: 'exam', examSection: 'EE' });
    expect(completionMessage(ee, runOut(ee))).toBe('EE section over. Pencils down.');
  });
});

describe('migratePomodoro (rehydrate)', () => {
  const NOW = T0 + 24 * 60 * MIN;

  it('maps the legacy timeLeft counter shape onto pausedRemaining', () => {
    const p = migratePomodoro({ workDuration: 25, breakDuration: 5, isWork: true, isRunning: false, timeLeft: 432 }, NOW);
    expect(p.pausedRemaining).toBe(432);
    expect(p.endsAt).toBeNull();
  });

  it('isWork:false becomes a short break, and isWork and timeLeft are gone', () => {
    const p = migratePomodoro({ workDuration: 25, breakDuration: 5, isWork: false, isRunning: false, pausedRemaining: 120, timeLeft: 9 }, NOW);
    expect(p).toMatchObject({ mode: 'short', pausedRemaining: 120 });
    expect(p).not.toHaveProperty('isWork');
    expect(p).not.toHaveProperty('timeLeft');
    expect(migratePomodoro({ isWork: true }, NOW).mode).toBe('focus');
  });

  // The previous version stopped such a block at 0:00 (already logged). It
  // loaded as 00:00 "in progress": an exam link was refused, Start ran the
  // same mode again, and the long break never came.
  it("the previous version's block stopped at 0:00 counts as done and moves on, logging nothing more", () => {
    const p = migratePomodoro({ workDuration: 25, breakDuration: 5, isWork: true, isRunning: false, endsAt: null, pausedRemaining: 0, focusStartedAt: null, pendingFocusLogs: [] }, NOW);
    expect(p).toMatchObject({ mode: 'short', cycle: 1, isRunning: false, pausedRemaining: 5 * 60 });
    expect(p.pendingFocusLogs).toEqual([]);
    expect(isInProgress(p, NOW)).toBe(false);
    const fromBreak = migratePomodoro({ isWork: false, isRunning: false, pausedRemaining: 0 }, NOW);
    expect(fromBreak).toMatchObject({ mode: 'focus', pausedRemaining: 25 * 60 });
  });

  it('a focus block that ran out while the app was closed is logged once and moves on, paused', () => {
    const endsAt = T0 + 25 * MIN;
    const p = migratePomodoro({ ...base({ autoStartBreaks: true }), isRunning: true, endsAt, pausedRemaining: null, focusStartedAt: T0 }, NOW);
    expect(p).toMatchObject({ mode: 'short', cycle: 1, isRunning: false, pausedRemaining: 5 * 60, focusStartedAt: null });
    expect(p.pendingFocusLogs).toEqual([expect.objectContaining({ minutes: 25, completed: true, endedAt: endsAt })]);
    expect(migratePomodoro(p, NOW).pendingFocusLogs).toHaveLength(1);
  });

  it('an exam section that ran out is logged in full and stays in exam mode, paused', () => {
    const endsAt = T0 + 360 * MIN;
    const p = migratePomodoro({ ...base({ mode: 'exam', examSection: 'EE' }), isRunning: true, endsAt, pausedRemaining: null, focusStartedAt: T0 }, NOW);
    expect(p).toMatchObject({ mode: 'exam', examSection: 'EE', isRunning: false, pausedRemaining: 360 * 60 });
    expect(p.pendingFocusLogs).toEqual([expect.objectContaining({ subject: 'EE', minutes: 360, completed: true })]);
  });

  it('a still-running future block survives rehydration untouched', () => {
    const endsAt = NOW + 10 * MIN;
    const p = migratePomodoro({ ...base(), isRunning: true, endsAt, pausedRemaining: null, focusStartedAt: NOW - 15 * MIN }, NOW);
    expect(p).toMatchObject({ isRunning: true, endsAt, focusStartedAt: NOW - 15 * MIN });
  });

  it('fills sane defaults from an empty or corrupt shape, and clamps what is out of range', () => {
    expect(migratePomodoro(undefined, NOW)).toMatchObject({
      workDuration: 25, breakDuration: 5, longBreakDuration: 15, longEvery: 4, mode: 'focus', cycle: 0,
      isRunning: false, sound: true, autoStartBreaks: false, examSection: 'Mathematics', pendingFocusLogs: [],
    });
    const p = migratePomodoro({ mode: 'nap', examSection: 'Chemistry', workDuration: 0, longEvery: 40, cycle: 99, pausedRemaining: 99_999, sound: 0 }, NOW);
    expect(p).toMatchObject({ mode: 'focus', examSection: 'Mathematics', workDuration: 25, longEvery: 8, cycle: 7, pausedRemaining: 25 * 60, sound: false });
  });
});
