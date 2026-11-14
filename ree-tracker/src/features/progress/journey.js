// src/features/progress/journey.js
//
// Progress › Overview › Your journey: what changed over time. Pure, so the
// rules (what counts as a point, what the week line says) are tested without
// rendering. Readiness and pass chance are one point a Manila day; accuracy is
// one point a Manila week (Monday first) per board subject.
import { DEFAULT_SYLLABUS_WEIGHTS, manilaDateOf, mondayOf, normalizeSubject, toDisplaySubject } from '@ree/shared';

// Fewer answers than this in a subject in a week is noise, not a point.
export const MIN_WEEK_ANSWERS = 10;
// The week line names an off-balance subject only past this many answers, and
// only when its share of them is this far under its share of the board.
const BALANCE_MIN_ANSWERS = 20;
const BALANCE_GAP = 0.1;
export const SUBJECTS = ['Mathematics', 'ESAS', 'EE'];

/**
 * What a tile shows, from points oldest or newest first.
 * @param {Array<{day: string, value: number}>} points
 * @returns {null | {values: number[], latest: number, change: number|null, since: string}}
 *   `change` is null with one point: there is nothing to compare it with yet.
 */
export function trendOf(points) {
  const clean = (points || [])
    .filter((p) => p?.day && Number.isFinite(p.value))
    .sort((a, b) => a.day.localeCompare(b.day));
  if (clean.length === 0) return null;
  const values = clean.map((p) => Math.round(p.value));
  return {
    values,
    latest: values[values.length - 1],
    change: values.length > 1 ? values[values.length - 1] - values[0] : null,
    since: clean[0].day,
  };
}

/** Readiness snapshots (GET /api/readiness/history) as points. */
export const readinessPoints = (snapshots) => (snapshots || []).map((s) => ({ day: manilaDateOf(s.createdAt), value: Number(s.score) }));

/** Pass chance per day (GET /api/forecast/history) as percent points. */
export const passPoints = (items) => (items || []).map((i) => ({ day: i.day, value: Number(i.passProbability) * 100 }));

/** Accuracy by week for each board subject, weeks under MIN_WEEK_ANSWERS left out. */
export function subjectTrends(items) {
  return SUBJECTS.map((subject) => ({
    subject,
    trend: trendOf((items || [])
      .filter((i) => normalizeSubject(i.subject) === subject && i.answered >= MIN_WEEK_ANSWERS)
      .map((i) => ({ day: i.week, value: (i.correct / i.answered) * 100 }))),
  }));
}

/**
 * One line on the week so far: how much, how well, and the subject furthest
 * under its share of the board (measured 2026-11-14: Mathematics was 55% of
 * answers and 25% of the board). Null before the week's first answer.
 */
export function weekLine(items, today, weights = DEFAULT_SYLLABUS_WEIGHTS) {
  const rows = (items || []).filter((i) => i.week === mondayOf(today));
  const answered = rows.reduce((n, r) => n + r.answered, 0);
  if (answered === 0) return null;
  const correct = rows.reduce((n, r) => n + r.correct, 0);
  const line = `This week: ${answered} answer${answered === 1 ? '' : 's'}, ${Math.round((correct / answered) * 100)}% right.`;
  if (answered < BALANCE_MIN_ANSWERS) return line;
  const behind = SUBJECTS
    .map((subject) => {
      const share = rows.filter((r) => normalizeSubject(r.subject) === subject).reduce((n, r) => n + r.answered, 0) / answered;
      return { subject, share, gap: (weights[subject] || 0) - share };
    })
    .sort((a, b) => b.gap - a.gap)[0];
  return behind.gap >= BALANCE_GAP
    ? `${line} ${toDisplaySubject(behind.subject)} is ${Math.round((weights[behind.subject] || 0) * 100)}% of the board and ${Math.round(behind.share * 100)}% of your answers.`
    : line;
}

/** Each week's accuracy per subject, newest first, for the table under the tiles. */
export function weekRows(items) {
  const weeks = [...new Set((items || []).map((i) => i.week))].sort().reverse();
  return weeks.map((week) => {
    const row = { week };
    for (const subject of SUBJECTS) {
      const hit = (items || []).find((i) => i.week === week && normalizeSubject(i.subject) === subject);
      row[subject] = hit && hit.answered > 0 ? { pct: Math.round((hit.correct / hit.answered) * 100), answered: hit.answered } : null;
    }
    return row;
  });
}
