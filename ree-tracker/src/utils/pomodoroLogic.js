// src/utils/pomodoroLogic.js
// Pure focus-timer state transitions on a TIMESTAMP model. The old model stored
// a decrementing `timeLeft` counter ticked by a component-local setInterval, so
// unmounting the sidebar (or navigating to a page without it) killed the tick
// and lost elapsed time: "the timer always resets". Deriving remaining time
// from an `endsAt` epoch instead survives unmounts, route changes, reloads,
// and even a suspended laptop; components only need to re-RENDER every second,
// never to write.
//
// Modes: 'focus', 'short' and 'long' (breaks), and 'exam', a physical paper
// exam timed at the PRC section's length (Mathematics 5 h, ESAS 4 h, EE 6 h).
// `mode` replaced the old `isWork` flag; migratePomodoro maps it.
//
// Settings (kept across sign-out): workDuration, breakDuration,
// longBreakDuration (minutes), longEvery (focus blocks per long break),
// autoStartBreaks, autoStartFocus, sound.
// Block state: mode, cycle (focus blocks done since the last long break),
// examSection, examFullBoard, subject, isRunning, endsAt (epoch ms | null),
// pausedRemaining (secs | null), focusStartedAt (epoch ms | null),
// pendingFocusLogs.
//
// Focus time: a focus block, or a paper exam section, is logged when it
// finishes, or when it's reset, skipped or switched away from after at least
// FOCUS_MIN_PARTIAL_MINUTES. Blocks wait in `pendingFocusLogs` (persisted with
// the timer) until the owning clock sends them (hooks/usePomodoroClock), so one
// finished while the app was closed is still counted. Only a block with a
// `focusStartedAt` is logged.
import { FOCUS_MIN_PARTIAL_MINUTES, FOCUS_SUBJECTS, PRC_EXAM_FORMAT } from '@ree/shared';

export const MODES = ['focus', 'short', 'long', 'exam'];
/** The paper exam's sections, in PRC board order. */
export const EXAM_SECTIONS = ['Mathematics', 'ESAS', 'EE'];
export const MODE_LABEL = { focus: 'Focus', short: 'Short break', long: 'Long break', exam: 'Paper exam' };

// Minutes a focus or break block can be set to (timer settings). Exam lengths
// come from PRC_EXAM_FORMAT, not from these.
export const MIN_MINUTES = 1;
export const MAX_MINUTES = 120;
export const MIN_LONG_EVERY = 2;
export const MAX_LONG_EVERY = 8;

/** A typed minutes value, kept to 1–120; empty or 0 keeps `fallback`. */
export const clampMinutes = (value, fallback) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, n));
};

/** Focus blocks per long break, kept to 2–8; anything unreadable keeps `fallback`. */
export const clampLongEvery = (value, fallback = 4) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(MAX_LONG_EVERY, Math.max(MIN_LONG_EVERY, n));
};

export const isFocusLike = (p) => p.mode === 'focus' || p.mode === 'exam';
const examMinutes = (section) => (PRC_EXAM_FORMAT[section] || PRC_EXAM_FORMAT.Mathematics).minutes;

/** The full length of `mode` (default: the current one), in seconds. */
export function modeDurationSecs(p, mode = p.mode) {
  const minutes = mode === 'exam' ? examMinutes(p.examSection)
    : mode === 'short' ? p.breakDuration
      : mode === 'long' ? p.longBreakDuration
        : p.workDuration;
  return Math.max(1, Math.round((Number(minutes) || 0) * 60));
}

/** Seconds left right now: the single source for every display. */
export function remainingSecs(p, now = Date.now()) {
  if (p.isRunning && p.endsAt != null) {
    return Math.max(0, Math.ceil((p.endsAt - now) / 1000));
  }
  return p.pausedRemaining ?? modeDurationSecs(p);
}

/** How much of the current block has run, 0..1. */
export function progressOf(p, now = Date.now()) {
  const total = modeDurationSecs(p);
  return Math.min(1, Math.max(0, 1 - remainingSecs(p, now) / total));
}

