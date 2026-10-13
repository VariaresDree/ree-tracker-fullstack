import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// generate-plan and DELETE /tasks/:id were written INSIDE the clear-plan
// handler body, so they were only registered once someone had called
// clear-plan at runtime — and registered again on every later call. On a fresh
// server, "Generate study plan" and deleting a single task fell through to the
// 404 handler. `node --check` cannot see this: the file is syntactically valid,
// the routes simply do not exist yet. Each test below builds a FRESH router and
// never calls clear-plan first, which is exactly the state a cold Render
// instance boots into.
//
// Same identity/Prisma pattern as questionRoutes.authz.test.js.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { invalidateTopicCache } = require('../src/services/topicResolver');

const UID = 'uid-planner';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

function makeApp() {
    // A fresh module instance per test, so no earlier clear-plan call can have
    // registered anything on the router being tested.
    // The router is loaded through Node's own require, so its cache entry is
    // what has to go; the Prisma singleton it requires stays shared, which is
    // what keeps the spies below effective.
    delete require.cache[require.resolve('../src/routes/plannerRoutes')];
    const plannerRoutes = require('../src/routes/plannerRoutes');
    const app = express();
    app.use(express.json());
    app.use('/api/user', plannerRoutes);
    app.use((req, res) => res.status(404).json({ error: 'not found' }));
    return app;
}

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('planner routes are registered on a fresh router', () => {
    it('POST /tasks/generate-plan is reachable without a prior clear-plan call', async () => {
        mockPlanInputs();
        const res = await request(makeApp())
            .post('/api/user/tasks/generate-plan')
            .set(as(UID))
            .send({ examDate: '2099-01-01', topics: [{ subject: 'EE', subtopic: 'Machines' }] });

        expect(res.status).toBe(201);
        expect(prisma.plannerTask.createMany).toHaveBeenCalledTimes(1);
    });

    it('DELETE /tasks/:id is reachable and owner-scoped', async () => {
        const del = vi.spyOn(prisma.plannerTask, 'delete').mockResolvedValue({ id: 'task-1' });

        const res = await request(makeApp())
            .delete('/api/user/tasks/task-1')
            .set(as(UID));

        expect(res.status).toBe(200);
        expect(del).toHaveBeenCalledWith({ where: { id: 'task-1', userId: UID } });
    });

    it('DELETE /tasks/clear-plan still wins over /tasks/:id', async () => {
        const deleteMany = vi.spyOn(prisma.plannerTask, 'deleteMany').mockResolvedValue({ count: 3 });
        const del = vi.spyOn(prisma.plannerTask, 'delete').mockResolvedValue({});

        const res = await request(makeApp())
            .delete('/api/user/tasks/clear-plan')
            .set(as(UID));

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, deleted: 3 });
        expect(deleteMany).toHaveBeenCalledTimes(1);
        // Only planner-owned tasks: v2 (kind set) and v1 ("[" prefix).
        expect(deleteMany.mock.calls[0][0].where).toEqual({ userId: UID, OR: [{ kind: { not: null } }, { text: { startsWith: '[' } }] });
        expect(del).not.toHaveBeenCalled();
    });
});

function mockPlanInputs() {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ dailyTarget: 40 });
    vi.spyOn(prisma.userTopicPerformance, 'findMany').mockResolvedValue([
        { topic: 'Protection', subject: 'EE', topicId: 't-p', attempts: 20, correct: 8, pMastery: 0.35, masteryN: 20, lastPracticedAt: new Date() },
    ]);
    vi.spyOn(prisma, '$queryRaw').mockResolvedValue([]);
    vi.spyOn(prisma.syllabusWeight, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.plannerTask, 'deleteMany').mockReturnValue({ op: 'delete' });
    vi.spyOn(prisma.plannerTask, 'createMany').mockImplementation(({ data }) => ({ op: 'create', count: data.length }));
    vi.spyOn(prisma, '$transaction').mockImplementation(async (ops) => [{ count: 0 }, { count: ops[1].count }]);
    // No open mistakes (services/mistakeList) and no formula cards due unless a test says so.
    vi.spyOn(prisma.questionAttempt, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.battleParticipant, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.cardReview, 'findMany').mockResolvedValue([]);
}

