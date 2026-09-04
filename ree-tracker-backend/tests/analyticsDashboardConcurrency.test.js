import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Pins the ONE property that makes GET /analytics/dashboard/:uid fast: its
// queries are issued together, not one after another.
//
// This is worth a test rather than a comment because the regression is silent.
// Turning any of those `Promise.all` entries back into a sequential `await`
// changes no output at all — every field still computes correctly — it just
// re-adds a network round-trip per query. In production that is ~180ms each
// (Render runs in Oregon, the database is in ap-southeast-1), which is how the
// endpoint reached 2.9s while its heaviest query executed in 1.9ms.
//
// The assertion is therefore about TIMING SHAPE, not values: every query must
// be invoked before any of them resolves. Under the old sequential code exactly
// one would have been invoked at that point.
//
// firebase-admin/auth is patched before the router is required, and the Prisma
// singleton is spied on — the same pattern as questionRoutes.authz.test.js.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const dashboardCache = require('../src/services/dashboardCache');
const analyticsRoutes = require('../src/routes/analyticsRoutes');

const UID = 'uid-dash';

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/analytics', analyticsRoutes);
    return app;
}

/** A query mock that records its invocation and resolves only when released. */
function makeGate(log, label, value) {
    return vi.fn(() => {
        log.push(label);
        return new Promise((resolve) => {
            log.releases.push(() => resolve(value));
        });
    });
}

let app;

beforeEach(() => {
    app = makeApp();
    dashboardCache.invalidate(UID);
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
});

afterEach(() => {
    vi.restoreAllMocks();
    dashboardCache.invalidate(UID);
});

describe('GET /analytics/dashboard/:uid query concurrency', () => {
    it('issues every query before any of them resolves', async () => {
        const log = [];
        log.releases = [];

        const user = {
            id: UID, displayName: 'Dash', role: 'USER', globalStreak: 3, thetaRating: 0.5,
            lastActive: new Date(), examDate: null, dailyTarget: 50, sessions: [],
        };

        vi.spyOn(prisma.user, 'findUnique').mockImplementation(makeGate(log, 'user', user));
        vi.spyOn(prisma.questionAttempt, 'groupBy').mockImplementation(makeGate(log, 'groupBy', []));
        vi.spyOn(prisma, '$queryRaw').mockImplementation(makeGate(log, 'queryRaw', []));
        vi.spyOn(prisma.userTopicPerformance, 'findMany').mockImplementation(makeGate(log, 'mastery', []));
        vi.spyOn(prisma.thetaHistory, 'findMany').mockImplementation(makeGate(log, 'theta', []));

        const pending = request(app)
            .get(`/api/analytics/dashboard/${UID}`)
            .set('Authorization', `Bearer ${UID}`);
        pending.end(() => {});

        // Let the handler run up to its first suspension point. Nothing has been
        // released, so anything invoked by now was invoked concurrently.
        for (let i = 0; i < 50; i += 1) await Promise.resolve();
        await new Promise((r) => setTimeout(r, 50));

        // 8 queries: user, dailyAgg, dayRows, topicRows, mastery, matrix, mode, theta.
        expect(log.length).toBe(8);
        expect(log.filter((l) => l === 'groupBy').length).toBe(3); // daily, matrix, mode
        expect(log.filter((l) => l === 'queryRaw').length).toBe(2); // dayRows, topicRows

        log.releases.forEach((release) => release());
    });

    it('still assembles the payload correctly once the queries resolve', async () => {
        const now = new Date();
        vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
            id: UID, displayName: 'Dash', role: 'USER', globalStreak: 7, thetaRating: 1.25,
            lastActive: now, examDate: null, dailyTarget: 50, sessions: [],
        });
        // dailyAgg -> matrixAgg -> modeAgg, in the order Promise.all invokes them.
        vi.spyOn(prisma.questionAttempt, 'groupBy')
            .mockResolvedValueOnce([{ subject: 'Mathematics', _count: { id: 4 } }])
            .mockResolvedValueOnce([{ confidenceLevel: 'high', isCorrect: true, _count: { id: 3 } }])
            .mockResolvedValueOnce([{ mode: 'BOARD_SIM', isCorrect: true, _count: { id: 3 } }]);
        vi.spyOn(prisma, '$queryRaw')
            .mockResolvedValueOnce([{ day: '2026-09-02', count: 10 }])
            .mockResolvedValueOnce([{
                topic: 'Algebra', subject: 'Mathematics', totalAttempts: 10,
                correctHits: 4, totalTimeMs: 90000n, timedAttempts: 9,
            }]);
        vi.spyOn(prisma.userTopicPerformance, 'findMany')
            .mockResolvedValue([{ topic: 'Algebra', pMastery: 0.42, masteryN: 10 }]);
        vi.spyOn(prisma.thetaHistory, 'findMany').mockResolvedValue([]);

        const res = await request(app)
            .get(`/api/analytics/dashboard/${UID}`)
            .set('Authorization', `Bearer ${UID}`);

        expect(res.status).toBe(200);
        const d = res.body.data;
        expect(d.profile.dailyMath).toBe(4);
        expect(d.profile.totalAnswered).toBe(10);          // Σ activityCalendar
        expect(d.activityCalendar['2026-09-02']).toBe(10);
        expect(d.matrix.hc).toBe(3);
        expect(d.modeBreakdown.BOARD_SIM).toEqual({ attempts: 3, correct: 3 });
        expect(d.microTopics.Algebra.totalAttempts).toBe(10);
        expect(d.microTopics.Algebra.totalTimeSecs).toBe(90);  // ms -> s at the boundary
        expect(d.microTopics.Algebra.mastery).toBe(0.42);      // BKT merged on by name
    });

    it('404s when the user row is missing', async () => {
        vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
        vi.spyOn(prisma.questionAttempt, 'groupBy').mockResolvedValue([]);
        vi.spyOn(prisma, '$queryRaw').mockResolvedValue([]);
        vi.spyOn(prisma.userTopicPerformance, 'findMany').mockResolvedValue([]);
        vi.spyOn(prisma.thetaHistory, 'findMany').mockResolvedValue([]);

        const res = await request(app)
            .get(`/api/analytics/dashboard/${UID}`)
            .set('Authorization', `Bearer ${UID}`);

        expect(res.status).toBe(404);
    });
});
