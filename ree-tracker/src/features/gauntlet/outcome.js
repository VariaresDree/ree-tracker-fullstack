// src/features/gauntlet/outcome.js
//
// What a graded Gauntlet run says on its result screen, pure: the headline and
// the line under it, from what the run did to the ladder.
import { SUBJECT_FLOOR, VERDICT } from '@ree/shared';

/** "Fri 9:30 PM" for a lock within the week, else the date too. */
export function formatLockTime(lockUntil, now = Date.now()) {
  const at = typeof lockUntil === 'number' ? lockUntil : Date.parse(lockUntil || '');
  if (!Number.isFinite(at) || at <= now) return null;
  const withinWeek = at - now < 6 * 24 * 3600 * 1000;
  return new Date(at).toLocaleString(undefined, withinWeek
    ? { weekday: 'short', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** The headline and the line under it, from what the run did to the ladder. */
export function outcomeCopy({ outcome, verdict, ladderLevel, lockUntil, isPassed }) {
  const lock = formatLockTime(lockUntil);
  switch (outcome) {
    case 'advanced':
      return { title: 'Tier passed', line: ladderLevel ? `Level ${ladderLevel} is open.` : 'The next tier is open.' };
    case 'cleared':
      return { title: 'Board cleared', line: 'This subject board is marked cleared on your ladder.' };
    case 'passed':
      return { title: 'Passed again', line: 'You had already cleared this tier, so your level stays the same.' };
    case 'locked':
      return { title: 'Not counted', line: 'This run started while the Gauntlet was locked, so it doesn’t change your place on the ladder.' };
    case 'failed': {
      const why = verdict === VERDICT.CONDITIONAL
        ? `A conditional pass (a subject under ${SUBJECT_FLOOR}%) doesn’t clear a Gauntlet tier. `
        : '';
      return { title: 'Not passed this time', line: `${why}${lock ? `The Gauntlet opens again ${lock}.` : 'The Gauntlet is locked for 12 hours.'}` };
    }
    default:
      return isPassed
        ? { title: 'Tier passed', line: '' }
        : { title: 'Not passed this time', line: lock ? `The Gauntlet opens again ${lock}.` : '' };
  }
}
