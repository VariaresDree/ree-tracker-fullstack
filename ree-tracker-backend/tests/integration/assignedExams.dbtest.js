import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Assigned exams against a real Postgres: a finalised sitting is tagged only
// when its answers are the exam's, and the JSON-path reads behind the learner's
// list and the reviewer's results find the tagged sittings.

const prisma = require('../../src/config/db');
const { finalizeSession } = require('../../src/services/examHistory');
const assignedExams = require('../../src/services/assignedExams');

const RUN = `ax${Date.now().toString(36)}`;
const U = (n) => `${RUN}-u${n}`;
const Q = (n) => `${RUN}-q${n}`;
const S = (n) => `${RUN}-s${n}`;
let examId;

async function sit(sessionId, userId, questionIds, correct) {
    await prisma.examSession.create({
        data: { id: sessionId, userId, mode: 'BOARD_SIM', targetSubject: 'EE', score: correct, totalQuestions: questionIds.length, timeTakenSecs: 60, verdict: 'IN_PROGRESS', config: {} },
    });
    await prisma.questionAttempt.createMany({
        data: questionIds.map((qid, i) => ({
            userId, sessionId, questionId: qid, subject: 'EE', subtopic: 'Circuits', isCorrect: i < correct,
            selectedAnswer: 'a', itemIndex: i, clientAttemptId: `${sessionId}:${qid}`,
        })),
    });
}

beforeAll(async () => {
    await prisma.user.createMany({ data: [1, 2, 3].map((n) => ({ id: U(n), email: `${U(n)}@example.test`, displayName: `Learner ${n}` })) });
    await prisma.question.createMany({
        data: [1, 2, 3, 4, 5, 6].map((n) => ({ id: Q(n), subject: 'EE', subtopic: 'Circuits', text: `Q${n}`, options: ['a', 'b'], answer: 'a' })),
    });
    ({ id: examId } = await assignedExams.create(
        { title: `${RUN} exam`, description: null, questionIds: [1, 2, 3, 4, 5].map(Q), timeLimitSecs: 600, status: 'published' },
        U(1),
    ));
    const five = [1, 2, 3, 4, 5].map(Q);
    await sit(S(1), U(1), five, 2); // 40%, first
    await sit(S(2), U(1), five, 5); // 100%, a retake
    await sit(S(3), U(2), five, 4); // 80%
    await sit(S(4), U(3), five, 3); // 60%
    await sit(S(5), U(3), [Q(1), Q(6)], 2); // holds a question outside the exam
    for (const [s, u] of [[1, 1], [2, 1], [3, 2], [4, 3], [5, 3]]) {
        await finalizeSession({ userId: U(u), sessionId: S(s), meta: { kind: 'assigned', assignedExamId: examId } });
    }
});

afterAll(async () => {
    await prisma.questionAttempt.deleteMany({ where: { userId: { startsWith: RUN } } });
    await prisma.examSession.deleteMany({ where: { userId: { startsWith: RUN } } });
    await prisma.assignedExam.deleteMany({ where: { title: { startsWith: RUN } } });
    await prisma.question.deleteMany({ where: { id: { startsWith: RUN } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: RUN } } });
    await prisma.$disconnect();
});

describe('assigned exam sittings', () => {
    it('tags a sitting whose answers are all the exam’s, and not one that holds another question', async () => {
        const tagged = await prisma.examSession.findUnique({ where: { id: S(1) }, select: { config: true } });
        expect(tagged.config).toMatchObject({ kind: 'assigned', assignedExamId: examId, assignedExamTitle: `${RUN} exam` });
        const foreign = await prisma.examSession.findUnique({ where: { id: S(5) }, select: { config: true } });
        expect(foreign.config.assignedExamId).toBeUndefined();
    });

    it('gives the learner their tries and the class average of first sittings', async () => {
        const mine = (await assignedExams.listForLearner(U(1))).find((e) => e.id === examId);
        expect(mine).toMatchObject({ itemCount: 5, mine: { attempts: 2, first: 40, best: 100 }, class: { average: 60, takers: 3 } });
        expect(mine.topics).toEqual([{ subject: 'EE', topic: 'Circuits', count: 5 }]);
    });

    it('gives the reviewer every learner’s first sitting and the questions from first sittings', async () => {
        const r = await assignedExams.results(examId);
        expect(r).toMatchObject({ takers: 3, average: 60, passed: 1 });
        expect(r.learners.map((l) => [l.displayName, l.first, l.best, l.attempts])).toEqual([
            ['Learner 2', 80, 80, 1], ['Learner 3', 60, 60, 1], ['Learner 1', 40, 100, 2],
        ]);
        // q1 was right in every first sitting; q5 in none of them (the 100% retake doesn't count).
        const pct = Object.fromEntries(r.items.map((i) => [i.questionId, i.pct]));
        expect(pct[Q(1)]).toBe(100);
        expect(pct[Q(5)]).toBe(0);
        expect(r.items[0].question.text).toBe('Q5');
    });

    it('the admin list carries how many took it and their average', async () => {
        const row = (await assignedExams.listForAdmin()).find((e) => e.id === examId);
        expect(row).toMatchObject({ takers: 3, average: 60, topics: [{ subject: 'EE', topic: 'Circuits', count: 5 }] });
    });
});
