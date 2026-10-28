// Which formula cards are weak, and a topic to recall at random — two CELE
// tracker tips. One passer wrote every formula on a pad, and in the last month
// put on the wall only the ones they still missed; and they wrote topics on
// little cards, tossed one, and had to know that topic's formulas cold.

/** A card's topic name (cards carry their Topic row). */
export const topicName = (c) => c?.topic?.name || '';

/** A rating that means "I didn't know it well": Again or Hard. */
const WEAK_RATINGS = ['again', 'hard'];
/** Below the starting ease: rated Again or Hard at some point (rows from before the rating was kept). */
const WEAK_EASE = 2.3;

/** Is this review row a card you're weak on? Its last rating, or for an older row its schedule. */
export function isWeakReview(r) {
  if (!r) return false;
  if (r.lastRating) return WEAK_RATINGS.includes(r.lastRating);
  return r.repetitions === 0 || (Number.isFinite(r.easeFactor) && r.easeFactor < WEAK_EASE);
}

/** The cards, from `cards`, you last rated Again or Hard, in subject and topic order. */
export function weakCards(cards, reviewItems) {
  const weak = new Set((reviewItems || []).filter(isWeakReview).map((r) => r.cardId));
  return (cards || [])
    .filter((c) => weak.has(c.id))
    .sort((a, b) => String(a.subject).localeCompare(String(b.subject)) || topicName(a).localeCompare(topicName(b)) || String(a.name).localeCompare(String(b.name)));
}

/**
 * A topic to recall at random, favouring the ones with cards due or weak:
 * { subject, topic, cards } or null. `random` is a number in [0, 1), passed
 * in so the pick happens in a click handler, never during render.
 *
 * @param {object[]} cards       formula cards (subject, topic { name }, id)
 * @param {object[]} reviewItems the learner's card reviews
 * @param {number} random
 * @param {string|null} [avoid]  a topic key to skip when another exists (the last pick)
 */
export function pickRecallTopic(cards, reviewItems, random, avoid = null) {
  const byTopic = new Map();
  for (const c of cards || []) {
    const name = topicName(c);
    if (!name) continue;
    const key = `${c.subject}|${name}`;
    if (!byTopic.has(key)) byTopic.set(key, { key, subject: c.subject, topic: name, cards: [] });
    byTopic.get(key).cards.push(c);
  }
  const now = Date.now();
  const flagged = new Set((reviewItems || [])
    .filter((r) => isWeakReview(r) || new Date(r.nextReviewDate).getTime() <= now)
    .map((r) => r.cardId));
  let topics = [...byTopic.values()];
  if (topics.length > 1 && avoid) topics = topics.filter((t) => t.key !== avoid);
  if (topics.length === 0) return null;
  // Each topic weighs 1, plus 2 for each card due or weak in it.
  const weights = topics.map((t) => 1 + 2 * t.cards.filter((c) => flagged.has(c.id)).length);
  const total = weights.reduce((a, b) => a + b, 0);
  let at = Math.min(Math.max(random, 0), 0.999999) * total;
  for (let i = 0; i < topics.length; i++) {
    at -= weights[i];
    if (at < 0) return topics[i];
  }
  return topics[topics.length - 1];
}
