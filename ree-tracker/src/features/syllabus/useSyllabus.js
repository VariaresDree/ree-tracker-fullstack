// src/features/syllabus/useSyllabus.js
//
// The syllabus checklist: every TOS topic with the learner's Read / Watched /
// Drilled ticks, dates and note, plus the automatic Drilled tick from their
// answers. Ticking works offline.
//
//   • Paints from memory, then this device's cache, then the network. The
//     Today link passes `fetchIfOlderThanMs` so it reads the cache and only
//     asks the server when that copy is old; the Progress tab always asks.
//   • Each change shows at once and is sent as the topic's FULL state, or
//     queued when offline; a newer queued state for a topic replaces the older
//     one (supersede), so ticking through a subject offline costs one queued
//     write per topic. Queued states are laid over the server's copy.
//   • A list fetched while a change was being made may predate it, so it is
//     dropped and fetched again once the change lands.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { syllabusProgressErrors, todayManila } from '@ree/shared';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../store/useStore';
import { apiRequest } from '../../services/dbQueries';
import { readUserCacheEntry, writeUserCache } from '../../services/userCache';
import { writeOrQueue } from '../../services/writeOrQueue';
import { classifySyncError, SYNC_OUTCOME } from '../../services/syncPolicy';

export const SYLLABUS_ENDPOINT = '/api/user/syllabus';
const CACHE = 'syllabus';
const FIELDS = ['read', 'watched', 'drilled', 'startedOn', 'finishedOn', 'note'];

// Module-level, keyed by account: switching tabs repaints instantly.
let memory = { uid: null, value: null, at: 0 };

/** A topic's checklist state, the six fields the PUT carries. */
export const topicState = (row) => Object.fromEntries(FIELDS.map((f) => [f, row?.[f] ?? (f === 'read' || f === 'watched' || f === 'drilled' ? false : null)]));

/**
 * The newest queued state per topic, for this account (an unstamped write
 * belongs to the device's owner). Another account's writes are quarantined
 * on replay, never shown.
 */
export function queuedTopicStates(writes, uid, ownerUid = null) {
  const out = new Map();
  for (const w of writes || []) {
    if (w.method !== 'PUT' || !w.endpoint.startsWith(`${SYLLABUS_ENDPOINT}/`)) continue;
    if ((w.ownerUid ?? ownerUid) !== uid) continue;
    out.set(decodeURIComponent(w.endpoint.slice(SYLLABUS_ENDPOINT.length + 1)), w.body);
  }
  return out;
}

const withTopic = (value, topicId, state) => (value
  ? { ...value, topics: value.topics.map((t) => (t.topicId === topicId ? { ...t, ...state } : t)) }
  : value);

/**
 * The full state after `patch`. The first tick of a topic fills in today as
 * its start date, unless the learner set one; a finish date already set
 * before today is used instead, so the start never lands after the finish.
 */
export function nextTopicState(row, patch, today = todayManila()) {
  const before = topicState(row);
  const next = { ...before, ...patch };
  const tickedBefore = before.read || before.watched || before.drilled;
  const tickedNow = next.read || next.watched || next.drilled;
  if (!tickedBefore && tickedNow && !next.startedOn && patch.startedOn === undefined) {
    next.startedOn = next.finishedOn && next.finishedOn < today ? next.finishedOn : today;
  }
  return next;
}

