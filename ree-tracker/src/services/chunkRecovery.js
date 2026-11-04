// src/services/chunkRecovery.js
//
// When a screen's code can't be loaded. Two things keep that failure in place, both
// seen in real Chromium: the page remembers a failed import until it reloads, so
// retrying can't help, and the browser could keep a 404 for a day, so a reload couldn't
// either. So: fetch the file and all it imports past the browser's cache, reload, and
// if that wasn't enough, clear the service worker once. At most two reloads, and then
// the screen says so (ErrorBoundary). index.html's blank-recovery covers the entry file.
import { APP_VERSION, healStuckWorker } from './appUpdate';

const RELOAD_KEY = 'ree:chunk-reload-at';
const RELOAD_WINDOW_MS = 60_000;
const REFRESH_LIMIT_MS = 5_000;
const MAX_FILES = 300;

export const isChunkLoadError = (err) => /dynamically imported module|importing a module script failed|unable to preload css/i.test(err?.message || '');

/** The file named in the error, as a full address on this site, or null. */
export function failedChunkUrl(err) {
  const found = String(err?.message || '').match(/\S*\/assets\/[^\s"']+?\.(?:m?js|css)/)?.[0];
  return found ? new URL(found, globalThis.location.href).href : null;
}

// Static imports only (a dynamic one has a bracket before its quote): those are what
// have to load for this file to. Chrome's error names only the file asked for.
const STATIC_IMPORT = /(?:from|import)\s*["'`](\.\/[\w.-]+\.m?js)["'`]/g;

/** Replace the browser's copy of a file and everything it imports with the server's. */
export async function refreshChunk(url, fetchImpl = (...a) => globalThis.fetch(...a), seen = new Set()) {
  if (!url || seen.has(url) || seen.size >= MAX_FILES) return;
  if (new URL(url).origin !== globalThis.location.origin) return;
  seen.add(url);
  try {
    const res = await fetchImpl(url, { cache: 'reload' });
    if (!res.ok || url.endsWith('.css')) return;
    const imports = [...(await res.text()).matchAll(STATIC_IMPORT)].map((m) => new URL(m[1], url).href);
    await Promise.all(imports.map((next) => refreshChunk(next, fetchImpl, seen)));
  } catch { /* the reload still goes ahead */ }
}

const serverAnswers = async (fetchImpl) => {
  try {
    return (await fetchImpl('/version.json', { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
};

let recovering = false;

/** Vite reports each retried import, so only the first of a page's reports acts. */
export async function recoverFromChunkFailure(err, {
  reload = () => globalThis.location.reload(),
  fetchImpl = (...a) => globalThis.fetch(...a),
  now = Date.now,
  refreshLimitMs = REFRESH_LIMIT_MS,
} = {}) {
  if (recovering) return;
  recovering = true;
  let last;
  try {
    last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
  } catch {
    return; // Can't tell a loop from a first try, so don't start one.
  }
  await Promise.race([
    refreshChunk(failedChunkUrl(err), fetchImpl),
    new Promise((resolve) => { setTimeout(resolve, refreshLimitMs); }),
  ]);
  if (now() - last >= RELOAD_WINDOW_MS) {
    try { sessionStorage.setItem(RELOAD_KEY, String(now())); } catch { return; }
    reload();
    return;
  }
  // Back within a minute, so reloading didn't help. Never when the server can't be
  // reached: the worker's cache is what lets the app run offline.
  if (await serverAnswers(fetchImpl)) await healStuckWorker(`chunk:${APP_VERSION}`);
}

/** Has this tab already reloaded for a chunk? If it fails now, recovery didn't work. */
export function recoveryWasTried() {
  try { return !!sessionStorage.getItem(RELOAD_KEY); } catch { return false; }
}

/** Test seam. */
export function __resetChunkRecovery() {
  recovering = false;
}
