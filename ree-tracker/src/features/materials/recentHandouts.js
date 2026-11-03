// src/features/materials/recentHandouts.js
// The handouts this account last opened on this device, newest first. A
// convenience only: if storage is blocked, there's simply no list.
const MAX = 5;
const keyFor = (uid) => `ree.handouts.recent.${uid}`;

export function readRecentHandouts(uid) {
  try {
    const ids = JSON.parse(localStorage.getItem(keyFor(uid)));
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

/** Puts `id` first, and returns the new list. */
export function rememberHandout(uid, id) {
  const ids = [id, ...readRecentHandouts(uid).filter((x) => x !== id)].slice(0, MAX);
  try { localStorage.setItem(keyFor(uid), JSON.stringify(ids)); } catch { /* storage unavailable */ }
  return ids;
}
