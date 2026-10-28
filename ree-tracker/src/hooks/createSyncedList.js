// src/hooks/createSyncedList.js
//
// A per-user list the learner edits by hand, offline-first, built on
// useSyncedUserData: the sets to finish and the personal links (CELE round,
// 2026-10) are both this shape — ids made on the device, POST to add, PUT the
// whole entry to change it, DELETE to remove it — so they share one copy of
// the overlay and the optimistic-change rules instead of a third and fourth
// near-copy of useOutsideScores.
//
//   • Every change shows at once, and is sent or queued (writeOrQueue);
//     queued changes are laid over the server's copy until they sync.
//   • A permanent rejection undoes that change only, and rethrows.
//   • `bulkEndpoint` (optional) adds several entries in one request.
import { useCallback } from 'react';
import { useSyncedUserData, resetSyncedMemory } from './useSyncedUserData';
import { writeOrQueue } from '../services/writeOrQueue';
import { newEntryId } from '../features/exams/useOutsideScores';

/**
 * @param {{ endpoint: string, cacheName: string, bulkEndpoint?: string,
 *   sort: (a: object, b: object) => number }} options  module-level constants
 */
export function createSyncedList({ endpoint, cacheName, bulkEndpoint = null, sort }) {
  const idFrom = (ep) => decodeURIComponent(ep.slice(endpoint.length + 1));

  /** One change applied to the list. Idempotent. */
  function applyChange(items, change) {
    const list = items || [];
    if (change.type === 'delete') return list.filter((e) => e.id !== change.id);
    if (change.type === 'many') return change.items.reduce((acc, item) => applyChange(acc, { type: 'upsert', item }), list);
    const existing = list.find((e) => e.id === change.item.id);
    const next = { ...existing, ...change.item, createdAt: existing?.createdAt || change.item.createdAt };
    return [...list.filter((e) => e.id !== next.id), next].sort(sort);
  }

  /** This account's queued writes for the list, as changes, oldest first. */
  function pendingChanges(writes, uid, ownerUid = null) {
    return (writes || [])
      .filter((w) => (w.ownerUid ?? ownerUid) === uid
        && (w.endpoint === endpoint || w.endpoint.startsWith(`${endpoint}/`)))
      .map((w) => {
        if (bulkEndpoint && w.endpoint === bulkEndpoint) {
          return { type: 'many', items: (w.body?.items || []).map((item) => ({ createdAt: w.createdAt, ...item })) };
        }
        if (w.method === 'DELETE') return { type: 'delete', id: idFrom(w.endpoint) };
        if (w.method === 'PUT') return { type: 'upsert', item: { ...w.body, id: idFrom(w.endpoint) } };
        return { type: 'upsert', item: { createdAt: w.createdAt, ...w.body } };
      });
  }

  const fromResponse = (res) => res?.items || [];
  const EMPTY = [];
  const overlay = (items, writes, uid, ownerUid) => {
    const queued = pendingChanges(writes, uid, ownerUid);
    return { value: items == null ? null : queued.reduce(applyChange, items), count: queued.length };
  };

  function useList({ fetchIfOlderThanMs = 0 } = {}) {
    const { server, value, status, queuedCount, setServer, trackWrite, reload } = useSyncedUserData({
      endpoint,
      cacheName,
      fromResponse,
      overlay,
      emptyValue: EMPTY,
      fetchIfOlderThanMs,
    });

    const change = useCallback(async (local, ep, method, body, supersede, undo) => {
      setServer((prev) => applyChange(prev, local));
      return trackWrite(async () => {
        try {
          const result = await writeOrQueue(ep, method, body, { queueKey: endpoint, supersede });
          if (result.status === 'sent' && result.data?.item) setServer((prev) => applyChange(prev, { type: 'upsert', item: result.data.item }));
          if (result.status === 'sent' && Array.isArray(result.data?.items)) setServer((prev) => applyChange(prev, { type: 'many', items: result.data.items }));
          return result.status;
        } catch (err) {
          setServer((prev) => undo.reduce(applyChange, prev));
          throw err;
        }
      });
    }, [setServer, trackWrite]);

    const previousOf = useCallback((id) => (server || []).find((e) => e.id === id) || null, [server]);
    const restore = useCallback((id) => {
      const previous = previousOf(id);
      return [previous ? { type: 'upsert', item: previous } : { type: 'delete', id }];
    }, [previousOf]);

    // `entry.id` when the caller made the id first.
    const add = useCallback((entry) => {
      const body = { ...entry, id: entry.id || newEntryId() };
      return change({ type: 'upsert', item: { ...body, createdAt: new Date().toISOString() } }, endpoint, 'POST', body, false, [{ type: 'delete', id: body.id }]);
    }, [change]);

    const addMany = useCallback((entries) => {
      if (!bulkEndpoint) throw new Error('This list has no bulk endpoint.');
      const items = entries.map((e) => ({ ...e, id: e.id || newEntryId() }));
      const at = new Date().toISOString();
      return change({ type: 'many', items: items.map((i) => ({ ...i, createdAt: at })) }, bulkEndpoint, 'POST', { items }, false,
        items.map((i) => ({ type: 'delete', id: i.id })));
    }, [change]);

    const update = useCallback((id, entry) => change(
      { type: 'upsert', item: { ...entry, id } }, `${endpoint}/${encodeURIComponent(id)}`, 'PUT', entry, true, restore(id),
    ), [change, restore]);

    const remove = useCallback((id) => change(
      { type: 'delete', id }, `${endpoint}/${encodeURIComponent(id)}`, 'DELETE', null, false, restore(id),
    ), [change, restore]);

    return { items: value, status, queuedCount, add, addMany, update, remove, reload };
  }

  return { useList, applyChange, pendingChanges, reset: () => resetSyncedMemory(cacheName) };
}
