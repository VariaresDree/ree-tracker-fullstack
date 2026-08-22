import { describe, it, expect } from 'vitest';

const { storableTimeMs, plausibleTimeMs, TIME_STORE_MAX_MS } = require('../src/config/telemetryBounds');
const { telemetryBulkSchema } = require('../src/schemas/telemetrySchemas');
const { examSubmitSchema } = require('../src/schemas/examSchemas');

// QuestionAttempt.timeSpentMs is a Postgres int4. Before these bounds existed a
// single malformed client value could either abort a whole 500-attempt batch
// (range error inside createMany) or be silently stored as 1ms.
const INT4_MAX = 2_147_483_647;

describe('storableTimeMs', () => {
    it('passes ordinary durations through untouched', () => {
        expect(storableTimeMs(0)).toBe(0);
        expect(storableTimeMs(1500)).toBe(1500);
        expect(storableTimeMs(60_000)).toBe(60_000);
    });

    it('caps anything above the ceiling instead of overflowing int4', () => {
        expect(storableTimeMs(5e9)).toBe(TIME_STORE_MAX_MS);
        expect(storableTimeMs(Number.MAX_SAFE_INTEGER)).toBe(TIME_STORE_MAX_MS);
        expect(storableTimeMs(5e9)).toBeLessThanOrEqual(INT4_MAX);
    });

    it('does not repeat the parseInt exponential-notation bug', () => {
        // parseInt(1e21) === 1, because JS stringifies it as "1e+21" and
        // parseInt stops at the "e". That silently turned an absurd duration
        // into a 1ms answer rather than clamping it.
        expect(parseInt(1e21)).toBe(1); // documents the old behaviour
        expect(storableTimeMs(1e21)).toBe(TIME_STORE_MAX_MS);
    });

    it('coerces junk and negatives to zero rather than NaN', () => {
        expect(storableTimeMs(undefined)).toBe(0);
        expect(storableTimeMs(null)).toBe(0);
        expect(storableTimeMs('abc')).toBe(0);
        expect(storableTimeMs(-500)).toBe(0);
        // Infinity is malformed input, not a very long answer, so it is
        // treated like NaN and 'abc': 0, meaning "no timing data", which the
        // aggregation layer already excludes. Clamping it to the ceiling would
        // fabricate a plausible-looking one-hour answer out of garbage.
        expect(storableTimeMs(Infinity)).toBe(0);
        expect(storableTimeMs(NaN)).toBe(0);
    });

    it('is distinct from plausibleTimeMs: it caps, it does not zero', () => {
        // A 45-minute answer is implausible for analytics but is still real
        // data; storage keeps it (capped), aggregation excludes it.
        const fortyFiveMin = 45 * 60 * 1000;
        expect(plausibleTimeMs(fortyFiveMin)).toBe(0);
        expect(storableTimeMs(fortyFiveMin)).toBe(fortyFiveMin);
    });
});

describe('telemetryBulkSchema timing', () => {
    const attempt = (timeSpentMs) => ({
        sessionId: 'sess-1',
        attempts: [{ questionId: 'q1', timeSpentMs }],
    });

    it('CLAMPS an out-of-range duration rather than rejecting the batch', () => {
        // Rejecting would 400 the request and lose all 500 attempts with it —
        // the same data loss the clamp exists to prevent, via a different door.
        const r = telemetryBulkSchema.safeParse(attempt(5e9));
        expect(r.success).toBe(true);
        expect(r.data.attempts[0].timeSpentMs).toBe(TIME_STORE_MAX_MS);
    });

    it('leaves a normal duration alone', () => {
        const r = telemetryBulkSchema.safeParse(attempt(4200));
        expect(r.success).toBe(true);
        expect(r.data.attempts[0].timeSpentMs).toBe(4200);
    });

    it('defaults a missing duration to 0', () => {
        const r = telemetryBulkSchema.safeParse({ attempts: [{ questionId: 'q1' }] });
        expect(r.success).toBe(true);
        expect(r.data.attempts[0].timeSpentMs).toBe(0);
    });
});

describe('examSubmitSchema exam clock', () => {
    const base = {
        attempts: [{ questionId: 'q1', userAnswer: 'A' }],
    };

    it('rejects a clock that would yield a negative duration', () => {
        // examRoutes derives timeTakenSecs as (totalExamTime - timeRemaining).
        // Validated independently these produced negative study time.
        const r = examSubmitSchema.safeParse({ ...base, timeRemaining: 900, totalExamTime: 600 });
        expect(r.success).toBe(false);
    });

    it('accepts a consistent clock', () => {
        const r = examSubmitSchema.safeParse({ ...base, timeRemaining: 600, totalExamTime: 10800 });
        expect(r.success).toBe(true);
    });

    it('clamps a per-question duration that would overflow the column', () => {
        const r = examSubmitSchema.safeParse({
            attempts: [{ questionId: 'q1', userAnswer: 'A', timeSpentSecs: 5e9 }],
            timeRemaining: 0,
            totalExamTime: 10800,
        });
        expect(r.success).toBe(true);
        // Seconds in, seconds out — capped at the same 1-hour ceiling.
        expect(r.data.attempts[0].timeSpentSecs).toBe(TIME_STORE_MAX_MS / 1000);
    });
});
