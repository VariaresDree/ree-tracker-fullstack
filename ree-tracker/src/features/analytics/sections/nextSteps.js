// src/features/analytics/sections/nextSteps.js
//
// What each analysis offers to do next (2026-11-14: accuracy by subject, time
// per topic and calibration showed a finding with nothing to press). Pure, so
// "which subject", "which topic" and "when" are tested rules.
import { levelCalibration } from '../calibration';

// A topic's average time is worth acting on from this many timed answers.
const SLOWEST_MIN_ANSWERS = 5;

/** The subject to practise: the lowest accuracy, once there are two to compare. */
export function lowestSubject(items) {
  const answered = (items || []).filter((i) => i.total > 0);
  return answered.length < 2 ? null : [...answered].sort((a, b) => a.accuracy - b.accuracy)[0];
}

/** The topic to drill: the slowest average with enough answers behind it. */
export function slowestTopic(items) {
  return [...(items || [])].filter((i) => i.count >= SLOWEST_MIN_ANSWERS).sort((a, b) => b.avgTimeMs - a.avgTimeMs)[0] || null;
}

/** Sure and wrong more often than "sure" allows: the blind-spot drill is the fix. */
export const overConfident = (items) => (items || []).some((i) => i.confidence === 'HIGH' && levelCalibration(i.confidence, i.accuracy) === 'over');
