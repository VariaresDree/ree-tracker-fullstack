import { describe, it, expect, vi, afterEach } from 'vitest';

// New questions are stored with the key at a random position. Generated ones
// came with it first far more often than not, and nothing reordered them.

const prisma = require('../src/config/db');
const { storageOrder, withStorageOrder, approveOneRow } = require('../src/services/reviewService');

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

    it('withStorageOrder keeps every field and choice, and is keyed when given a key', () => {
        const data = { subject: 'EE', text: 't', options: FOUR, answer: 'KEY' };
        const a = withStorageOrder(data, 'qid-1');
        expect(withStorageOrder(data, 'qid-1').options).toEqual(a.options);
        expect(a).toMatchObject({ subject: 'EE', text: 't', answer: 'KEY' });
        expect([...a.options].sort()).toEqual([...FOUR].sort());
        expect(data.options).toEqual(FOUR);
    });

    it('a publish stores the choices in a fresh order, and its APPROVED snapshot matches the live row', async () => {
        vi.spyOn(prisma.topic, 'findMany').mockResolvedValue([]);
        const created = vi.spyOn(prisma.question, 'create').mockImplementation(async ({ data }) => ({ id: 'q-live', ...data }));
        const version = vi.spyOn(prisma.questionVersion, 'create').mockImplementation((args) => args);
        vi.spyOn(prisma.questionPendingReview, 'update').mockImplementation((args) => args);
        vi.spyOn(prisma, '$transaction').mockResolvedValue([]);
        const seen = new Set();
        for (let i = 0; i < 24; i += 1) {
            const row = { id: `r${i}`, status: 'PENDING', subject: 'EE', subtopic: 'General', text: 'x', options: FOUR, answer: 'KEY', difficulty: 2 };
            const res = await approveOneRow(row, 'admin');
            expect(res.ok).toBe(true);
            const live = created.mock.calls.at(-1)[0].data.options;
            expect(version.mock.calls.at(-1)[0].data.snapshot.options).toEqual(live);
            seen.add(live.indexOf('KEY'));
        }
        expect(seen.size).toBeGreaterThan(1);
    });
});
