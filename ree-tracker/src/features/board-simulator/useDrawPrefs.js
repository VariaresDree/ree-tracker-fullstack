// src/features/board-simulator/useDrawPrefs.js
//
// How this learner last chose to pick a mock's questions, and their own counts.
// On the account, so a tablet and a phone agree; a change shows at once and is
// sent or queued. One document, so a later queued change replaces an earlier one.
import { useCallback } from 'react';
import { useSyncedUserData, resetSyncedMemory } from '../../hooks/useSyncedUserData';
import { writeOrQueue } from '../../services/writeOrQueue';

export const DRAW_PREFS_ENDPOINT = '/api/user/draw-prefs';
const CACHE = 'drawPrefs';
export const DEFAULT_DRAW_PREFS = Object.freeze({ drawMode: 'even', ownCounts: {} });

const fromResponse = (res) => ({ ...DEFAULT_DRAW_PREFS, ...(res?.prefs || {}) });
const overlay = (value, writes, uid, ownerUid) => {
  const queued = (writes || []).filter((w) => w.endpoint === DRAW_PREFS_ENDPOINT && (w.ownerUid ?? ownerUid) === uid);
  return { value: value != null && queued.length ? { ...value, ...queued.at(-1).body } : value, count: queued.length };
};

export function useDrawPrefs() {
  const { server, value, setServer, trackWrite } = useSyncedUserData({
    endpoint: DRAW_PREFS_ENDPOINT,
    cacheName: CACHE,
    fromResponse,
    overlay,
    emptyValue: DEFAULT_DRAW_PREFS,
  });
  const prefs = value || DEFAULT_DRAW_PREFS;

  // Both fields every time (the route replaces both).
  const save = useCallback(async (patch) => {
    const before = server || DEFAULT_DRAW_PREFS;
    const next = { ...DEFAULT_DRAW_PREFS, ...(value || {}), ...patch };
    setServer(next);
    return trackWrite(async () => {
      try {
        return (await writeOrQueue(DRAW_PREFS_ENDPOINT, 'PUT', next, { queueKey: DRAW_PREFS_ENDPOINT, supersede: true })).status;
      } catch (err) {
        setServer(before);
        throw err;
      }
    });
  }, [server, value, setServer, trackWrite]);

  return { prefs, save };
}

/** Test seam: forget the module-level copy between cases. */
export function __resetDrawPrefsMemory() {
  resetSyncedMemory(CACHE);
}
