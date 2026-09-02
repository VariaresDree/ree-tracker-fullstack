import { describe, it, expect } from 'vitest';
import {
    classifySyncError,
    isRetryable,
    createBackoff,
    SYNC_OUTCOME,
    BACKOFF_BASE_MS,
    BACKOFF_MAX_MS,
} from './syncPolicy';

// This policy decides whether a user's answers are retried or quarantined. It
// used to live inline in useStore.js with the classification predicate written
// out TWICE, ninety lines apart, and neither copy reachable from a test.

describe('classifySyncError', () => {
    it('treats the apiRequest sentinels as offline, not as errors', () => {
        // The distinction the user sees: "Offline — changes queued" (calm) vs a
        // red "Sync error" (alarming). A dropped Wi-Fi connection is the former.
        expect(classifySyncError(new Error('[OFFLINE]'))).toBe(SYNC_OUTCOME.OFFLINE);
        expect(classifySyncError(new Error('[TIMEOUT]'))).toBe(SYNC_OUTCOME.OFFLINE);
        expect(classifySyncError(new Error('request failed: [OFFLINE]'))).toBe(SYNC_OUTCOME.OFFLINE);
    });

    it('quarantines a payload the server will always reject', () => {
        const err = Object.assign(new Error('bad batch'), { status: 400 });
        expect(classifySyncError(err)).toBe(SYNC_OUTCOME.PERMANENT);
        expect(classifySyncError(Object.assign(new Error('x'), { status: 422 }))).toBe(SYNC_OUTCOME.PERMANENT);
    });

    it('does NOT quarantine the retryable 4xx codes', () => {
        // 408 and 429 are the server asking us to send it again. Dead-lettering
        // them would discard attempts on nothing worse than rate limiting.
        expect(classifySyncError(Object.assign(new Error('x'), { status: 408 }))).toBe(SYNC_OUTCOME.TRANSIENT);
        expect(classifySyncError(Object.assign(new Error('x'), { status: 429 }))).toBe(SYNC_OUTCOME.TRANSIENT);
    });

    it('treats 5xx as transient so the batch survives a server wobble', () => {
        expect(classifySyncError(Object.assign(new Error('x'), { status: 500 }))).toBe(SYNC_OUTCOME.TRANSIENT);
        expect(classifySyncError(Object.assign(new Error('x'), { status: 503 }))).toBe(SYNC_OUTCOME.TRANSIENT);
    });

    it('treats a status-less network error as transient, never permanent', () => {
        // `TypeError: Failed to fetch` has no status. Classifying it permanent
        // would dead-letter real answers on a connectivity blip.
        expect(classifySyncError(new TypeError('Failed to fetch'))).toBe(SYNC_OUTCOME.TRANSIENT);
        expect(classifySyncError(undefined)).toBe(SYNC_OUTCOME.TRANSIENT);
        expect(classifySyncError({})).toBe(SYNC_OUTCOME.TRANSIENT);
    });

    it('only permanent failures are non-retryable', () => {
        expect(isRetryable(SYNC_OUTCOME.OFFLINE)).toBe(true);
        expect(isRetryable(SYNC_OUTCOME.TRANSIENT)).toBe(true);
        expect(isRetryable(SYNC_OUTCOME.PERMANENT)).toBe(false);
    });
});

describe('createBackoff', () => {
    const at = (t) => () => t;

    it('allows an attempt before any failure', () => {
        expect(createBackoff({ now: at(0) }).canAttempt()).toBe(true);
    });

    it('blocks attempts inside the window and allows them after', () => {
        let clock = 1_000_000;
        const b = createBackoff({ now: () => clock });

        b.recordFailure();
        expect(b.canAttempt()).toBe(false);

        clock = b.nextAllowedAt - 1;
        expect(b.canAttempt()).toBe(false);

        clock = b.nextAllowedAt;
        expect(b.canAttempt()).toBe(true);
    });

    it('doubles the wait on consecutive failures', () => {
        let clock = 0;
        const b = createBackoff({ now: () => clock });

        b.recordFailure();
        const first = b.nextAllowedAt;
        b.recordFailure();
        const second = b.nextAllowedAt;

        expect(first).toBe(BACKOFF_BASE_MS * 2);
        expect(second).toBe(BACKOFF_BASE_MS * 4);
    });

    it('caps the wait so a long outage cannot push it to infinity', () => {
        let clock = 0;
        const b = createBackoff({ now: () => clock });
        for (let i = 0; i < 40; i++) b.recordFailure();
        expect(b.nextAllowedAt).toBe(BACKOFF_MAX_MS);
    });

    it('reset clears the window — a fresh `online` event is a strong signal', () => {
        let clock = 0;
        const b = createBackoff({ now: () => clock });
        b.recordFailure();
        expect(b.canAttempt()).toBe(false);

        b.reset();
        expect(b.canAttempt()).toBe(true);
        expect(b.failures).toBe(0);
    });

    it('is a factory, so two instances do not share a window', () => {
        // The old module-level counters meant tests could not get a clean one,
        // and two stores in one process would have shared a backoff.
        let clock = 0;
        const a = createBackoff({ now: () => clock });
        const c = createBackoff({ now: () => clock });
        a.recordFailure();
        expect(a.canAttempt()).toBe(false);
        expect(c.canAttempt()).toBe(true);
    });
});
