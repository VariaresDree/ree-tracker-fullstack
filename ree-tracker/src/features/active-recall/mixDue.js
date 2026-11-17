// src/features/active-recall/mixDue.js
//
// A bank-drawn Practice set leads with the learner's own due reviews, up to a
// quarter of it. Measured 2026-11-14: active learners answered 80 to 100
// questions a week in Practice and reviewed almost none of their due cards,
// because only Today's loop and Practice's "Review N now" ever served them.
//
// Several picked topics (2026-11-17): every topic gets an equal share of the
// WHOLE set, due reviews included. Before, the reviews came first and the
// even sample only filled what was left, so a learner whose reviews were
// mostly Algebra got Algebra, Complex Numbers and Trigonometry as 10, 5, 5.
import { evenSplit } from '../syllabus/topicPick';
import { shuffleArray } from '../../utils/shuffle';

/** How many due reviews a set of `want` questions asks for. */
export const dueShare = (want) => Math.ceil((Number(want) || 0) / 4);

/**
 * @param {Array<object>} bankSample  the set as drawn from the bank
 * @param {Array<object>} due  the learner's due questions, oldest due first
 * @param {number} want  the session's length
 * @param {{subtopic?: string, subtopicId?: string, topics?: string[]}} [scope]  a topic,
 *   subtopic or set of topics the session is pinned to (checked here, since the
 *   due queue is fetched by subject)
 * @returns {Array<object>} the due reviews (marked `dueReview`), then the bank's
 */
export function mixDue(bankSample, due, want, { subtopic, subtopicId, topics } = {}) {
  const fits = (q) => q?.id
    && (!subtopic || subtopic === 'All' || q.subtopic === subtopic)
    && (!topics?.length || topics.includes(q.subtopic))
    && (!subtopicId || q.subtopicId === subtopicId);
  const share = dueShare(want);
  const reviews = new Map();
  for (const q of due || []) {
    if (reviews.size >= share) break;
    if (fits(q) && !reviews.has(q.id)) reviews.set(q.id, { ...q, dueReview: true });
  }
  const rest = (bankSample || []).filter((q) => !reviews.has(q.id));
  if (topics?.length > 1) return balanced([...reviews.values()], rest, want, topics);
  return [...reviews.values(), ...rest.slice(0, Math.max(0, want - reviews.size))];
}

/**
 * An equal share of `want` for each topic: a topic's due reviews count toward
 * its own share (any beyond it wait for the next set), the bank fills the rest
 * of each share, and a topic that runs short passes its places to the others,
 * one at a time round the topics. Reviews still lead; the bank's questions
 * follow one topic at a time in turn, so no topic comes in a block.
 */
function balanced(reviews, bank, want, topics) {
  // The larger shares go to topics in random order, so none is always the one short.
  const order = shuffleArray(topics);
  const quota = new Map(evenSplit(want, order.length).map((n, i) => [order[i], n]));
  const byTopic = (list) => new Map(topics.map((t) => [t, list.filter((q) => q.subtopic === t)]));
  const due = byTopic(reviews);
  const pool = byTopic(bank);
  const takenReviews = [];
  const picks = new Map(topics.map((t) => [t, []]));
  for (const t of topics) {
    const r = due.get(t).slice(0, quota.get(t));
    takenReviews.push(...r);
    picks.get(t).push(...pool.get(t).splice(0, quota.get(t) - r.length));
  }
  // Short topics: each spare place goes to the topic with the fewest so far
  // that still has questions, so the others stay within one of each other.
  const total = (t) => picks.get(t).length + due.get(t).slice(0, quota.get(t)).length;
  let room = Math.max(0, want - takenReviews.length - [...picks.values()].reduce((sum, l) => sum + l.length, 0));
  while (room > 0) {
    const open = order.filter((t) => pool.get(t).length > 0);
    if (open.length === 0) break;
    const t = open.reduce((a, b) => (total(b) < total(a) ? b : a));
    picks.get(t).push(pool.get(t).shift());
    room -= 1;
  }
  const out = [];
  const lists = order.map((t) => picks.get(t));
  for (let i = 0; lists.some((l) => i < l.length); i += 1) {
    for (const l of lists) if (i < l.length) out.push(l[i]);
  }
  return [...takenReviews, ...out];
}
