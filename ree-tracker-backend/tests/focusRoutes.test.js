import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Focus time: the Pomodoro's focus blocks, recorded once each (by the
// device's id for the block), summarised per Manila day and per subject
// beside the PRC weights for Progress › Habits.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const focusRoutes = require('../src/routes/focusRoutes');
const analyticsDeepRoutes = require('../src/routes/analyticsDeepRoutes');
const { summarizeFocus } = require('../src/services/focusTime');

const UID = 'uid-focus';
function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/user', focusRoutes);
    app.use('/api/analytics/deep', analyticsDeepRoutes);
    return app;
}
const as = () => ({ Authorization: `Bearer ${UID}` });
const block = (over = {}) => {
    const end = Date.now() - 60_000;
    return {
        clientId: 'focus-1700000000000', subject: 'EE', minutes: 25,
        startedAt: new Date(end - 25 * 60_000).toISOString(), endedAt: new Date(end).toISOString(), completed: true, ...over,
    };
};

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
});
afterEach(() => vi.restoreAllMocks());

describe('POST /api/user/focus-blocks', () => {
    const post = (body) => request(makeApp()).post('/api/user/focus-blocks').set(as()).send(body);

    it('records a block for the caller, once', async () => {
        const create = vi.spyOn(prisma.focusBlock, 'create')
            .mockResolvedValueOnce({})
            .mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }));
        expect((await post(block())).status).toBe(201);
        expect(create.mock.calls[0][0].data).toMatchObject({ userId: UID, clientId: 'focus-1700000000000', subject: 'EE', minutes: 25, completed: true });
        expect((await post(block())).status).toBe(200); // the replay
    });

    it('refuses a block that cannot be right', async () => {
        vi.spyOn(prisma.focusBlock, 'create').mockResolvedValue({});
        expect((await post(block({ subject: 'Chemistry' }))).status).toBe(400);
        expect((await post(block({ minutes: 0 }))).status).toBe(400);
        expect((await post(block({ minutes: 200 }))).status).toBe(400);
        expect((await post(block({ minutes: 60 }))).status).toBe(400); // longer than the block lasted
        expect((await post(block({ endedAt: new Date(Date.now() + 3600_000).toISOString() }))).status).toBe(400);
        expect(prisma.focusBlock.create).not.toHaveBeenCalled();
    });

    it('needs a sign-in', async () => {
        expect((await request(makeApp()).post('/api/user/focus-blocks').send(block())).status).toBe(401);
    });
});

describe('focus summary', () => {
    const now = Date.parse('2026-10-14T04:00:00Z'); // 12:00 Manila
    it('adds up minutes per Manila day for two weeks, zero-filled', () => {
        const { days } = summarizeFocus([
            { subject: 'EE', minutes: 25, endedAt: '2026-10-14T01:00:00Z' },
            { subject: 'Mathematics', minutes: 10, endedAt: '2026-10-13T17:00:00Z' }, // 01:00 Manila on the 14th
            { subject: 'ESAS', minutes: 25, endedAt: '2026-10-13T15:00:00Z' }, // 23:00 Manila on the 13th
        ], { now });
        expect(days).toHaveLength(14);
        expect(days[13]).toMatchObject({ date: '2026-10-14', minutes: 35 });
        expect(days[13].bySubject).toMatchObject({ EE: 25, Mathematics: 10 });
        expect(days[12]).toMatchObject({ date: '2026-10-13', minutes: 25 });
        expect(days[0]).toMatchObject({ date: '2026-10-01', minutes: 0 });
    });

    it("sets each board subject's share of the time beside its weight, leaving General out", () => {
        const { shares, last30, boardMinutes } = summarizeFocus([
            { subject: 'EE', minutes: 30, endedAt: '2026-10-10T01:00:00Z' },
            { subject: 'Mathematics', minutes: 90, endedAt: '2026-10-11T01:00:00Z' },
            { subject: 'General', minutes: 50, endedAt: '2026-10-12T01:00:00Z' },
        ], { now, weights: { Mathematics: 0.25, ESAS: 0.3, EE: 0.45 } });
        expect(last30).toMatchObject({ minutes: 170, blocks: 3 });
        expect(boardMinutes).toBe(120);
        expect(shares).toEqual([
            { subject: 'Mathematics', minutes: 90, share: 0.75, weight: 0.25 },
            { subject: 'ESAS', minutes: 0, share: 0, weight: 0.3 },
            { subject: 'EE', minutes: 30, share: 0.25, weight: 0.45 },
        ]);
    });
});

