// src/services/questionBankCache.js
//
// Cache for GLOBAL, whole-question-bank aggregates. These are not per-user, so
// one entry serves every request.
//
// Two endpoints were doing expensive full-bank work on every call, uncached, on
// a path the app hits at startup:
//
//   GET /api/questions/pack-manifest — THREE sequential full scans of the
//     question bank, each computing a per-row md5 and a string_agg over the
//     whole subject. Its only limit was the global 300-req/15-min IP limiter.
//   GET /api/metadata/vault — a groupBy over the entire Question table.
//
// The bank only changes when an admin publishes, edits, deletes, approves or
// flags a question, so a short TTL plus explicit invalidation on those writes is
// both cheap and correct. Single-instance by design, like the sibling caches
// (see SCALING.md); a stale entry is bounded by the TTL even without the
// invalidation hook.

const TTL_MS = 5 * 60 * 1000;

const store = new Map(); // key -> { payload, expiresAt }

function get(key) {
    const hit = store.get(key);
    if (!hit) return null;
    if (hit.expiresAt <= Date.now()) {
        store.delete(key);
        return null;
    }
    return hit.payload;
}

function set(key, payload) {
    store.set(key, { payload, expiresAt: Date.now() + TTL_MS });
}

/**
 * Drop every cached bank aggregate. Called from the question write paths —
 * publish, edit, delete, approve, flag — since any of them can change both the
 * manifest checksum and the vault counts.
 */
function invalidateAll() {
    store.clear();
}

module.exports = { get, set, invalidateAll, _store: store, TTL_MS };
