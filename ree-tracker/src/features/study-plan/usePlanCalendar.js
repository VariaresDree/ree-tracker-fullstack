// src/features/study-plan/usePlanCalendar.js
//
// The learner's own calendar (Progress › Study plan › Key dates): their key
// dates — preboards, coaching, deadlines, rest days, personal events — and
// the days of the week they rest. The CELE tracker's "Important events" and
// the REST cells of its refresher calendar. Both shape the study plan; Today
// shows the next date and a rest day.
//
// Offline the same way as outside scores (hooks/useSyncedUserData): every
// change shows at once and is sent or queued; queued changes, the rest days
// included, are laid over the server's copy until they sync. Ids are made on
// the device.
import { useCallback } from 'react';
import { useSyncedUserData, resetSyncedMemory } from '../../hooks/useSyncedUserData';
import { writeOrQueue } from '../../services/writeOrQueue';
import { newEntryId } from '../exams/useOutsideScores';

export const KEY_DATES_ENDPOINT = '/api/user/key-dates';
export const PLAN_PREFS_ENDPOINT = '/api/user/plan-prefs';
const CACHE = 'keyDates';
export const DEFAULT_PREFS = Object.freeze({ restWeekdays: [], reviewMode: 'self' });

// Soonest first, as the server orders them.
const bySoonest = (a, b) => (a.startsOn === b.startsOn
  ? String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
  : (a.startsOn < b.startsOn ? -1 : 1));

const idFrom = (endpoint) => decodeURIComponent(endpoint.slice(KEY_DATES_ENDPOINT.length + 1));

/** One change applied to the calendar ({ items, prefs }). Idempotent. */
export function applyCalendarChange(value, change) {
  const items = value?.items || [];
  const prefs = value?.prefs || DEFAULT_PREFS;
  if (change.type === 'prefs') return { items, prefs: { ...prefs, ...change.prefs } };
  if (change.type === 'delete') return { items: items.filter((e) => e.id !== change.id), prefs };
  const existing = items.find((e) => e.id === change.item.id);
  const next = { ...existing, ...change.item, createdAt: existing?.createdAt || change.item.createdAt };
  return { items: [...items.filter((e) => e.id !== next.id), next].sort(bySoonest), prefs };
}

/** This account's queued calendar writes, as changes, oldest first. */
export function pendingCalendarChanges(writes, uid, ownerUid = null) {
  return (writes || [])
    .filter((w) => (w.ownerUid ?? ownerUid) === uid
      && (w.endpoint === PLAN_PREFS_ENDPOINT || w.endpoint === KEY_DATES_ENDPOINT || w.endpoint.startsWith(`${KEY_DATES_ENDPOINT}/`)))
    .map((w) => {
      if (w.endpoint === PLAN_PREFS_ENDPOINT) return { type: 'prefs', prefs: w.body };
      if (w.method === 'DELETE') return { type: 'delete', id: idFrom(w.endpoint) };
      if (w.method === 'PUT') return { type: 'upsert', item: { ...w.body, id: idFrom(w.endpoint) } };
      return { type: 'upsert', item: { createdAt: w.createdAt, ...w.body } };
    });
}

const fromResponse = (res) => ({ items: res?.items || [], prefs: { ...DEFAULT_PREFS, ...(res?.prefs || {}) } });
const EMPTY = { items: [], prefs: DEFAULT_PREFS };
const overlay = (value, writes, uid, ownerUid) => {
  const queued = pendingCalendarChanges(writes, uid, ownerUid);
  return { value: value == null ? null : queued.reduce(applyCalendarChange, value), count: queued.length };
};

/**
 * @param {{ fetchIfOlderThanMs?: number }} [options] 0 (default) always asks
 *   the server; Today passes a freshness window, since it is the boot screen.
 * @returns {{ items: object[]|null, prefs: object, status: string, queuedCount: number,
 *   add, update, remove, savePrefs, reload }}  items is null until the first copy arrives
 */
export function usePlanCalendar({ fetchIfOlderThanMs = 0 } = {}) {
  const { server, value, status, queuedCount, setServer, trackWrite, reload } = useSyncedUserData({
    endpoint: KEY_DATES_ENDPOINT,
    cacheName: CACHE,
    fromResponse,
    overlay,
    emptyValue: EMPTY,
    fetchIfOlderThanMs,
  });

  // Each change shows at once; a permanent rejection undoes that change only
  // and rethrows for the caller to explain.
  const change = useCallback(async (local, endpoint, method, body, supersede, undo) => {
    setServer((prev) => applyCalendarChange(prev, local));
    return trackWrite(async () => {
      try {
        const result = await writeOrQueue(endpoint, method, body, { queueKey: KEY_DATES_ENDPOINT, supersede });
        if (result.status === 'sent' && result.data?.item) {
          setServer((prev) => applyCalendarChange(prev, { type: 'upsert', item: result.data.item }));
        }
        return result.status;
      } catch (err) {
        setServer((prev) => applyCalendarChange(prev, undo));
        throw err;
      }
    });
  }, [setServer, trackWrite]);

  const previousOf = useCallback((id) => (server?.items || []).find((e) => e.id === id) || null, [server]);

  const add = useCallback((entry) => {
    const id = newEntryId();
    const body = { ...entry, id };
    return change({ type: 'upsert', item: { ...body, createdAt: new Date().toISOString() } }, KEY_DATES_ENDPOINT, 'POST', body, false, { type: 'delete', id });
  }, [change]);

  const update = useCallback((id, entry) => {
    const previous = previousOf(id);
    return change({ type: 'upsert', item: { ...entry, id } }, `${KEY_DATES_ENDPOINT}/${encodeURIComponent(id)}`, 'PUT', entry, true,
      previous ? { type: 'upsert', item: previous } : { type: 'delete', id });
  }, [change, previousOf]);

  const remove = useCallback((id) => {
    const previous = previousOf(id);
    return change({ type: 'delete', id }, `${KEY_DATES_ENDPOINT}/${encodeURIComponent(id)}`, 'DELETE', null, false,
      previous ? { type: 'upsert', item: previous } : { type: 'delete', id });
  }, [change, previousOf]);

  // Both fields every time (the route replaces both), queued with supersede.
  const savePrefs = useCallback(async (patch) => {
    const before = server?.prefs || DEFAULT_PREFS;
    const prefs = { ...DEFAULT_PREFS, ...(value?.prefs || {}), ...patch };
    setServer((prev) => applyCalendarChange(prev, { type: 'prefs', prefs }));
    return trackWrite(async () => {
      try {
        const result = await writeOrQueue(PLAN_PREFS_ENDPOINT, 'PUT', prefs, { queueKey: KEY_DATES_ENDPOINT, supersede: true });
        return result.status;
      } catch (err) {
        setServer((prev) => applyCalendarChange(prev, { type: 'prefs', prefs: before }));
        throw err;
      }
    });
  }, [server, value, setServer, trackWrite]);

  return {
    items: value ? value.items : null,
    prefs: value?.prefs || DEFAULT_PREFS,
    status,
    queuedCount,
    add,
    update,
    remove,
    savePrefs,
    reload,
  };
}

/** Test seam: forget the module-level copy between cases. */
export function __resetPlanCalendarMemory() {
  resetSyncedMemory(CACHE);
}
