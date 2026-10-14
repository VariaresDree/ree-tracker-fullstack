// src/features/analytics/sections/weeklyGoal.js
//
// The weekly focus goal's arithmetic, kept pure. A goal is minutes a week;
// each board subject's part of it follows its weight on the board (the same
// largest-remainder split Today uses for the daily target), so "10 hours"
// reads as EE 4h 30m, ESAS 3h, Mathematics 2h 30m.
import { apportionItems, DEFAULT_SYLLABUS_WEIGHTS } from '@ree/shared';

export const GOAL_MIN = 30;
export const GOAL_MAX = 3000;
export const GOAL_PRESETS = [300, 600, 900];

const BOARD_SUBJECTS = ['Mathematics', 'ESAS', 'EE'];

/** The weights in the summary's shares (the server's syllabus weights), else the default. */
export function weightsFrom(shares) {
  const known = (shares || []).filter((s) => BOARD_SUBJECTS.includes(s.subject) && Number.isFinite(s.weight));
  return known.length === BOARD_SUBJECTS.length
    ? Object.fromEntries(known.map((s) => [s.subject, s.weight]))
    : DEFAULT_SYLLABUS_WEIGHTS;
}

/**
 * Each board subject's part of the goal, and this week's minutes on it.
 * @param {number} goal  minutes a week
 * @param {{ bySubject?: Record<string, number> }} week
 */
export function goalRows(goal, week, weights = DEFAULT_SYLLABUS_WEIGHTS) {
  const split = apportionItems(goal, weights);
  return BOARD_SUBJECTS.map((subject) => ({
    subject,
    target: split[subject] || 0,
    minutes: week?.bySubject?.[subject] || 0,
  }));
}

/** Hours typed by the learner ("7.5") as whole minutes, or null outside GOAL_MIN–GOAL_MAX. */
export function minutesFromHours(text) {
  const hours = Number(String(text ?? '').trim().replace(',', '.'));
  if (!Number.isFinite(hours) || hours <= 0) return null;
  const minutes = Math.round(hours * 60);
  return minutes >= GOAL_MIN && minutes <= GOAL_MAX ? minutes : null;
}

/** A goal in hours, as the learner would say it: "10 h", "7.5 h". */
export function hoursLabel(minutes) {
  const h = Math.round((minutes / 60) * 10) / 10;
  return `${h} h`;
}
