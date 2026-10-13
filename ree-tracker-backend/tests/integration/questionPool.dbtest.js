import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// The question sampler's four raw queries against a real database, with and
// without an exclusion list. The exclusion is always bound (an empty array
// when there is none), so every battle and Practice sample runs through it.

const prisma = require('../../src/config/db');
const questionPool = require('../../src/services/questionPool');

const RUN = `qp${Date.now().toString(36)}`;
const SUBTOPIC = `${RUN}-sub`;
const Q = (n) => `${RUN}-q${n}`;

beforeAll(async () => {
    await prisma.question.createMany({
        data: [1, 2, 3, 4].map((n) => ({ id: Q(n), subject: 'EE', subtopic: SUBTOPIC, text: `Q${n}`, options: ['A', 'B'], answer: 'A' })),
    });
});

afterAll(async () => {
    await prisma.question.deleteMany({ where: { subtopic: SUBTOPIC } });
    await prisma.$disconnect();
});

describe('sampleQuestionIds', () => {
    it('by subtopic, with nothing to exclude', async () => {
        expect((await questionPool.sampleQuestionIds({ subtopic: SUBTOPIC, limit: 10 })).sort()).toEqual([Q(1), Q(2), Q(3), Q(4)]);
    });

    it('by subject and subtopic, leaving out the excluded', async () => {
        const ids = await questionPool.sampleQuestionIds({ subjectValues: ['EE'], subtopic: SUBTOPIC, limit: 10, excludeIds: [Q(1), Q(3)] });
        expect(ids.sort()).toEqual([Q(2), Q(4)]);
    });

    it('stratified by subject, and across the bank, leaving out the excluded', async () => {
        const bySubject = await questionPool.sampleQuestionIds({ subjectValues: ['EE'], limit: 2000, excludeIds: [Q(2)] });
        expect(bySubject).toEqual(expect.arrayContaining([Q(1), Q(3), Q(4)]));
        expect(bySubject).not.toContain(Q(2));
        const all = await questionPool.sampleQuestionIds({ limit: 2000, excludeIds: [Q(4)] });
        expect(all).toEqual(expect.arrayContaining([Q(1), Q(2), Q(3)]));
        expect(all).not.toContain(Q(4));
    });
});

describe('samplePool with questions to avoid', () => {
    it('takes every other question first, and only then the avoided ones', async () => {
        const three = (await questionPool.samplePool({ subtopic: SUBTOPIC, limit: 3, avoidIds: [Q(1), Q(2)] })).map((q) => q.id);
        expect(three).toEqual(expect.arrayContaining([Q(3), Q(4)]));
        expect(three).toHaveLength(3);
        const two = (await questionPool.samplePool({ subtopic: SUBTOPIC, limit: 2, avoidIds: [Q(1), Q(2)] })).map((q) => q.id);
        expect(two.sort()).toEqual([Q(3), Q(4)]);
    });
});