/** A block has started and not finished: running, or paused part-way. */
export function isInProgress(p, now = Date.now()) {
  return !!p.isRunning || p.focusStartedAt != null || remainingSecs(p, now) < modeDurationSecs(p);
}

const SETTING_DEFAULTS = {
  workDuration: 25, breakDuration: 5, longBreakDuration: 15, longEvery: 4,
  autoStartBreaks: false, autoStartFocus: false, sound: true,
};

/** A timer at rest in focus mode, with `prefs` laid over the defaults. */
export function freshPomodoro(prefs = {}) {
  const p = {
    ...SETTING_DEFAULTS,
    mode: 'focus', cycle: 0, examSection: 'Mathematics', examFullBoard: false, subject: 'General',
    isRunning: false, endsAt: null, pausedRemaining: null, focusStartedAt: null, pendingFocusLogs: [],
    ...prefs,
  };
  return { ...p, pausedRemaining: prefs.pausedRemaining ?? modeDurationSecs(p) };
}

/**
 * The focus block to log for `p` at `now`: the whole block when it finished,
 * or what ran of it when stopped early (if at least the minimum). Null for a
 * break, a block never started, or too short. A paper exam is logged under its
 * section.
 */
export function focusBlockFor(p, now = Date.now(), { completed = false } = {}) {
  if (!isFocusLike(p) || p.focusStartedAt == null) return null;
  const total = modeDurationSecs(p);
  const elapsedSecs = completed ? total : total - remainingSecs(p, now);
  const minutes = completed ? Math.round(elapsedSecs / 60) : Math.floor(elapsedSecs / 60);
  if (minutes < 1 || (!completed && minutes < FOCUS_MIN_PARTIAL_MINUTES)) return null;
  const endedAt = Math.max(p.focusStartedAt, completed && p.endsAt ? Math.min(p.endsAt, now) : now);
  const subject = p.mode === 'exam'
    ? (EXAM_SECTIONS.includes(p.examSection) ? p.examSection : 'Mathematics')
    : (FOCUS_SUBJECTS.includes(p.subject) ? p.subject : 'General');
  return {
    clientId: `focus-${p.focusStartedAt}`,
    subject,
    minutes,
    startedAt: p.focusStartedAt,
    endedAt,
    completed,
  };
}

const withLog = (p, block) => (block ? [...(p.pendingFocusLogs || []), block] : (p.pendingFocusLogs || []));

/** `p` at rest at the full length of its (possibly new) mode. */
const atRest = (p) => ({ ...p, isRunning: false, endsAt: null, focusStartedAt: null, pausedRemaining: modeDurationSecs(p) });

/** Start/resume: anchor endsAt from whatever is currently remaining. */
export function startTimer(p, now = Date.now()) {
  const remaining = remainingSecs(p, now);
  if (p.isRunning && p.endsAt != null && remaining > 0) return p;
  const base = remaining > 0 ? remaining : modeDurationSecs(p); // restart a finished block
  // A focus block is dated from its first start (pauses don't restart it).
  const focusStartedAt = isFocusLike(p) ? (remaining > 0 ? (p.focusStartedAt ?? now) : now) : null;
  return { ...p, isRunning: true, endsAt: now + base * 1000, pausedRemaining: null, focusStartedAt };
}

/** Pause: capture the remaining seconds so nothing is lost. */
export function pauseTimer(p, now = Date.now()) {
  if (!p.isRunning) return p;
  return { ...p, isRunning: false, endsAt: null, pausedRemaining: remainingSecs(p, now) };
}

/** Reset the CURRENT mode to its full length, paused (logging what ran of a focus block). */
export function resetTimer(p, now = Date.now()) {
  return { ...atRest(p), pendingFocusLogs: withLog(p, focusBlockFor(p, now)) };
}

