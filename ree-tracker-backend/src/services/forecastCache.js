// src/services/forecastCache.js
// Short-lived in-memory cache for the pass-probability forecast, keyed by uid.
// Same shape as dashboardCache and readinessCache — three caches, one pattern.
//
// WHY: GET /api/forecast had no cache at all, and its staleness test
// (`snapshot.createdAt < user.lastActive`) is true for essentially any active
// learner, so nearly every request took the recompute path — 2 queries to
// decide, then 3 more to rebuild — and then did NOT persist the result, so the
// next request rebuilt it again from scratch. Five queries per call, each one
// paying the ~200ms Oregon->Singapore hop, for a projection that moves slowly.
//
// TTL matches readinessCache rather than dashboardCache's 30s: readiness and
// the forecast are the same kind of derived, slow-moving metric, whereas the
// dashboard carries the raw counters a learner watches tick during a session.
//
// The TTL is mostly a backstop. recordAttempts invalidates this alongside the
// other two, so anything that actually changes a forecast — every attempt, from
// every write surface — clears it immediately rather than waiting out the
// window.
//
// NOT persisted on this path, deliberately. Writing a ForecastSnapshot row on
// every recompute would put unbounded row growth on a READ endpoint; the
// explicit POST /api/forecast/recompute remains the way to persist one.
//
// Single-instance by design — swap for Redis if the backend scales out
// (see SCALING.md).

const FORECAST_TTL_MS = 60_000;
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
    store.set(uid, { payload, expiresAt: Date.now() + FORECAST_TTL_MS });
}

function invalidate(uid) {
    store.delete(uid);
}

module.exports = { get, set, invalidate, _store: store, FORECAST_TTL_MS };
