// src/hooks/useOfflinePack.js
// Keeps the on-device question pack fresh and exposes its state to the UI. On
// first use (when online) it silently builds/refreshes the pack if it's missing
// or stale, so a user who later goes offline already has questions cached. Also
// exposes a manual refresh for the "Download" control in the status badge.
//
// One state for the whole app. Each badge (the shell's and Account › Offline
// & sync) used to keep its own: both could start a download of the same pack
// at once, and one said "Syncing…" while the other didn't.
import { useEffect, useSyncExternalStore } from 'react';
import { refreshOfflinePack } from '../services/dbQueries';
import { getOfflinePackMeta } from '../services/offlinePack';

let state = { meta: null, isRefreshing: false };
let inFlight = null;
let autoBuildChecked = false;
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getState = () => state;

async function reloadMeta() {
  set({ meta: await getOfflinePackMeta() });
}

/** Downloads the pack again; joins a download already running. */
function refresh() {
  if (!navigator.onLine) return Promise.resolve();
  if (inFlight) return inFlight;
  set({ isRefreshing: true });
  inFlight = (async () => {
    try {
      set({ meta: await refreshOfflinePack() });
    } catch {
      await reloadMeta();
    } finally {
      set({ isRefreshing: false });
      inFlight = null;
    }
  })();
  return inFlight;
}

async function checkOnce() {
  const m = await getOfflinePackMeta();
  set({ meta: m });
  // Build once per app session when online and the pack is empty or stale.
  if (!autoBuildChecked && navigator.onLine && (!m.exists || m.stale)) {
    autoBuildChecked = true;
    refresh();
  }
}

export function useOfflinePack() {
  const s = useSyncExternalStore(subscribe, getState, getState);
  useEffect(() => { checkOnce().catch(() => {}); }, []);
  return { meta: s.meta, isRefreshing: s.isRefreshing, refresh, reloadMeta };
}

/** Test seam. */
export function __resetOfflinePack() {
  state = { meta: null, isRefreshing: false };
  inFlight = null;
  autoBuildChecked = false;
}
