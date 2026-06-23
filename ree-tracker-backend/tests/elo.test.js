import { describe, it, expect } from 'vitest';
const { TIERS, tierFor, kFactor, expected, recomputeRatings } = require('../src/engine/elo');

describe('tierFor', () => {
    it('maps every named tier floor correctly', () => {
        expect(tierFor(0)).toBe('BRONZE');
        expect(tierFor(1099)).toBe('BRONZE');
        expect(tierFor(1100)).toBe('SILVER');
        expect(tierFor(1300)).toBe('GOLD');
        expect(tierFor(1500)).toBe('PLATINUM');
        expect(tierFor(1700)).toBe('DIAMOND');
        expect(tierFor(2500)).toBe('DIAMOND');
    });

    it('exposes the tier ladder in ascending order', () => {
        const floors = TIERS.map((t) => t.floor);
        const sorted = [...floors].sort((a, b) => a - b);
        expect(floors).toEqual(sorted);
    });
});

describe('kFactor — decays with rating', () => {
    it('returns the largest K at low ratings and the smallest at high ratings', () => {
        expect(kFactor(800)).toBeGreaterThan(kFactor(1400));
        expect(kFactor(1400)).toBeGreaterThan(kFactor(1800));
    });
});

describe('expected — sums to 1 for two players', () => {
    it('e(A,B) + e(B,A) === 1', () => {
        const eAB = expected(1500, 1700);
        const eBA = expected(1700, 1500);
        expect(eAB + eBA).toBeCloseTo(1, 6);
    });
});

describe('recomputeRatings', () => {
    it('rewards the winner and punishes the loser symmetrically in a 1v1', () => {
        const ratings = recomputeRatings([
            { userId: 'a', rating: 1200, placement: 1 },
            { userId: 'b', rating: 1200, placement: 2 },
        ]);
        const a = ratings.find((r) => r.userId === 'a');
        const b = ratings.find((r) => r.userId === 'b');
        expect(a.delta).toBeGreaterThan(0);
        expect(b.delta).toBeLessThan(0);
        expect(a.delta + b.delta).toBe(0); // symmetric for equal-rated 1v1
    });

    it('promotes tier when the winner crosses a floor', () => {
        const ratings = recomputeRatings([
            { userId: 'a', rating: 1095, placement: 1 }, // near SILVER floor 1100
            { userId: 'b', rating: 800, placement: 2 },
        ]);
        const a = ratings.find((r) => r.userId === 'a');
        // Even a near-zero positive delta will push them past 1100.
        expect(a.ratingAfter).toBeGreaterThanOrEqual(1100);
        expect(a.tierBefore).toBe('BRONZE');
        expect(a.tierAfter).toBe('SILVER');
    });

    it('handles a 4-player free-for-all without sign errors', () => {
        const ratings = recomputeRatings([
            { userId: 'first',  rating: 1500, placement: 1 },
            { userId: 'second', rating: 1500, placement: 2 },
            { userId: 'third',  rating: 1500, placement: 3 },
            { userId: 'fourth', rating: 1500, placement: 4 },
        ]);
        // Strict ordering: 1st delta > 2nd > 3rd > 4th
        const deltas = ['first', 'second', 'third', 'fourth'].map(
            (id) => ratings.find((r) => r.userId === id).delta,
        );
        expect(deltas[0]).toBeGreaterThan(deltas[1]);
        expect(deltas[1]).toBeGreaterThan(deltas[2]);
        expect(deltas[2]).toBeGreaterThan(deltas[3]);
        // Roughly zero-sum (rounding can produce a ±1 drift).
        const sum = deltas.reduce((a, b) => a + b, 0);
        expect(Math.abs(sum)).toBeLessThanOrEqual(2);
    });

    it('returns zero-delta no-ops for solo battles', () => {
        const ratings = recomputeRatings([{ userId: 'lonely', rating: 1234, placement: 1 }]);
        expect(ratings[0].delta).toBe(0);
        expect(ratings[0].ratingAfter).toBe(1234);
    });

    it('never produces a negative rating', () => {
        const ratings = recomputeRatings([
            { userId: 'a', rating: 5, placement: 2 },
            { userId: 'b', rating: 2000, placement: 1 },
        ]);
        const a = ratings.find((r) => r.userId === 'a');
        expect(a.ratingAfter).toBeGreaterThanOrEqual(0);
    });
});
