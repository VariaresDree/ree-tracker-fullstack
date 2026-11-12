import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Learners' reports reach the admin (Admin › Question bank › Reports). Before,
// a report showed nowhere until three learners agreed; 65 sat unseen.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { invalidateRole } = require('../src/middlewares/roleMiddleware');
const { openReports, resolveReports } = require('../src/services/questionReports');
const questionRoutes = require('../src/routes/questionRoutes');

const ADMIN = 'uid-admin';
const USER = 'uid-user';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const app = () => { const a = express(); a.use(express.json()); a.use('/api/questions', questionRoutes); return a; };
const at = (d) => new Date(`2026-11-${d}T00:00:00Z`);

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockImplementation(async ({ where }) => ({ id: where.id }));
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => ({ role: where.id === ADMIN ? 'ADMIN' : 'USER' }));
    invalidateRole(ADMIN);
    invalidateRole(USER);
});
afterEach(() => vi.restoreAllMocks());

describe('openReports', () => {
    const groups = [
        { questionId: 'one', _count: { _all: 1 }, _min: { createdAt: at(10) }, _max: { createdAt: at(10) } },
        { questionId: 'two', _count: { _all: 2 }, _min: { createdAt: at(1) }, _max: { createdAt: at(5) } },
        { questionId: 'new', _count: { _all: 1 }, _min: { createdAt: at(11) }, _max: { createdAt: at(11) } },
    ];
    const q = (id, subject = 'EE') => ({ id, subject, subtopic: 'T', text: id, options: ['a', 'b'], answer: 'a', isFlagged: false });

    it('only open reports, most-reported first, then the latest, with why', async () => {
        const group = vi.spyOn(prisma.questionFlag, 'groupBy').mockResolvedValue(groups);
        vi.spyOn(prisma.question, 'findMany').mockResolvedValue([q('one'), q('two'), q('new')]);
        vi.spyOn(prisma.questionFlag, 'findMany').mockResolvedValue([
            { questionId: 'two', reason: 'The answer key looks wrong' },
            { questionId: 'two', reason: 'The answer key looks wrong' },
            { questionId: 'one', reason: null },
        ]);
        const out = await openReports();
        expect(group.mock.calls[0][0].where).toEqual({ resolvedAt: null });
        expect(out.total).toBe(3);
        expect(out.items.map((i) => i.question.id)).toEqual(['two', 'new', 'one']);
        expect(out.items[0]).toMatchObject({ reports: 2, reasons: { 'The answer key looks wrong': 2 }, firstAt: at(1), lastAt: at(5) });
        expect(out.items[2].reasons).toEqual({ 'No reason given': 1 });
    });

    it('one subject, and nothing at all', async () => {
        vi.spyOn(prisma.questionFlag, 'groupBy').mockResolvedValueOnce(groups).mockResolvedValueOnce([]);
        const find = vi.spyOn(prisma.question, 'findMany')
            .mockResolvedValueOnce([{ id: 'two' }])
            .mockResolvedValueOnce([q('two')]);
        vi.spyOn(prisma.questionFlag, 'findMany').mockResolvedValue([]);
        const out = await openReports({ subject: 'EE' });
        expect(find.mock.calls[0][0].where.id.in).toEqual(['one', 'two', 'new']);
        expect(out.items.map((i) => i.question.id)).toEqual(['two']);
        expect(out.total).toBe(1);
        expect(await openReports()).toEqual({ items: [], total: 0 });
    });
});

