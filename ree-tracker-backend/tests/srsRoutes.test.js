import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// The review queue. Cards are written by the telemetry transaction
// (engine/srs); these routes only READ them. POST /review — which trusted a
// client-computed interval and ease factor — is gone; nothing called it.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const srsRoutes = require('../src/routes/srsRoutes');
const { foldSummaryRows } = srsRoutes;

const UID = 'uid-srs';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/srs', srsRoutes);
    app.use((req, res) => res.status(404).json({ error: 'not found' }));
    return app;
}

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
});

afterEach(() => { vi.restoreAllMocks(); });

describe('GET /api/srs/due', () => {
    it('serves due questions WITH their answer, owner-scoped, unflagged, oldest-due first', async () => {
        const findMany = vi.spyOn(prisma.sRSCard, 'findMany').mockResolvedValue([
            {
                questionId: 'q1', nextReviewDate: new Date('2026-10-01T16:00:00Z'), interval: 1, repetitions: 0,
                question: { id: 'q1', subject: 'EE', subtopic: 'Machines', text: 'T', options: ['A', 'B'], answer: 'A', fixedExplanation: 'because' },
            },
        ]);

        const res = await request(makeApp()).get('/api/srs/due?limit=10&subject=EE').set(as(UID));

        expect(res.status).toBe(200);
        // Practice sessions grade client-side — a question without its answer
        // is marked wrong no matter what was picked (the Smart Drill bug).
        expect(res.body.items[0]).toMatchObject({ id: 'q1', answer: 'A', fixedExplanation: 'because' });
        expect(res.body.items[0].srs).toMatchObject({ interval: 1, repetitions: 0 });

        const args = findMany.mock.calls[0][0];
        expect(args.where.userId).toBe(UID);
        expect(args.where.question.isFlagged).toBe(false);
        expect(args.where.nextReviewDate.lte).toBeInstanceOf(Date);
        expect(args.orderBy).toEqual({ nextReviewDate: 'asc' });
        expect(args.take).toBe(10);
    });

    it('caps the page size', async () => {
        const findMany = vi.spyOn(prisma.sRSCard, 'findMany').mockResolvedValue([]);
        await request(makeApp()).get('/api/srs/due?limit=5000').set(as(UID));
        expect(findMany.mock.calls[0][0].take).toBe(100);
    });
});

describe('GET /api/srs/summary', () => {
    it('folds subject spellings and reports due, overdue, total and the next due time', async () => {
        vi.spyOn(prisma, '$queryRaw').mockResolvedValue([
            { subject: 'Math', due: 2, overdue: 1, total: 5, nextDueAt: new Date('2026-10-05T16:00:00Z') },
            { subject: 'Mathematics', due: 1, overdue: 0, total: 2, nextDueAt: new Date('2026-10-03T16:00:00Z') },
            { subject: 'EE', due: 4, overdue: 4, total: 9, nextDueAt: null },
        ]);

        const res = await request(makeApp()).get('/api/srs/summary').set(as(UID));

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            due: 7, overdue: 5, total: 16,
            bySubject: { Mathematics: 3, EE: 4 },
            nextDueAt: '2026-10-03T16:00:00.000Z',
        });
    });

    it('the client-trusting POST /review is gone', async () => {
        const res = await request(makeApp()).post('/api/srs/review').set(as(UID)).send({ questionId: 'q1', interval: 365 });
        expect(res.status).toBe(404);
    });
});

describe('foldSummaryRows', () => {
    it('is empty-safe', () => {
        expect(foldSummaryRows([])).toEqual({ due: 0, overdue: 0, total: 0, bySubject: {}, nextDueAt: null });
    });
});
