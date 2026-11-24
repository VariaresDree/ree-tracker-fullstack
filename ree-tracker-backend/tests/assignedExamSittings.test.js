import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Taking an assigned exam: the learner's list (their tries, the class average
// once 3 have sat it), its questions, the tag a finalised sitting gets only
// when its answers prove it, and the reviewer's results.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const learnerRoutes = require('../src/routes/assignedExamRoutes');
const adminRoutes = require('../src/routes/adminAssignedExamRoutes');
const examRoutes = require('../src/routes/examRoutes');
const { summarize, CLASS_MIN } = require('../src/services/assignedExams');

const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const at = (n) => new Date(Date.UTC(2026, 10, 20, n));
// One finished sitting: `score` right out of `total`.
const sitting = (id, userId, score, n, over = {}) => ({ id, userId, examId: 'x1', score, totalQuestions: 10, mode: 'BOARD_SIM', createdAt: at(n), ...over });

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/assigned-exams', learnerRoutes);
    app.use('/api/admin/assigned-exams', adminRoutes);
    app.use('/api/exams', examRoutes);
    return app;
}

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    const role = (id) => ({ id, role: id === 'admin' ? 'ADMIN' : 'USER' });
    vi.spyOn(prisma.user, 'upsert').mockImplementation(async ({ where }) => role(where.id));
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => role(where.id));
});

afterEach(() => vi.restoreAllMocks());

describe('summarize', () => {
    it('keeps each learner’s first sitting, their best and how many, and averages first sittings', () => {
        const s = summarize([
            sitting('a1', 'ana', 5, 1), sitting('b1', 'ben', 9, 2), sitting('a2', 'ana', 8, 3), sitting('a3', 'ana', 6, 4),
        ]).x1;
        expect(s.learners.find((l) => l.userId === 'ana')).toMatchObject({ first: 50, best: 80, attempts: 3, firstSessionId: 'a1', last: at(4) });
        expect(s).toMatchObject({ takers: 2, average: 70, passed: 1 });
    });

    it('is empty with no sittings', () => {
        expect(summarize([])).toEqual({});
    });
});

describe('GET /api/assigned-exams (learner)', () => {
    const published = [{ id: 'x1', title: 'EE prelim', description: null, subject: 'EE', questionIds: ['q1', 'q2', 'q3', 'q4', 'q5'], timeLimitSecs: 1080, publishedAt: at(0) }];

    it('lists published exams only, with no question ids', async () => {
        const findMany = vi.spyOn(prisma.assignedExam, 'findMany').mockResolvedValue(published);
        vi.spyOn(prisma, '$queryRaw').mockResolvedValue([]);
        const res = await request(makeApp()).get('/api/assigned-exams').set(as('ana'));
        expect(res.status).toBe(200);
        expect(findMany.mock.calls[0][0].where).toEqual({ status: 'published' });
        expect(res.body.items).toEqual([expect.objectContaining({ id: 'x1', itemCount: 5, mine: null, class: null })]);
        expect(res.body.items[0].questionIds).toBeUndefined();
    });

    it('gives the learner their tries, and the class average only after they sat it and once 3 have', async () => {
        vi.spyOn(prisma.assignedExam, 'findMany').mockResolvedValue(published);
        const raw = vi.spyOn(prisma, '$queryRaw').mockResolvedValue([sitting('a1', 'ana', 6, 1), sitting('b1', 'ben', 8, 2)]);
        let res = await request(makeApp()).get('/api/assigned-exams').set(as('ana'));
        expect(res.body.items[0]).toMatchObject({ mine: { attempts: 1, best: 60, first: 60 }, class: null });

        raw.mockResolvedValue([sitting('a1', 'ana', 6, 1), sitting('b1', 'ben', 8, 2), sitting('c1', 'cy', 7, 3)]);
        res = await request(makeApp()).get('/api/assigned-exams').set(as('ana'));
        expect(CLASS_MIN).toBe(3);
        expect(res.body.items[0].class).toEqual({ average: 70, takers: 3 });

        res = await request(makeApp()).get('/api/assigned-exams').set(as('dee'));
        expect(res.body.items[0]).toMatchObject({ mine: null, class: null });
    });
});

