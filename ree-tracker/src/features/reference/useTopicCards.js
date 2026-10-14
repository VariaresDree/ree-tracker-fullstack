// src/features/reference/useTopicCards.js
//
// The live formula cards for one topic, for a screen that shows a missed
// question. Every such screen shares one read of the card list per visit
// (fetchReferenceCards, which this device's copy answers offline), and it's
// made only when a link is first wanted, so Practice doesn't load the cards
// until a question is missed.
import { useEffect, useMemo, useState } from 'react';
import { fetchReferenceCards } from '../../services/dbQueries';
import { cardsForTopic } from './topicCards';

let shared = null;

function loadCards() {
  if (!shared) {
    // Started inside a promise, so even a synchronous failure lands in the
    // handler below instead of the effect.
    shared = Promise.resolve().then(() => fetchReferenceCards()).then(
      (items) => (Array.isArray(items) ? items : []),
      // A failed read is asked again next time, not remembered as "none".
      () => { shared = null; return []; },
    );
  }
  return shared;
}

/** Test seam: forget the shared card list. */
export function resetTopicCards() {
  shared = null;
}

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
