// src/services/bookmarks.js
//
// Bookmarks that work offline. A change is sent now or queued for the next
// reconnect, and the last list seen is kept on the device, in the store sign-out
// wipes. Reading it applies whatever is still queued, so a question bookmarked
// offline shows straight away, as long as the pack holds its text.
import { get, set } from 'idb-keyval';
import { auth } from '../config/firebaseDb';
import { useStore } from '../store/useStore';
import { apiRequest, normalizeQuestions } from './dbQueries';
import { getOfflinePack, OFFLINE_SUBJECTS } from './offlinePack';
import { classifySyncError, SYNC_OUTCOME } from './syncPolicy';
import { writeOrQueue } from './writeOrQueue';

const ENDPOINT = '/api/bookmarks';
const COPY_KEY = 'ree_bookmarks_v1';

export const saveBookmark = (uid, item) => writeOrQueue(ENDPOINT, 'POST', item, { queueKey: ENDPOINT });
export const removeBookmark = (uid, id) => writeOrQueue(`${ENDPOINT}/${id}`, 'DELETE', null, { queueKey: ENDPOINT });

/** The list once the queued writes land, in order. Pure. */
export function applyQueuedBookmarks(items, writes, pack = null) {
  let list = items;
  for (const write of writes) {
    if (write.method === 'POST') {
      const id = write.body?.questionId;
      if (list.some((q) => q.id === id)) continue;
      const question = OFFLINE_SUBJECTS.flatMap((s) => pack?.subjects?.[s] || []).find((q) => q.id === id);
      if (question) list = [question, ...list];
    } else {
      const id = write.endpoint.slice(ENDPOINT.length + 1);
      list = list.filter((q) => q.id !== id);
    }
  }
  return list;
}

const readCopy = async (uid) => {
  try {
    const copy = await get(COPY_KEY);
    return copy?.uid === uid ? copy.items : [];
  } catch {
    return [];
  }
};

// Newest first, with answers (the vault and a bookmarks session both need them).
// The server caps `limit` at 100. Throws only when the server refuses or fails:
// offline or timed out, it answers from the device.
export const fetchBookmarks = async ({ limit = 100 } = {}) => {
  const uid = auth.currentUser?.uid;
  let items;
  try {
    items = normalizeQuestions(await apiRequest(`${ENDPOINT}?limit=${limit}`));
    set(COPY_KEY, { uid, items }).catch(() => {});
  } catch (err) {
    if (classifySyncError(err) !== SYNC_OUTCOME.OFFLINE) throw err;
    items = await readCopy(uid);
  }
  const store = useStore.getState();
  const writes = (store.pendingWrites || []).filter((w) => w.endpoint.startsWith(ENDPOINT)
    && (w.ownerUid ?? store.ownerUid) === uid);
  if (writes.length === 0) return items;
  return applyQueuedBookmarks(items, writes, writes.some((w) => w.method === 'POST') ? await getOfflinePack() : null);
};