/**
 * Leave the current block for the next one: after focus, a break (a long one
 * every `longEvery` blocks counted); after a break, focus; after an exam
 * section, the same section again, or the next one with "full board in
 * order". `counted` says whether a focus block counts toward the long break.
 */
function advance(p, now, block, { counted, autoStart }) {
  let next;
  let start;
  if (p.mode === 'focus') {
    const cycle = (p.cycle || 0) + (counted ? 1 : 0);
    const long = cycle >= p.longEvery;
    next = { ...p, mode: long ? 'long' : 'short', cycle: long ? 0 : cycle };
    start = p.autoStartBreaks;
  } else if (p.mode === 'exam') {
    const i = EXAM_SECTIONS.indexOf(p.examSection);
    const onward = p.examFullBoard && i >= 0 && i < EXAM_SECTIONS.length - 1;
    next = { ...p, examSection: onward ? EXAM_SECTIONS[i + 1] : p.examSection };
    start = false; // a paper exam never starts itself: pencils down first
  } else {
    next = { ...p, mode: 'focus', cycle: p.mode === 'long' ? 0 : p.cycle };
    start = p.autoStartFocus;
  }
  const rested = { ...atRest(next), pendingFocusLogs: withLog(p, block) };
  return autoStart && start ? startTimer(rested, now) : rested;
}

/**
 * The block ran out: log it in full and move on. `autoStart: false` lands the
 * next block paused whatever the settings say (a block that ran out while the
 * app was closed).
 */
export function completeTimer(p, now = Date.now(), { autoStart = true } = {}) {
  return advance(p, now, focusBlockFor(p, now, { completed: true }), { counted: true, autoStart });
}

/**
 * Skip to the next block (an exam's "End section"). What ran is logged if it
 * reached the minimum, and a skipped focus block counts toward the long break
 * only if it was logged.
 */
export function skipTimer(p, now = Date.now()) {
  const block = focusBlockFor(p, now);
  return advance(p, now, block, { counted: !!block, autoStart: true });
}

/** Switch mode, paused at the new mode's full length (logging what ran). */
export function setMode(p, mode, now = Date.now()) {
  if (!MODES.includes(mode) || mode === p.mode) return p;
  return { ...atRest({ ...p, mode }), pendingFocusLogs: withLog(p, focusBlockFor(p, now)) };
}

/** Pick the exam section. In exam mode that ends the section in progress (logging what ran). */
export function setExamSection(p, section, now = Date.now()) {
  if (!EXAM_SECTIONS.includes(section) || section === p.examSection) return p;
  if (p.mode !== 'exam') return { ...p, examSection: section };
  return { ...atRest({ ...p, examSection: section }), pendingFocusLogs: withLog(p, focusBlockFor(p, now)) };
}

export function setExamFullBoard(p, on) {
  return { ...p, examFullBoard: !!on };
}

/**
 * Apply settings, clamped. Only a new length for the CURRENT mode ends the
 * block in progress (what ran of a focus block is logged on the length it ran
 * at); any other change leaves the clock alone.
 */
export function updateSettings(p, patch = {}, now = Date.now()) {
  const next = { ...p };
  for (const key of ['workDuration', 'breakDuration', 'longBreakDuration']) {
    if (patch[key] != null) next[key] = clampMinutes(patch[key], p[key]);
  }
  if (patch.longEvery != null) next.longEvery = clampLongEvery(patch.longEvery, p.longEvery);
  for (const key of ['autoStartBreaks', 'autoStartFocus', 'sound', 'examFullBoard']) {
    if (patch[key] != null) next[key] = !!patch[key];
  }
  if (FOCUS_SUBJECTS.includes(patch.subject)) next.subject = patch.subject;
  next.cycle = Math.min(next.cycle || 0, next.longEvery - 1);

  if (modeDurationSecs(next) === modeDurationSecs(p)) return next;
  return { ...atRest(next), pendingFocusLogs: withLog(p, focusBlockFor(p, now)) };
}

