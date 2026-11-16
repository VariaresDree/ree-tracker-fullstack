import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Questions to check against a real Postgres (2026-11-16): the scan's page
// query (the answer line by regex, md5 of the question), the learners' picks,
// a key changed from the queue regrading stored answers, and a settled finding
// staying settled until the question changes.

const prisma = require('../../src/config/db');
const { scanBank, resolveCheck } = require('../../src/services/keyCheck');

const RUN = `kc${Date.now().toString(36)}`;
const Q = (n) => `${RUN}-q${n}`;
const USERS = [1, 2, 3, 4, 5].map((n) => `${RUN}-u${n}`);
const ADMIN = USERS[0];
const opts = ['0.853 H', '0.700 H', '0.953 H', '0.600 H'];

const checksFor = (id) => prisma.questionCheck.findMany({ where: { questionId: id }, orderBy: { reason: 'asc' } });

beforeAll(async () => {
    await prisma.user.createMany({ data: USERS.map((id) => ({ id, email: `${id}@example.test` })) });
    await prisma.question.createMany({
        data: [
            // The explanation works out 0.953 H; the key says 0.853 H.
            { id: Q(1), subject: 'EE', subtopic: 'Magnetic Circuits', text: `${RUN} two coils`, options: opts, answer: '0.853 H', difficulty: 2,
                fixedExplanation: '**Key idea:** M = k√(L1 L2).\n\n**Answer:** The total inductance is $0.953\\ \\text{H}$.\n\n**Why the others are wrong:** …' },
            // Fine: the line gives the key in another spelling.
            { id: Q(2), subject: 'Mathematics', subtopic: 'Calculus', text: `${RUN} radius`, options: ['4/3 units', '8/3 units', '16/3 units', '3 units'], answer: '8/3 units', difficulty: 2,
                fixedExplanation: '**Answer:** $\\frac{8}{3}$ units.' },
            // Five learners: four chose B.
            { id: Q(3), subject: 'ESAS', subtopic: 'Statics', text: `${RUN} beam`, options: ['A', 'B', 'C', 'D'], answer: 'A', difficulty: 2, fixedExplanation: 'Because.' },
        ],
    });
    await prisma.questionAttempt.createMany({
        data: [
            ...USERS.map((userId, i) => ({ userId, questionId: Q(3), subject: 'ESAS', subtopic: 'Statics', selectedAnswer: i === 0 ? 'A' : 'B', isCorrect: i === 0, mode: 'DRILL' })),
            // An answer to Q1 that the key change should mark right.
            { userId: USERS[1], questionId: Q(1), subject: 'EE', subtopic: 'Magnetic Circuits', selectedAnswer: '0.953 H', isCorrect: false, mode: 'DRILL' },
        ],
    });
});

afterAll(async () => {
    await prisma.questionAttempt.deleteMany({ where: { userId: { in: USERS } } });
    await prisma.questionVersion.deleteMany({ where: { questionId: { in: [Q(1), Q(2), Q(3)] } } });
    await prisma.question.deleteMany({ where: { id: { in: [Q(1), Q(2), Q(3)] } } });
    await prisma.userTopicPerformance.deleteMany({ where: { userId: { in: USERS } } });
    await prisma.user.deleteMany({ where: { id: { in: USERS } } });
    await prisma.$disconnect();
});

describe('questions to check', () => {
    it('finds the explanation that works out another option and the learners who chose one, not the spelling difference', async () => {
        const out = await scanBank();
        expect(out.scanned).toBeGreaterThanOrEqual(3);
        const [q1] = await checksFor(Q(1));
        expect(q1).toMatchObject({ reason: 'explanation-names-other', resolvedAt: null });
        expect(q1.detail).toMatchObject({ option: '0.953 H' });
        expect(q1.contentHash).toMatch(/^[0-9a-f]{32}$/);
        expect(await checksFor(Q(2))).toEqual([]);
        const [q3] = await checksFor(Q(3));
        expect(q3).toMatchObject({ reason: 'learners-chose-other' });
        expect(q3.detail).toMatchObject({ option: 'B', chose: 4, right: 1, learners: 5 });
    });

    it('changing the key from the queue regrades stored answers and closes the finding', async () => {
        const [q1] = await checksFor(Q(1));
        const out = await resolveCheck(q1.id, { action: 'use-option', answer: '0.953 H' }, ADMIN);
        expect(out).toMatchObject({ status: 200, regraded: 1 });
        expect((await prisma.question.findUnique({ where: { id: Q(1) } })).answer).toBe('0.953 H');
        const attempt = await prisma.questionAttempt.findFirst({ where: { questionId: Q(1) } });
        expect(attempt.isCorrect).toBe(true);
        expect((await checksFor(Q(1)))[0]).toMatchObject({ resolution: 'key-changed' });
        // The explanation now agrees with the key: the next scan finds nothing new.
        await scanBank();
        expect((await checksFor(Q(1)))[0]).toMatchObject({ resolution: 'key-changed' });
    });

    it("'Key is right' holds until the question changes", async () => {
        const [q3] = await checksFor(Q(3));
        await resolveCheck(q3.id, { action: 'keep' }, ADMIN);
        await scanBank();
        expect((await checksFor(Q(3)))[0]).toMatchObject({ resolution: 'kept' });
        await prisma.question.update({ where: { id: Q(3) }, data: { text: `${RUN} beam, edited` } });
        await scanBank();
        expect((await checksFor(Q(3)))[0]).toMatchObject({ resolvedAt: null, resolution: null });
    });
});
