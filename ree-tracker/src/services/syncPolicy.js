// src/services/syncPolicy.js
//
// The retry POLICY for the offline sync pipeline: how a failure is classified,
// and how long to wait before trying again.
//
// This was inline in useStore.js, and the classification predicate was written
// out TWICE — once in flushQueueToCloud and again in flushPendingWrites, ninety
// lines apart. Two copies of a rule that decides whether a user's answers are
// retried or quarantined is exactly the shape of bug this codebase kept
// producing elsewhere, and neither copy was reachable from a test.
//
// Deliberately pure and dependency-free: no store access, no network, no
// module-level mutable state (the backoff is a factory, so a test gets its own).

'use strict';

/**
 * Outcomes, in the order the caller cares about:
 *
 *  offline   — the network or the circuit breaker said no. The batch is intact
 *              and MUST be preserved for the next reconnect. Not the user's
 *              fault and not worth alarming them about.
 *  permanent — the server will reject this payload no matter how often we send
 *              it (a malformed batch). Quarantine it, or it wedges the queue
 *              forever and keeps the optimistic local counters inflated.
 *  transient — anything else, including 5xx. Keep the batch and back off.
 */
export const SYNC_OUTCOME = {
    OFFLINE: 'offline',
    PERMANENT: 'permanent',
    TRANSIENT: 'transient',
};

/**
 * 408 Request Timeout and 429 Too Many Requests are 4xx but explicitly RETRYABLE
 * — treating them as permanent would dead-letter a batch the server merely asked
 * us to send again.
 */
const RETRYABLE_4XX = new Set([408, 429]);

/**
 * Classify a failure from the sync pipeline.
 *
 * The `[OFFLINE]` / `[TIMEOUT]` sentinels come from `apiRequest`, which is why
 * the telemetry flush had to be routed through it: when that path used a bare
 * fetch, a dropped connection surfaced as `TypeError: Failed to fetch` with no
 * status and no sentinel, fell through to "transient", and showed the user a red
 * "Sync error" for what was really just a Wi-Fi blip.
 *
 * @param {unknown} error
 * @returns {'offline'|'permanent'|'transient'}
 */
export function classifySyncError(error) {
    const message = error?.message || '';
    if (message.includes('[OFFLINE]') || message.includes('[TIMEOUT]')) {
        return SYNC_OUTCOME.OFFLINE;
    }

    const status = error?.status;
    if (typeof status === 'number' && status >= 400 && status < 500 && !RETRYABLE_4XX.has(status)) {
        return SYNC_OUTCOME.PERMANENT;
    }

    return SYNC_OUTCOME.TRANSIENT;
}

/** Should the caller keep the batch and retry it later? */
export function isRetryable(outcome) {
    return outcome !== SYNC_OUTCOME.PERMANENT;
}

export const BACKOFF_BASE_MS = 1000;
export const BACKOFF_MAX_MS = 60_000;

/**
 * Capped exponential backoff for the safety-net retry.
 *
 * A persistently failing backend used to be re-hit every 15s forever; this backs
 * off 2s → 4s → 8s … capped at BACKOFF_MAX_MS. A fresh `online` event is a
 * strong signal and bypasses the window by calling reset().
 *
 * A FACTORY rather than a module singleton: the previous version kept its
 * counters in module scope, so tests could not get a clean one and two stores in
 * the same process would have shared a backoff window.
 *
 * @param {{ now?: () => number, baseMs?: number, maxMs?: number }} [opts]
 */
export function createBackoff({ now = Date.now, baseMs = BACKOFF_BASE_MS, maxMs = BACKOFF_MAX_MS } = {}) {
    let failures = 0;
    let nextAllowedAt = 0;

    return {
        /** True when the backoff window has elapsed. */
        canAttempt: () => now() >= nextAllowedAt,

        /** Clear the window — a healthy round-trip, or a fresh connectivity signal. */
        reset: () => { failures = 0; nextAllowedAt = 0; },

        recordFailure: () => {
            // Capped at 16 doublings so the shift cannot overflow into nonsense
            // on a very long outage; maxMs bounds the practical wait anyway.
            failures = Math.min(failures + 1, 16);
            nextAllowedAt = now() + Math.min(baseMs * 2 ** failures, maxMs);
        },

        /** Introspection for tests and diagnostics. */
        get failures() { return failures; },
        get nextAllowedAt() { return nextAllowedAt; },
    };
}