const PREF_KEYS = Object.keys(SETTING_DEFAULTS);
const prefsOf = (p) => Object.fromEntries(PREF_KEYS.filter((k) => p?.[k] !== undefined).map((k) => [k, p[k]]));

/**
 * Sign-out: the device keeps its lengths, toggles and sound; the block in
 * progress, the logged blocks still waiting to be sent, and what they were for
 * belong to the account that signed out, and go.
 */
export function resetForSignOut(p) {
  return freshPomodoro(prefsOf(migratePomodoro(p)));
}

const NUMBER_WORD = { 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight' };
const hoursText = (minutes) => {
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hour${h === 1 ? '' : 's'}`;
};

/** What to tell the learner when `before` ran out and the timer moved to `after`. */
export function completionMessage(before, after) {
  if (before.mode === 'exam') {
    const next = after.examSection !== before.examSection
      ? ` Next: ${after.examSection} (${hoursText(examMinutes(after.examSection))}).`
      : '';
    return `${before.examSection} section over. Pencils down.${next}`;
  }
  if (before.mode === 'focus') {
    if (after.mode === 'long') {
      return `${NUMBER_WORD[before.longEvery] || before.longEvery} blocks done. Take a ${after.longBreakDuration}-minute break.`;
    }
    return `Focus block done. Take a ${after.breakDuration}-minute break.`;
  }
  return 'Break over. Back to focus.';
}

const finiteOr = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/**
 * Rehydrate migration + sanity. Accepts every persisted shape the timer has
 * had: the legacy `{ timeLeft }` counter, the `isWork` flag (false → a short
 * break), and anything missing or out of range (clamped). A block that ran out
 * while the app was closed is logged in full, dated when it ended, and the
 * timer moves on to the next block, paused.
 */
export function migratePomodoro(raw, now = Date.now()) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const longEvery = clampLongEvery(r.longEvery, SETTING_DEFAULTS.longEvery);
  const p = {
    workDuration: clampMinutes(r.workDuration, SETTING_DEFAULTS.workDuration),
    breakDuration: clampMinutes(r.breakDuration, SETTING_DEFAULTS.breakDuration),
    longBreakDuration: clampMinutes(r.longBreakDuration, SETTING_DEFAULTS.longBreakDuration),
    longEvery,
    autoStartBreaks: !!r.autoStartBreaks,
    autoStartFocus: !!r.autoStartFocus,
    sound: r.sound === undefined ? SETTING_DEFAULTS.sound : !!r.sound,
    mode: MODES.includes(r.mode) ? r.mode : (r.isWork === false ? 'short' : 'focus'),
    cycle: Math.min(longEvery - 1, Math.max(0, Math.floor(finiteOr(r.cycle, 0)))),
    examSection: EXAM_SECTIONS.includes(r.examSection) ? r.examSection : 'Mathematics',
    examFullBoard: !!r.examFullBoard,
    subject: FOCUS_SUBJECTS.includes(r.subject) ? r.subject : 'General',
    isRunning: !!r.isRunning,
    endsAt: finiteOr(r.endsAt, null),
    pausedRemaining: finiteOr(r.pausedRemaining, null),
    focusStartedAt: finiteOr(r.focusStartedAt, null),
    pendingFocusLogs: Array.isArray(r.pendingFocusLogs) ? r.pendingFocusLogs : [],
  };
  if (p.pausedRemaining == null && typeof r.timeLeft === 'number') p.pausedRemaining = r.timeLeft;
  if (p.pausedRemaining != null) p.pausedRemaining = Math.min(modeDurationSecs(p), Math.max(0, Math.round(p.pausedRemaining)));

  if (!p.isRunning) return { ...p, endsAt: null };
  if (p.endsAt == null) {
    // The legacy counter shape, running: nothing to date it by, so it waits paused.
    return { ...p, isRunning: false, pausedRemaining: p.pausedRemaining ?? modeDurationSecs(p), focusStartedAt: null };
  }
  if (p.endsAt <= now) return completeTimer(p, p.endsAt, { autoStart: false });
  return p;
}
