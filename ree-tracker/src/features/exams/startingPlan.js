// src/features/exams/startingPlan.js
//
// Where a learner should start, from their placement result. The board fails
// anyone with a subject under 50%, whatever the average, so a subject under
// the floor comes first: Practice on that subject. Otherwise the projected
// average decides (startingMode). Worked out from the saved result each time
// rather than stored, so a change to the rule reaches every account.
// Pure, with no icon imports, so Today's logic can use it cheaply.
import { SUBJECT_FLOOR, toDisplaySubject } from '@ree/shared';

/** The mode for a projected general weighted average (modes.js keeps the copy). */
export function startingMode(projectedAverage) {
  const gwa = Number(projectedAverage);
  if (!Number.isFinite(gwa) || gwa < 60) return 'practice';
  return gwa < 70 ? 'mock' : 'gauntlet';
}

/**
 * @param {{ projectedGWA?: number, subjects?: Record<string, { expected?: number }> } | null} result
 * @returns {{ mode: 'practice'|'mock'|'gauntlet', subject: string|null, reason: 'floor'|'average', note: string|null } | null}
 */
export function startingPlan(result) {
  if (!result) return null;
  const below = Object.entries(result.subjects || {})
    .filter(([, r]) => Number.isFinite(r?.expected) && r.expected < SUBJECT_FLOOR)
    .sort(([, a], [, b]) => a.expected - b.expected);
  if (below.length > 0) {
    const [subject] = below[0];
    const name = toDisplaySubject(subject);
    return {
      mode: 'practice',
      subject,
      reason: 'floor',
      note: `${name} is under the ${SUBJECT_FLOOR}% subject floor, which fails the board on its own. Start with Practice on ${name}.`,
    };
  }
  return { mode: startingMode(result.projectedGWA), subject: null, reason: 'average', note: null };
}
