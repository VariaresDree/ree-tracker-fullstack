// src/services/dashboardCache.js
// Tiny in-memory dashboard cache (30s TTL, FIFO-capped). Extracted from
// analyticsRoutes so EVERY write surface (telemetry-bulk, exams/grade,
// exams/submit, battle-submit via recordAttempts) can invalidate it — the
// route-local version left battles and gauntlet grades serving a stale
// dashboard for up to 30 seconds.
//
// Single-instance by design; swap for Redis if the backend ever scales out
// (see SCALING.md).

const DASHBOARD_TTL_MS = 30_000;
const MAX_CACHE = 5000;

const store = new Map(); // uid -> { payload, expiresAt }

function get(uid) {
    const hit = store.get(uid);
    if (!hit) return null;
    if (hit.expiresAt <= Date.now()) {
        store.delete(uid);
        return null;
    }
    return hit.payload;
}

function set(uid, payload) {
    if (store.size >= MAX_CACHE) {
        const oldest = store.keys().next().value;
        store.delete(oldest);
    }
    store.set(uid, { payload, expiresAt: Date.now() + DASHBOARD_TTL_MS });
}

function invalidate(uid) {
    store.delete(uid);
}

module.exports = { get, set, invalidate, _store: store, DASHBOARD_TTL_MS };
