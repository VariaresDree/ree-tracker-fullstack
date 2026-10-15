import { describe, it, expect } from 'vitest';

// The order answer choices are shown in (@ree/shared optionOrder.js): seeded,
// so a sitting keeps its order and its review can show it, and unbiased, so
// the key lands on each letter as often as any other.

const {
    seededRng, optionKey, optionOrder, orderOptions, shuffleWithKey, answerPositions,
    isClosingOption, isLetterReference, newSittingKey,
} = require('@ree/shared');

const FOUR = ['10 A', '20 A', '30 A', '40 A'];

describe('optionOrder', () => {
    it('is the same for the same key, and a permutation of the stored indices', () => {
        const key = optionKey('sitting-1', 'q1');
        expect(optionOrder(FOUR, key)).toEqual(optionOrder(FOUR, key));
        expect([...optionOrder(FOUR, key)].sort()).toEqual([0, 1, 2, 3]);
        expect(orderOptions(FOUR, key).sort()).toEqual([...FOUR].sort());
    });

    it('differs across sittings and across questions', () => {
        const orders = new Set();
        for (let i = 0; i < 40; i += 1) orders.add(optionOrder(FOUR, optionKey(`s${i}`, 'q1')).join(''));
        expect(orders.size).toBeGreaterThan(15);
        const perQuestion = new Set(['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].map((q) => optionOrder(FOUR, optionKey('s', q)).join('')));
        expect(perQuestion.size).toBeGreaterThan(2);
    });

    it('puts the key on each of four letters as often as any other (no position bias)', () => {
        const N = 20000;
        const at = [0, 0, 0, 0];
        for (let i = 0; i < N; i += 1) at[orderOptions(FOUR, optionKey(`sitting-${i}`, 'q')).indexOf('10 A')] += 1;
        for (const n of at) expect(Math.abs(n / N - 0.25)).toBeLessThan(0.015);
        // The comparator sort the app used to use fails the same check.
        const biased = [0, 0, 0, 0];
        const rng = seededRng('biased');
        for (let i = 0; i < N; i += 1) biased[[...FOUR].sort(() => rng() - 0.5).indexOf('10 A')] += 1;
        expect(Math.max(...biased.map((n) => Math.abs(n / N - 0.25)))).toBeGreaterThan(0.015);
    });

    it('keeps a closing option ("All of the above") last', () => {
        const options = ['Ohm', 'Watt', 'Joule', 'All of the above'];
        for (let i = 0; i < 30; i += 1) expect(orderOptions(options, `k${i}`)[3]).toBe('All of the above');
        expect(isClosingOption('None of these')).toBe(true);
        expect(isClosingOption('Neither of the above')).toBe(true);
        expect(isClosingOption('All values are equal')).toBe(false);
    });

    it('keeps the stored order when an option names others by letter', () => {
        const options = ['Ohm', 'Watt', 'Joule', 'Both A and B'];
        expect(orderOptions(options, 'any')).toEqual(options);
        for (const ref of ['A and C', 'A, B and C', 'Either A or D', 'B & C only', '(A) and (B)']) expect(isLetterReference(ref)).toBe(true);
        for (const text of ['10 A and 5 V', 'A and B phases', 'Phase A']) expect(isLetterReference(text)).toBe(false);
        // Ordinary words that spell a letter, "or" and a letter, and lower case.
        for (const word of ['Core', 'Bore', 'Cord', 'Ford', 'Fore', 'a, b', 'Both a and b']) expect(isLetterReference(word)).toBe(false);
        for (const ref of ['A, B, and C', 'BOTH A AND B', 'neither B nor D', 'A,B', 'A & B']) expect(isLetterReference(ref)).toBe(true);
        // A question with such a word among its choices is still shuffled.
        const transformer = ['Core', 'Winding', 'Tank', 'Bushing'];
        const keys = Array.from({ length: 12 }, (_, i) => optionOrder(transformer, `k${i}`).join());
        expect(new Set(keys).size).toBeGreaterThan(1);
    });

    it('leaves fewer than two options, and non-arrays, alone', () => {
        expect(orderOptions(['only'], 'k')).toEqual(['only']);
        expect(orderOptions(null, 'k')).toBeNull();
        expect(optionOrder(undefined, 'k')).toEqual([]);
    });
});

describe('shuffleWithKey and newSittingKey', () => {
    it('shuffles a list repeatably by key', () => {
        const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
        expect(shuffleWithKey(ids, 'k')).toEqual(shuffleWithKey(ids, 'k'));
        expect([...shuffleWithKey(ids, 'k')].sort()).toEqual(ids);
        expect(ids).toEqual(['a', 'b', 'c', 'd', 'e', 'f']); // a copy
    });

    it('a sitting key is fresh each time', () => {
        expect(newSittingKey()).not.toBe(newSittingKey());
    });
});

describe('answerPositions', () => {
    it('counts where the key sits, and what keeps its order or has no key among its options', () => {
        expect(answerPositions([
            { options: ['x', 'y', 'z', 'w'], answer: 'x' },
            { options: ['x', 'y', 'z', 'w'], answer: 'x' },
            { options: ['x', 'y', 'z', 'w'], answer: 'w' },
            { options: ['x', 'y', 'z', 'w', 'v'], answer: 'v' },
            { options: ['x', 'y', 'z', 'w'], answer: 'B' },
            { options: ['x', 'y', 'z', 'A and B'], answer: 'y' },
        ])).toEqual({ A: 2, B: 1, C: 0, D: 1, other: 1, missing: 1, fixedOrder: 1 });
    });
});
