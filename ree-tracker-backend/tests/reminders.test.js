import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Scheduled reminders: one push a day at the learner's chosen Manila hour,
// with the day's most useful line, sent by an hourly cron call that only the
// scheduler (holding CRON_SECRET) can make.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const pushService = require('../src/services/pushService');
const { pickReminder, hoursServed, manilaHour, sendDueReminders, streakStatus } = require('../src/services/reminderService');
const cronRoutes = require('../src/routes/cronRoutes');
const reminderRoutes = require('../src/routes/reminderRoutes');

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/cron', cronRoutes);
    app.use('/api/user', reminderRoutes);
    return app;
}

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: 'u' });
});
afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
});

describe('which reminder', () => {
    it('leads with a streak about to break, mentioning reviews due', () => {
        expect(pickReminder({ streak: 6, studiedToday: false, dueQuestions: 8, dueCards: 4 })).toEqual({
            title: 'Your 6-day streak ends tonight',
            body: '8 questions and 4 formula cards due for review. One session keeps it going.',
            data: { route: '/' },
        });
    });

    it('then reviews due, opening formula cards when only cards are due', () => {
        expect(pickReminder({ streak: 0, studiedToday: true, dueQuestions: 0, dueCards: 3 })).toMatchObject({
            title: '3 reviews due', data: { route: '/library?tab=formulas' },
        });
        expect(pickReminder({ studiedToday: true, dueQuestions: 1 })).toMatchObject({ title: '1 review due', body: expect.stringMatching(/^1 question,/) });
    });

    it("then today's plan task, then a plain nudge, and nothing when there's nothing to do", () => {
        expect(pickReminder({ studiedToday: true, planTask: { text: 'Drill Protection — 15 questions' } })).toMatchObject({ title: "Today's plan", body: 'Drill Protection — 15 questions' });
        expect(pickReminder({ studiedToday: false })).toMatchObject({ title: "Time for today's practice" });
        expect(pickReminder({ studiedToday: true })).toBeNull();
    });

    it('serves the hour and the two before it, never across midnight', () => {
        expect(hoursServed(19)).toEqual([19, 18, 17]);
        expect(hoursServed(1)).toEqual([1, 0]);
        expect(manilaHour(new Date('2026-10-14T11:30:00Z'))).toBe(19);
    });

    it('judges the streak from study days, not the stored count alone', () => {
        expect(streakStatus({ globalStreak: 6, activityDates: ['2026-10-13'] }, '2026-10-14')).toEqual({ streak: 6, studiedToday: false });
        expect(streakStatus({ globalStreak: 6, activityDates: [] }, '2026-10-14').streak).toBe(0);
    });
});

describe('sending', () => {
    const now = new Date('2026-10-14T11:10:00Z'); // 19:10 Manila

    it('claims each learner’s day before sending, so a second run sends nothing', async () => {
        const findMany = vi.spyOn(prisma.user, 'findMany').mockResolvedValue([
            { id: 'a', globalStreak: 4, activityLogs: [{ date: '2026-10-13' }] },
            { id: 'b', globalStreak: 0, activityLogs: [{ date: '2026-10-14' }] },
        ]);
        const claims = new Set();
        vi.spyOn(prisma.user, 'updateMany').mockImplementation(async ({ where }) => {
            if (claims.has(where.id)) return { count: 0 };
            claims.add(where.id);
            return { count: 1 };
        });
        vi.spyOn(prisma.sRSCard, 'count').mockResolvedValue(0);
        vi.spyOn(prisma.cardReview, 'count').mockResolvedValue(0);
        vi.spyOn(prisma.plannerTask, 'findFirst').mockResolvedValue(null);
        const send = vi.spyOn(pushService, 'sendToUser').mockResolvedValue({ delivered: 1 });

        const first = await sendDueReminders({ now });
        expect(findMany.mock.calls[0][0].where).toMatchObject({ reminderHour: { in: [19, 18, 17] }, deviceTokens: { some: {} } });
        expect(first).toMatchObject({ today: '2026-10-14', hour: 19, candidates: 2, sent: 1, quiet: 1 });
        expect(send).toHaveBeenCalledTimes(1);
        expect(send.mock.calls[0]).toEqual(['a', expect.objectContaining({ title: 'Your 4-day streak ends tonight' })]);

        const second = await sendDueReminders({ now });
        expect(second.sent).toBe(0);
        expect(send).toHaveBeenCalledTimes(1);
    });
});

describe('POST /api/cron/reminders', () => {
    it('does nothing until CRON_SECRET is set', async () => {
        const res = await request(makeApp()).post('/api/cron/reminders').set('x-cron-secret', 'anything');
        expect(res.status).toBe(503);
    });

    it('refuses a wrong or missing secret', async () => {
        process.env.CRON_SECRET = 'a-long-random-secret-value';
        expect((await request(makeApp()).post('/api/cron/reminders')).status).toBe(401);
        expect((await request(makeApp()).post('/api/cron/reminders').set('x-cron-secret', 'nope')).status).toBe(401);
    });

    it('runs with the right secret', async () => {
        process.env.CRON_SECRET = 'a-long-random-secret-value';
        vi.spyOn(prisma.user, 'findMany').mockResolvedValue([]);
        const res = await request(makeApp()).post('/api/cron/reminders').set('x-cron-secret', 'a-long-random-secret-value');
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ candidates: 0, sent: 0 });
    });
});

describe('/api/user/reminders', () => {
    const as = { Authorization: 'Bearer me' };
    it('saves the hour, or off, for the caller', async () => {
        const update = vi.spyOn(prisma.user, 'update').mockResolvedValue({});
        expect((await request(makeApp()).put('/api/user/reminders').set(as).send({ hour: 19 })).status).toBe(200);
        expect(update).toHaveBeenCalledWith({ where: { id: 'me' }, data: { reminderHour: 19 } });
        expect((await request(makeApp()).put('/api/user/reminders').set(as).send({ hour: null })).status).toBe(200);
        expect((await request(makeApp()).put('/api/user/reminders').set(as).send({ hour: 24 })).status).toBe(400);
    });

    it('reads it back', async () => {
        vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ reminderHour: 7 });
        expect((await request(makeApp()).get('/api/user/reminders').set(as)).body).toEqual({ hour: 7 });
    });
});
