// src/features/reference/practiseTopics.js
//
// After a formula-card review: a few questions on each topic just reviewed,
// so a formula is used, not only recognised. Drawn like any Practice set
// (GET /api/questions, or the offline pack when there's no connection), then
// run as a fixed set (itemsPreset), so it works offline once drawn.
import { fetchVaultQuestions } from '../../services/dbQueries';

export const PER_TOPIC = 2;
export const MAX_TOPICS = 5;

/** The distinct { subject, topic } of the cards rated, in the order rated, at most MAX_TOPICS. */
export function topicsOf(cards) {
  const seen = new Set();
  const out = [];
  for (const c of cards || []) {
    const topic = c?.topic?.name;
    if (!topic || !c.subject) continue;
    const k = `${c.subject}|${topic}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ subject: c.subject, topic });
    if (out.length === MAX_TOPICS) break;
  }
  return out;
}

/**
 * PER_TOPIC questions on each topic, gradable ones only, without repeats. A
 * topic that can't be drawn (no questions, or offline with no pack for it)
 * is skipped rather than failing the rest.
 */
export async function questionsForTopics(topics) {
  const draws = await Promise.allSettled(
    (topics || []).map(({ subject, topic }) => fetchVaultQuestions(subject, topic, PER_TOPIC)),
  );
  const seen = new Set();
  const items = [];
  for (const d of draws) {
    if (d.status !== 'fulfilled') continue;
    for (const q of (d.value || []).slice(0, PER_TOPIC)) {
      if (!q?.id || !q.text || !q.answer || seen.has(q.id)) continue;
      seen.add(q.id);
      items.push(q);
    }
  }
  return items;
}
