import { describe, it, expect, vi, afterEach } from 'vitest';

// New questions are stored with the key at a random position. Generated ones
// came with it first far more often than not, and nothing reordered them.

const prisma = require('../src/config/db');
const { storageOrder, buildQuestionCreateData, createLiveQuestion } = require('../src/services/reviewService');

afterEach(() => vi.restoreAllMocks());

const FOUR = ['KEY', 'w1', 'w2', 'w3'];

describe('storageOrder', () => {
    it('keeps every choice and spreads the key evenly over the slots', () => {
        const at = [0, 0, 0, 0];
        const N = 8000;
        for (let i = 0; i < N; i += 1) {
            const out = storageOrder(FOUR);
            expect([...out].sort()).toEqual([...FOUR].sort());
            at[out.indexOf('KEY')] += 1;
        }
        for (const n of at) expect(Math.abs(n / N - 0.25)).toBeLessThan(0.03);
    });

    it('keeps the shared rules: a closing choice stays last, letter references keep the order', () => {
        for (let i = 0; i < 50; i += 1) {
            expect(storageOrder(['a', 'b', 'c', 'All of the above']).at(-1)).toBe('All of the above');
        }
        expect(storageOrder(['1', '2', '3', 'Both A and B'])).toEqual(['1', '2', '3', 'Both A and B']);
        expect(storageOrder(undefined)).toEqual([]);
    });

    it('a publish with a known id is keyed on it, so a retried batch stores the same order', () => {
        const data = { subject: 'EE', text: 't', options: FOUR, answer: 'KEY' };
        const a = buildQuestionCreateData(data, null, 'qid-1');
        expect(buildQuestionCreateData(data, null, 'qid-1').options).toEqual(a.options);
        expect(a.answer).toBe('KEY');
        expect(a.options).toContain('KEY');
    });

    it('a live create stores a shuffled copy, never the caller’s array as given', async () => {
        vi.spyOn(prisma.topic, 'findMany').mockResolvedValue([]);
        const created = vi.spyOn(prisma.question, 'create').mockImplementation(async ({ data }) => ({ id: 'q', ...data }));
        const seen = new Set();
        for (let i = 0; i < 24; i += 1) {
            await createLiveQuestion({ subject: 'EE', subtopic: 'General', text: 'x', options: FOUR, answer: 'KEY' });
            seen.add(created.mock.calls.at(-1)[0].data.options.indexOf('KEY'));
        }
        expect(seen.size).toBeGreaterThan(1);
    });
});
