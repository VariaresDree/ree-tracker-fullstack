// src/utils/topicLabels.js
// Matching question subtopic labels against the LIVE taxonomy
// (GET /api/config/tos → store.dynamicTOS). Same key as the server's
// topicResolver.normKey (trim + lowercase) — keep the two in lockstep, or a
// label can pass here and be refused at publish.

const topicKey = (s) => String(s ?? '').trim().toLowerCase();

const SENTINELS = new Set(['', 'all', 'general']);

/** The live spelling of `label` in `topics`, or null if it isn't one of them. */
export function canonicalTopic(label, topics) {
  const k = topicKey(label);
  if (!k || !Array.isArray(topics)) return null;
  return topics.find((t) => topicKey(t) === k) ?? null;
}

/**
 * Client mirror of the server's publish gate (topicResolver.resolveQuestionTopic):
 * a label is publishable when it is one of the subject's topics, or when no
 * taxonomy is loaded for the subject (the server decides then).
 */
export function isKnownTopic(label, topics) {
  if (!Array.isArray(topics) || topics.length === 0) return true;
  return canonicalTopic(label, topics) !== null;
}

/**
 * The subtopic an AI-generated question is filed under. A specific target the
 * admin picked always wins (the prompt demands it verbatim; models drift). For
 * "All topics" the model's label is snapped to the live spelling, or kept as-is
 * when it matches nothing, so the review queue can flag it for re-tagging.
 */
export function labelForGenerated(aiLabel, { target, topics }) {
  if (!SENTINELS.has(topicKey(target))) return target;
  return canonicalTopic(aiLabel, topics) ?? (aiLabel || target);
}
