// src/features/active-recall/adaptiveFallback.js
//
// The adaptive set's on-device picker, for when POST /api/exams/next-item
// can't be reached (offline, a server error, a slow answer). The server picks
// by ability estimate and item information; this keeps the same feel with
// what the device has: a level that steps up after a right answer and down
// after a wrong one, and the unseen question whose difficulty is nearest it.
// Pure, so the session hook stays thin and this stays testable.

// Difficulty is the IRT b parameter where the item is calibrated, else the
// author's difficulty, both on the same rough −3…3 scale.
const num = (v) => (v == null || v === '' ? NaN : Number(v));
export const difficultyOf = (q) => {
  const b = num(q?.irtB);
  if (Number.isFinite(b)) return b;
  const d = num(q?.difficulty);
  return Number.isFinite(d) ? d : 0;
};

const STEP = 0.5;
const LIMIT = 3;

/** The level after a run of answers, starting from `start` (an ability estimate, or 0). */
export function nextLevel(history = [], start = 0) {
  let level = Number.isFinite(start) ? start : 0;
  for (const h of history) level += h.isCorrect ? STEP : -STEP;
  return Math.max(-LIMIT, Math.min(LIMIT, level));
}

/**
 * The next question: unseen, nearest the current level, a random one of the
 * closest three so a retake doesn't replay the same order. Null when nothing
 * unseen is left.
 */
export function pickNextLocal(pool, { seenIds = [], history = [], start = 0, random = Math.random } = {}) {
  const seen = new Set(seenIds);
  const unseen = (pool || []).filter((q) => q?.id && q.text && !seen.has(q.id));
  if (unseen.length === 0) return null;
  const level = nextLevel(history, start);
  const closest = unseen
    .map((q) => ({ q, gap: Math.abs(difficultyOf(q) - level) }))
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 3);
  return closest[Math.floor(random() * closest.length)].q;
}
