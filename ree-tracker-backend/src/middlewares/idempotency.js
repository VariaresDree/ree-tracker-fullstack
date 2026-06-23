// Lightweight Idempotency-Key middleware. Keyed on (userId, route, key);
// caches the response status + body and replays it on duplicate sends. Useful
// for the offline-sync queue, where a flaky network can produce double
// submissions of the same telemetry batch.
//
// Backed by an in-memory LRU. For multi-instance backends this should be
// swapped for Redis; for our single-instance Express deployment it's enough.

'use strict';

const TTL_MS = 10 * 60 * 1000; // 10 minutes — covers retry windows comfortably
const MAX_ENTRIES = 5000;

const store = new Map(); // key -> { status, body, expiresAt }

function get(key) {
    const hit = store.get(key);
    if (!hit) return null;
    if (hit.expiresAt < Date.now()) {
        store.delete(key);
        return null;
    }
    // refresh LRU order
    store.delete(key);
    store.set(key, hit);
    return hit;
}

function set(key, status, body) {
    if (store.size >= MAX_ENTRIES) {
        // evict oldest
        const oldestKey = store.keys().next().value;
        if (oldestKey) store.delete(oldestKey);
    }
    store.set(key, { status, body, expiresAt: Date.now() + TTL_MS });
}

// Express middleware factory. Use AFTER authMiddleware so req.user.id is set.
function idempotency() {
    return (req, res, next) => {
        const key = req.headers['idempotency-key'];
        if (!key || typeof key !== 'string' || key.length > 200) return next();

        const cacheKey = `${req.user?.id || 'anon'}|${req.method}|${req.originalUrl}|${key}`;
        const cached = get(cacheKey);
        if (cached) {
            res.set('Idempotency-Replay', 'true');
            return res.status(cached.status).json(cached.body);
        }

        // Capture res.json calls so we can stash the body without changing
        // call sites in every route handler.
        const origJson = res.json.bind(res);
        res.json = (body) => {
            set(cacheKey, res.statusCode || 200, body);
            return origJson(body);
        };
        next();
    };
}

module.exports = idempotency;
module.exports._store = store; // exposed for tests