describe('GET /api/analytics/deep/focus-time', () => {
    it("reads the caller's last 30 days", async () => {
        const findMany = vi.spyOn(prisma.focusBlock, 'findMany').mockResolvedValue([{ subject: 'EE', minutes: 25, endedAt: new Date() }]);
        vi.spyOn(prisma.syllabusWeight, 'findMany').mockResolvedValue([]);
        const res = await request(makeApp()).get('/api/analytics/deep/focus-time').set(as());
        expect(res.status).toBe(200);
        expect(findMany.mock.calls[0][0].where.userId).toBe(UID);
        expect(res.body.last30.minutes).toBe(25);
        expect(res.body.days).toHaveLength(14);
    });
});

describe('fixing a logged focus block', () => {
    const START = new Date(Date.now() - 3 * 3600_000);
    const END = new Date(START.getTime() + 30 * 60_000); // a 30-minute span
    const patch = (id, body) => request(makeApp()).patch(`/api/user/focus-blocks/${id}`).set(as()).send(body);

    it('lists the newest blocks, each with the most minutes it can be set to', async () => {
        vi.spyOn(prisma.focusBlock, 'findMany').mockResolvedValue([
            { id: 'b1', subject: 'EE', minutes: 25, startedAt: START, endedAt: END },
            { id: 'b2', subject: 'ESAS', minutes: 10, startedAt: END, endedAt: new Date(END.getTime() + 12 * 60_000) },
        ]);
        vi.spyOn(prisma.syllabusWeight, 'findMany').mockResolvedValue([]);
        const res = await request(makeApp()).get('/api/analytics/deep/focus-time').set(as());
        expect(res.body.recent.map((b) => [b.id, b.maxMinutes])).toEqual([['b2', 13], ['b1', 31]]);
    });

    it("changes the subject and minutes of the caller's own block", async () => {
        const findFirst = vi.spyOn(prisma.focusBlock, 'findFirst').mockResolvedValue({ id: 'b1', startedAt: START, endedAt: END });
        const updateMany = vi.spyOn(prisma.focusBlock, 'updateMany').mockResolvedValue({ count: 1 });
        const res = await patch('b1', { subject: 'Mathematics', minutes: 20 });
        expect(res.status).toBe(200);
        expect(findFirst.mock.calls[0][0].where).toEqual({ id: 'b1', userId: UID });
        expect(updateMany.mock.calls[0][0]).toEqual({ where: { id: 'b1', userId: UID }, data: { subject: 'Mathematics', minutes: 20 } });
    });

    it('refuses more minutes than the block lasted, an unknown subject, or an empty change', async () => {
        vi.spyOn(prisma.focusBlock, 'findFirst').mockResolvedValue({ id: 'b1', startedAt: START, endedAt: END });
        const updateMany = vi.spyOn(prisma.focusBlock, 'updateMany').mockResolvedValue({ count: 1 });
        expect((await patch('b1', { minutes: 45 })).status).toBe(400);
        expect((await patch('b1', { subject: 'Chemistry' })).status).toBe(400);
        expect((await patch('b1', {})).status).toBe(400);
        expect(updateMany).not.toHaveBeenCalled();
    });

    it("answers 404 for a block that isn't the caller's", async () => {
        vi.spyOn(prisma.focusBlock, 'findFirst').mockResolvedValue(null);
        expect((await patch('someone-elses', { minutes: 5 })).status).toBe(404);
    });

    it("deletes only the caller's block", async () => {
        const deleteMany = vi.spyOn(prisma.focusBlock, 'deleteMany').mockResolvedValue({ count: 1 });
        const res = await request(makeApp()).delete('/api/user/focus-blocks/b1').set(as());
        expect(res.body).toEqual({ success: true, deleted: true });
        expect(deleteMany.mock.calls[0][0].where).toEqual({ id: 'b1', userId: UID });
    });
});
