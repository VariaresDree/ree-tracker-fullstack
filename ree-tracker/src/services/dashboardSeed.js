// src/services/dashboardSeed.js
//
// A single-use handoff slot for ONE dashboard payload.
//
// WHY THIS EXISTS. Two unrelated modules fetch GET /api/analytics/dashboard/:uid
// on every boot, and neither knows about the other:
//
//   AuthContext  t≈520ms   needs profile.role, to set the admin flag
//   Dashboard    t≈1530ms  needs the whole aggregate
//
// Measured on production after PR #94, which removed the *other* three
// duplicates. These two survive a full second apart, so request coalescing
// cannot catch them — nothing overlaps. They are simply two consumers of one
// endpoint. The response is identical; the second costs a full Oregon↔Singapore
// round-trip on a 0.1-CPU free instance, and it sits directly in front of the
// dashboard's first paint.
//
// AuthContext already holds the bytes Dashboard is about to ask for. This
// module hands them over.
//
// WHY NOT A CACHE. The backend caches this payload for 30s
// (services/dashboardCache.js) and invalidates it from recordAttempts on every
// write surface — telemetry-bulk, exams/grade, exams/submit, battle-submit —
// precisely because a stale dashboard after a battle or gauntlet run was a real
// bug once. A client-side cache would reintroduce it above the layer that fix
// lives in. So this is not a cache: it holds exactly one payload, for one uid,
// and gives it away exactly once.
//
// FOUR CONDITIONS, all required, each closing a different hole:
//
//   1. uid match     — never serve one account's numbers to another
//   2. single use    — taking it clears it, so it cannot answer a later call
//   3. age bound     — covers the boot handoff only (see SEED_MAX_AGE_MS)
//   4. any mutation  — invalidated by ANY non-GET, mirroring what
//                      recordAttempts does to the server's cache
//
// (2) alone is not enough: land on /arena, browse for five minutes, then open
// the dashboard and an unconsumed seed would still be sitting there. (3) alone
// is not enough either: a fast user could answer one card and reach the
// dashboard inside the window. (4) is what makes the guarantee provable rather
// than probabilistic — after any write, there is no seed to serve.
//
// Deliberately dependency-free. dbQueries imports it to invalidate, and
// analyticsSync imports it to consume; analyticsSync already imports dbQueries,
// so putting this state in either one would make that edge a cycle.

// Long enough for the boot handoff on a slow phone — auth response, render,
// route resolve, lazy Dashboard chunk — with room to spare. NOT tied to the
// server's 30s cache TTL: that number describes how long the server may reuse
// a payload absent a write, which is a different question from how long this
// process may hold one. Shorter is strictly safer here, and 10s is already
// several times the ~1s gap actually measured.
const SEED_MAX_AGE_MS = 10_000;

let slot = null;   // { uid, payload, at } | null

/**
 * Offer a freshly-fetched payload for the next reader. Overwrites any previous
 * offer — the newest response is always the most accurate one to hand on.
 * Ignores empty payloads so a failed fetch cannot seed `undefined`.
 */
export function seedDashboardPayload(uid, payload) {
    if (!uid || !payload) return;
    slot = { uid, payload, at: Date.now() };
}

/**
 * Take the payload for `uid` if one is on offer and still valid, else null.
 * ALWAYS clears the slot when the uid matches — including when the entry is
 * too old — so a stale seed cannot linger and be re-tested on every later call.
 */
export function takeDashboardSeed(uid) {
    if (!slot || !uid || slot.uid !== uid) return null;
    const { payload, at } = slot;
    slot = null;
    return Date.now() - at <= SEED_MAX_AGE_MS ? payload : null;
}

/** Drop any offer. Called on every mutation; also the test seam. */
export function invalidateDashboardSeed() {
    slot = null;
}

export const __SEED_MAX_AGE_MS = SEED_MAX_AGE_MS;
