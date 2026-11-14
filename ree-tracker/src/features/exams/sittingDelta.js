// src/features/exams/sittingDelta.js
//
// The mock debrief's two comparisons, pure: this sitting against the last one
// like it, and its first half against its second. A result used to stand
// alone: 62% in EE said nothing about whether that was up or down, or whether
// the score fell away late in the paper.

const SUBJECTS = ['Mathematics', 'ESAS', 'EE'];
// The PRC weighted average when the sitting has one, else the raw share right
// (the same headline Past sittings shows).
const headline = (r) => (typeof r.generalAverage === 'number' ? r.generalAverage : (r.score ?? 0));
// Like with like: a full board against a full board, an EE paper against an EE paper.
const formatOf = (r) => [r.kind || '', r.isPrcStandard ? 1 : 0, r.targetSubject || ''].join('|');

/**
 * This sitting against the newest earlier one of the same format.
 *
 * @param {Array<object>} history  mock history rows (GET …/deep/mock-history), any order
 * @param {string} sessionId  the sitting to compare
 * @returns {null | {date: string, overall: number, subjects: Record<string, number>}}
 *   points gained (negative: lost); null when it is the first of its format,
 *   or isn't in the history yet
 */
export function sittingChange(history, sessionId) {
  const rows = [...(history || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const at = rows.findIndex((r) => r.id === sessionId);
  if (at < 0) return null;
  const current = rows[at];
  const previous = rows.slice(at + 1).find((r) => formatOf(r) === formatOf(current));
  if (!previous) return null;
  const subjects = {};
  for (const s of SUBJECTS) {
    const now = current.subjectScores?.[s];
    const was = previous.subjectScores?.[s];
    if (now != null && was != null) subjects[s] = Math.round(now - was);
  }
  return { date: previous.date, overall: Math.round((headline(current) - headline(previous)) * 10) / 10, subjects };
}

/** "Up 8", "Down 3.5", "Level": a change in points, in words. */
export const changeWords = (n) => (n === 0 ? 'Level' : `${n > 0 ? 'Up' : 'Down'} ${Math.abs(n)}`);

// Halves of a short paper are a handful of items each, and a few points
// between them is chance.
const HALVES_MIN_ITEMS = 20;
const HALVES_MIN_GAP = 10;

/**
 * The share right in each half of the paper, in the order it was sat, when
 * they differ enough to say so (a blank counts as wrong, as it is scored).
 * @param {Array<{answer: string, userAnswer?: string}>} questions
 * @returns {null | {first: number, second: number}} percentages
 */
export function halves(questions) {
  const asked = (questions || []).filter((q) => q?.answer != null);
  if (asked.length < HALVES_MIN_ITEMS) return null;
  const mid = Math.floor(asked.length / 2);
  const pct = (list) => Math.round((list.filter((q) => q.userAnswer === q.answer).length / list.length) * 100);
  const first = pct(asked.slice(0, mid));
  const second = pct(asked.slice(mid));
  return Math.abs(second - first) >= HALVES_MIN_GAP ? { first, second } : null;
}

/** The halves as one line for the results card, or null. */
export function halvesLine(questions) {
  const h = halves(questions);
  if (!h) return null;
  const gap = Math.abs(h.second - h.first);
  return `Your second half was ${gap} points ${h.second < h.first ? 'lower' : 'higher'} than your first (${h.second}% against ${h.first}%).`;
}
