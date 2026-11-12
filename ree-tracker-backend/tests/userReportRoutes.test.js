import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// A learner's own reports and what was done about each (Account › Your reports).

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const routes = require('../src/routes/userReportRoutes');

const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const app = () => { const a = express(); a.use(express.json()); a.use('/api/user', routes); return a; };

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockImplementation(async ({ where }) => ({ id: where.id, role: 'USER' }));
});
afterEach(() => vi.restoreAllMocks());

describe('GET /api/user/reports', () => {
    it('needs a sign-in', async () => {
        expect((await request(app()).get('/api/user/reports')).status).toBe(401);
    });

    it('only this learner’s, newest first, with the outcome and note, and no key', async () => {
        const find = vi.spyOn(prisma.questionFlag, 'findMany').mockResolvedValue([{
            questionId: 'q1', reason: 'The answer key looks wrong', createdAt: '2026-11-01T00:00:00.000Z',
            resolvedAt: '2026-11-12T00:00:00.000Z', resolution: 'fixed', resolutionNote: 'Key is B now.',
            question: { subject: 'EE', subtopic: 'Circuits', text: 'x'.repeat(500) },
        }]);
        const res = await request(app()).get('/api/user/reports').set(as('me'));
        expect(res.status).toBe(200);
        const q = find.mock.calls[0][0];
        expect(q.where).toEqual({ userId: 'me' });
        expect(q.orderBy).toEqual({ createdAt: 'desc' });
        expect(q.select.resolvedBy).toBeUndefined();
        expect(q.select.question.select).toEqual({ subject: true, subtopic: true, text: true });
        expect(res.body.items[0]).toMatchObject({ questionId: 'q1', resolution: 'fixed', resolutionNote: 'Key is B now.', subject: 'EE', topic: 'Circuits' });
        expect(res.body.items[0].stem).toHaveLength(200);
        expect(res.body.items[0]).not.toHaveProperty('question');
    });
});

describe('POST /api/user/reports/seen', () => {
    it('marks only this learner’s answered, unseen reports, and refreshes Today', async () => {
        const dashboardCache = require('../src/services/dashboardCache');
        const invalidate = vi.spyOn(dashboardCache, 'invalidate');
        const update = vi.spyOn(prisma.questionFlag, 'updateMany').mockResolvedValue({ count: 3 });
        const res = await request(app()).post('/api/user/reports/seen').set(as('me')).send({});
        expect(res.body).toEqual({ success: true, seen: 3 });
        expect(update.mock.calls[0][0]).toEqual({ where: { userId: 'me', resolvedAt: { not: null }, seenAt: null }, data: { seenAt: expect.any(Date) } });
        expect(invalidate).toHaveBeenCalledWith('me');
    });

    it('needs a sign-in', async () => {
        expect((await request(app()).post('/api/user/reports/seen')).status).toBe(401);
    });
});