describe('GET /api/assigned-exams/:id/questions (learner)', () => {
    it('gives a published exam’s questions with their keys, in the exam’s order', async () => {
        vi.spyOn(prisma.assignedExam, 'findFirst').mockResolvedValue({ id: 'x1', title: 'EE prelim', questionIds: ['q2', 'q1'], timeLimitSecs: 600 });
        vi.spyOn(prisma.battleParticipant, 'findMany').mockResolvedValue([]);
        vi.spyOn(prisma.question, 'findMany').mockResolvedValue([{ id: 'q1', answer: 'A' }, { id: 'q2', answer: 'B' }]);
        const res = await request(makeApp()).get('/api/assigned-exams/x1/questions').set(as('ana'));
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 'x1', title: 'EE prelim', timeLimitSecs: 600, questions: [{ id: 'q2', answer: 'B' }, { id: 'q1', answer: 'A' }] });
        expect(prisma.assignedExam.findFirst.mock.calls[0][0].where).toEqual({ id: 'x1', status: 'published' });
    });

    it('a draft or deleted exam is a plain 404', async () => {
        vi.spyOn(prisma.assignedExam, 'findFirst').mockResolvedValue(null);
        expect((await request(makeApp()).get('/api/assigned-exams/x1/questions').set(as('ana'))).status).toBe(404);
    });

    it('holds the keys back while the learner is in a battle with any of its questions', async () => {
        vi.spyOn(prisma.assignedExam, 'findFirst').mockResolvedValue({ id: 'x1', title: 'T', questionIds: ['q1', 'q2'], timeLimitSecs: 600 });
        vi.spyOn(prisma.battleParticipant, 'findMany').mockResolvedValue([
            { battle: { id: 'B1', questions: [{ id: 'q2' }], startedAt: new Date(), timeLimitSecs: 3600, createdAt: new Date() } },
        ]);
        const q = vi.spyOn(prisma.question, 'findMany');
        const res = await request(makeApp()).get('/api/assigned-exams/x1/questions').set(as('ana'));
        expect(res.status).toBe(409);
        expect(q).not.toHaveBeenCalled();
    });

    it('needs a sign-in', async () => {
        expect((await request(makeApp()).get('/api/assigned-exams')).status).toBe(401);
        expect((await request(makeApp()).get('/api/assigned-exams/x1/questions')).status).toBe(401);
    });
});

describe('finalize tags a sitting with its assigned exam', () => {
    const finalize = (body) => request(makeApp()).post('/api/exams/sessions/s1/finalize').set(as('ana')).send(body);
    let answered;
    beforeEach(() => {
        vi.spyOn(prisma.examSession, 'findFirst').mockResolvedValue({ id: 's1', config: {} });
        vi.spyOn(prisma.examSession, 'updateMany').mockResolvedValue({ count: 1 });
        vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ sessionId: 's1', subject: 'EE', total: 5, correct: 4 }]);
        vi.spyOn(prisma.assignedExam, 'findUnique').mockResolvedValue({ id: 'x1', title: 'EE prelim', questionIds: ['q1', 'q2', 'q3', 'q4', 'q5'] });
        answered = ['q1', 'q2', 'q3'];
        vi.spyOn(prisma.questionAttempt, 'findMany').mockImplementation(async () => answered.map((questionId) => ({ questionId })));
    });
    const stored = () => prisma.examSession.updateMany.mock.calls.at(-1)[0].data.config;

    it('when every answer is one of the exam’s questions', async () => {
        const res = await finalize({ kind: 'assigned', assignedExamId: 'x1' });
        expect(res.status).toBe(200);
        expect(stored()).toMatchObject({ kind: 'assigned', assignedExamId: 'x1', assignedExamTitle: 'EE prelim' });
        expect(prisma.questionAttempt.findMany.mock.calls[0][0].where).toEqual({ userId: 'ana', sessionId: 's1' });
    });

    it('not when the sitting holds another question', async () => {
        answered = ['q1', 'other'];
        await finalize({ kind: 'assigned', assignedExamId: 'x1' });
        expect(stored()).not.toHaveProperty('assignedExamId');
    });

    it('not for an exam that isn’t there', async () => {
        prisma.assignedExam.findUnique.mockResolvedValue(null);
        await finalize({ kind: 'assigned', assignedExamId: 'gone' });
        expect(stored()).not.toHaveProperty('assignedExamId');
    });

    it('keeps the tag it already has when finalised again', async () => {
        prisma.examSession.findFirst.mockResolvedValue({ id: 's1', config: { assignedExamId: 'x1', assignedExamTitle: 'EE prelim', finalizedAt: 'then' } });
        await finalize({ kind: 'assigned', assignedExamId: 'x1' });
        expect(stored()).toMatchObject({ assignedExamId: 'x1' });
        expect(prisma.assignedExam.findUnique).not.toHaveBeenCalled();
    });
});

