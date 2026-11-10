// src/features/reference/useTopicCards.js
//
// The live formula cards for one topic, for a screen that shows a missed
// question. Read only when a link is first wanted, so Practice doesn't load
// the cards until a question is missed. The links share Library's read of the
// deck (fetchReferenceCards keeps one for ten minutes, and this device's copy
// answers offline); a failed read shows no links rather than an error.
import { useEffect, useMemo, useState } from 'react';
import { fetchReferenceCards } from '../../services/dbQueries';
import { cardsForTopic } from './topicCards';

// Started inside a promise, so even a synchronous failure lands in the handler.
const loadCards = () => Promise.resolve().then(() => fetchReferenceCards()).then(
  (items) => (Array.isArray(items) ? items : []),
  () => [],
);

/**
 * @param {{ topicId?: string|null, topic?: string|null, subject?: string|null }} question
 * @param {{ enabled?: boolean }} [options]  false: nothing is loaded
 */
export function useTopicCards({ topicId = null, topic = null, subject = null } = {}, { enabled = true } = {}) {
  const [cards, setCards] = useState(null);
  const wanted = enabled && !!(topicId || topic);

  useEffect(() => {
    if (!wanted) return undefined;
    let live = true;
    loadCards().then((items) => { if (live) setCards(items); });
    return () => { live = false; };
  }, [wanted]);

  return useMemo(
    () => (wanted ? cardsForTopic(cards, { topicId, topic, subject }) : []),
    [wanted, cards, topicId, topic, subject],
  );
}
