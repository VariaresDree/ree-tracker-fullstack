import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock-exam records, server-authoritative. Sittings used to be finalised only
// in a device-local ledger; the server's ExamSession stayed 'IN_PROGRESS'
// forever, with no per-subject breakdown.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const examRoutes = require('../src/routes/examRoutes');
const analyticsDeepRoutes = require('../src/routes/analyticsDeepRoutes');
const { buildMockHistory, sanitizeMeta } = require('../src/services/examHistory');

const UID = 'uid-hist';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/exams', examRoutes);
    app.use('/api/analytics/deep', analyticsDeepRoutes);
    return app;
}

let session;
beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
    session = { id: 'sess-1', userId: UID, config: { count: 100 } };
    vi.spyOn(prisma.examSession, 'findFirst').mockImplementation(async ({ where }) =>
        (where.id === session.id && where.userId === session.userId ? session : null));
    vi.spyOn(prisma.examSession, 'updateMany').mockResolvedValue({ count: 1 });
    vi.spyOn(prisma, '$queryRaw').mockResolvedValue([
        { sessionId: 'sess-1', subject: 'Mathematics', total: 25, correct: 10 },  // 40%
        { sessionId: 'sess-1', subject: 'ESAS', total: 30, correct: 24 },         // 80%
        { sessionId: 'sess-1', subject: 'EE', total: 45, correct: 36 },           // 80%
    ]);
});

afterEach(() => { vi.restoreAllMocks(); });

describe('POST /api/exams/sessions/:id/finalize', () => {
    it('grades the session from its own attempts: weighted GWA, subject floor, stored', async () => {
        const res = await request(makeApp()).post('/api/exams/sessions/sess-1/finalize').set(as(UID))
            .send({ kind: 'blended', isPrcStandard: true });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ verdict: 'CONDITIONAL PASS', generalAverage: 70, subjectScores: { Mathematics: 40, ESAS: 80, EE: 80 } });

        const update = prisma.examSession.updateMany.mock.calls[0][0];
        expect(update.where).toEqual({ id: 'sess-1', userId: UID });
        expect(update.data.verdict).toBe('CONDITIONAL PASS');
        expect(update.data.config).toMatchObject({ count: 100, kind: 'blended', isPrcStandard: true, generalAverage: 70 });
    });

    it('is owner-scoped', async () => {
        const res = await request(makeApp()).post('/api/exams/sessions/sess-1/finalize').set(as('uid-other')).send({});
        expect(res.status).toBe(404);
        expect(prisma.examSession.updateMany).not.toHaveBeenCalled();
    });

    it('answers 409 (retryable) while the attempts are still on their way', async () => {
        prisma.$queryRaw.mockResolvedValue([]);
        const res = await request(makeApp()).post('/api/exams/sessions/sess-1/finalize').set(as(UID)).send({});
        expect(res.status).toBe(409);
    });
});

describe('POST /api/exams/sessions/:id/hide', () => {
    it('hides a sitting from history without deleting its answers', async () => {
        const del = vi.spyOn(prisma.examSession, 'delete');
        const res = await request(makeApp()).post('/api/exams/sessions/sess-1/hide').set(as(UID)).send({});
        expect(res.status).toBe(200);
        expect(del).not.toHaveBeenCalled();
        expect(prisma.examSession.updateMany.mock.calls[0][0].data.config).toMatchObject({ hiddenFromHistory: true });
    });
});

describe('GET /api/analytics/deep/mock-history', () => {
    it('serves sittings with per-subject scores, deriving them for unfinalised sessions', async () => {
        vi.spyOn(prisma.examSession, 'findMany').mockResolvedValue([
            { id: 'sess-1', mode: 'BOARD_SIM', targetSubject: 'BLENDED', score: 70, totalQuestions: 100, timeTakenSecs: 9000, verdict: 'IN_PROGRESS', config: {}, createdAt: new Date('2026-10-01') },
        ]);
        const res = await request(makeApp()).get('/api/analytics/deep/mock-history').set(as(UID));
        expect(res.status).toBe(200);
        expect(res.body.items[0]).toMatchObject({ id: 'sess-1', score: 70, generalAverage: 70, verdict: 'CONDITIONAL PASS', subjectScores: { Mathematics: 40 } });
        const where = prisma.examSession.findMany.mock.calls[0][0].where;
        expect(where).toMatchObject({ userId: UID, mode: { in: ['BOARD_SIM', 'BATTLE'] } });
    });
});

describe('buildMockHistory', () => {
    it('prefers the finalised record, hides hidden sittings and falls back to the raw verdict', () => {
        const items = buildMockHistory([
            { id: 'a', mode: 'BOARD_SIM', score: 72, totalQuestions: 100, verdict: 'PASSED', createdAt: 1, config: { subjectScores: { EE: 72 }, generalAverage: 72, finalizedAt: 'x', kind: 'subject' } },
            { id: 'b', mode: 'BOARD_SIM', score: 50, totalQuestions: 100, verdict: 'IN_PROGRESS', createdAt: 2, config: { hiddenFromHistory: true } },
            { id: 'c', mode: 'BATTLE', score: 8, totalQuestions: 10, verdict: null, createdAt: 3, config: null },
        ]);
        expect(items.map((i) => i.id)).toEqual(['a', 'c']);
        expect(items[0]).toMatchObject({ finalized: true, kind: 'subject', verdict: 'PASSED' });
        expect(items[1]).toMatchObject({ kind: 'battle', score: 80, verdict: 'PASSED', generalAverage: null });
    });

    it('sanitizes the client-described shape of a sitting', () => {
        expect(sanitizeMeta({ kind: 'hacked', isPrcStandard: 'yes', targetSubject: 'EE', verdict: 'PASSED' })).toEqual({ targetSubject: 'EE' });
    });
});
