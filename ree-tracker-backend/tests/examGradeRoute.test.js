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
    vi.spyOn(prisma.battleParticipant, 'findMany').mockResolvedValue([]);
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

describe('POST /api/exams/grade — Gauntlet ladder', () => {
    const gauntletService = require('../src/services/gauntletService');
    const RUN = { level: 2, runId: 'run-abcdef12', knownLevel: 2, startedAt: '2026-10-09T08:00:00Z', finishedAt: '2026-10-09T09:00:00Z' };

    it('records the run under its id and returns the server’s ladder', async () => {
        recordAttempts.mockResolvedValue({ written: 1 });
        const apply = vi.spyOn(gauntletService, 'applyGauntletRun').mockResolvedValue({ outcome: 'advanced', level: 3, lockUntil: null, boardClears: [] });
        const res = await request(makeApp()).post('/api/exams/grade').set(as(UID)).send({ ...BODY, gauntlet: RUN });
        expect(res.status).toBe(200);
        expect(recordAttempts).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'run-abcdef12', mode: 'GAUNTLET' }));
        expect(apply).toHaveBeenCalledWith(expect.objectContaining({ userId: UID, runId: 'run-abcdef12', level: 2, knownLevel: 2 }));
        expect(res.body.gauntlet).toMatchObject({ outcome: 'advanced', level: 3 });
    });

    it('a body without the block is graded exactly as before (old queued entries)', async () => {
        recordAttempts.mockResolvedValue({ written: 1 });
        const apply = vi.spyOn(gauntletService, 'applyGauntletRun');
        const res = await request(makeApp()).post('/api/exams/grade').set(as(UID)).send(BODY);
        expect(res.status).toBe(200);
        expect(res.body.gauntlet).toBeNull();
        expect(apply).not.toHaveBeenCalled();
        expect(recordAttempts.mock.calls[0][0].sessionId).toBeUndefined();
    });

    it('a failed ladder write is retryable (503), the answers already saved', async () => {
        recordAttempts.mockResolvedValue({ written: 1 });
        vi.spyOn(gauntletService, 'applyGauntletRun').mockRejectedValue(new Error('deadlock'));
        const res = await request(makeApp()).post('/api/exams/grade').set(as(UID)).send({ ...BODY, gauntlet: RUN });
        expect(res.status).toBe(503);
    });

    it('leaving a run locks the ladder', async () => {
        const forfeit = vi.spyOn(gauntletService, 'forfeitGauntletRun').mockResolvedValue({ outcome: 'forfeited', level: 2, lockUntil: 'x', boardClears: [] });
        const res = await request(makeApp()).post('/api/exams/gauntlet/forfeit').set(as(UID)).send({ level: 2, runId: 'run-abcdef12', knownLevel: 2 });
        expect(res.status).toBe(200);
        expect(forfeit).toHaveBeenCalledWith(expect.objectContaining({ userId: UID, level: 2, knownLevel: 2 }));
    });

    it('the hard-deleting history route is gone', async () => {
        const del = vi.spyOn(prisma.examSession, 'delete');
        const res = await request(makeApp()).delete('/api/exams/history/sess-1').set(as(UID));
        expect(res.status).toBe(404);
        expect(del).not.toHaveBeenCalled();
    });
});

describe('POST /api/exams/grade — questions in a battle the learner is still in', () => {
    const openBattle = (questions, over = {}) => ({
        battle: { id: 'LIVE01', questions, startedAt: new Date(), timeLimitSecs: 600, createdAt: new Date(), ...over },
    });

    it('withholds the key and does not record the attempt while the battle is open', async () => {
        prisma.question.findMany.mockResolvedValue([
            { id: 'q1', answer: 'A', fixedExplanation: 'why', difficulty: 2 },
            { id: 'q2', answer: 'C', fixedExplanation: null, difficulty: 2 },
        ]);
        prisma.battleParticipant.findMany.mockResolvedValue([openBattle([{ id: 'q1' }])]);
        recordAttempts.mockResolvedValue({ written: 1 });
        const body = { mode: 'GAUNTLET', answers: [
            { questionId: 'q1', userAnswer: 'A', confidenceLevel: 'HIGH', timeSpentMs: 4000, clientAttemptId: 'run-1:q1' },
            { questionId: 'q2', userAnswer: 'C', confidenceLevel: 'HIGH', timeSpentMs: 4000, clientAttemptId: 'run-1:q2' },
        ] };

        const res = await request(makeApp()).post('/api/exams/grade').set(as(UID)).send(body);

        expect(res.status).toBe(200);
        const byQ = Object.fromEntries(res.body.results.map((r) => [r.questionId, r]));
        expect(byQ.q1).toEqual({ questionId: 'q1', withheld: true, isCorrect: null, correctAnswer: null, explanation: null });
        expect(byQ.q2).toMatchObject({ isCorrect: true, correctAnswer: 'C' });
        expect(recordAttempts.mock.calls[0][0].attempts.map((a) => a.questionId)).toEqual(['q2']);
        expect(prisma.battleParticipant.findMany.mock.calls[0][0].where).toEqual({ userId: UID, battle: { status: { not: 'COMPLETED' } } });
    });

    it('grades normally once the battle has closed', async () => {
        const longAgo = new Date(Date.now() - 3600_000);
        prisma.battleParticipant.findMany.mockResolvedValue([openBattle([{ id: 'q1' }], { startedAt: longAgo, createdAt: longAgo, timeLimitSecs: 60 })]);
        recordAttempts.mockResolvedValue({ written: 1 });

        const res = await request(makeApp()).post('/api/exams/grade').set(as(UID)).send(BODY);

        expect(res.body.results[0]).toMatchObject({ questionId: 'q1', isCorrect: true, correctAnswer: 'A' });
        expect(recordAttempts).toHaveBeenCalledTimes(1);
    });

    it('writes nothing when every answer is withheld', async () => {
        prisma.battleParticipant.findMany.mockResolvedValue([openBattle([{ id: 'q1' }])]);

        const res = await request(makeApp()).post('/api/exams/grade').set(as(UID)).send(BODY);

        expect(res.status).toBe(200);
        expect(res.body.results[0].withheld).toBe(true);
        expect(recordAttempts).not.toHaveBeenCalled();
    });
});
