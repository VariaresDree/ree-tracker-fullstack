// src/services/connection.js
//
// Whether the backend is answering, and a signal for screens to fetch again
// when it comes back. The app used to need a reload after a network blip:
//
//   1. One network failure blocked every API request for 30 seconds with an
//      instant "[OFFLINE]", and only a successful response unblocked it. The
//      browser's `online` event didn't, and many outages never fire it at all
//      (a sleeping Render server, a Wi-Fi handover).
//   2. Most screens fetch once. A fetch that landed in that window failed,
//      and nothing ever asked again.
//
// Now a failure marks the backend down, but a real request may still go
// through every PROBE_MS, and while it's down a light /health ping checks on
// it (with backoff) while the app is in view. The moment anything succeeds
// the backend is up again and `epoch` goes up; screens keyed on it
// (useConnection / useReconnectKey) fetch again by themselves. Coming back
// online, or back to the app after a long time away, does the same.

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

/** While down, how often one real request may go through. */
export const PROBE_MS = 5_000;
/** The /health checks while down: 5 s, 15 s, 30 s, then every 60 s. */
export const HEALTH_BACKOFF_MS = [5_000, 15_000, 30_000, 60_000];
/** Back to the app after this long away: fetch again (and wake the server). */
export const STALE_AFTER_HIDDEN_MS = 10 * 60_000;

let backendUp = true;
let lastFailAt = 0;
let epoch = 0;
let snapshot = { backendUp, epoch };
const listeners = new Set();

let healthTimer = null;
let healthTry = 0;
let hiddenAt = 0;
let started = false;

function emit() {
    snapshot = { backendUp, epoch };
    listeners.forEach((fn) => fn());
}

/** For useSyncExternalStore. */
export function subscribeConnection(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}
export const getConnection = () => snapshot;

const isVisible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';

/** Should this request fail fast instead of going out? Only while down, and not more than once per PROBE_MS. */
export function shouldShortCircuit(now = Date.now()) {
    return !backendUp && now - lastFailAt < PROBE_MS;
}

/** A request failed at the network level (no answer, or the default timeout). */
export function noteNetworkFailure(now = Date.now()) {
    lastFailAt = now;
    if (!backendUp) return;
    backendUp = false;
    emit();
    scheduleHealthCheck();
}

/** The backend answered (any HTTP status). Back up: screens fetch again. */
export function noteBackendAnswered() {
    if (backendUp) return;
    backendUp = true;
    healthTry = 0;
    clearTimeout(healthTimer);
    healthTimer = null;
    epoch += 1;
    emit();
}

/** Ask screens to fetch again, and let the next request through now. */
export function requestRefetch() {
    lastFailAt = 0;
    epoch += 1;
    emit();
}

/** One /health check, which flips the backend up when it answers. */
export async function checkBackend({ fetchImpl = globalThis.fetch } = {}) {
    if (typeof fetchImpl !== 'function') return false;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    try {
        await fetchImpl(`${BACKEND_URL}/health`, { mode: 'no-cors', cache: 'no-store', credentials: 'omit' });
        noteBackendAnswered();
        return true;
    } catch {
        return false;
    }
}

function scheduleHealthCheck() {
    if (healthTimer || backendUp) return;
    const delay = HEALTH_BACKOFF_MS[Math.min(healthTry, HEALTH_BACKOFF_MS.length - 1)];
    healthTimer = setTimeout(async () => {
        healthTimer = null;
        if (backendUp) return;
        healthTry += 1;
        // Out of view, wait: coming back to the app checks straight away.
        if (isVisible()) await checkBackend();
        if (!backendUp) scheduleHealthCheck();
    }, delay);
}

/** The listeners that bring the app back without a reload. Called once from main.jsx. */
export function startConnectionWatch({ wake } = {}) {
    if (started || typeof window === 'undefined') return;
    started = true;
    window.addEventListener('online', () => {
        wake?.();
        healthTry = 0;
        requestRefetch();
        if (!backendUp) checkBackend();
    });
    document.addEventListener('visibilitychange', () => {
        if (!isVisible()) { hiddenAt = Date.now(); return; }
        const away = hiddenAt ? Date.now() - hiddenAt : 0;
        hiddenAt = 0;
        if (!backendUp) {
            healthTry = 0;
            lastFailAt = 0;
            checkBackend();
        } else if (away >= STALE_AFTER_HIDDEN_MS) {
            // The server has likely gone to sleep, and what's on screen is old.
            wake?.();
            requestRefetch();
        }
    });
}

/** Test seam. */
export function __resetConnection() {
    backendUp = true;
    lastFailAt = 0;
    epoch = 0;
    healthTry = 0;
    hiddenAt = 0;
    clearTimeout(healthTimer);
    healthTimer = null;
    snapshot = { backendUp, epoch };
    listeners.clear();
}
