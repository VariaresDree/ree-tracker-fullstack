// src/features/exams/gauntletTierState.js
//
// The Gauntlet ladder's rules, pure (they were inline in the Arena page's
// render): which tier is cleared, open, or locked, and the cooldown left
// after a failed attempt.
import { SUBJECT_UNLOCK_LEVEL, isSubjectTier } from '../../config/examStandards';

/** secs → "Xh Ym" / "Y min", for the tier cards. */
export const formatLimit = (secs) => {
  const m = Math.round((secs || 0) / 60);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r} min`;
};

/**
 * A blended tier is cleared once the learner's level is past it, and open at
 * their level once they have answered its required number of questions. The
 * subject boards open together once every blended tier is cleared. Failing
 * any exam locks open tiers until the cooldown ends.
 *
 * @returns {{ subject: boolean, isPassed: boolean, isUnlocked: boolean, isLocked: boolean, isCoolingDown: boolean }}
 */
export function tierState(tier, { currentLevel = 1, totalAnswered = 0, coolingDown = false } = {}) {
  const subject = isSubjectTier(tier);
  const isPassed = !subject && currentLevel > tier.level;
  const isUnlocked = subject
    ? currentLevel >= SUBJECT_UNLOCK_LEVEL
    : currentLevel === tier.level && totalAnswered >= tier.reqQs;
  return {
    subject,
    isPassed,
    isUnlocked,
    isLocked: !isPassed && !isUnlocked,
    isCoolingDown: isUnlocked && !!coolingDown,
  };
}

/** Time left on the post-failure lock as "Xh Ym Zs", or null when unlocked. */
export function cooldownLabel(lockUntil, now) {
  if (!lockUntil || lockUntil <= now) return null;
  const diff = lockUntil - now;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${h}h ${m}m ${s}s`;
}
