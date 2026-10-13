// src/features/notebook/useMistakes.js
//
// The mistake notebook's list (GET /api/user/mistakes): every question you
// got wrong, newest first, with your cause tag and whether it's fixed. Built
// on the server from your attempts; only the tags are written from here.
//
// The caching, overlay and stale-list rules are hooks/useSyncedUserData:
// paints from memory, then this device's cache, then the network; a tag shows
// at once and is sent as the mistake's full tag state, or queued offline (a
// newer one for the same question replaces the older).
import { useCallback, useLayoutEffect, useRef } from 'react';
import { isMistakeFixed } from '@ree/shared';
import { useSyncedUserData, resetSyncedMemory } from '../../hooks/useSyncedUserData';
import { writeOrQueue } from '../../services/writeOrQueue';

export const MISTAKES_ENDPOINT = '/api/user/mistakes';
const CACHE = 'mistakes';

/** One mistake with a new tag state, its Fixed recomputed. */
export function withTag(item, { cause, resolved }, now = new Date()) {
  const resolvedAt = resolved ? (item.resolvedAt || now.toISOString()) : null;
  return {
    ...item,
    cause: cause ?? null,
    resolvedAt,
    fixed: isMistakeFixed({ lastWrongAt: item.lastWrongAt, lastCorrectAt: item.lastCorrectAt, resolvedAt }),
  };
}

const mapItem = (value, questionId, fn) => (value
  ? { ...value, items: value.items.map((i) => (i.questionId === questionId ? fn(i) : i)) }
  : value);

/** The newest queued tag state per question, for this account. */
export function queuedTags(writes, uid, ownerUid = null) {
  const out = new Map();
  for (const w of writes || []) {
    if (w.method !== 'PUT' || !w.endpoint.startsWith(`${MISTAKES_ENDPOINT}/`)) continue;
    if ((w.ownerUid ?? ownerUid) !== uid) continue;
    out.set(decodeURIComponent(w.endpoint.slice(MISTAKES_ENDPOINT.length + 1)), w.body);
  }
  return out;
}

const fromResponse = (res) => ({ items: Array.isArray(res?.items) ? res.items : [], truncated: !!res?.truncated });
const overlay = (value, writes, uid, ownerUid) => {
  const queued = queuedTags(writes, uid, ownerUid);
  if (value == null || queued.size === 0) return { value, count: queued.size };
  return {
    value: { ...value, items: value.items.map((i) => (queued.has(i.questionId) ? withTag(i, queued.get(i.questionId)) : i)) },
    count: queued.size,
  };
};

/** @param {{ fetchIfOlderThanMs?: number }} [options] 0 (default) always asks the server. */
export function useMistakes({ fetchIfOlderThanMs = 0 } = {}) {
  const { value, status, queuedCount, setServer, trackWrite, reload } = useSyncedUserData({
    endpoint: MISTAKES_ENDPOINT,
    cacheName: CACHE,
    fromResponse,
    overlay,
    fetchIfOlderThanMs,
  });

  // The newest list, including tags set since the last render, so a rejected
  // tag is put back to what it was just before.
  const latest = useRef(value);
  useLayoutEffect(() => { latest.current = value; }, [value]);

  /**
   * Set a mistake's cause and whether it's fixed. Resolves 'sent' or
   * 'queued'; rejects (with the tag put back) when the server refuses.
   */
  const setTag = useCallback(async (questionId, next) => {
    const previous = latest.current?.items.find((i) => i.questionId === questionId) || null;
    if (latest.current) latest.current = mapItem(latest.current, questionId, (i) => withTag(i, next));
    setServer((prev) => mapItem(prev, questionId, (i) => withTag(i, next)));
    const state = { cause: next.cause ?? null, resolved: !!next.resolved };
    return trackWrite(async () => {
      try {
        const result = await writeOrQueue(`${MISTAKES_ENDPOINT}/${encodeURIComponent(questionId)}`, 'PUT', state, { queueKey: MISTAKES_ENDPOINT, supersede: true });
        return result.status;
      } catch (err) {
        if (previous) {
          setServer((prev) => mapItem(prev, questionId, () => previous));
          if (latest.current) latest.current = mapItem(latest.current, questionId, () => previous);
        }
        throw err;
      }
    });
  }, [setServer, trackWrite]);

  return {
    items: value?.items || null,
    truncated: !!value?.truncated,
    status,
    queuedCount,
    setTag,
    reload,
  };
}

/** Test seam: forget the module-level copy between cases. */
export function __resetMistakesMemory() {
  resetSyncedMemory(CACHE);
}
