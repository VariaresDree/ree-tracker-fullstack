import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// /api/user/syllabus: the Read / Watched / Drilled checklist per TOS topic.
// Same identity/Prisma pattern as plannerRoutes.test.js.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { buildSyllabusRows } = require('../src/services/syllabusView');
const { buildResolverIndex } = require('../src/services/topicResolver');

const UID = 'uid-syllabus';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

const topic = (id, subject, name, sortOrder, aliases = []) => ({ id, subject, name, normKey: name.toLowerCase(), aliases, sortOrder, active: true });
const TOPICS = [
    topic('t-ee-2', 'EE', 'Power Systems', 2),
    topic('t-ee-1', 'EE', 'Electric Circuits', 1, ['DC Circuits']),
    topic('t-m-1', 'Mathematics', 'Calculus', 1),
    topic('t-es-1', 'ESAS', 'Thermodynamics', 1),
];

const state = (over = {}) => ({ read: true, watched: false, drilled: false, startedOn: '2026-10-01', finishedOn: null, note: null, ...over });

function makeApp() {
    delete require.cache[require.resolve('../src/routes/syllabusRoutes')];
    const routes = require('../src/routes/syllabusRoutes');
    const app = express();
    app.use(express.json());
    app.use('/api/user', routes);
    return app;
}

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('buildSyllabusRows', () => {
    const rows = (progress = [], performance = []) => buildSyllabusRows({
        topics: TOPICS, progress, performance, index: buildResolverIndex(TOPICS),
    });

    it('lists every active topic in board order: Math, ESAS, EE, then TOS order', () => {
        expect(rows().map((r) => r.topicId)).toEqual(['t-m-1', 't-es-1', 't-ee-1', 't-ee-2']);
        expect(rows()[0]).toMatchObject({ read: false, watched: false, drilled: false, autoDrilled: false, attempts: 0, note: null });
    });

    it('carries the learner’s ticks, dates and note', () => {
        const [, , circuits] = rows([{ topicId: 't-ee-1', read: true, watched: true, drilled: false, startedOn: '2026-09-01', finishedOn: '2026-09-20', note: 'KVL' }]);
        expect(circuits).toMatchObject({ read: true, watched: true, drilled: false, startedOn: '2026-09-01', finishedOn: '2026-09-20', note: 'KVL' });
    });

    it('ticks Drilled itself from answers matched by topic id, or by a legacy name or alias', () => {
        const r = rows([], [
            { topicId: 't-ee-1', topic: 'Electric Circuits', subject: 'EE', attempts: 12, pMastery: 0.3 },
            { topicId: null, topic: 'DC Circuits', subject: 'EE Professional', attempts: 9, pMastery: null }, // alias, legacy subject spelling
            { topicId: null, topic: 'calculus', subject: 'Math', attempts: 10, pMastery: 0.5 },
            { topicId: null, topic: 'Thermodynamics', subject: 'ESAS', attempts: 9, pMastery: 0.9 },
            { topicId: null, topic: 'Not a topic', subject: 'EE', attempts: 99, pMastery: 1 },
        ]);
        const by = Object.fromEntries(r.map((x) => [x.topicId, x]));
        expect(by['t-ee-1']).toMatchObject({ attempts: 21, autoDrilled: true }); // 12 + 9 ≥ 20
        expect(by['t-m-1']).toMatchObject({ attempts: 10, autoDrilled: true }); // 10 at Developing
        expect(by['t-es-1']).toMatchObject({ attempts: 9, autoDrilled: false }); // too few, however good
        expect(by['t-ee-2']).toMatchObject({ attempts: 0, autoDrilled: false });
    });
});

describe('GET /syllabus', () => {
    it('reads only the caller’s ticks and answers, with the board weights', async () => {
        vi.spyOn(prisma.topic, 'findMany').mockResolvedValue(TOPICS);
        const progress = vi.spyOn(prisma.syllabusProgress, 'findMany').mockResolvedValue([{ topicId: 't-m-1', read: true, watched: false, drilled: true }]);
        const perf = vi.spyOn(prisma.userTopicPerformance, 'findMany').mockResolvedValue([]);
        vi.spyOn(prisma.syllabusWeight, 'findMany').mockResolvedValue([]);
        const res = await request(makeApp()).get('/api/user/syllabus').set(as(UID));
        expect(res.status).toBe(200);
        expect(res.body.weights).toEqual({ Mathematics: 0.25, ESAS: 0.3, EE: 0.45 });
        expect(res.body.topics).toHaveLength(4);
        expect(res.body.topics[0]).toMatchObject({ topicId: 't-m-1', read: true, drilled: true });
        expect(progress).toHaveBeenCalledWith({ where: { userId: UID } });
        expect(perf.mock.calls[0][0].where).toEqual({ userId: UID });
        expect(prisma.topic.findMany.mock.calls[0][0].where).toEqual({ active: true });
    });

    it('needs a signed-in caller', async () => {
        const res = await request(makeApp()).get('/api/user/syllabus');
        expect(res.status).toBe(401);
    });
});

describe('PUT /syllabus/:topicId', () => {
    it('upserts the caller’s row for that topic with the full state', async () => {
        const upsert = vi.spyOn(prisma.syllabusProgress, 'upsert').mockImplementation(async ({ create }) => ({ id: 'row', ...create }));
        const res = await request(makeApp()).put('/api/user/syllabus/t-ee-1').set(as(UID)).send(state({ note: '  KVL first  ' }));
        expect(res.status).toBe(200);
        expect(upsert).toHaveBeenCalledWith({
            where: { userId_topicId: { userId: UID, topicId: 't-ee-1' } },
            create: { userId: UID, topicId: 't-ee-1', ...state({ note: 'KVL first' }) },
            update: state({ note: 'KVL first' }),
        });
        expect(res.body.item).not.toHaveProperty('userId');
    });

    it.each([
        ['a patch instead of the full state', { read: true }, 'watched'],
        ['a date that does not exist', state({ startedOn: '2026-02-30' }), 'startedOn'],
        ['a finish before the start', state({ startedOn: '2026-10-05', finishedOn: '2026-10-01' }), 'finishedOn'],
        ['a note that is too long', state({ note: 'x'.repeat(501) }), 'note'],
    ])('rejects %s', async (_label, body, field) => {
        const upsert = vi.spyOn(prisma.syllabusProgress, 'upsert');
        const res = await request(makeApp()).put('/api/user/syllabus/t-ee-1').set(as(UID)).send(body);
        expect(res.status).toBe(400);
        expect(res.body.details).toHaveProperty(field);
        expect(upsert).not.toHaveBeenCalled();
    });

    it('404s for a topic that doesn’t exist', async () => {
        vi.spyOn(prisma.syllabusProgress, 'upsert').mockRejectedValue(Object.assign(new Error('fk'), { code: 'P2003' }));
        const res = await request(makeApp()).put('/api/user/syllabus/nope').set(as(UID)).send(state());
        expect(res.status).toBe(404);
    });

    it('two first ticks racing end as one row, updated', async () => {
        vi.spyOn(prisma.syllabusProgress, 'upsert').mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }));
        const update = vi.spyOn(prisma.syllabusProgress, 'update').mockImplementation(async ({ data }) => ({ id: 'row', userId: UID, topicId: 't-ee-1', ...data }));
        const res = await request(makeApp()).put('/api/user/syllabus/t-ee-1').set(as(UID)).send(state());
        expect(res.status).toBe(200);
        expect(update).toHaveBeenCalledWith({ where: { userId_topicId: { userId: UID, topicId: 't-ee-1' } }, data: state() });
    });
});
