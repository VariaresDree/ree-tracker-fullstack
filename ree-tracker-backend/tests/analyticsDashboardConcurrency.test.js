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
// The count is five, not eight: the daily-subject counter, per-day rollup,
// confidence matrix and per-mode breakdown were folded into a single statement
// (one materialised CTE, four aggregates reading it). That merge is a CPU win on
// a 0.1-CPU instance rather than a latency win — see the note on the query.
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
        vi.spyOn(prisma, '$queryRaw').mockImplementation(makeGate(log, 'queryRaw', []));
        const groupBy = vi.spyOn(prisma.questionAttempt, 'groupBy').mockImplementation(makeGate(log, 'groupBy', []));
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

        // 5 queries: user, attemptRollup, topicRows, mastery, theta.
        expect(log.length).toBe(5);
        expect(log.filter((l) => l === 'queryRaw').length).toBe(2); // rollup, topicRows
        // The four attempt aggregates are now ONE statement. Asserting groupBy was
        // never reached is what stops them being quietly split back apart: doing so
        // would still produce a correct payload, just with four extra round-trips.
        expect(groupBy).not.toHaveBeenCalled();
        expect(log).not.toContain('groupBy');

        log.releases.forEach((release) => release());
    });

    it('still assembles the payload correctly once the queries resolve', async () => {
        const now = new Date();
        vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
            id: UID, displayName: 'Dash', role: 'USER', globalStreak: 7, thetaRating: 1.25,
            lastActive: now, examDate: null, dailyTarget: 50, sessions: [],
        });
        // $queryRaw is called twice: the merged attempt rollup, then the topic
        // rollup — in the order Promise.all invokes them.
        vi.spyOn(prisma, '$queryRaw')
            .mockResolvedValueOnce([
                { kind: 'day', k1: '2026-09-02', k2: null, n: 10 },
                { kind: 'daily', k1: 'Mathematics', k2: null, n: 4 },
                { kind: 'matrix', k1: 'high', k2: true, n: 3 },
                { kind: 'mode', k1: 'BOARD_SIM', k2: true, n: 3 },
            ])
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
        vi.spyOn(prisma, '$queryRaw').mockResolvedValue([]);
        vi.spyOn(prisma.userTopicPerformance, 'findMany').mockResolvedValue([]);
        vi.spyOn(prisma.thetaHistory, 'findMany').mockResolvedValue([]);

        const res = await request(app)
            .get(`/api/analytics/dashboard/${UID}`)
            .set('Authorization', `Bearer ${UID}`);

        expect(res.status).toBe(404);
    });
});
