// src/features/exams/pacing.js
//
// Pacing against the board: how long each item took against the PRC pace for
// its subject (Mathematics 180 s, ESAS 144 s, EE 216 s per item, from
// @ree/shared boardPaceSeconds). Results used to list only the items over a
// flat three minutes, which put every subject on one pace and said nothing
// about the rest.
import { boardPaceSeconds, normalizeSubject } from '@ree/shared';

// Under half the pace counts as fast; up to the pace, on pace; over it, slow.
const FAST_SHARE = 0.5;
// Timings under a second are missing data (a resumed or skipped item), not speed.
const MIN_PLAUSIBLE_MS = 1000;

const SUBJECTS = ['Mathematics', 'ESAS', 'EE'];

/** 'fast' | 'onPace' | 'slow' for one item's time, or null when untimed. */
export function paceBand(subject, timeSpentMs) {
  const pace = boardPaceSeconds(subject);
  if (!pace || !(timeSpentMs >= MIN_PLAUSIBLE_MS)) return null;
  const secs = timeSpentMs / 1000;
  if (secs > pace) return 'slow';
  return secs < pace * FAST_SHARE ? 'fast' : 'onPace';
}

/**
 * Per subject: the pace, the average seconds per timed item, and how many were
 * fast / on pace / slow. Plus the five slowest items overall.
 *
 * @param items [{ order?, subject, timeSpentMs, isCorrect?, text? }]
 */
export function pacingSummary(items = []) {
  const by = {};
  const timed = [];
  for (const item of items) {
    const subject = normalizeSubject(item.subject);
    const band = paceBand(subject, item.timeSpentMs);
    if (!band) continue;
    if (!by[subject]) by[subject] = { subject, paceSecs: boardPaceSeconds(subject), totalSecs: 0, timed: 0, fast: 0, onPace: 0, slow: 0 };
    const row = by[subject];
    row.timed += 1;
    row.totalSecs += item.timeSpentMs / 1000;
    row[band] += 1;
    timed.push({ ...item, subject, secs: item.timeSpentMs / 1000, overBy: item.timeSpentMs / 1000 - row.paceSecs });
  }
  const bySubject = SUBJECTS.filter((s) => by[s]).map((s) => {
    const { totalSecs, ...row } = by[s];
    return { ...row, avgSecs: Math.round(totalSecs / row.timed) };
  });
  const slowest = timed.filter((t) => t.overBy > 0).sort((a, b) => b.overBy - a.overBy).slice(0, 5);
  return { bySubject, slowest, timedCount: timed.length };
}

/**
 * Where a timed sitting stands against an even pace: the item you'd be on if
 * the time were spread evenly, against how many are answered.
 * 'ahead' | 'onPace' | 'behind', with the expected count. Tolerance: two items
 * or 3% of the sitting, whichever is larger.
 */
export function paceStatus({ elapsedSecs, totalSecs, totalItems, answered }) {
  if (!(totalSecs > 0) || !(totalItems > 0)) return null;
  const expected = Math.min(totalItems, Math.floor((Math.max(0, elapsedSecs) / totalSecs) * totalItems));
  const tolerance = Math.max(2, Math.round(totalItems * 0.03));
  const status = answered >= expected + tolerance ? 'ahead' : answered <= expected - tolerance ? 'behind' : 'onPace';
  return { status, expected, answered };
}

// Times print through utils/time (formatClock).
