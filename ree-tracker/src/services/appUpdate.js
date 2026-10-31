// src/services/appUpdate.js
//
// Getting a new version of the app onto every device, without reloading
// anyone mid-question.
//
// What went wrong (2026-10-31): PR #187 set the service worker to 'prompt' so
// an update would stop reloading the page during an exam. A new version then
// waited until every tab and installed-app window was closed, or until the
// learner tapped a "new version" toast that was easy to miss. An installed
// app on a phone is rarely closed, and the browser only looks for a new
// service worker on a page load, so PRs #188 and #189 were live on Vercel for
// hours while devices kept running #187.
//
// Now:
//   1. The new service worker takes over as soon as it is installed
//      (registerType 'autoUpdate', so a deploy never waits on closed tabs).
//   2. The page reloads into it at a safe moment, never on an exam or a
//      practice screen: straight away if the app has only just opened, when
//      the app is put in the background, or on the next move to a calm
//      screen. A toast offers the reload now.
//   3. The app asks for updates itself, every 15 minutes while in view, on
//      coming back to it, and on coming back online.
//   4. A version beacon (/version.json, written at build time) is compared
//      with the build that's running. If they differ and the service worker
//      never brings the new one, the worker is stuck: it is unregistered and
//      its caches cleared, then the page reloads (once per version).

/** The build that is running (vite.config.js `define`). */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
export const UPDATE_CHECK_MS = 15 * 60_000;
/** Opened this recently: reloading into a new version costs nothing. */
export const FRESH_LOAD_MS = 10_000;
/** Checks in a row that must see a newer version before the worker counts as stuck. */
export const STUCK_AFTER_CHECKS = 3;

// Screens where a reload would lose work in progress: a timed exam, a
// practice session, a focus timer, a scan, a battle.
const BUSY = /^\/(practice|simulator|focus|scan|gauntlet|diagnostic|battle|review|arena|library\/quiz)(\/|$)/;

/** May the page reload now without costing the learner anything? */
export function isSafeToReload(pathname = globalThis.location?.pathname || '/') {
    return !BUSY.test(pathname);
}

const state = {
    pending: false,
    registration: null,
    bootAt: Date.now(),
    mismatches: 0,
    timer: null,
    started: false,
};
let deps = {
    reload: () => globalThis.location.reload(),
    notify: () => {},
    now: () => Date.now(),
    fetchImpl: (...a) => globalThis.fetch(...a),
    hidden: () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
};

/** Reload into the new version if it's safe now; true when it reloaded. */
export function applyUpdateIfSafe({ pathname } = {}) {
    if (!state.pending) return false;
    if (!isSafeToReload(pathname)) return false;
    state.pending = false;
    deps.reload();
    return true;
}

/**
 * A new version has taken over (the service worker's onNeedReload). Reload
 * now if the app has only just opened or is in the background and on a calm
 * screen; otherwise wait for a safe moment and offer it in a toast.
 */
export function onNewVersionReady() {
    state.pending = true;
    const fresh = deps.now() - state.bootAt < FRESH_LOAD_MS;
    if ((fresh || deps.hidden()) && applyUpdateIfSafe()) return;
    deps.notify();
}

/** Ask the server for a newer service worker, and compare the version beacon. */
export async function checkForUpdate() {
    const reg = state.registration;
    try { await reg?.update?.(); } catch { /* offline, or the server is waking */ }
    if (APP_VERSION === 'dev') return;
    let remote = null;
    try {
        const res = await deps.fetchImpl(`/version.json?t=${deps.now()}`, { cache: 'no-store' });
        if (res.ok) remote = (await res.json())?.id || null;
    } catch { return; }
    if (!remote || remote === APP_VERSION) { state.mismatches = 0; return; }
    state.mismatches += 1;
    // A worker on its way (installing or waiting) will bring it: not stuck.
    if (reg?.installing || reg?.waiting) return;
    if (state.mismatches >= STUCK_AFTER_CHECKS) await healStuckWorker(remote);
}

/** Unregister every service worker and clear its caches, then reload (once per version). */
export async function healStuckWorker(remoteVersion) {
    if (!isSafeToReload()) return false;
    const key = `ree:sw-healed:${remoteVersion}`;
    try {
        if (sessionStorage.getItem(key)) return false;
        sessionStorage.setItem(key, '1');
    } catch { return false; }
    try {
        const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
        await Promise.all(regs.map((r) => r.unregister()));
        const names = (await globalThis.caches?.keys?.()) || [];
        await Promise.all(names.filter((n) => n.startsWith('workbox-precache')).map((n) => caches.delete(n)));
    } catch { /* reload anyway: the network has the new version */ }
    deps.reload();
    return true;
}

/** Start the update watch. Called once from main.jsx with the registration. */
export function startUpdateWatch({ registration, notify, ...overrides } = {}) {
    state.registration = registration || state.registration;
    if (notify) deps.notify = notify;
    deps = { ...deps, ...overrides };
    if (state.started || typeof window === 'undefined') return;
    state.started = true;
    const tick = () => {
        clearTimeout(state.timer);
        state.timer = setTimeout(() => {
            if (!deps.hidden()) checkForUpdate();
            tick();
        }, UPDATE_CHECK_MS);
    };
    tick();
    document.addEventListener('visibilitychange', () => {
        if (deps.hidden()) applyUpdateIfSafe();
        else checkForUpdate();
    });
    window.addEventListener('online', () => { checkForUpdate(); });
}

/** Test seam. */
export function __resetAppUpdate(overrides = {}) {
    clearTimeout(state.timer);
    Object.assign(state, { pending: false, registration: null, bootAt: overrides.bootAt ?? 0, mismatches: 0, timer: null });
    deps = {
        reload: () => {},
        notify: () => {},
        now: () => Date.now(),
        fetchImpl: () => Promise.reject(new Error('no fetch')),
        hidden: () => false,
        ...overrides,
    };
}
