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
// IT HOLDS THE IN-FLIGHT PROMISE, NOT THE SETTLED PAYLOAD, and that distinction
// was learned the hard way. The first version stored the response once it
// arrived, which made the handoff a race: on production it eliminated the
// duplicate on one load and missed it on the next. The timings said why —
// AuthContext's request started at 574ms and took 1740ms, while Dashboard
// mounted at 1567ms and found an empty slot. The response had not landed yet.
//
// That failure mode is backwards: the slower the backend, the more likely the
// seed misses, so it stopped working exactly when a saved round-trip is worth
// most. Offering the promise at REQUEST time instead removes the race
// entirely — a late reader awaits the same request, an early one is impossible
// because the offer is made before the fetch can resolve, and an
// already-settled promise resolves instantly.
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

let slot = null;   // { uid, promise, at } | null

/**
 * Offer an in-flight dashboard request for the next reader. Call this at the
 * moment the request STARTS, not when it resolves. Overwrites any previous
 * offer — the newest request is always the one worth sharing.
 */
export function seedDashboardRequest(uid, promise) {
    if (!uid || !promise || typeof promise.then !== 'function') return;
    // The offerer has its own error handling; this keeps an unclaimed
    // rejection from surfacing as an unhandled one. It does not swallow
    // anything — the original promise still rejects for whoever awaits it.
    promise.catch(() => {});
    slot = { uid, promise, at: Date.now() };
}

/**
 * Take the offered request for `uid` if one is valid, else null. The caller
 * awaits it and must fall back to its own fetch if it rejects.
 *
 * ALWAYS clears the slot when the uid matches — including when the entry is
 * too old — so a stale offer cannot linger and be re-tested on every later
 * call. Age is measured from the OFFER, which is the only honest reading:
 * a request made 30s ago is stale whether or not it has come back yet.
 */
export function takeDashboardSeed(uid) {
    if (!slot || !uid || slot.uid !== uid) return null;
    const { promise, at } = slot;
    slot = null;
    return Date.now() - at <= SEED_MAX_AGE_MS ? promise : null;
}

/** Drop any offer. Called on every mutation; also the test seam. */
export function invalidateDashboardSeed() {
    slot = null;
}

export const __SEED_MAX_AGE_MS = SEED_MAX_AGE_MS;