describe('GET /api/admin/assigned-exams/:id/results', () => {
    beforeEach(() => {
        vi.spyOn(prisma.assignedExam, 'findUnique').mockResolvedValue({ id: 'x1', title: 'EE prelim', questionIds: ['q1', 'q2', 'q3', 'q4', 'q5'], status: 'published' });
    });

    it('is for admins only', async () => {
        expect((await request(makeApp()).get('/api/admin/assigned-exams/x1/results').set(as('ana'))).status).toBe(403);
    });

    it('ranks learners by first sitting and the questions hardest first, from first sittings only', async () => {
        vi.spyOn(prisma, '$queryRaw')
            .mockResolvedValueOnce([sitting('a1', 'ana', 5, 1), sitting('b1', 'ben', 9, 2, { mode: 'BATTLE' }), sitting('a2', 'ana', 10, 3)])
            .mockResolvedValueOnce([{ questionId: 'q1', answered: 2, correct: 2 }, { questionId: 'q2', answered: 2, correct: 0 }]);
        vi.spyOn(prisma.user, 'findMany').mockResolvedValue([{ id: 'ana', displayName: 'Ana' }, { id: 'ben', displayName: null }]);
        vi.spyOn(prisma.question, 'findMany').mockResolvedValue([{ id: 'q1', text: 'Easy one' }, { id: 'q2', text: 'Hard one' }]);

        const res = await request(makeApp()).get('/api/admin/assigned-exams/x1/results').set(as('admin'));
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ takers: 2, average: 70, passed: 1 });
        expect(res.body.learners.map((l) => [l.displayName === 'Ana' ? 'Ana' : 'fallback', l.first, l.best, l.attempts, l.firstMode]))
            .toEqual([['fallback', 90, 90, 1, 'BATTLE'], ['Ana', 50, 100, 2, 'BOARD_SIM']]);
        expect(res.body.learners[0].firstSessionId).toBeUndefined();
        // The per-question read is over first sittings only (a1, b1), not the retake.
        const perItemSql = prisma.$queryRaw.mock.calls[1];
        expect(perItemSql.slice(1)).toContainEqual(['a1', 'b1']);
        expect(res.body.items.map((i) => [i.questionId, i.pct, i.question?.text])).toEqual([['q2', 0, 'Hard one'], ['q1', 100, 'Easy one']]);
    });

    it('with no sittings yet', async () => {
        vi.spyOn(prisma, '$queryRaw').mockResolvedValue([]);
        const res = await request(makeApp()).get('/api/admin/assigned-exams/x1/results').set(as('admin'));
        expect(res.body).toMatchObject({ takers: 0, average: null, passed: 0, learners: [], items: [] });
    });
});