describe('Planner v2', () => {
    it('plans from mastery and the syllabus: linked, sized tasks replacing the previous plan', async () => {
        mockPlanInputs();
        const res = await request(makeApp())
            .post('/api/user/tasks/generate-plan')
            .set(as(UID))
            .send({ examDate: '2099-01-01', topics: [{ subject: 'Mathematics', subtopic: 'Calculus' }, { subject: 'EE', subtopic: 'Protection' }] });

        expect(res.status).toBe(201);
        expect(res.body.totalDays).toBe(42);
        const rows = prisma.plannerTask.createMany.mock.calls[0][0].data;
        expect(rows.every((r) => r.userId === UID && r.dueDate)).toBe(true);
        const drills = rows.filter((r) => r.kind === 'drill');
        expect(new Set(drills.map((r) => r.topic))).toEqual(new Set(['Protection', 'Calculus']));
        expect(drills[0]).toMatchObject({ targetCount: 24 }); // 60% of a 40-question day
        expect(rows.filter((r) => r.kind === 'mock')).toHaveLength(6);
        // The previous plan goes in the same transaction; the learner's own tasks stay.
        expect(prisma.plannerTask.deleteMany.mock.calls[0][0].where.OR).toBeDefined();
    });

    // A syllabus topic the learner has never touched arrives by name only. It
    // is linked to its live Topic row so Start drills by id (tagged questions
    // whose label differs still count), never to another subject's topic.
    it('links an untouched syllabus topic to its live Topic row', async () => {
        mockPlanInputs();
        invalidateTopicCache();
        vi.spyOn(prisma.topic, 'findMany').mockResolvedValue([
            { id: 't-calc', subject: 'Mathematics', name: 'Calculus', normKey: 'calculus', aliases: [], active: true },
            { id: 't-ee-calc', subject: 'EE', name: 'Circuits', normKey: 'circuits', aliases: [], active: true },
        ]);
        const res = await request(makeApp())
            .post('/api/user/tasks/generate-plan')
            .set(as(UID))
            .send({ examDate: '2099-01-01', topics: [{ subject: 'Mathematics', subtopic: 'Calculus' }, { subject: 'Mathematics', subtopic: 'Circuits' }] });

        expect(res.status).toBe(201);
        const rows = prisma.plannerTask.createMany.mock.calls[0][0].data;
        expect(rows.find((r) => r.topic === 'Calculus').topicId).toBe('t-calc');
        // same name under another subject is not a match
        expect(rows.find((r) => r.topic === 'Circuits').topicId).toBeNull();
        invalidateTopicCache();
    });

    it('GET /tasks reports a planned task done from that day\u2019s answers', async () => {
        vi.spyOn(prisma.plannerTask, 'findMany').mockResolvedValue([
            { id: 'd1', kind: 'drill', topic: 'Protection', dueDate: '2026-10-03', targetCount: 20, completed: false, text: 'Drill Protection — 20 questions' },
            { id: 'free', kind: null, dueDate: '2026-10-03', completed: false, text: 'Read chapter 4' },
        ]);
        vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ day: '2026-10-03', topic: 'Protection', count: 22 }]);
        vi.spyOn(prisma.examSession, 'findMany').mockResolvedValue([]);

        const res = await request(makeApp()).get('/api/user/tasks').set(as(UID));
        expect(res.status).toBe(200);
        const drill = res.body.items.find((t) => t.id === 'd1');
        expect(drill.progress).toMatchObject({ count: 22, target: 20, done: true });
        expect(res.body.items.find((t) => t.id === 'free').progress).toBeUndefined();
    });

    it('weights a topic with open mistakes up and says how many are open; plans formula-card days', async () => {
        mockPlanInputs();
        // Two open mistakes on Protection, one fixed (not counted).
        prisma.questionAttempt.findMany.mockImplementation(async ({ where }) => (where.isCorrect === false
            ? ['q1', 'q2', 'q3'].map((id) => ({ questionId: id, subject: 'EE', subtopic: 'Protection', selectedAnswer: 'B', createdAt: new Date('2026-10-01'), mode: 'DRILL' }))
            : [{ questionId: 'q3', answeredAt: new Date('2026-10-02'), createdAt: new Date('2026-10-02'), mode: 'DRILL' }]));
        vi.spyOn(prisma.question, 'findMany').mockImplementation(async ({ where }) => where.id.in.map((id) => ({ id, subject: 'EE', subtopic: 'Protection', text: id, options: ['A', 'B'], answer: 'A' })));
        vi.spyOn(prisma.mistakeTag, 'findMany').mockResolvedValue([]);
        const soon = new Date(Date.now() + 2 * 86400000);
        prisma.cardReview.findMany.mockResolvedValue(Array.from({ length: 6 }, () => ({ nextReviewDate: soon })));

        const res = await request(makeApp()).post('/api/user/tasks/generate-plan').set(as(UID))
            .send({ examDate: '2099-01-01', topics: [{ subject: 'EE', subtopic: 'Protection' }] });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ totalDays: 42, openMistakes: 2, cardsDue: 6 });
        const rows = prisma.plannerTask.createMany.mock.calls[0][0].data;
        expect(rows.find((r) => r.kind === 'drill').text).toMatch(/\(2 open mistakes\)$/);
        expect(rows.filter((r) => r.kind === 'cards')).toEqual([expect.objectContaining({ targetCount: 6, text: 'Review 6 formula cards' })]);
        expect(prisma.cardReview.findMany.mock.calls[0][0].where).toMatchObject({ userId: UID, card: { status: 'LIVE' } });
    });

    it('GET /tasks counts the formula cards rated on a cards day', async () => {
        vi.spyOn(prisma.plannerTask, 'findMany').mockResolvedValue([
            { id: 'c1', kind: 'cards', dueDate: '2026-10-03', targetCount: 5, completed: false, text: 'Review 5 formula cards' },
        ]);
        vi.spyOn(prisma, '$queryRaw').mockResolvedValue([]);
        vi.spyOn(prisma.examSession, 'findMany').mockResolvedValue([]);
        const at = (h) => new Date(Date.UTC(2026, 9, 3, h)); // 2026-10-03, Manila daytime
        const rated = vi.spyOn(prisma.cardReview, 'findMany').mockResolvedValue([at(1), at(2), at(3), at(4), at(5)].map((d) => ({ lastReviewed: d })));

        const res = await request(makeApp()).get('/api/user/tasks').set(as(UID));
        expect(res.body.items[0].progress).toMatchObject({ count: 5, target: 5, done: true });
        expect(rated.mock.calls[0][0].where.userId).toBe(UID);
    });
});
