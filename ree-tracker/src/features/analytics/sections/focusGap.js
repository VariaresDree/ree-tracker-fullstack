// src/features/analytics/sections/focusGap.js
import { toDisplaySubject } from '@ree/shared';

export const pct = (x) => Math.round((x || 0) * 100);

/** The subject furthest below its board weight, when the gap is worth saying. */
export function focusGapLine(shares) {
  const gaps = (shares || [])
    .filter((s) => s.weight != null)
    .map((s) => ({ ...s, gap: s.weight - s.share }))
    .sort((a, b) => b.gap - a.gap);
  const top = gaps[0];
  if (!top || top.gap < 0.15) return null;
  return `${toDisplaySubject(top.subject)} is ${pct(top.weight)}% of the board but ${pct(top.share)}% of your focus time.`;
}

