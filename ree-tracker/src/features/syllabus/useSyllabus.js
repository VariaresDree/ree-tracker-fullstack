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
// The caching, overlay, stale-list and status rules are hooks/useSyncedUserData.
import { useCallback, useLayoutEffect, useRef } from 'react';
import { syllabusProgressErrors, todayManila } from '@ree/shared';
import { useSyncedUserData, resetSyncedMemory } from '../../hooks/useSyncedUserData';
import { writeOrQueue } from '../../services/writeOrQueue';

export const SYLLABUS_ENDPOINT = '/api/user/syllabus';
const CACHE = 'syllabus';
const FIELDS = ['read', 'watched', 'drilled', 'startedOn', 'finishedOn', 'note'];

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

const fromResponse = (res) => ({ weights: res?.weights || null, topics: res?.topics || [] });
const overlay = (value, writes, uid, ownerUid) => {
  const queued = queuedTopicStates(writes, uid, ownerUid);
  if (value == null || queued.size === 0) return { value, count: queued.size };
  return {
    value: { ...value, topics: value.topics.map((t) => (queued.has(t.topicId) ? { ...t, ...queued.get(t.topicId) } : t)) },
    count: queued.size,
  };
};

/** @param {{ fetchIfOlderThanMs?: number }} [options] 0 (default) always asks the server. */
export function useSyllabus({ fetchIfOlderThanMs = 0 } = {}) {
  const { value, status, queuedCount, setServer, trackWrite, reload } = useSyncedUserData({
    endpoint: SYLLABUS_ENDPOINT,
    cacheName: CACHE,
    fromResponse,
    overlay,
    fetchIfOlderThanMs,
  });

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
    setServer((prev) => withTopic(prev, topicId, next));
    return trackWrite(async () => {
      try {
        const result = await writeOrQueue(`${SYLLABUS_ENDPOINT}/${encodeURIComponent(topicId)}`, 'PUT', next, { queueKey: SYLLABUS_ENDPOINT, supersede: true });
        return result.status;
      } catch (err) {
        if (changeSeq.current.get(topicId) === seq) {
          setServer((prev) => withTopic(prev, topicId, previous));
          if (latest.current) latest.current = withTopic(latest.current, topicId, previous);
        }
        throw err;
      }
    });
  }, [setServer, trackWrite]);

  return {
    weights: value?.weights || null,
    topics: value?.topics || null,
    status,
    queuedCount,
    saveTopic,
    reload,
  };
}

/** Test seam: forget the module-level copy between cases. */
export function __resetSyllabusMemory() {
  resetSyncedMemory(CACHE);
}