describe('resolveReports', () => {
    beforeEach(() => {
        vi.spyOn(prisma.question, 'findUnique').mockResolvedValue({ id: 'q1' });
        vi.spyOn(prisma.questionFlag, 'updateMany').mockImplementation((args) => ({ op: 'flags', args }));
        vi.spyOn(prisma.question, 'update').mockImplementation((args) => ({ op: 'question', args }));
        vi.spyOn(prisma, '$transaction').mockImplementation(async () => [{ count: 2 }, {}]);
    });

    it.each([['fixed', false], ['dismissed', false], ['removed', true]])('%s closes the open reports, kept on record; in the bank: %s', async (resolution, flagged) => {
        expect(await resolveReports('q1', resolution, ADMIN)).toEqual({ resolved: 2 });
        const flags = prisma.questionFlag.updateMany.mock.calls[0][0];
        expect(flags.where).toEqual({ questionId: 'q1', resolvedAt: null });
        // A new answer is new to the learner, even on a report they had seen.
        expect(flags.data).toMatchObject({ resolution, resolvedBy: ADMIN, resolvedAt: expect.any(Date), seenAt: null });
        expect(prisma.question.update.mock.calls[0][0]).toEqual({ where: { id: 'q1' }, data: { isFlagged: flagged } });
    });

    it('keeps the note for the learners, and no note is null', async () => {
        await resolveReports('q1', 'fixed', ADMIN, 'The key is B now.');
        expect(prisma.questionFlag.updateMany.mock.calls[0][0].data.resolutionNote).toBe('The key is B now.');
        await resolveReports('q1', 'dismissed', ADMIN);
        expect(prisma.questionFlag.updateMany.mock.calls[1][0].data.resolutionNote).toBeNull();
    });

    it('an unknown question is null', async () => {
        prisma.question.findUnique.mockResolvedValue(null);
        expect(await resolveReports('gone', 'fixed', ADMIN)).toBeNull();
    });
});

describe('routes', () => {
    it.each([
        ['get', '/api/questions/reports', undefined],
        ['get', '/api/questions/reports/count', undefined],
        ['post', '/api/questions/q1/reports/resolve', { resolution: 'dismissed' }],
        // These two sent answer keys to any signed-in learner.
        ['get', '/api/questions/flagged', undefined],
        ['get', '/api/questions/quarantine', undefined],
    ])('%s %s is for admins only', async (method, url, body) => {
        const find = vi.spyOn(prisma.question, 'findMany');
        const res = await request(app())[method](url).set(as(USER)).send(body);
        expect(res.status).toBe(403);
        expect(find).not.toHaveBeenCalled();
    });

    it('counts the questions with an open report', async () => {
        vi.spyOn(prisma.questionFlag, 'groupBy').mockResolvedValue([{ questionId: 'a' }, { questionId: 'b' }]);
        const res = await request(app()).get('/api/questions/reports/count').set(as(ADMIN));
        expect(res.body).toEqual({ open: 2 });
    });

    it('a note over 300 characters is refused', async () => {
        const res = await request(app()).post('/api/questions/q1/reports/resolve').set(as(ADMIN)).send({ resolution: 'fixed', note: 'x'.repeat(301) });
        expect(res.status).toBe(400);
    });

    it('refuses a resolution it doesn’t know, and 404s a missing question', async () => {
        expect((await request(app()).post('/api/questions/q1/reports/resolve').set(as(ADMIN)).send({ resolution: 'ignore' })).status).toBe(400);
        vi.spyOn(prisma.question, 'findUnique').mockResolvedValue(null);
        expect((await request(app()).post('/api/questions/q1/reports/resolve').set(as(ADMIN)).send({ resolution: 'fixed' })).status).toBe(404);
    });
});

describe('a learner reports again after an admin closed it', () => {
    it('reopens their report, and only open reports count toward taking it out', async () => {
        vi.spyOn(prisma.question, 'findUnique').mockResolvedValue({ id: 'q1' });
        const upsert = vi.spyOn(prisma.questionFlag, 'upsert').mockResolvedValue({});
        const count = vi.spyOn(prisma.questionFlag, 'count').mockResolvedValue(1);
        const update = vi.spyOn(prisma.question, 'update');
        const res = await request(app()).patch('/api/questions/q1/flag').set(as(USER)).send({ reason: 'It doesn’t display properly' });
        expect(res.body).toMatchObject({ success: true, flagCount: 1, quarantined: false });
        expect(upsert.mock.calls[0][0].update).toEqual({ reason: 'It doesn’t display properly', resolvedAt: null, resolution: null, resolvedBy: null, resolutionNote: null, seenAt: null });
        expect(count).toHaveBeenCalledWith({ where: { questionId: 'q1', resolvedAt: null } });
        expect(update).not.toHaveBeenCalled();
    });
});
