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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../store/useStore';
import { apiRequest } from '../../services/dbQueries';
import { readUserCache, writeUserCache } from '../../services/userCache';
import { writeOrQueue } from '../../services/writeOrQueue';
import { classifySyncError, SYNC_OUTCOME } from '../../services/syncPolicy';

export const OUTSIDE_SCORES_ENDPOINT = '/api/user/outside-scores';
const CACHE = 'outsideScores';

// Module-level, keyed by account: a remount (tab switch) paints instantly.
let memory = { uid: null, items: null };

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

/** Queued writes for this list as changes, oldest first. */
export function pendingChanges(writes) {
  return (writes || [])
    .filter((w) => w.endpoint === OUTSIDE_SCORES_ENDPOINT || w.endpoint.startsWith(`${OUTSIDE_SCORES_ENDPOINT}/`))
    .map((w) => {
      if (w.method === 'DELETE') return { type: 'delete', id: idFrom(w.endpoint) };
      if (w.method === 'PUT') return { type: 'upsert', item: { ...w.body, id: idFrom(w.endpoint) } };
      return { type: 'upsert', item: { createdAt: w.createdAt, ...w.body } };
    });
}

export function useOutsideScores() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const pendingWrites = useStore((s) => s.pendingWrites);
  // Held with the account it belongs to: after a sign-in as someone else the
  // previous list reads as null at once, with no reset needed.
  const [data, setData] = useState(() => ({ uid: memory.uid, items: memory.items }));
  const server = data.uid === uid ? data.items : null;
  const setServer = useCallback((next) => setData((prev) => {
    const current = prev.uid === uid ? prev.items : null;
    return { uid, items: typeof next === 'function' ? next(current) : next };
  }), [uid]);
  const [status, setStatus] = useState('loading'); // loading | ready | offline | error

  const queued = useMemo(() => pendingChanges(pendingWrites), [pendingWrites]);
  const items = useMemo(
    () => (server ? queued.reduce(applyChange, server) : null),
    [server, queued],
  );

  // Keep memory and the device cache in step with what the screen shows.
  useEffect(() => {
    if (!uid || !server) return;
    memory = { uid, items: server };
    writeUserCache(uid, CACHE, server);
  }, [uid, server]);

  const load = useCallback(() => {
    if (!uid) return Promise.resolve();
    // Queued changes first, so the list fetched includes them.
    const flushed = navigator.onLine
      ? useStore.getState().flushPendingWrites().catch(() => {})
      : Promise.resolve();
    return flushed
      .then(() => apiRequest(OUTSIDE_SCORES_ENDPOINT))
      .then((res) => {
        setServer(res?.items || []);
        setStatus('ready');
      })
      .catch((err) => {
        setStatus(classifySyncError(err) === SYNC_OUTCOME.PERMANENT ? 'error' : 'offline');
        setServer((prev) => prev || []);
      });
  }, [uid, setServer]);

  useEffect(() => {
    if (!uid) return undefined;
    let live = true;
    if (memory.uid !== uid) {
      readUserCache(uid, CACHE).then((cached) => {
        if (live && cached) setServer((prev) => prev || cached);
      });
    }
    load();
    return () => { live = false; };
  }, [uid, load, setServer]);

  // The queue drained (the app reconnected and replayed it): read back the
  // server's copy, which now holds those changes with its own timestamps.
  const queuedCount = queued.length;
  const prevQueued = useRef(queuedCount);
  useEffect(() => {
    const drained = prevQueued.current > 0 && queuedCount === 0;
    prevQueued.current = queuedCount;
    if (drained && navigator.onLine) load();
  }, [queuedCount, load]);

  // Each change shows at once; a permanent rejection puts the list back and
  // rethrows for the caller to explain.
  const change = useCallback(async (local, endpoint, method, body, supersede) => {
    const before = server;
    setServer((prev) => applyChange(prev, local));
    try {
      const result = await writeOrQueue(endpoint, method, body, { queueKey: OUTSIDE_SCORES_ENDPOINT, supersede });
      if (result.status === 'sent' && result.data?.item) {
        setServer((prev) => applyChange(prev, { type: 'upsert', item: result.data.item }));
      }
      return result.status;
    } catch (err) {
      setServer(before);
      throw err;
    }
  }, [server, setServer]);

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

  return { items, status, queuedCount, add, update, remove, reload: load };
}

/** Test seam: forget the module-level copy between cases. */
export function __resetOutsideScoresMemory() {
  memory = { uid: null, items: null };
}
