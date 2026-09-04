// src/services/apiCache.js
//
// Ownership control for the service worker's per-user API cache.
//
// WHY THIS IS NOT OPTIONAL. The SW caches responses by URL, but two of the
// three endpoints it now covers carry no user id at all:
//
//   /api/analytics/dashboard/<uid>   uid in the path  — distinct keys per user
//   /api/readiness                   no uid           — SAME key for everyone
//   /api/forecast                    no uid           — SAME key for everyone
//   /api/leaderboard/me              no uid           — SAME key for everyone
//
// They are scoped by the Firebase token instead. So on a shared browser, or
// after any account switch, a cached "/api/readiness" written for account A
// would be served to account B — one person's board-readiness score, accuracy
// and weak topics shown to another. The cache must therefore be tied to an
// owner and dropped the moment the owner changes.
//
// TWO TRIGGERS, because sign-out is not the only way the owner changes:
//   - logout()          — the deliberate path
//   - a uid mismatch on auth state change — covers a session restored as a
//     different user, a second account signing in without an explicit logout,
//     and a token refresh landing on a new uid
//
// The owner is persisted, not held in memory: a reload creates a fresh module
// with no idea who wrote the cache, while the CACHE ITSELF survives. In-memory
// state would forget the owner exactly when it matters.

/** Must match `cacheName` in vite.config.js's runtimeCaching entry. */
export const API_CACHE_NAME = 'api-user-data';

const OWNER_KEY = 'ree-api-cache-owner';

function readOwner() {
    try { return localStorage.getItem(OWNER_KEY); } catch { return null; }
}

function writeOwner(uid) {
    try {
        if (uid) localStorage.setItem(OWNER_KEY, uid);
        else localStorage.removeItem(OWNER_KEY);
    } catch { /* private mode — the purge below still runs */ }
}

/**
 * Delete the cached API responses. Safe to call anywhere: no Cache Storage
 * (unsupported browser, private mode, jsdom) is a no-op, never a throw.
 * Returns true only when a cache was actually deleted.
 */
export async function purgeApiCache() {
    writeOwner(null);
    try {
        if (typeof caches === 'undefined') return false;
        return await caches.delete(API_CACHE_NAME);
    } catch {
        return false;
    }
}

/**
 * Record `uid` as the cache's owner, purging first if someone else owned it.
 *
 * Called on every auth state change. The common case — same user reloading —
 * must NOT purge, or the cache would be wiped on every boot and the cold-start
 * fallback it exists for would never have anything to serve.
 */
export async function claimApiCacheFor(uid) {
    if (!uid) return purgeApiCache();

    const owner = readOwner();
    if (owner === uid) return false;      // same user: keep the cache

    // Anything else — a different user, or an UNKNOWN owner — is untrusted.
    // Unknown matters as much as different: localStorage and Cache Storage are
    // cleared independently, so a wiped owner record can sit in front of a
    // fully populated cache written by somebody else. Treating null as "safe,
    // nothing to purge" is precisely the leak this module exists to prevent.
    //
    // This cannot wipe the cache on every boot: the first claim records the
    // owner, and every later reload takes the equality branch above.
    await purgeApiCache();
    writeOwner(uid);
    return true;
}
