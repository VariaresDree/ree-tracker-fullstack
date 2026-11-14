import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// The leaderboard serves streaks as they stand TODAY.
//
// User.globalStreak is only rewritten when answers are recorded, so the stored
// value outlived a missed day: an account whose last answers were 2026-10-05
// still showed "3 STREAK" on Rankings on 2026-10-08. Snapshot rows get the fix
// in buildEntries (leaderboardService.test.js). These pin the LIVE rows — the
// requester's own row on /me and /paginated, and the stale-snapshot fallback —
// which read the User table directly and must judge the streak from the
// ActivityLog rows dated yesterday or later, never from lastActive (which an
// app open re-stamps).
//
// firebase-admin/auth is patched before the router is required, and the Prisma
// singleton is spied on — the same pattern as analyticsDashboardConcurrency.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const leaderboardRoutes = require('../src/routes/leaderboardRoutes');
const { todayManila, dayBefore } = require('@ree/shared');

const UID = 'uid-board';

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/leaderboard', leaderboardRoutes);
    return app;
}

const daysBack = (n) => {
    let day = todayManila();
    for (let i = 0; i < n; i++) day = dayBefore(day);
    return day;
};

/** A live User row as the routes select it: streak 3, opened the app just now. */
const liveUser = (id, studyDays) => ({
    id, displayName: `User ${id}`, role: 'USER', thetaRating: 1.2, globalStreak: 3,
    lastActive: new Date(),
    activityLogs: studyDays.map((date) => ({ date })),
});

let app;

