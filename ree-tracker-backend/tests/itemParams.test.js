import { describe, it, expect } from 'vitest';
const { itemParams, authorB, PRIOR_SE, p3pl, updateTheta } = require('../src/engine/irt');

// Every 3PL consumer used to restate its own fallback for an uncalibrated item,
// and all of them fell back to `difficulty` as the b parameter. But authors and
// the AI generator write `difficulty` on a 1/2/3 ORDINAL scale ("Foundational /
// Core / Complex"; review defaults to 2.0) — it is not on the θ scale at all.
// Read as b, the typical item sat at b = 2: two standard deviations above an
// average candidate. A correct answer on a "b = 2" item is strong evidence of
// high ability and a miss is almost none, so θ drifted upward for everyone
// until calibration caught up — and the forecast with it.

describe('authorB — the ordinal author rating on the θ scale', () => {
    it('maps the 1/2/3 rating to −1 / 0 / +1', () => {
        expect(authorB(1)).toBe(-1);
        expect(authorB(2)).toBe(0);
        expect(authorB(3)).toBe(1);
    });

    it('passes a value already on the b scale through, clamped to ±3', () => {
        expect(authorB(0)).toBe(0);
        expect(authorB(1.2)).toBe(1.2);
        expect(authorB(-0.5)).toBe(-0.5);
        expect(authorB(9)).toBe(3);
        expect(authorB(-9)).toBe(-3);
    });

    it('treats a missing or non-numeric rating as average difficulty', () => {
        expect(authorB(undefined)).toBe(0);
        expect(authorB(null)).toBe(0);
        expect(authorB('hard')).toBe(0);
    });
});

describe('itemParams — one rule for every estimator and picker', () => {
    it('serves calibrated parameters when they exist', () => {
        expect(itemParams({ irtA: 1.4, irtB: -0.3, irtC: 0.15, difficulty: 3 })).toEqual({ a: 1.4, b: -0.3, c: 0.15 });
    });

    it('falls back to the author rating mapped onto the θ scale, never the raw ordinal', () => {
        expect(itemParams({ irtA: null, irtB: null, irtC: null, difficulty: 2 })).toEqual({ a: 1, b: 0, c: 0.2 });
        expect(itemParams({ difficulty: 3 }).b).toBe(1);
    });

    it('accepts the prefixed shape telemetry carries through its pipeline', () => {
        expect(itemParams({ _a: null, _b: null, _c: null, _difficulty: 1 })).toEqual({ a: 1, b: -1, c: 0.2 });
    });

    it('an average candidate on an average uncalibrated item is ~60% — not ~25%', () => {
        // c = 0.2, so P(θ=0 | b=0) = 0.2 + 0.8·0.5 = 0.6. Read as b = 2 the
        // same "Core" item predicted barely above the guessing floor.
        const params = itemParams({ difficulty: 2 });
        expect(p3pl(0, params)).toBeCloseTo(0.6, 5);
        expect(p3pl(0, { a: 1, b: 2, c: 0.2 })).toBeLessThan(0.25);
    });

    it('a 60%-correct record on Core items lands near θ = 0 instead of being inflated', () => {
        const pairs = Array.from({ length: 50 }, (_, i) => ({ item: itemParams({ difficulty: 2 }), correct: i % 5 < 3 }));
        const { theta } = updateTheta({ theta: 0, se: PRIOR_SE }, pairs);
        expect(Math.abs(theta)).toBeLessThan(0.3);

        const asOrdinal = pairs.map((p) => ({ ...p, item: { a: 1, b: 2, c: 0.2 } }));
        expect(updateTheta({ theta: 0, se: PRIOR_SE }, asOrdinal).theta).toBeGreaterThan(1.5);
    });

    it('the population prior is N(0, 1)', () => {
        expect(PRIOR_SE).toBe(1);
    });
});
