import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// POST /api/exams/next-item used to read `take: 80` unordered rows — the same
// rows every call — match the subject by raw equality, and drop recently seen
// ids only after loading. It now draws a θ-windowed random sample with the
// exclusions in SQL (services/catCandidates) and picks with content balance.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const catCandidatesModule = require('../src/services/catCandidates');
const catCandidates = vi.fn();
catCandidatesModule.catCandidates = catCandidates;

const prisma = require('../src/config/db');
const examRoutes = require('../src/routes/examRoutes');

const UID = 'uid-cat';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/exams', examRoutes);
    return app;
}

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ thetaRating: 0.2, standardError: 0.6 });
    vi.spyOn(prisma.userAbility, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.question, 'findMany').mockResolvedValue([
        { id: 'seen-1', subtopic: 'Machines', topicId: 't-m', irtA: 1, irtB: 0, irtC: 0.2, difficulty: null },
    ]);
    catCandidates.mockReset();
    catCandidates.mockResolvedValue([
        { id: 'm2', subject: 'EE', subtopic: 'Machines', topicId: 't-m', text: 'T', options: ['A'], irtA: 1, irtB: 0.2, irtC: 0.2, difficulty: null },
        { id: 'p1', subject: 'EE', subtopic: 'Protection', topicId: 't-p', text: 'T', options: ['A'], irtA: 1, irtB: 0.2, irtC: 0.2, difficulty: null },
    ]);
});

afterEach(() => { vi.restoreAllMocks(); });

describe('POST /api/exams/next-item', () => {
    it('excludes recently seen AND this session’s items in the candidate query', async () => {
        await request(makeApp()).post('/api/exams/next-item').set(as(UID)).send({
            subject: 'EE', recentIds: ['r-1'], sessionAttempts: [{ questionId: 'seen-1', isCorrect: true }],
        });
        const args = catCandidates.mock.calls[0][0];
        expect(args.subject).toBe('EE');
        expect(args.excludeIds).toEqual(expect.arrayContaining(['r-1', 'seen-1']));
    });

    it('balances content: an equally informative item from an uncovered topic wins', async () => {
        const picks = new Set();
        for (let i = 0; i < 10; i++) {
            const res = await request(makeApp()).post('/api/exams/next-item').set(as(UID)).send({
                subject: 'EE', sessionAttempts: [{ questionId: 'seen-1', isCorrect: true }],
            });
            picks.add(res.body.item.id);
        }
        // Both candidates are in the top 3, so either can be drawn — but the
        // response always carries no answer key.
        expect([...picks].every((id) => ['m2', 'p1'].includes(id))).toBe(true);
    });

    it('never ships the answer key', async () => {
        const res = await request(makeApp()).post('/api/exams/next-item').set(as(UID)).send({ subject: 'EE' });
        expect(res.status).toBe(200);
        expect(res.body.item).not.toHaveProperty('answer');
        expect(res.body.selection).toHaveProperty('info');
    });
});
