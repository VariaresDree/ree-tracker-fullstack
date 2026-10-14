// src/features/reference/topicCards.js
//
// The formula cards for a question's topic. Cards and questions share the
// Topic table: a card's `topic.id` is a question's `topicId`. Most screens
// that show a missed question carry only the topic's name (the question's
// subtopic, which the taxonomy keeps equal to Topic.name), so the name is
// matched too, with the server's key (trim + lowercase, as topicLabels.js).
// Pure, so the rule is tested apart from the loading.
import { normalizeSubject } from '@ree/shared';

const key = (s) => String(s ?? '').trim().toLowerCase();

/**
 * @param {Array<{ id: string, subject?: string, topic?: { id: string, name: string } }>} cards  live cards
 * @param {{ topicId?: string|null, topic?: string|null, subject?: string|null }} question
 * @returns the cards on that topic: by id, or by name within the subject
 */
export function cardsForTopic(cards, { topicId = null, topic = null, subject = null } = {}) {
  const name = key(topic);
  if ((!topicId && !name) || !Array.isArray(cards)) return [];
  const wanted = subject ? normalizeSubject(subject) : null;
  return cards.filter((c) => {
    if (!c?.topic) return false;
    if (topicId && c.topic.id === topicId) return true;
    if (!name || key(c.topic.name) !== name) return false;
    // A name can repeat across subjects; an id can't.
    return !wanted || !c.subject || normalizeSubject(c.subject) === wanted;
  });
}

/** The Library deep link for a topic's cards: Formula cards, opened at that topic (Library.jsx reads the state). */
export const topicCardsLink = (subject, topic) => ({ to: '/library?tab=formulas', state: { subject, topic } });
