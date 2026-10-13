// src/utils/pomodoroLogic.js
// Pure Pomodoro state transitions on a TIMESTAMP model. The old model stored a
// decrementing `timeLeft` counter ticked by a component-local setInterval, so
// unmounting the sidebar (or navigating to a page without it) killed the tick
// and lost elapsed time — "the timer always resets". Deriving remaining time
// from an `endsAt` epoch instead survives unmounts, route changes, reloads,
// and even a suspended laptop; components only need to re-RENDER every second,
// never to write.
//
// State shape: { workDuration, breakDuration (minutes), isWork, isRunning,
//                endsAt (epoch ms | null), pausedRemaining (secs | null),
//                subject, focusStartedAt (epoch ms | null), pendingFocusLogs }
//
// Focus time: a focus block is logged when it finishes, or when it's reset or
// switched to a break after at least FOCUS_MIN_PARTIAL_MINUTES. Blocks wait in
// `pendingFocusLogs` (persisted with the timer) until the owning clock sends
// them (hooks/usePomodoroClock), so one finished while the app was closed is
// still counted. Only a block with a `focusStartedAt` is logged.
import { FOCUS_MIN_PARTIAL_MINUTES, FOCUS_SUBJECTS } from '@ree/shared';

const durationSecs = (p) => Math.max(1, Math.round((p.isWork ? p.workDuration : p.breakDuration) * 60));

/** Seconds left right now — the single source for every display. */
export function remainingSecs(p, now = Date.now()) {
    if (p.isRunning && p.endsAt != null) {
        return Math.max(0, Math.ceil((p.endsAt - now) / 1000));
    }
    return p.pausedRemaining ?? durationSecs(p);
}

/**
 * The focus block to log for `p` at `now`: the whole block when it finished,
 * or what ran of it when stopped early (if at least the minimum). Null for a
 * break, a block never started, or too short.
 */
export function focusBlockFor(p, now = Date.now(), { completed = false } = {}) {
    if (!p.isWork || p.focusStartedAt == null) return null;
    const elapsedSecs = completed ? durationSecs(p) : durationSecs(p) - remainingSecs(p, now);
    const minutes = completed ? Math.round(elapsedSecs / 60) : Math.floor(elapsedSecs / 60);
    if (minutes < 1 || (!completed && minutes < FOCUS_MIN_PARTIAL_MINUTES)) return null;
    const endedAt = Math.max(p.focusStartedAt, completed && p.endsAt ? Math.min(p.endsAt, now) : now);
    return {
        clientId: `focus-${p.focusStartedAt}`,
        subject: FOCUS_SUBJECTS.includes(p.subject) ? p.subject : 'General',
        minutes,
        startedAt: p.focusStartedAt,
        endedAt,
        completed,
    };
}

const withLog = (p, block) => (block ? [...(p.pendingFocusLogs || []), block] : (p.pendingFocusLogs || []));

/** Start/resume: anchor endsAt from whatever is currently remaining. */
export function startTimer(p, now = Date.now()) {
    const remaining = remainingSecs(p, now);
    const base = remaining > 0 ? remaining : durationSecs(p); // restart a finished block
    // A focus block is dated from its first start (pauses don't restart it).
    const focusStartedAt = p.isWork ? (remaining > 0 ? (p.focusStartedAt ?? now) : now) : null;
    return { ...p, isRunning: true, endsAt: now + base * 1000, pausedRemaining: null, focusStartedAt };
}

/** Pause: capture the remaining seconds so nothing is lost. */
export function pauseTimer(p, now = Date.now()) {
    return { ...p, isRunning: false, endsAt: null, pausedRemaining: remainingSecs(p, now) };
}

/** Reset the CURRENT mode to its full duration, paused (logging what ran of a focus block). */
export function resetTimer(p, now = Date.now()) {
    const block = focusBlockFor(p, now);
    return { ...p, isRunning: false, endsAt: null, pausedRemaining: durationSecs(p), focusStartedAt: null, pendingFocusLogs: withLog(p, block) };
}

/**
 * Flip focus/break, paused at the new mode's full duration (existing UX). A
 * focus block that ran out is logged in full; one cut short, for what ran.
 */
export function switchMode(p, now = Date.now()) {
    const block = focusBlockFor(p, now, { completed: remainingSecs(p, now) === 0 });
    const next = { ...p, isWork: !p.isWork, isRunning: false, endsAt: null, focusStartedAt: null, pendingFocusLogs: withLog(p, block) };
    return { ...next, pausedRemaining: durationSecs(next) };
}

/**
 * Rehydrate migration + sanity. Maps the legacy `{ timeLeft }` counter shape
 * onto `pausedRemaining`, and if the app was closed while running and the
 * block expired in the meantime, lands on "finished, paused at 0" so the
 * ticker's completion path (mode switch) fires naturally on next start.
 */
export function migratePomodoro(raw) {
    const p = {
        workDuration: raw?.workDuration ?? 25,
        breakDuration: raw?.breakDuration ?? 5,
        isWork: raw?.isWork ?? true,
        isRunning: raw?.isRunning ?? false,
        endsAt: raw?.endsAt ?? null,
        pausedRemaining: raw?.pausedRemaining ?? null,
        subject: FOCUS_SUBJECTS.includes(raw?.subject) ? raw.subject : 'General',
        focusStartedAt: raw?.focusStartedAt ?? null,
        pendingFocusLogs: Array.isArray(raw?.pendingFocusLogs) ? raw.pendingFocusLogs : [],
    };
    if (p.pausedRemaining == null && typeof raw?.timeLeft === 'number') {
        p.pausedRemaining = Math.max(0, raw.timeLeft);
    }
    if (p.isRunning && (p.endsAt == null || p.endsAt <= Date.now())) {
        // Ran out (or was in the legacy shape) while the app was closed. A
        // focus block that ran out is logged now, dated when it ended.
        const block = p.endsAt ? focusBlockFor(p, p.endsAt, { completed: true }) : null;
        return {
            ...p, isRunning: false, endsAt: null, pausedRemaining: p.endsAt ? 0 : (p.pausedRemaining ?? durationSecs(p)),
            focusStartedAt: null, pendingFocusLogs: withLog(p, block),
        };
    }
    return p;
}

// Minutes a focus or break block can be set to (Pomodoro settings).
export const MIN_MINUTES = 1;
export const MAX_MINUTES = 120;
/** A typed minutes value, kept to 1–120; empty or 0 keeps `fallback`. */
export const clampMinutes = (value, fallback) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, n));
};
