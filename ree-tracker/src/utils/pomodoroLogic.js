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
//                endsAt (epoch ms | null), pausedRemaining (secs | null) }

const durationSecs = (p) => Math.max(1, Math.round((p.isWork ? p.workDuration : p.breakDuration) * 60));

/** Seconds left right now — the single source for every display. */
export function remainingSecs(p, now = Date.now()) {
    if (p.isRunning && p.endsAt != null) {
        return Math.max(0, Math.ceil((p.endsAt - now) / 1000));
    }
    return p.pausedRemaining ?? durationSecs(p);
}

/** Start/resume: anchor endsAt from whatever is currently remaining. */
export function startTimer(p, now = Date.now()) {
    const remaining = remainingSecs(p, now);
    const base = remaining > 0 ? remaining : durationSecs(p); // restart a finished block
    return { ...p, isRunning: true, endsAt: now + base * 1000, pausedRemaining: null };
}

/** Pause: capture the remaining seconds so nothing is lost. */
export function pauseTimer(p, now = Date.now()) {
    return { ...p, isRunning: false, endsAt: null, pausedRemaining: remainingSecs(p, now) };
}

/** Reset the CURRENT mode to its full duration, paused. */
export function resetTimer(p) {
    return { ...p, isRunning: false, endsAt: null, pausedRemaining: durationSecs(p) };
}

/** Flip focus/break, paused at the new mode's full duration (existing UX). */
export function switchMode(p) {
    const next = { ...p, isWork: !p.isWork, isRunning: false, endsAt: null };
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
    };
    if (p.pausedRemaining == null && typeof raw?.timeLeft === 'number') {
        p.pausedRemaining = Math.max(0, raw.timeLeft);
    }
    if (p.isRunning && (p.endsAt == null || p.endsAt <= Date.now())) {
        // Ran out (or was in the legacy shape) while the app was closed.
        return { ...p, isRunning: false, endsAt: null, pausedRemaining: p.endsAt ? 0 : (p.pausedRemaining ?? durationSecs(p)) };
    }
    return p;
}

export const _internals = { durationSecs };
