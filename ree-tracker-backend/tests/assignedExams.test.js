import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// See questionRoutes.authz.test.js for why the patch comes before the requires.
const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const adminRoutes = require('../src/routes/adminAssignedExamRoutes');
const { subjectOf } = require('../src/services/assignedExams');
const { assignedExamSchema } = require('../src/schemas/assignedExamSchemas');

const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const ids = (n, prefix = 'q') => Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`);
const body = (over = {}) => ({ title: 'EE prelim', questionIds: ids(6), timeLimitSecs: 1800, ...over });
// The bank: q1…q20 are EE, m1…m20 Mathematics (stored under its old spelling).
const bankRow = (id) => ({ id, subject: id.startsWith('m') ? 'Math' : 'EE' });

describe('subjectOf', () => {
    it('names the one subject every question shares, in its canonical spelling', () => {
        expect(subjectOf([{ subject: 'Math' }, { subject: 'Mathematics' }])).toBe('Mathematics');
    });
    it('is Mixed when the questions span subjects', () => {
        expect(subjectOf([{ subject: 'EE' }, { subject: 'ESAS' }])).toBe('Mixed');
    });
});

describe('assignedExamSchema', () => {
    const parse = (over) => assignedExamSchema.safeParse(body(over));
    it('takes 5 to 100 different questions', () => {
        expect(parse({ questionIds: ids(4) }).success).toBe(false);
        expect(parse({ questionIds: ids(5) }).success).toBe(true);
        expect(parse({ questionIds: ids(100) }).success).toBe(true);
        expect(parse({ questionIds: ids(101) }).success).toBe(false);
        expect(parse({ questionIds: ['q1', 'q2', 'q3', 'q4', 'q1'] }).success).toBe(false);
    });
    it('keeps the time between a minute and six hours, and drafts by default', () => {
        expect(parse({ timeLimitSecs: 59 }).success).toBe(false);
        expect(parse({ timeLimitSecs: 6 * 3600 + 1 }).success).toBe(false);
        expect(parse({}).data.status).toBe('draft');
    });
    it('won’t take a subject or anything else it doesn’t know', () => {
        expect(parse({ subject: 'EE' }).success).toBe(false);
    });
    it('needs a title, and stores an empty description as none', () => {
        expect(parse({ title: '  ' }).success).toBe(false);
        expect(parse({ description: '' }).data.description).toBeNull();
    });
});

describe('admin assigned-exam routes', () => {
    let app;
    const exam = {};

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/admin/assigned-exams', adminRoutes);
        verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
        const role = (id) => ({ id, role: id === 'admin' ? 'ADMIN' : 'USER' });
        vi.spyOn(prisma.user, 'upsert').mockImplementation(async ({ where }) => role(where.id));
        vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => role(where.id));
        // Every id asked for is in the bank unless it starts with "gone".
        vi.spyOn(prisma.question, 'findMany').mockImplementation(async ({ where }) => (
            where.id.in.filter((id) => !id.startsWith('gone')).map(bankRow)
        ));
        for (const fn of ['findMany', 'findUnique', 'create', 'update', 'deleteMany']) {
            exam[fn] = vi.spyOn(prisma.assignedExam, fn);
        }
        vi.spyOn(prisma, '$queryRaw').mockResolvedValue([]); // no sittings yet
        exam.create.mockImplementation(async ({ data }) => ({ id: 'x1', ...data }));
        exam.update.mockImplementation(async ({ where, data }) => ({ id: where.id, ...data }));
    });

    afterEach(() => vi.restoreAllMocks());

    it('are for admins only', async () => {
        const url = '/api/admin/assigned-exams';
        expect((await request(app).get(url)).status).toBe(401);
        expect((await request(app).get(url).set(as('learner'))).status).toBe(403);
        expect((await request(app).get(`${url}/x1`).set(as('learner'))).status).toBe(403);
        expect((await request(app).post(url).set(as('learner')).send(body())).status).toBe(403);
        expect((await request(app).put(`${url}/x1`).set(as('learner')).send(body())).status).toBe(403);
        expect((await request(app).patch(`${url}/x1`).set(as('learner')).send({ status: 'published' })).status).toBe(403);
        expect((await request(app).delete(`${url}/x1`).set(as('learner'))).status).toBe(403);
        expect(exam.create).not.toHaveBeenCalled();
        expect(exam.update).not.toHaveBeenCalled();
        expect(exam.deleteMany).not.toHaveBeenCalled();
    });

    it('creates a draft, reading the subject off the questions', async () => {
        const res = await request(app).post('/api/admin/assigned-exams').set(as('admin')).send(body());
        expect(res.status).toBe(201);
        expect(exam.create.mock.calls[0][0].data).toMatchObject({
            title: 'EE prelim', subject: 'EE', status: 'draft', publishedAt: null, createdBy: 'admin', questionIds: ids(6),
        });
        expect(res.body.item.subject).toBe('EE');
    });

    it('a paper across subjects is Mixed', async () => {
        await request(app).post('/api/admin/assigned-exams').set(as('admin')).send(body({ questionIds: [...ids(3), ...ids(3, 'm')] }));
        expect(exam.create.mock.calls[0][0].data.subject).toBe('Mixed');
    });

    it('drops questions deleted from the bank since they were picked, keeping the order', async () => {
        const picked = ['q3', 'gone1', 'q1', 'q2', 'gone2', 'q5', 'q4'];
        await request(app).post('/api/admin/assigned-exams').set(as('admin')).send(body({ questionIds: picked }));
        expect(exam.create.mock.calls[0][0].data.questionIds).toEqual(['q3', 'q1', 'q2', 'q5', 'q4']);
    });

    it('refuses an exam left with fewer than 5 questions still in the bank', async () => {
        const res = await request(app).post('/api/admin/assigned-exams').set(as('admin'))
            .send(body({ questionIds: ['q1', 'q2', 'q3', 'q4', 'gone1'] }));
        expect(res.status).toBe(422);
        expect(res.body.error).toMatch(/Only 4 of those questions/);
        expect(exam.create).not.toHaveBeenCalled();
    });

    it('stamps the date it was first published, and keeps it through later saves', async () => {
        await request(app).post('/api/admin/assigned-exams').set(as('admin')).send(body({ status: 'published' }));
        expect(exam.create.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date);

        const posted = new Date('2026-11-20T00:00:00Z');
        exam.findUnique.mockResolvedValue({ publishedAt: posted });
        await request(app).put('/api/admin/assigned-exams/x1').set(as('admin')).send(body({ status: 'published', title: 'Renamed' }));
        expect(exam.update.mock.calls[0][0].data).toMatchObject({ title: 'Renamed', publishedAt: posted });
    });

    it('publishes and unpublishes without the questions being sent again', async () => {
        exam.findUnique.mockResolvedValue({ id: 'x1', ...body(), description: null, status: 'draft', publishedAt: null });
        const res = await request(app).patch('/api/admin/assigned-exams/x1').set(as('admin')).send({ status: 'published' });
        expect(res.status).toBe(200);
        expect(exam.update.mock.calls[0][0].data).toMatchObject({ status: 'published', questionIds: ids(6) });
        expect(exam.update.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date);

        exam.findUnique.mockResolvedValue({ id: 'x1', ...body(), description: null, status: 'published', publishedAt: new Date() });
        await request(app).patch('/api/admin/assigned-exams/x1').set(as('admin')).send({ status: 'draft' });
        expect(exam.update.mock.calls[1][0].data).toMatchObject({ status: 'draft', publishedAt: null });
    });

    it('shows the admin the questions still in the bank and how many dropped out', async () => {
        exam.findUnique.mockResolvedValue({ id: 'x1', ...body({ questionIds: ['q1', 'gone1', 'q2', 'q3', 'q4', 'q5'] }) });
        const res = await request(app).get('/api/admin/assigned-exams/x1').set(as('admin'));
        expect(res.status).toBe(200);
        expect(res.body.item.questions.map((q) => q.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5']);
        expect(res.body.item.missing).toBe(1);
    });

    it('a missing exam is a plain 404', async () => {
        exam.findUnique.mockResolvedValue(null);
        exam.deleteMany.mockResolvedValue({ count: 0 });
        expect((await request(app).get('/api/admin/assigned-exams/nope').set(as('admin'))).status).toBe(404);
        expect((await request(app).put('/api/admin/assigned-exams/nope').set(as('admin')).send(body())).status).toBe(404);
        expect((await request(app).patch('/api/admin/assigned-exams/nope').set(as('admin')).send({ status: 'draft' })).status).toBe(404);
        expect((await request(app).delete('/api/admin/assigned-exams/nope').set(as('admin'))).status).toBe(404);
    });

    it('lists every exam with its item count', async () => {
        exam.findMany.mockResolvedValue([{ id: 'x1', title: 'A', questionIds: ids(7) }]);
        const res = await request(app).get('/api/admin/assigned-exams').set(as('admin'));
        expect(res.body.items).toEqual([{ id: 'x1', title: 'A', questionIds: ids(7), itemCount: 7, availability: 'open', takers: 0, average: null }]);
    });
});