beforeEach(() => {
    app = makeApp();
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
    // Self-row stats (computeUserStats) — not under test here.
    vi.spyOn(prisma.activityLog, 'count').mockResolvedValue(4);
    vi.spyOn(prisma.questionAttempt, 'groupBy').mockResolvedValue([]);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('GET /leaderboard/me — the requester\'s live row', () => {
    beforeEach(() => {
        // A fresh snapshot, so the snapshot path runs.
        vi.spyOn(prisma.leaderboardEntry, 'findFirst').mockResolvedValue({ snapshotAt: new Date() });
        vi.spyOn(prisma.leaderboardEntry, 'findUnique').mockResolvedValue({
            userId: UID, rank: 1, thetaRating: 1.2, activeDays: 4, questionsAnswered: 30, accuracy: 0.5,
        });
        vi.spyOn(prisma.leaderboardEntry, 'count').mockResolvedValue(10);
    });

    it.each([
        ['today', [0], 3],
        ['yesterday', [1], 3],
        ['no study day since the day before yesterday', [], 0],
    ])('streak when the last study day is %s', async (_label, back, expected) => {
        const findUnique = vi.spyOn(prisma.user, 'findUnique')
            .mockResolvedValue(liveUser(UID, back.map(daysBack)));

        const res = await request(app).get('/api/leaderboard/me').set('Authorization', `Bearer ${UID}`);

        expect(res.status).toBe(200);
        expect(res.body.self).toMatchObject({ streak: expected, globalStreak: expected });
        expect(res.body.self).not.toHaveProperty('activityLogs');
        // The join is bounded to the only rows that can keep a streak alive.
        expect(findUnique.mock.calls[0][0].select.activityLogs).toEqual({
            where: { date: { gte: daysBack(1) } },
            select: { date: true },
        });
    });
});

describe('GET /leaderboard/paginated — the off-board self row', () => {
    it('serves the requester\'s streak as it stands today', async () => {
        vi.spyOn(prisma.leaderboardEntry, 'findFirst').mockResolvedValue({ snapshotAt: new Date() });
        vi.spyOn(prisma.leaderboardEntry, 'findMany').mockResolvedValue([]);
        vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(liveUser(UID, []));

        const res = await request(app).get('/api/leaderboard/paginated').set('Authorization', `Bearer ${UID}`);

        expect(res.status).toBe(200);
        expect(res.body.items[0]).toMatchObject({ uid: UID, isSelf: true, streak: 0 });
    });
});

describe('GET /leaderboard — live fallback while the snapshot is stale', () => {
    it('serves every row\'s streak as it stands today', async () => {
        vi.spyOn(prisma.leaderboardEntry, 'findFirst').mockResolvedValue(null);
        vi.spyOn(prisma.user, 'findMany').mockResolvedValue([
            liveUser('alive', [daysBack(1)]),
            liveUser('broken', []),
        ]);
        // The background rebuild the stale read kicks off.
        vi.spyOn(prisma.activityLog, 'groupBy').mockResolvedValue([]);
        vi.spyOn(prisma, '$transaction').mockResolvedValue([]);

        const res = await request(app).get('/api/leaderboard').set('Authorization', `Bearer ${UID}`);

        expect(res.status).toBe(200);
        expect(res.body.leaderboard.map((a) => [a.uid, a.streak])).toEqual([['alive', 3], ['broken', 0]]);
    });
});

// A streak alive on yesterday's answers looked the same as one extended today
// (2026-11-14: read as "the streak doesn't reset"). Each row now says whether
// its owner has answered today, so Rankings can show the difference.
describe('studiedToday: has this streak been extended today?', () => {
    const entry = (userId, rank) => ({ userId, rank, displayName: userId, role: 'USER', thetaRating: 1, globalStreak: 3, activeDays: 2, questionsAnswered: 9, accuracy: 0.5, lastActive: new Date() });

    it('snapshot rows: one read of today\'s study days for the ids on the page', async () => {
        vi.spyOn(prisma.leaderboardEntry, 'findFirst').mockResolvedValue({ snapshotAt: new Date() });
        vi.spyOn(prisma.leaderboardEntry, 'findMany').mockResolvedValue([entry(UID, 1), entry('rested', 2)]);
        const today = vi.spyOn(prisma.activityLog, 'findMany').mockResolvedValue([{ userId: UID }]);

        const paged = await request(app).get('/api/leaderboard/paginated').set('Authorization', `Bearer ${UID}`);
        expect(paged.body.items.map((a) => [a.uid, a.streak, a.studiedToday])).toEqual([[UID, 3, true], ['rested', 3, false]]);
        expect(today.mock.calls[0][0]).toEqual({ where: { date: todayManila(), userId: { in: [UID, 'rested'] } }, select: { userId: true } });

        const list = await request(app).get('/api/leaderboard').set('Authorization', `Bearer ${UID}`);
        expect(list.body.leaderboard.map((a) => a.studiedToday)).toEqual([true, false]);
    });

    it('when that read fails the list still answers, and says nothing about today', async () => {
        vi.spyOn(prisma.leaderboardEntry, 'findFirst').mockResolvedValue({ snapshotAt: new Date() });
        vi.spyOn(prisma.leaderboardEntry, 'findMany').mockResolvedValue([entry(UID, 1)]);
        vi.spyOn(prisma.activityLog, 'findMany').mockRejectedValue(new Error('db down'));

        const res = await request(app).get('/api/leaderboard/paginated').set('Authorization', `Bearer ${UID}`);
        expect(res.status).toBe(200);
        expect(res.body.items[0]).toMatchObject({ uid: UID, streak: 3 });
        expect(res.body.items[0]).not.toHaveProperty('studiedToday');
    });

    it('live rows (your own, and the stale-snapshot fallback) read it from the days they already carry', async () => {
        vi.spyOn(prisma.leaderboardEntry, 'findFirst').mockResolvedValue({ snapshotAt: new Date() });
        vi.spyOn(prisma.leaderboardEntry, 'findUnique').mockResolvedValue({ userId: UID, rank: 1, thetaRating: 1.2, activeDays: 4, questionsAnswered: 30, accuracy: 0.5 });
        vi.spyOn(prisma.leaderboardEntry, 'count').mockResolvedValue(10);
        const findUnique = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(liveUser(UID, [daysBack(1)]));
        const me = () => request(app).get('/api/leaderboard/me').set('Authorization', `Bearer ${UID}`);
        expect((await me()).body.self).toMatchObject({ streak: 3, studiedToday: false });
        findUnique.mockResolvedValue(liveUser(UID, [daysBack(1), daysBack(0)]));
        expect((await me()).body.self).toMatchObject({ streak: 3, studiedToday: true });

        vi.spyOn(prisma.leaderboardEntry, 'findFirst').mockResolvedValue(null);
        vi.spyOn(prisma.user, 'findMany').mockResolvedValue([liveUser('today', [daysBack(0)]), liveUser('yesterday', [daysBack(1)])]);
        vi.spyOn(prisma.activityLog, 'groupBy').mockResolvedValue([]);
        vi.spyOn(prisma, '$transaction').mockResolvedValue([]);
        const res = await request(app).get('/api/leaderboard').set('Authorization', `Bearer ${UID}`);
        expect(res.body.leaderboard.map((a) => [a.uid, a.studiedToday])).toEqual([['today', true], ['yesterday', false]]);
    });
});
