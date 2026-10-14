import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';

// The weekly focus goal against a real database: the new User column
// (migration 20261018000000_weekly_focus_goal) is written by
// PUT /api/user/focus-goal and read back with this week's minutes.

const verifyIdToken = vi.fn(async (token) => ({ uid: token, email: `${token}@example.test` }));
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../../src/config/db');

const RUN = `fg${Date.now().toString(36)}`;
const A = `${RUN}-a`;
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/user', require('../../src/routes/focusRoutes'));
    app.use('/api/analytics/deep', require('../../src/routes/analyticsDeepRoutes'));
    return app;
}

beforeAll(async () => {
    await prisma.user.create({ data: { id: A, email: `${A}@example.test` } });
    // Ended a second ago: this week, except in the first second of a Monday.
    const end = new Date(Date.now() - 1000);
    await prisma.focusBlock.create({
        data: { userId: A, clientId: `${RUN}-b1`, subject: 'EE', minutes: 25, startedAt: new Date(end.getTime() - 25 * 60_000), endedAt: end, completed: true },
    });
});

afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: A } });
    await prisma.$disconnect();
});

describe('the weekly focus goal', () => {
    it('is saved on the account, read back with this week, and cleared', async () => {
        const app = makeApp();
        expect((await request(app).put('/api/user/focus-goal').set(as(A)).send({ weeklyMinutes: 600 })).status).toBe(200);
        expect((await prisma.user.findUnique({ where: { id: A }, select: { weeklyFocusMinutes: true } })).weeklyFocusMinutes).toBe(600);

        const res = await request(app).get('/api/analytics/deep/focus-time').set(as(A));
        expect(res.status).toBe(200);
        expect(res.body.goal).toEqual({ weeklyMinutes: 600 });
        expect(res.body.week).toMatchObject({ minutes: 25, bySubject: { EE: 25 } });

        expect((await request(app).put('/api/user/focus-goal').set(as(A)).send({ weeklyMinutes: null })).status).toBe(200);
        expect((await prisma.user.findUnique({ where: { id: A }, select: { weeklyFocusMinutes: true } })).weeklyFocusMinutes).toBeNull();
    });
});
