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
const { summarizeFocus, manilaWeekStart } = require('../src/services/focusTime');
const { FOCUS_MAX_MINUTES } = require('@ree/shared');

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
    // No weekly goal unless a test says so.
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ weeklyFocusMinutes: null });
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
        expect((await post(block({ minutes: 361 }))).status).toBe(400);
        expect((await post(block({ minutes: 60 }))).status).toBe(400); // longer than the block lasted
        expect((await post(block({ endedAt: new Date(Date.now() + 3600_000).toISOString() }))).status).toBe(400);
        expect(prisma.focusBlock.create).not.toHaveBeenCalled();
    });

    it('needs a sign-in', async () => {
        expect((await request(makeApp()).post('/api/user/focus-blocks').send(block())).status).toBe(401);
    });

    // A paper exam timed on the focus timer counts: up to the longest PRC
    // section (EE, 6 hours), and not a minute more, however long it spanned.
    it('takes a block as long as the longest board section, and no longer', async () => {
        const create = vi.spyOn(prisma.focusBlock, 'create').mockResolvedValue({});
        const end = Date.now() - 60_000;
        const sixHoursTen = { startedAt: new Date(end - 370 * 60_000).toISOString(), endedAt: new Date(end).toISOString() };
        expect(FOCUS_MAX_MINUTES).toBe(360);
        expect((await post(block({ ...sixHoursTen, minutes: 360 }))).status).toBe(201);
        expect(create.mock.calls[0][0].data).toMatchObject({ minutes: 360 });
        expect((await post(block({ ...sixHoursTen, minutes: 361, clientId: 'focus-1700000000001' }))).status).toBe(400);
        expect(create).toHaveBeenCalledTimes(1);
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

describe('this week, against the weekly goal', () => {
    it('a Manila week starts on Monday, whatever the UTC day', () => {
        expect(manilaWeekStart(Date.parse('2026-10-14T04:00:00Z'))).toBe('2026-10-12'); // Wednesday
        expect(manilaWeekStart(Date.parse('2026-10-12T00:30:00Z'))).toBe('2026-10-12'); // Monday 08:30
        expect(manilaWeekStart(Date.parse('2026-10-11T17:00:00Z'))).toBe('2026-10-12'); // Monday 01:00, still Sunday in UTC
        expect(manilaWeekStart(Date.parse('2026-10-11T15:00:00Z'))).toBe('2026-10-05'); // Sunday 23:00
    });

    it('adds up the minutes since Monday, by subject', () => {
        const now = Date.parse('2026-10-14T04:00:00Z');
        const { week } = summarizeFocus([
            { subject: 'EE', minutes: 50, endedAt: '2026-10-14T01:00:00Z' },
            { subject: 'General', minutes: 20, endedAt: '2026-10-11T17:00:00Z' }, // Monday 01:00 Manila
            { subject: 'ESAS', minutes: 25, endedAt: '2026-10-11T15:00:00Z' }, // last week
        ], { now });
        expect(week).toEqual({
            startsOn: '2026-10-12', minutes: 70,
            bySubject: { General: 20, Mathematics: 0, ESAS: 0, EE: 50 },
        });
    });

    it('the summary carries the goal', async () => {
        vi.spyOn(prisma.focusBlock, 'findMany').mockResolvedValue([]);
        vi.spyOn(prisma.syllabusWeight, 'findMany').mockResolvedValue([]);
        prisma.user.findUnique.mockResolvedValue({ weeklyFocusMinutes: 600 });
        const res = await request(makeApp()).get('/api/analytics/deep/focus-time').set(as());
        expect(res.body.goal).toEqual({ weeklyMinutes: 600 });
        expect(prisma.user.findUnique.mock.calls[0][0].where).toEqual({ id: UID });
    });

    it('PUT /api/user/focus-goal sets or clears it for the caller, within half an hour to 50 hours', async () => {
        const update = vi.spyOn(prisma.user, 'update').mockResolvedValue({});
        const put = (body) => request(makeApp()).put('/api/user/focus-goal').set(as()).send(body);
        expect((await put({ weeklyMinutes: 600 })).status).toBe(200);
        expect(update).toHaveBeenLastCalledWith({ where: { id: UID }, data: { weeklyFocusMinutes: 600 } });
        expect((await put({ weeklyMinutes: null })).status).toBe(200);
        expect(update).toHaveBeenLastCalledWith({ where: { id: UID }, data: { weeklyFocusMinutes: null } });
        for (const bad of [{ weeklyMinutes: 10 }, { weeklyMinutes: 4000 }, { weeklyMinutes: 'lots' }, {}]) {
            expect((await put(bad)).status).toBe(400);
        }
        expect(update).toHaveBeenCalledTimes(2);
        expect((await request(makeApp()).put('/api/user/focus-goal').send({ weeklyMinutes: 600 })).status).toBe(401);
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

    it('lets a 6-hour block (a timed EE paper) be set to any minutes it spanned', async () => {
        const start = new Date(Date.now() - 7 * 3600_000);
        vi.spyOn(prisma.focusBlock, 'findFirst').mockResolvedValue({ id: 'b6', startedAt: start, endedAt: new Date(start.getTime() + 6 * 3600_000) });
        const updateMany = vi.spyOn(prisma.focusBlock, 'updateMany').mockResolvedValue({ count: 1 });
        expect((await patch('b6', { minutes: 300 })).status).toBe(200);
        expect((await patch('b6', { minutes: 361 })).status).toBe(400);
        expect(updateMany).toHaveBeenCalledTimes(1);
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
