// src/features/active-recall/mixDue.js
//
// A bank-drawn Practice set leads with the learner's own due reviews, up to a
// quarter of it. Measured 2026-11-14: active learners answered 80 to 100
// questions a week in Practice and reviewed almost none of their due cards,
// because only Today's loop and Practice's "Review N now" ever served them.

/** How many due reviews a set of `want` questions asks for. */
export const dueShare = (want) => Math.ceil((Number(want) || 0) / 4);

/**
 * @param {Array<object>} bankSample  the set as drawn from the bank
 * @param {Array<object>} due  the learner's due questions, oldest due first
 * @param {number} want  the session's length
 * @param {{subtopic?: string, subtopicId?: string}} [scope]  a topic or subtopic
 *   the session is pinned to (an older server ignores them, so checked here too)
 * @returns {Array<object>} the due reviews (marked `dueReview`), then the bank's
 */
export function mixDue(bankSample, due, want, { subtopic, subtopicId } = {}) {
  const fits = (q) => q?.id
    && (!subtopic || subtopic === 'All' || q.subtopic === subtopic)
    && (!subtopicId || q.subtopicId === subtopicId);
  const share = dueShare(want);
  const reviews = new Map();
  for (const q of due || []) {
    if (reviews.size >= share) break;
    if (fits(q) && !reviews.has(q.id)) reviews.set(q.id, { ...q, dueReview: true });
  }
  const rest = (bankSample || []).filter((q) => !reviews.has(q.id));
  return [...reviews.values(), ...rest.slice(0, Math.max(0, want - reviews.size))];
}
