// src/services/userCache.js
//
// Small per-account caches in IndexedDB, for per-user lists a screen should
// paint without the network (outside scores today, the syllabus checklist
// next). Each entry is stamped with the account it belongs to and is read
// back only for that account, so a sign-out and sign-in as someone else in
// the same browser never shows the previous learner's data, even before
// resetStore has cleared them.
//
// The store's persisted stats live in the same database (idb-keyval's
// keyval-store); these sit beside them under their own keys.
import { get, set, del } from 'idb-keyval';

const PREFIX = 'ree-user-cache-v1:';

// Every cache name, so a sign-out can clear them without listing the store.
export const USER_CACHE_NAMES = ['outsideScores'];

/** The cached value for this account, or null (none, another account's, or unreadable). */
export async function readUserCache(uid, name) {
  if (!uid) return null;
  try {
    const entry = await get(PREFIX + name);
    return entry && entry.uid === uid ? entry.value : null;
  } catch {
    return null;
  }
}

/** Best effort: a failed write only costs the next cold start a skeleton. */
export async function writeUserCache(uid, name, value) {
  if (!uid) return;
  try {
    await set(PREFIX + name, { uid, value, savedAt: Date.now() });
  } catch {
    /* private mode or quota: the screen still works from the network */
  }
}

/** Called on sign-out and account deletion (resetStore). */
export async function clearUserCaches() {
  await Promise.all(USER_CACHE_NAMES.map((name) => del(PREFIX + name).catch(() => {})));
}
