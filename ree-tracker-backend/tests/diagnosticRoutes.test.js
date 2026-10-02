import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Placement test, end to end through the routes, against an in-memory session
// store. Pins: server grading with no answer leakage, the current-item guard,
// owner scoping, a 15–19-item sitting that ends in a result, exactly-once
// attempt recording, and ability seeding only for a cold account.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

// Collaborators are destructured at load time — patch BEFORE requiring.
const SUBJECT_BANK = { Mathematics: 'Mathematics', ESAS: 'ESAS', EE: 'EE' };
const bank = Object.fromEntries(Object.keys(SUBJECT_BANK).map((s) => [s,
    Array.from({ length: 30 }, (_, i) => ({
        id: `${s}-${i}`, subject: s, subtopic: `${s} topic ${i % 4}`, topicId: `${s}-t${i % 4}`,
        text: `Question ${i}`, options: ['A', 'B', 'C', 'D'], type: 'conceptual',
        irtA: 1, irtB: -1.2 + (i % 10) * 0.25, irtC: 0.2, difficulty: null,
    })),
]));
const catCandidatesModule = require('../src/services/catCandidates');
catCandidatesModule.catCandidates = vi.fn(async ({ subject, excludeIds }) =>
    bank[subject].filter((q) => !excludeIds.includes(q.id)));
const telemetryService = require('../src/services/telemetryService');
const recordAttempts = vi.fn().mockResolvedValue({ written: 1 });
telemetryService.recordAttempts = recordAttempts;
const referenceFormCache = require('../src/services/referenceFormCache');
const { buildTccGrid } = require('../src/engine/forecast');
referenceFormCache.getTccBySubject = vi.fn(async () => ({
    Mathematics: buildTccGrid([]), ESAS: buildTccGrid([]), EE: buildTccGrid([]),
}));

const prisma = require('../src/config/db');
const diagnosticRoutes = require('../src/routes/diagnosticRoutes');
const { buildResult } = require('../src/services/diagnosticService');

const UID = 'uid-place';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });
let sessions;
let priorAttempts;

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/diagnostic', diagnosticRoutes);
    return app;
}

const matches = (row, where) => Object.entries(where).every(([k, v]) => {
    if (v && typeof v === 'object' && 'in' in v) return v.in.includes(row[k]);
    return row[k] === v;
});

beforeEach(() => {
    sessions = new Map();
    priorAttempts = 0;
    recordAttempts.mockClear();
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
    vi.spyOn(prisma.examSession, 'create').mockImplementation(async ({ data }) => {
        sessions.set(data.id, { ...data, createdAt: new Date() });
        return sessions.get(data.id);
    });
    vi.spyOn(prisma.examSession, 'findFirst').mockImplementation(async ({ where }) =>
        [...sessions.values()].reverse().find((s) => matches(s, where)) || null);
    vi.spyOn(prisma.examSession, 'updateMany').mockImplementation(async ({ where, data }) => {
        const s = sessions.get(where.id);
        if (!s || s.userId !== where.userId) return { count: 0 };
        Object.assign(s, data);
        return { count: 1 };
    });
    vi.spyOn(prisma.question, 'findUnique').mockImplementation(async ({ where }) => {
        const q = Object.values(bank).flat().find((x) => x.id === where.id);
        return q ? { ...q, answer: 'A' } : null;
    });
    vi.spyOn(prisma.questionAttempt, 'count').mockImplementation(async () => priorAttempts);
    vi.spyOn(prisma.userAbility, 'upsert').mockImplementation((args) => ({ op: 'ability', args }));
    vi.spyOn(prisma.user, 'update').mockImplementation((args) => ({ op: 'user', args }));
    vi.spyOn(prisma, '$transaction').mockImplementation(async (ops) => ops);
});

afterEach(() => { vi.restoreAllMocks(); });

async function sitWholeTest(app, pick = () => 'A') {
    const started = await request(app).post('/api/diagnostic/start').set(as(UID)).send({});
    let { item } = started.body;
    const sessionId = started.body.sessionId;
    let last = started;
    for (let n = 0; n < 25 && item; n++) {
        last = await request(app).post('/api/diagnostic/answer').set(as(UID))
            .send({ sessionId, questionId: item.id, userAnswer: pick(item, n), confidenceLevel: 'MED', timeSpentMs: 30000 });
        item = last.body.item;
    }
    return { sessionId, last };
}

