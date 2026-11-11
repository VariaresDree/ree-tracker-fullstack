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

describe('a focus drawn by the server', () => {
    const CALC = `${RUN}-calc`;
    beforeAll(async () => {
        await prisma.question.createMany({
            data: [
                { id: `${CALC}-1`, subject: 'EE', subtopic: CALC, text: 'c1', options: ['A', 'B'], answer: 'A', type: 'calculation' },
                { id: `${CALC}-2`, subject: 'EE', subtopic: CALC, text: 'k1', options: ['A', 'B'], answer: 'A', type: 'conceptual' },
                { id: `${CALC}-3`, subject: 'EE', subtopic: CALC, text: 'n1', options: ['A', 'B'], answer: 'A', type: null },
            ],
        });
    });
    afterAll(async () => {
        await prisma.question.deleteMany({ where: { subtopic: CALC } });
    });

    it('calculation only, or everything else (a missing type is conceptual), on every branch', async () => {
        const mine = (ids) => ids.filter((id) => id.startsWith(CALC)).sort();
        for (const spec of [{ subtopic: CALC }, { subjectValues: ['EE'], subtopic: CALC }, { subjectValues: ['EE'] }, {}]) {
            expect(mine(await questionPool.sampleQuestionIds({ ...spec, limit: 2000, focus: 'calculation' }))).toEqual([`${CALC}-1`]);
            expect(mine(await questionPool.sampleQuestionIds({ ...spec, limit: 2000, focus: 'conceptual' }))).toEqual([`${CALC}-2`, `${CALC}-3`]);
            expect(mine(await questionPool.sampleQuestionIds({ ...spec, limit: 2000 }))).toHaveLength(3);
        }
    });
});

describe('drawn by subtopic', () => {
    const TAG = `${RUN}-tag`;
    beforeAll(async () => {
        await prisma.topic.create({ data: { id: `${TAG}-topic`, subject: 'EE', name: `${TAG} Topic`, normKey: `${TAG} topic` } });
        await prisma.syllabusSubtopic.createMany({
            data: [
                { id: `${TAG}-s1`, topicId: `${TAG}-topic`, name: 'One', normKey: 'one' },
                { id: `${TAG}-s2`, topicId: `${TAG}-topic`, name: 'Two', normKey: 'two' },
            ],
        });
        await prisma.question.createMany({
            data: [1, 2, 3].map((n) => ({
                id: `${TAG}-q${n}`, subject: 'EE', subtopic: `${TAG} Topic`, topicId: `${TAG}-topic`, text: `t${n}`, options: ['A', 'B'], answer: 'A',
                subtopicId: n === 3 ? `${TAG}-s2` : `${TAG}-s1`, type: n === 2 ? 'calculation' : 'conceptual',
            })),
        });
    });
    afterAll(async () => {
        await prisma.question.deleteMany({ where: { id: { startsWith: TAG } } });
        await prisma.syllabusSubtopic.deleteMany({ where: { topicId: `${TAG}-topic` } });
        await prisma.topic.deleteMany({ where: { id: `${TAG}-topic` } });
    });

    it('only that subtopic’s questions, on every branch, and with a focus', async () => {
        const mine = (ids) => ids.filter((id) => id.startsWith(TAG)).sort();
        const s1 = `${TAG}-s1`;
        for (const spec of [{ subtopic: `${TAG} Topic` }, { subjectValues: ['EE'], subtopic: `${TAG} Topic` }, { subjectValues: ['EE'] }, {}]) {
            expect(mine(await questionPool.sampleQuestionIds({ ...spec, limit: 2000, subtopicId: s1 }))).toEqual([`${TAG}-q1`, `${TAG}-q2`]);
            expect(mine(await questionPool.sampleQuestionIds({ ...spec, limit: 2000, subtopicId: s1, focus: 'calculation' }))).toEqual([`${TAG}-q2`]);
        }
        const pool = await questionPool.samplePool({ subject: 'EE', subtopic: `${TAG} Topic`, subtopicId: `${TAG}-s2`, limit: 10 });
        expect(pool.map((q) => q.id)).toEqual([`${TAG}-q3`]);
    });

    it('a subtopic removed untags its questions rather than delete them', async () => {
        await prisma.syllabusSubtopic.delete({ where: { id: `${TAG}-s2` } });
        const q = await prisma.question.findUnique({ where: { id: `${TAG}-q3` }, select: { subtopicId: true } });
        expect(q).toEqual({ subtopicId: null });
    });
});
