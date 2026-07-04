// src/services/readinessCache.js
// Short-lived in-memory cache for the composite readiness score. The GET route
// runs ~7 aggregate queries and readiness is a slow-moving metric, so a 60s TTL
// removes repeat recomputes on rapid refreshes with no noticeable staleness.
//
// Single-instance by design — swap for Redis if the backend scales out
// (see SCALING.md / dashboardCache).

const READINESS_TTL_MS = 60_000;
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
    store.set(uid, { payload, expiresAt: Date.now() + READINESS_TTL_MS });
}

function invalidate(uid) {
    store.delete(uid);
}

module.exports = { get, set, invalidate, _store: store, READINESS_TTL_MS };
