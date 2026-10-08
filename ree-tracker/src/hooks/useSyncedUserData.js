// src/hooks/useSyncedUserData.js
//
// The offline-first plumbing for a per-user list the learner edits by hand
// (outside scores, the syllabus checklist): one copy of the rules both lists
// need, which had been written twice and had already drifted apart.
//
//   • State is held with the account it belongs to, so after a sign-in as
//     someone else the previous list reads as nothing at once.
//   • Paints from memory (a module-level copy per list, for tab switches),
//     then this device's cache, then the network. `fetchIfOlderThanMs` lets a
//     glance-only screen (Today) skip the network while the copy is fresh; a
//     copy restored from the cache keeps its real age.
//   • Queued writes (the store's pending-write queue, this account's only)
//     are laid over the server's copy by the list's own `overlay`.
//   • A list fetched while a change was being made may predate it: it is
//     dropped, and fetched again once the change lands (`trackWrite`).
//   • When the queue drains (the app reconnected and replayed it), the
//     server's copy is read back.
//   • Status tells offline, an unreachable server and a refused request apart.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import { apiRequest } from '../services/dbQueries';
import { readUserCacheEntry, writeUserCache } from '../services/userCache';
import { classifySyncError, SYNC_OUTCOME } from '../services/syncPolicy';

// name -> { uid, value, at }
const memory = new Map();

/** Test seam: forget a list's module-level copy (all lists when no name). */
export function resetSyncedMemory(name) {
  if (name) memory.delete(name);
  else memory.clear();
}

/**
 * Every option must keep its identity between renders (module-level
 * constants and functions): they are dependencies of the load, and a new
 * array or function each render would refetch on every render, overwriting
 * the changes the screen just showed.
 *
 * @param {object} options
 * @param {string} options.endpoint   GET endpoint for the list
 * @param {string} options.cacheName  a USER_CACHE_NAMES entry (services/userCache)
 * @param {(res: any) => any} [options.fromResponse]  response -> stored value
 * @param {(value: any, writes: object[], uid: string, ownerUid: string|null) => { value: any, count: number }} options.overlay
 *   the value with this account's queued writes applied, and how many apply
 * @param {any} [options.emptyValue]  what a failed first load shows (default: nothing, so the screen can explain)
 * @param {number} [options.fetchIfOlderThanMs]  0 always asks the server
 */
export function useSyncedUserData({
  endpoint, cacheName, fromResponse = (res) => res, overlay, emptyValue, fetchIfOlderThanMs = 0,
}) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const pendingWrites = useStore((s) => s.pendingWrites);
  const ownerUid = useStore((s) => s.ownerUid);

  const [data, setData] = useState(() => {
    const m = memory.get(cacheName);
    return { uid: m?.uid ?? null, value: m?.value ?? null, at: m?.at ?? 0 };
  });
  const server = data.uid === uid ? data.value : null;
  /** Replace the server copy (or derive it from the current one), stamped now. */
  const setServer = useCallback((next, at = Date.now()) => setData((prev) => {
    const current = prev.uid === uid ? prev.value : null;
    return { uid, value: typeof next === 'function' ? next(current) : next, at };
  }), [uid]);
  // loading | ready | offline (no connection) | unreachable (server error) | error (refused)
  const [status, setStatus] = useState('loading');

  const overlaid = useMemo(
    () => (server == null ? { value: null, count: overlay(null, pendingWrites, uid, ownerUid).count } : overlay(server, pendingWrites, uid, ownerUid)),
    [server, pendingWrites, uid, ownerUid, overlay],
  );

  // Keep memory and the device cache in step; a copy just restored from
  // either is not written back.
  const savedAt = data.at;
  useEffect(() => {
    if (!uid || server == null) return;
    const m = memory.get(cacheName);
    if (m && m.uid === uid && m.value === server) return;
    memory.set(cacheName, { uid, value: server, at: savedAt });
    writeUserCache(uid, cacheName, server, savedAt);
  }, [uid, server, savedAt, cacheName]);

  const writes = useRef({ made: 0, sending: 0, refetch: false });
  const loadRef = useRef(null);

  const load = useCallback(() => {
    if (!uid) return Promise.resolve();
    const madeBefore = writes.current.made;
    // Queued changes first, so the list fetched includes them.
    const flushed = navigator.onLine
      ? useStore.getState().flushPendingWrites().catch(() => {})
      : Promise.resolve();
    return flushed
      .then(() => apiRequest(endpoint))
      .then((res) => {
        const w = writes.current;
        if (w.made !== madeBefore || w.sending > 0) {
          if (w.sending > 0) w.refetch = true;
          else loadRef.current?.();
          return;
        }
        setServer(fromResponse(res));
        setStatus('ready');
      })
      .catch((err) => {
        const outcome = classifySyncError(err);
        setStatus(outcome === SYNC_OUTCOME.OFFLINE ? 'offline' : outcome === SYNC_OUTCOME.TRANSIENT ? 'unreachable' : 'error');
        if (emptyValue !== undefined) setServer((prev) => prev ?? emptyValue);
      });
  }, [uid, endpoint, fromResponse, emptyValue, setServer]);
  useEffect(() => { loadRef.current = load; }, [load]);

  useEffect(() => {
    if (!uid) return undefined;
    let live = true;
    const m = memory.get(cacheName);
    const known = m && m.uid === uid ? Promise.resolve({ value: m.value, savedAt: m.at }) : readUserCacheEntry(uid, cacheName);
    known.then((entry) => {
      if (!live) return;
      if (entry?.value != null) {
        // Into memory too, so the effect above doesn't write it straight back.
        if (!(m && m.uid === uid)) memory.set(cacheName, { uid, value: entry.value, at: entry.savedAt || 0 });
        // Only into an empty screen: a copy already fetched is newer.
        setData((prev) => (prev.uid === uid && prev.value != null ? prev : { uid, value: entry.value, at: entry.savedAt || 0 }));
      }
      if (entry?.value == null || Date.now() - (entry.savedAt || 0) >= fetchIfOlderThanMs) load();
      else setStatus('ready');
    });
    return () => { live = false; };
  }, [uid, cacheName, load, fetchIfOlderThanMs]);

  // The queue drained: read back the server's copy.
  const queuedCount = overlaid.count;
  const prevQueued = useRef(queuedCount);
  useEffect(() => {
    const drained = prevQueued.current > 0 && queuedCount === 0;
    prevQueued.current = queuedCount;
    if (drained && navigator.onLine) load();
  }, [queuedCount, load]);

  /**
   * Run one change's network write. While any is in flight, a list that
   * arrives is dropped and fetched again when the last one settles.
   */
  const trackWrite = useCallback(async (run) => {
    const w = writes.current;
    w.made += 1;
    w.sending += 1;
    try {
      return await run();
    } finally {
      w.sending -= 1;
      if (w.sending === 0 && w.refetch) {
        w.refetch = false;
        loadRef.current?.();
      }
    }
  }, []);

  return { server, value: overlaid.value, status, queuedCount, setServer, trackWrite, reload: load };
}
