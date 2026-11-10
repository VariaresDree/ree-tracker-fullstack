import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// The bank-wide numbers (vault counts, the pack manifest, the bank's topic
// count) are kept until a question is written. Drawing a session's questions
// is not a write, and the topic count is read from the bank once, not on
// every learner's readiness.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const questionBankCache = require('../src/services/questionBankCache');
const { invalidateRole } = require('../src/middlewares/roleMiddleware');
const questionRoutes = require('../src/routes/questionRoutes');
const readinessRoutes = require('../src/routes/readinessRoutes');

const as = (uid) => ({ Authorization: `Bearer ${uid}` });
// The middleware clears the cache once the response has finished.
const settled = () => new Promise((resolve) => setImmediate(resolve));

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/questions', questionRoutes);
    app.use('/api/readiness', readinessRoutes);
    return app;
}

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: 'uid-admin' });
    invalidateRole('uid-admin');
    questionBankCache.invalidateAll();
});
afterEach(() => vi.restoreAllMocks());

describe('the question bank cache', () => {
    it('survives a session draw, and is dropped by a write', async () => {
        vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ role: 'ADMIN' });
        vi.spyOn(prisma, '$queryRawUnsafe').mockResolvedValue([]);
        vi.spyOn(prisma.battleParticipant, 'findMany').mockResolvedValue([]);
        vi.spyOn(prisma.question, 'findMany').mockResolvedValue([]);
        questionBankCache.set('pack-manifest', { kept: true });

        const draw = await request(makeApp()).post('/api/questions/review').set(as('uid-admin')).send({ subject: 'EE', limit: 5 });
        await settled();
        expect(draw.status).toBe(200);
        expect(questionBankCache.get('pack-manifest')).toEqual({ kept: true });

        const write = await request(makeApp()).post('/api/questions/option-audit/fix-keys').set(as('uid-admin')).send({ ids: ['gone'] });
        await settled();
        expect(write.status).toBe(200);
        expect(questionBankCache.get('pack-manifest')).toBeNull();
    });

    it("holds the bank's topic count, so readiness reads it from the bank once", async () => {
        vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ thetaRating: 0, standardError: 1 });
        const raw = vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ n: 7 }]);
        // Stop each request right after the two topic counts: nothing is cached
        // per learner, so the second request reaches them again.
        vi.spyOn(prisma.questionAttempt, 'count').mockRejectedValue(new Error('stop here'));

        await request(makeApp()).get('/api/readiness').set(as('uid-admin'));
        expect(raw).toHaveBeenCalledTimes(2);
        expect(questionBankCache.get('topic-count')).toEqual({ n: 7 });

        await request(makeApp()).get('/api/readiness').set(as('uid-admin'));
        // Only the learner's own count ran again.
        expect(raw).toHaveBeenCalledTimes(3);
    });
});