describe('placement test', () => {
    it('starts with an item that carries no answer key', async () => {
        const res = await request(makeApp()).post('/api/diagnostic/start').set(as(UID)).send({});
        expect(res.status).toBe(200);
        expect(res.body.item).toHaveProperty('text');
        expect(res.body.item).not.toHaveProperty('answer');
        expect(res.body.progress).toEqual({ answered: 0, total: 19 });
        const created = [...sessions.values()][0];
        expect(created).toMatchObject({ userId: UID, mode: 'DIAGNOSTIC', verdict: 'IN_PROGRESS' });
    });

    it('never reveals whether an answer was right while the test runs', async () => {
        const app = makeApp();
        const { body } = await request(app).post('/api/diagnostic/start').set(as(UID)).send({});
        const res = await request(app).post('/api/diagnostic/answer').set(as(UID))
            .send({ sessionId: body.sessionId, questionId: body.item.id, userAnswer: 'A' });
        expect(res.body.done).toBe(false);
        expect(JSON.stringify(res.body)).not.toMatch(/isCorrect|"answer"/);
    });

    it('only accepts an answer to the item it is currently asking', async () => {
        const app = makeApp();
        const { body } = await request(app).post('/api/diagnostic/start').set(as(UID)).send({});
        const res = await request(app).post('/api/diagnostic/answer').set(as(UID))
            .send({ sessionId: body.sessionId, questionId: 'EE-29', userAnswer: 'A' });
        expect(res.status).toBe(409);
    });

    it("cannot touch another user's sitting", async () => {
        const app = makeApp();
        const { body } = await request(app).post('/api/diagnostic/start').set(as(UID)).send({});
        const res = await request(app).post('/api/diagnostic/answer').set(as('uid-intruder'))
            .send({ sessionId: body.sessionId, questionId: body.item.id, userAnswer: 'A' });
        expect(res.status).toBe(404);
    });

    it('a full sitting is 19 items, balanced by syllabus weight, and ends in a placement result', async () => {
        const { last } = await sitWholeTest(makeApp());
        expect(last.body.done).toBe(true);
        const { subjects, projectedGWA, seeded } = last.body.result;
        expect(subjects.Mathematics.answered).toBe(5);
        expect(subjects.ESAS.answered).toBe(6);
        expect(subjects.EE.answered).toBe(8);
        expect(subjects.EE.band).toBe('board-ready'); // all correct
        expect(projectedGWA).toBeGreaterThan(70);
        expect(seeded).toBe(true);
    });

    it('records the 19 attempts ONCE, with deterministic ids, in the DIAGNOSTIC mode', async () => {
        const { sessionId } = await sitWholeTest(makeApp());
        expect(recordAttempts).toHaveBeenCalledTimes(1);
        const [{ attempts, mode, userId }] = recordAttempts.mock.calls[0];
        expect(mode).toBe('DIAGNOSTIC');
        expect(userId).toBe(UID);
        expect(attempts).toHaveLength(19);
        expect(attempts[0].clientAttemptId).toBe(`${sessionId}:${attempts[0].questionId}`);
    });

    it('seeds per-subject abilities and θ for a cold account', async () => {
        await sitWholeTest(makeApp(), (item, n) => (n % 2 === 0 ? 'A' : 'B'));
        expect(prisma.userAbility.upsert).toHaveBeenCalledTimes(3);
        const userUpdate = prisma.user.update.mock.calls[0][0];
        expect(userUpdate.where).toEqual({ id: UID });
        expect(Number.isFinite(userUpdate.data.thetaRating)).toBe(true);
        expect(userUpdate.data.standardError).toBeGreaterThanOrEqual(0.35);
    });

    it('reports — but does not impose — a placement on an account with real history', async () => {
        priorAttempts = 500;
        const { last } = await sitWholeTest(makeApp());
        expect(last.body.result.seeded).toBe(false);
        expect(prisma.userAbility.upsert).not.toHaveBeenCalled();
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('finishing twice is a no-op the second time', async () => {
        const app = makeApp();
        const { sessionId } = await sitWholeTest(app);
        const again = await request(app).post('/api/diagnostic/finish').set(as(UID)).send({ sessionId });
        expect(again.body.done).toBe(true);
        expect(recordAttempts).toHaveBeenCalledTimes(1);
    });

    it('status reports none, then completed with the result', async () => {
        const app = makeApp();
        expect((await request(app).get('/api/diagnostic/status').set(as(UID))).body).toEqual({ status: 'none' });
        await sitWholeTest(app);
        const st = (await request(app).get('/api/diagnostic/status').set(as(UID))).body;
        expect(st.status).toBe('completed');
        expect(st.result.subjects).toHaveProperty('EE');
    });
});

describe('buildResult', () => {
    it('projects each subject through its curve and bands it against the PRC marks', () => {
        const grid = buildTccGrid([]); // P(θ = 0) = 0.6
        const r = buildResult(
            { Mathematics: { theta: 0, se: 0.6, n: 5, correct: 3 }, ESAS: { theta: 0, se: 1, n: 0, correct: 0 }, EE: { theta: 0, se: 0.5, n: 8, correct: 5 } },
            { Mathematics: grid, ESAS: grid, EE: grid },
        );
        expect(r.subjects.Mathematics).toMatchObject({ expected: 60, band: 'developing' });
        expect(r.subjects).not.toHaveProperty('ESAS');
        expect(r.projectedGWA).toBe(60);
    });
});
