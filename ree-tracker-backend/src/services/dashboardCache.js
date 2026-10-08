// src/services/dashboardCache.js
// Tiny in-memory dashboard cache (30s TTL, FIFO-capped). Extracted from
// analyticsRoutes so EVERY write surface (telemetry-bulk, exams/grade,
// exams/submit, battle-submit via recordAttempts) can invalidate it — the
// route-local version left battles and gauntlet grades serving a stale
// dashboard for up to 30 seconds.
//
// Single-instance by design; swap for Redis if the backend ever scales out
// (see SCALING.md).

const { nextManilaMidnight } = require('@ree/shared');

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
    // The payload is judged against a Manila day: the day's per-subject counts
    // and the streak as it stands today. An entry cached just before Manila
    // midnight must not be served after it, so no entry outlives its day.
    const now = Date.now();
    store.set(uid, { payload, expiresAt: Math.min(now + DASHBOARD_TTL_MS, nextManilaMidnight(now)) });
}

function invalidate(uid) {
    store.delete(uid);
}

module.exports = { get, set, invalidate, _store: store, DASHBOARD_TTL_MS };
