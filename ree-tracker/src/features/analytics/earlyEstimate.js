// src/features/analytics/earlyEstimate.js
//
// When the readiness and pass numbers are still mostly the starting guess.
// They show from the first answer, and a new learner read "Pass probability
// 38%" as a verdict. Under EARLY_ANSWERS answers, or before the forecast has
// any topic-level signal (no weak topics found yet), they carry an "Early
// estimate" label. Today and Progress › Forecast use the same rule.
export const EARLY_ANSWERS = 100;

export function isEarlyEstimate({ snapshot, answered } = {}) {
  if (Number.isFinite(answered) && answered < EARLY_ANSWERS) return true;
  return !!snapshot && (!snapshot.weakTopics || snapshot.weakTopics.length === 0);
}
