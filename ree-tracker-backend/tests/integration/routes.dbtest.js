import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';

// The routes this release touched, against a real database: the answer gate's
// relation filter, the bookmarks include, the mistakes reads (and their index),
// the focus-block edit and delete, and a real grade write.

const verifyIdToken = vi.fn(async (token) => ({ uid: token, email: `${token}@example.test` }));
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../../src/config/db');
const { lockedQuestionIds } = require('../../src/services/answerGate');

const RUN = `it${Date.now().toString(36)}`;
const A = `${RUN}-a`;
const B = `${RUN}-b`;
const Q = (n) => `${RUN}-q${n}`;
const BATTLE = `${RUN}-LIVE`.slice(0, 32);
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/exams', require('../../src/routes/examRoutes'));
    app.use('/api/bookmarks', require('../../src/routes/bookmarkRoutes'));
    app.use('/api/user', require('../../src/routes/mistakeRoutes'));
    app.use('/api/user', require('../../src/routes/focusRoutes'));
    app.use('/api/analytics/deep', require('../../src/routes/analyticsDeepRoutes'));
    return app;
}

beforeAll(async () => {
    await prisma.user.createMany({ data: [{ id: A, email: `${A}@example.test` }, { id: B, email: `${B}@example.test` }] });
    await prisma.question.createMany({
        data: [1, 2, 3].map((n) => ({ id: Q(n), subject: 'EE', subtopic: 'Circuits', text: `Q${n}`, options: ['A', 'B', 'C', 'D'], answer: 'A', fixedExplanation: `Why ${n}` })),
    });
    // A battle A is playing, started a minute ago, ten minutes long: q1 is in it.
    await prisma.battle.create({
        data: {
            id: BATTLE, hostId: A, config: {}, questions: [{ id: Q(1) }], timeLimitSecs: 600,
            status: 'IN_PROGRESS', startedAt: new Date(Date.now() - 60_000),
            participants: { create: [{ userId: A, displayName: 'A', isHost: true }] },
        },
    });
});

afterAll(async () => {
    await prisma.battle.deleteMany({ where: { id: BATTLE } });
    await prisma.user.deleteMany({ where: { id: { in: [A, B] } } });
    await prisma.question.deleteMany({ where: { id: { in: [Q(1), Q(2), Q(3)] } } });
    await prisma.$disconnect();
});

describe('answer gate', () => {
    it("locks the open battle's question for its player only", async () => {
        expect([...await lockedQuestionIds(A, [Q(1), Q(2)])]).toEqual([Q(1)]);
        expect((await lockedQuestionIds(B, [Q(1)])).size).toBe(0);
    });

    it('grades and records only what is not locked', async () => {
        const answers = [Q(1), Q(2)].map((id, i) => ({
            questionId: id, userAnswer: 'B', confidenceLevel: 'HIGH', timeSpentMs: 30_000, clientAttemptId: `${RUN}-run:${id}`, itemIndex: i,
        }));
        const res = await request(makeApp()).post('/api/exams/grade').set(as(A)).send({ mode: 'DRILL', answers });
        expect(res.status).toBe(200);
        const byQ = Object.fromEntries(res.body.results.map((r) => [r.questionId, r]));
        expect(byQ[Q(1)]).toMatchObject({ withheld: true, correctAnswer: null });
        expect(byQ[Q(2)]).toMatchObject({ isCorrect: false, correctAnswer: 'A' });
        const recorded = await prisma.questionAttempt.findMany({ where: { userId: A }, select: { questionId: true } });
        expect(recorded.map((r) => r.questionId)).toEqual([Q(2)]);
    });

    it('keeps the key out of bookmarks and mistakes while the battle runs', async () => {
        await prisma.bookmark.createMany({ data: [{ userId: A, questionId: Q(1) }, { userId: A, questionId: Q(3) }] });
        await prisma.questionAttempt.create({ data: { userId: A, questionId: Q(1), subject: 'EE', subtopic: 'Circuits', isCorrect: false, selectedAnswer: 'C', mode: 'DRILL' } });

        const marks = await request(makeApp()).get('/api/bookmarks').set(as(A));
        const byQ = Object.fromEntries(marks.body.items.map((i) => [i.id, i]));
        expect(byQ[Q(1)]).toMatchObject({ answer: null, fixedExplanation: null, answerWithheld: true });
        expect(byQ[Q(3)]).toMatchObject({ answer: 'A', fixedExplanation: 'Why 3' });

        const mistakes = await request(makeApp()).get('/api/user/mistakes').set(as(A));
        expect(mistakes.status).toBe(200);
        expect(mistakes.body.items.map((i) => i.questionId)).toEqual([Q(2)]);
    });
});

describe('focus blocks', () => {
    it("records, fixes and deletes the caller's block, and only theirs", async () => {
        const app = makeApp();
        const end = Date.now() - 60_000;
        const block = { clientId: `${RUN}-focus-1`, subject: 'EE', minutes: 25, startedAt: new Date(end - 30 * 60_000).toISOString(), endedAt: new Date(end).toISOString(), completed: true };
        expect((await request(app).post('/api/user/focus-blocks').set(as(A)).send(block)).status).toBe(201);

        const summary = await request(app).get('/api/analytics/deep/focus-time').set(as(A));
        const [recent] = summary.body.recent;
        expect(recent).toMatchObject({ subject: 'EE', minutes: 25, maxMinutes: 31 });

        expect((await request(app).patch(`/api/user/focus-blocks/${recent.id}`).set(as(B)).send({ minutes: 5 })).status).toBe(404);
        expect((await request(app).patch(`/api/user/focus-blocks/${recent.id}`).set(as(A)).send({ minutes: 40 })).status).toBe(400);
        expect((await request(app).patch(`/api/user/focus-blocks/${recent.id}`).set(as(A)).send({ subject: 'ESAS', minutes: 20 })).status).toBe(200);
        expect(await prisma.focusBlock.findUnique({ where: { id: recent.id }, select: { subject: true, minutes: true } })).toEqual({ subject: 'ESAS', minutes: 20 });

        expect((await request(app).delete(`/api/user/focus-blocks/${recent.id}`).set(as(B))).body.deleted).toBe(false);
        expect((await request(app).delete(`/api/user/focus-blocks/${recent.id}`).set(as(A))).body.deleted).toBe(true);
        expect(await prisma.focusBlock.count({ where: { userId: A } })).toBe(0);
    });
});
