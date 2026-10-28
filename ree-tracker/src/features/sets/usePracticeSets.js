// src/features/sets/usePracticeSets.js
//
// Sets to finish (Progress › Syllabus › Sets): the CELE tracker's "Progress
// check", offline-first (hooks/createSyncedList). A template adds its sets in
// one request (POST /practice-sets/bulk).
import { createSyncedList } from '../../hooks/createSyncedList';

export const PRACTICE_SETS_ENDPOINT = '/api/user/practice-sets';

const list = createSyncedList({
  endpoint: PRACTICE_SETS_ENDPOINT,
  bulkEndpoint: `${PRACTICE_SETS_ENDPOINT}/bulk`,
  cacheName: 'practiceSets',
  // Oldest first, as the server lists them; each collection sorts its own.
  sort: (a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')),
});

export const usePracticeSets = list.useList;
export const applySetChange = list.applyChange;
export const pendingSetChanges = list.pendingChanges;
/** Test seam: forget the module-level copy between cases. */
export const __resetPracticeSetsMemory = list.reset;