/** @param {{ fetchIfOlderThanMs?: number }} [options] 0 (default) always asks the server. */
export function useSyllabus({ fetchIfOlderThanMs = 0 } = {}) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const pendingWrites = useStore((s) => s.pendingWrites);
  const ownerUid = useStore((s) => s.ownerUid);

  // `at`: when this copy was fetched or last changed here. A copy restored
  // from the device cache keeps the cache's time, so its age stays honest.
  const [data, setData] = useState(() => ({ uid: memory.uid, value: memory.value, at: memory.at }));
  const server = data.uid === uid ? data.value : null;
  const setServer = useCallback((next, at = Date.now()) => setData((prev) => {
    const current = prev.uid === uid ? prev.value : null;
    return { uid, value: typeof next === 'function' ? next(current) : next, at };
  }), [uid]);
  // loading | ready | offline (no connection) | unreachable (server error) | error (refused)
  const [status, setStatus] = useState('loading');

  const queued = useMemo(() => queuedTopicStates(pendingWrites, uid, ownerUid), [pendingWrites, uid, ownerUid]);
  const value = useMemo(() => {
    if (!server) return null;
    if (queued.size === 0) return server;
    return { ...server, topics: server.topics.map((t) => (queued.has(t.topicId) ? { ...t, ...queued.get(t.topicId) } : t)) };
  }, [server, queued]);

  const savedAt = data.at;
  useEffect(() => {
    if (!uid || !server) return;
    if (memory.uid === uid && memory.value === server) return; // nothing new to keep
    memory = { uid, value: server, at: savedAt };
    writeUserCache(uid, CACHE, server, savedAt);
  }, [uid, server, savedAt]);

  const writes = useRef({ made: 0, sending: 0, refetch: false });
  const loadRef = useRef(null);

  const load = useCallback(() => {
    if (!uid) return Promise.resolve();
    const madeBefore = writes.current.made;
    const flushed = navigator.onLine
      ? useStore.getState().flushPendingWrites().catch(() => {})
      : Promise.resolve();
    return flushed
      .then(() => apiRequest(SYLLABUS_ENDPOINT))
      .then((res) => {
        const w = writes.current;
        if (w.made !== madeBefore || w.sending > 0) {
          if (w.sending > 0) w.refetch = true;
          else loadRef.current?.();
          return;
        }
        setServer({ weights: res?.weights || null, topics: res?.topics || [] });
        setStatus('ready');
      })
      .catch((err) => {
        const outcome = classifySyncError(err);
        setStatus(outcome === SYNC_OUTCOME.OFFLINE ? 'offline' : outcome === SYNC_OUTCOME.TRANSIENT ? 'unreachable' : 'error');
      });
  }, [uid, setServer]);
  useEffect(() => { loadRef.current = load; }, [load]);

  useEffect(() => {
    if (!uid) return undefined;
    let live = true;
    const known = memory.uid === uid ? Promise.resolve({ value: memory.value, savedAt: memory.at }) : readUserCacheEntry(uid, CACHE);
    known.then((entry) => {
      if (!live) return;
      // Only into an empty screen: a copy already fetched is newer.
      if (entry?.value) {
        // Into memory too, so the effect above doesn't write the copy it was
        // just read from straight back to IndexedDB.
        if (memory.uid !== uid) memory = { uid, value: entry.value, at: entry.savedAt || 0 };
        setData((prev) => (prev.uid === uid && prev.value ? prev : { uid, value: entry.value, at: entry.savedAt || 0 }));
      }
      if (!entry?.value || Date.now() - (entry.savedAt || 0) >= fetchIfOlderThanMs) load();
      else setStatus('ready');
    });
    return () => { live = false; };
  }, [uid, load, fetchIfOlderThanMs]);

  // The queue drained (reconnected and replayed): read back the server's copy.
  const queuedCount = queued.size;
  const prevQueued = useRef(queuedCount);
  useEffect(() => {
    const drained = prevQueued.current > 0 && queuedCount === 0;
    prevQueued.current = queuedCount;
    if (drained && navigator.onLine) load();
  }, [queuedCount, load]);

  // The newest state, including changes made since the last render: two
  // changes to one topic before React re-renders must build on each other,
  // not both on the same stale row (the second full state would erase the
  // first). Refreshed at commit; advanced by saveTopic itself in between.
  const latest = useRef(value);
  useLayoutEffect(() => { latest.current = value; }, [value]);
  // Per topic, the newest change: a rejection undoes its change only if no
  // later change to that topic was made meanwhile.
  const changeSeq = useRef(new Map());

  /**
   * Change one topic. Resolves 'sent' or 'queued'; rejects (with the topic put
   * back) when the change is invalid or the server refuses it.
   */
  const saveTopic = useCallback(async (topicId, patch) => {
    const base = latest.current;
    const row = base?.topics.find((t) => t.topicId === topicId);
    if (!row) throw new Error('That topic isn’t in the syllabus.');
    const next = nextTopicState(row, patch);
    const problems = syllabusProgressErrors(next);
    if (Object.keys(problems).length > 0) throw Object.assign(new Error(Object.values(problems)[0]), { fields: problems });

    const previous = topicState(row);
    const seq = (changeSeq.current.get(topicId) || 0) + 1;
    changeSeq.current.set(topicId, seq);
    latest.current = withTopic(base, topicId, next);
    const w = writes.current;
    w.made += 1;
    w.sending += 1;
    setServer((prev) => withTopic(prev, topicId, next));
    try {
      const result = await writeOrQueue(`${SYLLABUS_ENDPOINT}/${encodeURIComponent(topicId)}`, 'PUT', next, { queueKey: SYLLABUS_ENDPOINT, supersede: true });
      return result.status;
    } catch (err) {
      if (changeSeq.current.get(topicId) === seq) {
        setServer((prev) => withTopic(prev, topicId, previous));
        if (latest.current) latest.current = withTopic(latest.current, topicId, previous);
      }
      throw err;
    } finally {
      w.sending -= 1;
      if (w.sending === 0 && w.refetch) {
        w.refetch = false;
        loadRef.current?.();
      }
    }
  }, [setServer]);

  return {
    weights: value?.weights || null,
    topics: value?.topics || null,
    status,
    queuedCount,
    saveTopic,
    reload: load,
  };
}

/** Test seam: forget the module-level copy between cases. */
export function __resetSyllabusMemory() {
  memory = { uid: null, value: null, at: 0 };
}
