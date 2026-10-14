import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';

// Shuffled answer choices against a real database: the order tag survives a
// finalise into the session's JSON config, a battle carries it from creation,
// the sitting review rebuilds the order the learner saw, and the admin audit
// reads the live bank.

const verifyIdToken = vi.fn(async (token) => ({ uid: token, email: `${token}@example.test` }));
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../../src/config/db');
const { optionKey, orderOptions } = require('@ree/shared');
const battleCreate = require('../../src/services/battleCreate');
const questionPool = require('../../src/services/questionPool');
const { auditLiveBank } = require('../../src/services/optionAudit');

const RUN = `oo${Date.now().toString(36)}`;
const U = `${RUN}-u`;
const Q = (n) => `${RUN}-q${n}`;
const SESSION = `${RUN}-sit`;
const BATTLE = `${RUN.slice(-6).toUpperCase()}`.padEnd(6, 'X').slice(0, 6);
const OPTIONS = (n) => [`a${n}`, `b${n}`, `c${n}`, `d${n}`];
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/exams', require('../../src/routes/examRoutes'));
    app.use('/api/analytics/deep', require('../../src/routes/analyticsDeepRoutes'));
    return app;
}

let before;
beforeAll(async () => {
    before = await auditLiveBank();
    await prisma.user.create({ data: { id: U, email: `${U}@example.test` } });
    await prisma.question.createMany({
        data: [
            ...[1, 2, 3, 4].map((n) => ({ id: Q(n), subject: 'EE', subtopic: 'Circuits', text: `Q${n}`, options: OPTIONS(n), answer: `a${n}`, fixedExplanation: `Why ${n}` })),
            // Not among its options, and an explanation naming option B.
            { id: Q(9), subject: 'EE', subtopic: 'Circuits', text: 'Q9', options: OPTIONS(9), answer: 'B', fixedExplanation: 'Option B is right.' },
        ],
    });
    await prisma.examSession.create({
        data: { id: SESSION, userId: U, mode: 'BOARD_SIM', targetSubject: 'EE', score: 0, totalQuestions: 4, timeTakenSecs: 60, verdict: 'IN_PROGRESS', config: {} },
    });
    await prisma.questionAttempt.createMany({
        data: [1, 2, 3, 4].map((n, i) => ({
            userId: U, sessionId: SESSION, questionId: Q(n), subject: 'EE', subtopic: 'Circuits', isCorrect: n % 2 === 0,
            selectedAnswer: `a${n}`, itemIndex: i, confidenceLevel: 'MED', timeSpentMs: 1000, clientAttemptId: `${SESSION}:${n}`,
        })),
    });
});

afterAll(async () => {
    await prisma.battle.deleteMany({ where: { id: BATTLE } });
    await prisma.questionAttempt.deleteMany({ where: { userId: U } });
    await prisma.examSession.deleteMany({ where: { userId: U } });
    await prisma.user.deleteMany({ where: { id: U } });
    await prisma.question.deleteMany({ where: { id: { in: [1, 2, 3, 4, 9].map(Q) } } });
    await prisma.$disconnect();
});

describe('shuffled answer choices (real database)', () => {
    it('keeps the order tag through a finalise and reviews the sitting in the order it was shown', async () => {
        const fin = await request(makeApp()).post(`/api/exams/sessions/${SESSION}/finalize`).set(as(U)).send({ kind: 'subject', optionOrder: 'seeded-v1' });
        expect(fin.status).toBe(200);
        const stored = await prisma.examSession.findUnique({ where: { id: SESSION }, select: { config: true } });
        expect(stored.config.optionOrder).toBe('seeded-v1');

        const res = await request(makeApp()).get(`/api/analytics/deep/sittings/${SESSION}/review`).set(as(U));
        expect(res.status).toBe(200);
        expect(res.body.session.optionOrder).toBe('seeded-v1');
        for (const item of res.body.items) {
            const n = Number(item.questionId.split('-q')[1]);
            expect(item.options).toEqual(orderOptions(OPTIONS(n), optionKey(SESSION, item.questionId)));
        }
    });

    it('creates a battle carrying the tag in its config', async () => {
        const spy = vi.spyOn(questionPool, 'samplePool').mockResolvedValue([{ id: Q(1), options: OPTIONS(1), answer: 'a1' }]);
        const made = await battleCreate.createBattle({ hostId: U, battleId: BATTLE, config: { mode: 'subject', subject: 'EE', count: 5 }, timeLimitSecs: 600 });
        spy.mockRestore();
        const row = await prisma.battle.findUnique({ where: { id: made.id }, select: { config: true } });
        expect(row.config.optionOrder).toBe('seeded-v1');
    });

    it('audits the live bank', async () => {
        const after = await auditLiveBank();
        expect(after.total - before.total).toBe(5);
        expect(after.positions.A - before.positions.A).toBe(4);
        expect(after.positions.missing - before.positions.missing).toBe(1);
        expect(after.letterInExplanation - before.letterInExplanation).toBe(1);
    });
});
