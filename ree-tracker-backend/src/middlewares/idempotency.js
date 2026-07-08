// Lightweight Idempotency-Key middleware. Keyed on (userId, route, key);
// caches the SUCCESS response status + body and replays it on duplicate sends.
// Useful for the offline-sync queue, where a flaky network can produce double
// submissions of the same telemetry batch.
//
// Two guarantees:
//   1. Only 2xx responses are cached. Caching 4xx/5xx used to replay a stale
//      validation error (or a partial-write 500) for the whole TTL, so a
//      corrected retry with the same key kept getting the old failure.
//   2. Concurrent duplicates are serialized via an in-flight reservation taken
//      SYNCHRONOUSLY on a cache miss. Without it, two simultaneous identical
//      requests both missed the cache and both ran the handler (a TOCTOU gap) —
//      the exact double-tap / retry-before-first-response case this exists for.
//
// Backed by an in-memory LRU. For multi-instance backends this should be
// swapped for Redis; for our single-instance Express deployment it's enough.
// Mount AFTER validate() so only well-formed requests ever reserve a key.

'use strict';

const TTL_MS = 10 * 60 * 1000;   // 10 minutes — covers retry windows comfortably
const INFLIGHT_TTL_MS = 30 * 1000; // in-flight reservation — short, so a crashed handler can't wedge the key
const MAX_ENTRIES = 5000;

const store = new Map(); // key -> { status, body, expiresAt } | { inFlight:true, expiresAt }

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

function evictIfFull() {
    if (store.size >= MAX_ENTRIES) {
        const oldestKey = store.keys().next().value;
        if (oldestKey) store.delete(oldestKey);
    }
}

function set(key, status, body) {
    evictIfFull();
    store.set(key, { status, body, expiresAt: Date.now() + TTL_MS });
}

function reserve(key) {
    evictIfFull();
    store.set(key, { inFlight: true, expiresAt: Date.now() + INFLIGHT_TTL_MS });
}

function clear(key) {
    store.delete(key);
}

// Express middleware factory. Use AFTER authMiddleware (needs req.user.id) and
// AFTER validate() (so malformed requests never reserve a key or get cached).
function idempotency() {
    return (req, res, next) => {
        const key = req.headers['idempotency-key'];
        if (!key || typeof key !== 'string' || key.length > 200) return next();

        const cacheKey = `${req.user?.id || 'anon'}|${req.method}|${req.originalUrl}|${key}`;
        const cached = get(cacheKey);
        if (cached) {
            if (cached.inFlight) {
                // A concurrent identical request is still being processed. Tell the
                // client to retry instead of running the side effect a second time.
                return res.status(409).json({ error: 'Duplicate request already in progress.' });
            }
            res.set('Idempotency-Replay', 'true');
            return res.status(cached.status).json(cached.body);
        }

        // Reserve the key SYNCHRONOUSLY before any async work so a simultaneous
        // duplicate sees the reservation and 409s rather than double-executing.
        reserve(cacheKey);

        // Capture res.json so we can stash the body without touching route code.
        const origJson = res.json.bind(res);
        res.json = (body) => {
            const status = res.statusCode || 200;
            if (status < 300) {
                set(cacheKey, status, body); // cache SUCCESS only
            } else {
                clear(cacheKey);             // release so a corrected retry can run
            }
            return origJson(body);
        };

        // Safety net: if the response finishes without res.json (res.end/send,
        // or an error path), release a still-reserved key so it can't wedge.
        // Guarded so lightweight test stubs without an EventEmitter still work.
        if (typeof res.on === 'function') {
            res.on('finish', () => {
                const hit = store.get(cacheKey);
                if (hit && hit.inFlight) clear(cacheKey);
            });
        }

        next();
    };
}

module.exports = idempotency;
module.exports._store = store; // exposed for tests
