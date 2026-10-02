import { describe, it, expect } from 'vitest';
const { selectDrillItems, splitAcrossTopics } = require('../src/engine/drill');
const { _internals } = require('../src/engine/forecast');

// Smart Drill used to rank subtopics by raw accuracy and serve whatever
// questions it found there, with no regard to difficulty — and stripped the
// answers, so every drill MCQ graded wrong on the client. Item choice is now
// adaptive: items near the learner's ability in that subject carry the most
// information, so the drill is pitched where it can actually move them.

const item = (id, b) => ({ id, irtA: 1, irtB: b, irtC: 0.2, difficulty: null });
const seeded = (seed = 3) => _internals.createRng(seed);

describe('selectDrillItems', () => {
    const bank = [item('far-easy', -3), item('near-1', 0.1), item('near-2', -0.2), item('near-3', 0.4), item('far-hard', 3)];

    it('prefers items within ±1 of θ, where they are most informative', () => {
        const ids = selectDrillItems({ candidates: bank, theta: 0, limit: 3, rng: seeded() });
        expect(ids.sort()).toEqual(['near-1', 'near-2', 'near-3']);
    });

    it('widens the window rather than coming back short', () => {
        const ids = selectDrillItems({ candidates: bank, theta: 0, limit: 5, rng: seeded() });
        expect(ids).toHaveLength(5);
    });

    it('never serves an excluded (recently seen) item', () => {
        const ids = selectDrillItems({ candidates: bank, theta: 0, limit: 5, exclude: new Set(['near-1']), rng: seeded() });
        expect(ids).not.toContain('near-1');
        expect(ids).toHaveLength(4);
    });

    it('is randomesque: varies with the seed but stays inside the informative band', () => {
        const wide = Array.from({ length: 20 }, (_, i) => item(`q${i}`, -0.95 + i * 0.1));
        const a = selectDrillItems({ candidates: wide, theta: 0, limit: 4, rng: seeded(1) });
        const b = selectDrillItems({ candidates: wide, theta: 0, limit: 4, rng: seeded(99) });
        expect(a).not.toEqual(b);
        expect(selectDrillItems({ candidates: wide, theta: 0, limit: 4, rng: seeded(1) })).toEqual(a);
    });

    it('places an uncalibrated item by its author rating, not the raw ordinal', () => {
        // difficulty 3 → b = +1; difficulty 1 → b = −1. At θ = 1 the "Complex"
        // item is the informative one.
        const ids = selectDrillItems({
            candidates: [{ id: 'core', difficulty: 2 }, { id: 'complex', difficulty: 3 }, { id: 'found', difficulty: 1 }],
            theta: 1, limit: 1, rng: seeded(),
        });
        expect(['complex', 'core']).toContain(ids[0]);
        expect(ids[0]).not.toBe('found');
    });
});

describe('splitAcrossTopics', () => {
    it('weights the weakest topic heaviest and always sums to the limit', () => {
        expect(splitAcrossTopics(10, 3)).toEqual([5, 3, 2]);
        expect(splitAcrossTopics(10, 2)).toEqual([6, 4]);
        expect(splitAcrossTopics(10, 1)).toEqual([10]);
        for (const n of [1, 7, 11, 20]) {
            expect(splitAcrossTopics(n, 3).reduce((a, b) => a + b, 0)).toBe(n);
        }
    });
});
