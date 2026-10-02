import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// POST /api/exams/grade used to catch a recordAttempts failure, log it, and
// answer 200 anyway. The Gauntlet outbox treats a 200 as "delivered" and drops
// the entry, and the idempotency layer stores that 200 and replays it for 24h —
// so a transient database error permanently lost every attempt in the run while
// the learner saw a normal results screen. A failed write must surface as a
// retryable status so the outbox keeps the batch.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

// examRoutes destructures recordAttempts at load time, so the export is
// replaced BEFORE the router is required (same reasoning as the getAuth patch).
const telemetryService = require('../src/services/telemetryService');
const recordAttempts = vi.fn();
telemetryService.recordAttempts = recordAttempts;

const prisma = require('../src/config/db');
const examRoutes = require('../src/routes/examRoutes');

const UID = 'uid-grade';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/exams', examRoutes);
    return app;
}

const BODY = {
    answers: [{ questionId: 'q1', userAnswer: 'A', confidenceLevel: 'HIGH', timeSpentMs: 4000, clientAttemptId: 'run-1:q1' }],
    mode: 'GAUNTLET',
};

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
    vi.spyOn(prisma.question, 'findMany').mockResolvedValue([
        { id: 'q1', answer: 'A', fixedExplanation: null, difficulty: 2 },
    ]);
    recordAttempts.mockReset();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('POST /api/exams/grade', () => {
    it('grades and returns 200 when the attempts are persisted', async () => {
        recordAttempts.mockResolvedValue({ written: 1 });

        const res = await request(makeApp()).post('/api/exams/grade').set(as(UID)).send(BODY);

        expect(res.status).toBe(200);
        expect(res.body.results[0]).toMatchObject({ questionId: 'q1', isCorrect: true });
        expect(recordAttempts).toHaveBeenCalledTimes(1);
    });

    it('answers 503 — not 200 — when persisting the attempts fails, so the outbox retries', async () => {
        recordAttempts.mockRejectedValue(new Error('connection terminated'));

        const res = await request(makeApp()).post('/api/exams/grade').set(as(UID)).send(BODY);

        expect(res.status).toBe(503);
        expect(res.body.error).toMatch(/not saved/i);
    });
});
