// src/features/paper-sets/usePrintedSets.js
//
// The account's printed sets (summaries: no items or edits), for Exams >
// Paper sets: memory, then this device, then the server, with this account's
// queued writes laid over it (a set made offline shows at once, a deleted one
// goes at once). The caching and status rules are hooks/useSyncedUserData.
import { useCallback } from 'react';
import { useSyncedUserData, resetSyncedMemory } from '../../hooks/useSyncedUserData';
import { PRINTED_SETS_ENDPOINT, overlaySetList } from './printedSetQueue';
import { deletePrintedSet } from './printedSetsApi';

const CACHE = 'printedSets';
const NO_SETS = [];
const fromResponse = (res) => (Array.isArray(res) ? res : res?.items || res?.sets || NO_SETS);

export function usePrintedSets() {
  const { server, value, status, queuedCount, setServer, trackWrite, reload } = useSyncedUserData({
    endpoint: PRINTED_SETS_ENDPOINT,
    cacheName: CACHE,
    fromResponse,
    overlay: overlaySetList,
    emptyValue: NO_SETS,
  });

  /** Delete a set: gone from the list at once, back again if the server refuses. */
  const remove = useCallback((id) => {
    const previous = (server || []).find((s) => s.id === id) || null;
    setServer((prev) => (prev || []).filter((s) => s.id !== id));
    return trackWrite(async () => {
      try {
        return (await deletePrintedSet(id)).status;
      } catch (err) {
        if (previous) {
          setServer((prev) => [...(prev || []).filter((s) => s.id !== id), previous]
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))));
        }
        throw err;
      }
    });
  }, [server, setServer, trackWrite]);

  return { sets: value, status, queuedCount, reload, remove };
}

/** Test seam: forget the module-level copy between cases. */
export function __resetPrintedSetsMemory() {
  resetSyncedMemory(CACHE);
}
