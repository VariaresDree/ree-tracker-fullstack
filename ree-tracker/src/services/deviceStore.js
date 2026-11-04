// src/services/deviceStore.js
//
// What lives only on this device: its own IndexedDB database, apart from the one
// the app's caches share, so signing out (which wipes those) can't touch it. Keys
// carry the account, so one account never reads another's. See
// docs/decisions/ADR-003-device-files-and-synced-records.md for why this exists
// and what stays on the server instead.
//
// Reads never throw: no storage (a private window, a test) reads as empty. Writes
// do, with a message for the learner, since the caller has to say it wasn't kept.
import { createStore, del, get, getMany, keys, set } from 'idb-keyval';

let store = null;
const open = () => {
  if (!store) store = createStore('ree-device', 'kv');
  return store;
};

const isFull = (err) => err?.name === 'QuotaExceededError' || /quota/i.test(err?.message || '');

export async function deviceSet(key, value) {
  try {
    await set(key, value, open());
  } catch (err) {
    throw new Error(isFull(err) ? 'This device is out of space for saved files.' : 'This browser isn’t letting the app save files here.', { cause: err });
  }
}

export async function deviceGet(key) {
  try {
    return await get(key, open());
  } catch {
    return undefined;
  }
}

export async function deviceDel(key) {
  try {
    await del(key, open());
  } catch { /* nothing there to remove */ }
}

/** Every [key, value] whose key starts with `prefix`. */
export async function deviceEntries(prefix) {
  try {
    const s = open();
    const matching = (await keys(s)).filter((k) => typeof k === 'string' && k.startsWith(prefix));
    const values = await getMany(matching, s);
    return matching.map((k, i) => [k, values[i]]);
  } catch {
    return [];
  }
}
