// src/features/reference/useCardReviews.js
//
// Spaced repetition for formula cards: your rated cards and when each is due
// (GET /api/user/card-reviews), and `rate()` for a rating after flipping one.
//
//   • Paints from memory, then this device's cache, then the network
//     (hooks/useSyncedUserData).
//   • A rating is sent, or queued when offline. Ratings are not replaceable
//     (each one moves the schedule), so queued ones are replayed in order and
//     laid over the server's copy with the same SM-2 step the server runs
//     (@ree/shared rateCard). The server's answer replaces the row once sent.
import { useCallback, useMemo } from 'react';
import { NEW_CARD, rateCard } from '@ree/shared';
import { useSyncedUserData, resetSyncedMemory } from '../../hooks/useSyncedUserData';
import { writeOrQueue } from '../../services/writeOrQueue';

export const CARD_REVIEWS_ENDPOINT = '/api/user/card-reviews';
const CACHE = 'cardReviews';

const newReviewId = () => (globalThis.crypto?.randomUUID?.() || `r-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

const fromResponse = (res) => ({ items: Array.isArray(res?.items) ? res.items : [] });

/** Queued ratings (this account's, in order) applied over the rows. */
export function overlayQueuedRatings(value, writes, uid, ownerUid = null) {
  if (value == null) return { value, count: 0 };
  const byId = new Map(value.items.map((r) => [r.cardId, r]));
  let count = 0;
  for (const w of writes || []) {
    if (w.method !== 'POST' || !w.endpoint.startsWith(`${CARD_REVIEWS_ENDPOINT}/`)) continue;
    if ((w.ownerUid ?? ownerUid) !== uid) continue;
    const cardId = decodeURIComponent(w.endpoint.slice(CARD_REVIEWS_ENDPOINT.length + 1));
    try {
      const next = rateCard(byId.get(cardId) || NEW_CARD, w.body?.rating, w.body?.reviewedAt ? new Date(w.body.reviewedAt) : new Date());
      byId.set(cardId, { cardId, ...next, nextReviewDate: next.nextReviewDate.toISOString(), lastReviewed: next.lastReviewed.toISOString() });
      count += 1;
    } catch { /* an unknown rating: the server will refuse it too */ }
  }
  return count ? { value: { ...value, items: Array.from(byId.values()) }, count } : { value, count };
}

/** The card ids due now among the cards you can see, soonest due first. */
export function dueCardIds(items, cardIds, now = Date.now()) {
  const visible = new Set(cardIds);
  return (items || [])
    .filter((r) => visible.has(r.cardId) && new Date(r.nextReviewDate).getTime() <= now)
    .sort((a, b) => new Date(a.nextReviewDate) - new Date(b.nextReviewDate))
    .map((r) => r.cardId);
}

export function useCardReviews({ fetchIfOlderThanMs = 0 } = {}) {
  const { value, status, setServer, trackWrite, reload } = useSyncedUserData({
    endpoint: CARD_REVIEWS_ENDPOINT,
    cacheName: CACHE,
    fromResponse,
    overlay: overlayQueuedRatings,
    fetchIfOlderThanMs,
  });
  const items = useMemo(() => value?.items || [], [value]);
  const byId = useMemo(() => new Map(items.map((r) => [r.cardId, r])), [items]);

  /**
   * Rate a card. Resolves 'sent' (the row is the server's) or 'queued' (it
   * shows through the queue's overlay); rejects when the server refuses it.
   */
  const rate = useCallback((cardId, rating) => trackWrite(async () => {
    const body = { rating, reviewId: newReviewId(), reviewedAt: new Date().toISOString() };
    const result = await writeOrQueue(`${CARD_REVIEWS_ENDPOINT}/${encodeURIComponent(cardId)}`, 'POST', body, { queueKey: CARD_REVIEWS_ENDPOINT });
    const item = result.status === 'sent' ? result.data?.item : null;
    if (item) {
      setServer((prev) => {
        const rest = (prev?.items || []).filter((r) => r.cardId !== cardId);
        return { ...(prev || {}), items: [...rest, item] };
      });
    }
    return result.status;
  }), [setServer, trackWrite]);

  return {
    items,
    status,
    rowFor: (cardId) => byId.get(cardId) || null,
    rate,
    reload,
  };
}

/** Test seam: forget the module-level copy between cases. */
export function __resetCardReviewsMemory() {
  resetSyncedMemory(CACHE);
}
