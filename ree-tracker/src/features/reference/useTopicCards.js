// src/features/reference/useTopicCards.js
//
// The live formula cards for one topic, for a screen that shows a missed
// question. The links on screen share one read of the card list
// (fetchReferenceCards, which this device's copy answers offline), made only
// when a link is first wanted, so Practice doesn't load the cards until a
// question is missed. The read is kept for ten minutes, so cards approved
// meanwhile appear; an empty one (offline, nothing saved yet) or a failed
// one isn't kept at all, and coming back online drops it, so the links come
// back once there's a connection.
import { useEffect, useMemo, useState } from 'react';
import { fetchReferenceCards } from '../../services/dbQueries';
import { cardsForTopic } from './topicCards';

const KEEP_MS = 10 * 60 * 1000;
let shared = null; // { promise, at }

function loadCards() {
  if (shared && Date.now() - shared.at < KEEP_MS) return shared.promise;
  const entry = { at: Date.now(), promise: null };
  // Started inside a promise, so even a synchronous failure lands in the
  // handler below instead of the effect.
  entry.promise = Promise.resolve().then(() => fetchReferenceCards()).then(
    (items) => {
      const cards = Array.isArray(items) ? items : [];
      if (cards.length === 0 && shared === entry) shared = null;
      return cards;
    },
    () => {
      if (shared === entry) shared = null;
      return [];
    },
  );
  shared = entry;
  return entry.promise;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { shared = null; });
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
