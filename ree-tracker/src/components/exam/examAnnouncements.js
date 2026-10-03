// src/components/exam/examAnnouncements.js
//
// What the exam chrome says to a screen reader. Pure helpers, kept out of the
// component modules so Fast Refresh treats those as component-only boundaries.

/**
 * The accessible name of a navigator cell. Answered/marked used to be colour
 * and a dot only, so "Go to item 3" said nothing about the item.
 */
export function navigatorLabel({ idx, answered, reviewState, marked }) {
  const state = reviewState || (answered ? 'answered' : 'not answered');
  return `Go to item ${idx + 1}, ${state}${marked ? ', marked for review' : ''}`;
}

/** Minutes-left marks a screen reader hears. */
const MILESTONE_MINUTES = [60, 30, 10, 5, 1];

/**
 * The milestone (in minutes) crossed between two readings, or null. A first
 * reading crosses nothing, so starting at 15 minutes left does not announce 30
 * and 60. If a throttled tab skips several, the latest (smallest) one wins.
 */
export function crossedMilestone(prevSecs, nowSecs) {
  if (prevSecs == null || nowSecs == null) return null;
  const crossed = MILESTONE_MINUTES.filter((m) => prevSecs > m * 60 && nowSecs <= m * 60);
  return crossed.length ? Math.min(...crossed) : null;
}
