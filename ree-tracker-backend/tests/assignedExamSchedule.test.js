import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Locking an assigned exam, and the dates it opens and closes: learners still
// see it, but can't start it (alone or as a battle) unless it is open.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const learnerRoutes = require('../src/routes/assignedExamRoutes');
const adminRoutes = require('../src/routes/adminAssignedExamRoutes');
const battleRoutes = require('../src/routes/battleRoutes');
const { availabilityOf } = require('../src/services/assignedExams');
const { assignedExamSchema } = require('../src/schemas/assignedExamSchemas');

const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const HOUR = 3600_000;
const ago = (h) => new Date(Date.now() - h * HOUR);
const ids = ['q1', 'q2', 'q3', 'q4', 'q5'];
const exam = (over = {}) => ({ id: 'x1', title: 'EE prelim', subject: 'EE', questionIds: ids, timeLimitSecs: 1800, opensAt: null, closesAt: null, locked: false, ...over });

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/assigned-exams', learnerRoutes);
    app.use('/api/admin/assigned-exams', adminRoutes);
    app.use('/api/battles', battleRoutes);
    return app;
}

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    const role = (id) => ({ id, role: id === 'admin' ? 'ADMIN' : 'USER' });
    vi.spyOn(prisma.user, 'upsert').mockImplementation(async ({ where }) => role(where.id));
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => role(where.id));
    vi.spyOn(prisma.battleParticipant, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.question, 'findMany').mockImplementation(async ({ where }) => where.id.in.map((id) => ({ id, subject: 'EE' })));
    vi.spyOn(prisma.battle, 'create').mockImplementation(async ({ data }) => data);
});

afterEach(() => vi.restoreAllMocks());

describe('availabilityOf', () => {
    const now = new Date('2026-11-25T00:00:00Z');
    it('is open with no dates and no lock', () => {
        expect(availabilityOf(exam(), now)).toBe('open');
    });
    it('is upcoming before it opens, open from then, and closed from when it closes', () => {
        const e = exam({ opensAt: new Date('2026-11-26T00:00:00Z'), closesAt: new Date('2026-11-28T00:00:00Z') });
        expect(availabilityOf(e, now)).toBe('upcoming');
        expect(availabilityOf(e, new Date('2026-11-26T00:00:00Z'))).toBe('open');
        expect(availabilityOf(e, new Date('2026-11-28T00:00:00Z'))).toBe('closed');
    });
    it('the lock wins over any dates', () => {
        expect(availabilityOf(exam({ locked: true, opensAt: ago(5) }), now)).toBe('locked');
    });
});

describe('the dates the admin sends', () => {
    const base = { title: 'T', questionIds: ids, timeLimitSecs: 600 };
    it('are instants with their offset, or none', () => {
        const ok = assignedExamSchema.safeParse({ ...base, opensAt: '2026-11-28T08:00:00+08:00', closesAt: null });
        expect(ok.success).toBe(true);
        expect(ok.data.opensAt.toISOString()).toBe('2026-11-28T00:00:00.000Z');
        expect(ok.data.closesAt).toBeNull();
        expect(assignedExamSchema.safeParse({ ...base, opensAt: 'next friday' }).success).toBe(false);
    });
    it('must close after they open', () => {
        expect(assignedExamSchema.safeParse({ ...base, opensAt: '2026-11-28T08:00:00Z', closesAt: '2026-11-28T08:00:00Z' }).success).toBe(false);
    });
});

describe('a learner starting it', () => {
    const start = () => request(makeApp()).get('/api/assigned-exams/x1/questions').set(as('ana'));
    it.each([
        ['locked', { locked: true }, 'locked this exam'],
        ['not open yet', { opensAt: new Date(Date.now() + HOUR) }, 'isn’t open yet'],
        ['closed', { closesAt: ago(1) }, 'has closed'],
    ])('is refused while %s', async (_, over, says) => {
        vi.spyOn(prisma.assignedExam, 'findFirst').mockResolvedValue(exam(over));
        const res = await start();
        expect(res.status).toBe(409);
        expect(res.body.error).toContain(says);
        expect(prisma.question.findMany).not.toHaveBeenCalled();
    });

    it('goes ahead once it has opened, before it closes', async () => {
        vi.spyOn(prisma.assignedExam, 'findFirst').mockResolvedValue(exam({ opensAt: ago(1), closesAt: new Date(Date.now() + HOUR) }));
        expect((await start()).status).toBe(200);
    });

    it('sees it in the list either way, with its state', async () => {
        vi.spyOn(prisma.assignedExam, 'findMany').mockResolvedValue([exam({ locked: true }), exam({ id: 'x2', closesAt: ago(1) })]);
        vi.spyOn(prisma, '$queryRaw').mockResolvedValue([]);
        const res = await request(makeApp()).get('/api/assigned-exams').set(as('ana'));
        expect(res.body.items.map((e) => [e.id, e.availability])).toEqual([['x1', 'locked'], ['x2', 'closed']]);
    });

    it('can’t host a battle on it either, and is told why', async () => {
        vi.spyOn(prisma.assignedExam, 'findFirst').mockResolvedValue(exam({ locked: true }));
        const res = await request(makeApp()).post('/api/battles').set(as('ana'))
            .send({ battleId: 'ABC123', timeLimitSecs: 1800, config: { mode: 'assigned', assignedExamId: 'x1' } });
        expect(res.status).toBe(409);
        expect(res.body.error).toContain('locked this exam');
        expect(prisma.battle.create).not.toHaveBeenCalled();
    });
});

describe('the admin', () => {
    beforeEach(() => {
        vi.spyOn(prisma.assignedExam, 'findUnique').mockResolvedValue({ ...exam(), description: null, status: 'published', publishedAt: ago(24) });
        vi.spyOn(prisma.assignedExam, 'update').mockImplementation(async ({ data }) => ({ id: 'x1', ...data }));
    });

    it('locks and unlocks without touching anything else', async () => {
        const res = await request(makeApp()).patch('/api/admin/assigned-exams/x1').set(as('admin')).send({ locked: true });
        expect(res.status).toBe(200);
        expect(prisma.assignedExam.update.mock.calls[0][0].data).toEqual({ locked: true });
    });

    it('saves the dates with the exam', async () => {
        await request(makeApp()).put('/api/admin/assigned-exams/x1').set(as('admin'))
            .send({ title: 'T', questionIds: ids, timeLimitSecs: 600, status: 'published', opensAt: '2026-11-28T08:00:00+08:00', closesAt: '2026-11-30T17:00:00+08:00' });
        expect(prisma.assignedExam.update.mock.calls[0][0].data).toMatchObject({
            opensAt: new Date('2026-11-28T00:00:00Z'), closesAt: new Date('2026-11-30T09:00:00Z'),
        });
    });

    it('a learner can’t lock one', async () => {
        expect((await request(makeApp()).patch('/api/admin/assigned-exams/x1').set(as('ana')).send({ locked: true })).status).toBe(403);
    });

    it('an empty change is refused', async () => {
        expect((await request(makeApp()).patch('/api/admin/assigned-exams/x1').set(as('admin')).send({})).status).toBe(400);
    });
});
