// src/features/exams/useOutsideScores.js
//
// The learner's outside scores (review-center preboards, book drills): the
// list, and add / edit / delete that work offline.
//
//   • Paints from memory, then from this device's cache, then the network.
//   • Every change shows at once. It is sent, or queued when offline
//     (services/writeOrQueue); queued changes are laid over whatever the
//     server last said, so the list never jumps back while they wait.
//   • Ids are made on the device, so an entry created offline and then edited
//     or deleted offline is one row when the queue replays.
// The caching, overlay, stale-list and status rules are hooks/useSyncedUserData.
import { useCallback } from 'react';
import { useSyncedUserData, resetSyncedMemory } from '../../hooks/useSyncedUserData';
import { writeOrQueue } from '../../services/writeOrQueue';

export const OUTSIDE_SCORES_ENDPOINT = '/api/user/outside-scores';
const CACHE = 'outsideScores';

/** A v4 UUID. crypto.randomUUID needs a secure context; the fallback doesn't. */
export function newEntryId() {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Newest first, as the server orders them.
const byNewest = (a, b) => (a.takenOn === b.takenOn
  ? String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  : (a.takenOn < b.takenOn ? 1 : -1));

const idFrom = (endpoint) => decodeURIComponent(endpoint.slice(OUTSIDE_SCORES_ENDPOINT.length + 1));

/** One change applied to a list. Idempotent, so applying a queued change twice is harmless. */
export function applyChange(items, change) {
  const list = items || [];
  if (change.type === 'delete') {
    // Deleting a first try leaves its retests as ordinary entries (the server's SetNull).
    return list
      .filter((e) => e.id !== change.id)
      .map((e) => (e.retestOfId === change.id ? { ...e, retestOfId: null } : e));
  }
  const existing = list.find((e) => e.id === change.item.id);
  const next = { ...existing, ...change.item, createdAt: existing?.createdAt || change.item.createdAt };
  return [...list.filter((e) => e.id !== next.id), next].sort(byNewest);
}

/**
 * This account's queued writes for the list, as changes, oldest first.
 * Another account's are left out: they are quarantined on replay, never sent.
 * An unstamped write belongs to the device's owner (`ownerUid`).
 */
export function pendingChanges(writes, uid, ownerUid = null) {
  return (writes || [])
    .filter((w) => (w.endpoint === OUTSIDE_SCORES_ENDPOINT || w.endpoint.startsWith(`${OUTSIDE_SCORES_ENDPOINT}/`))
      && (w.ownerUid ?? ownerUid) === uid)
    .map((w) => {
      if (w.method === 'DELETE') return { type: 'delete', id: idFrom(w.endpoint) };
      if (w.method === 'PUT') return { type: 'upsert', item: { ...w.body, id: idFrom(w.endpoint) } };
      return { type: 'upsert', item: { createdAt: w.createdAt, ...w.body } };
    });
}

const fromResponse = (res) => res?.items || [];
const NO_ENTRIES = [];
const overlay = (items, writes, uid, ownerUid) => {
  const queued = pendingChanges(writes, uid, ownerUid);
  return { value: items == null ? null : queued.reduce(applyChange, items), count: queued.length };
};

export function useOutsideScores() {
  const { server, value: items, status, queuedCount, setServer, trackWrite, reload } = useSyncedUserData({
    endpoint: OUTSIDE_SCORES_ENDPOINT,
    cacheName: CACHE,
    fromResponse,
    overlay,
    emptyValue: NO_ENTRIES, // a failed first load shows the empty list, with the status line
  });

  // Each change shows at once. A permanent rejection undoes that one change
  // (not the whole list, which may hold other changes made meanwhile) and
  // rethrows for the caller to explain.
  const change = useCallback(async (local, endpoint, method, body, supersede) => {
    const id = local.type === 'delete' ? local.id : local.item.id;
    const previous = (server || []).find((e) => e.id === id) || null;
    const linked = local.type === 'delete' ? (server || []).filter((e) => e.retestOfId === id).map((e) => e.id) : [];
    setServer((prev) => applyChange(prev, local));
    return trackWrite(async () => {
      try {
        const result = await writeOrQueue(endpoint, method, body, { queueKey: OUTSIDE_SCORES_ENDPOINT, supersede });
        if (result.status === 'sent' && result.data?.item) {
          setServer((prev) => applyChange(prev, { type: 'upsert', item: result.data.item }));
        }
        return result.status;
      } catch (err) {
        setServer((prev) => {
          const list = (prev || []).filter((e) => e.id !== id)
            .map((e) => (linked.includes(e.id) ? { ...e, retestOfId: id } : e));
          return previous ? applyChange(list, { type: 'upsert', item: previous }) : list;
        });
        throw err;
      }
    });
  }, [server, setServer, trackWrite]);

  // The stored retest link is always the FIRST try (the server normalises the
  // same way), so a retest of a retest still compares with the original.
  const firstTryOf = useCallback((id) => {
    if (!id) return null;
    const target = (items || []).find((e) => e.id === id);
    return target?.retestOfId || id;
  }, [items]);

  const add = useCallback((entry) => {
    const id = newEntryId();
    const body = { ...entry, id, retestOfId: firstTryOf(entry.retestOfId) };
    return change({ type: 'upsert', item: { ...body, createdAt: new Date().toISOString() } }, OUTSIDE_SCORES_ENDPOINT, 'POST', body, false);
  }, [change, firstTryOf]);

  const update = useCallback((id, entry) => {
    const body = { ...entry, retestOfId: firstTryOf(entry.retestOfId) };
    return change({ type: 'upsert', item: { ...body, id } }, `${OUTSIDE_SCORES_ENDPOINT}/${encodeURIComponent(id)}`, 'PUT', body, true);
  }, [change, firstTryOf]);

  const remove = useCallback((id) => change(
    { type: 'delete', id }, `${OUTSIDE_SCORES_ENDPOINT}/${encodeURIComponent(id)}`, 'DELETE', null, false,
  ), [change]);

  return { items, status, queuedCount, add, update, remove, reload };
}

/** Test seam: forget the module-level copy between cases. */
export function __resetOutsideScoresMemory() {
  resetSyncedMemory(CACHE);
}
