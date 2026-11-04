import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Delete all analytics has to reach every device, so the server records when it happened.
const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const dashboardCache = require('../src/services/dashboardCache');

const UID = 'uid-purge';
const as = () => ({ Authorization: `Bearer ${UID}` });

function makeApp() {
    delete require.cache[require.resolve('../src/routes/analyticsRoutes')];
    const app = express();
    app.use(express.json());
    app.use('/api/analytics', require('../src/routes/analyticsRoutes'));
    return app;
}

const deleter = () => ({ deleteMany: vi.fn().mockResolvedValue({ count: 0 }) });
const TABLES = ['questionAttempt', 'examSession', 'activityLog', 'userTopicPerformance', 'forecastSnapshot', 'userAbility', 'studySession', 'thetaHistory', 'readinessSnapshot', 'sRSCard', 'mistakeTag'];

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
});
afterEach(() => vi.restoreAllMocks());

describe('DELETE /api/analytics/purge', () => {
    const run = async () => {
        const tx = Object.fromEntries(TABLES.map((t) => [t, deleter()]));
        tx.user = { update: vi.fn().mockResolvedValue({}) };
        vi.spyOn(prisma, '$transaction').mockImplementation(async (fn) => fn(tx));
        const res = await request(makeApp()).delete('/api/analytics/purge').set(as());
        return { res, tx };
    };

    it('deletes the caller’s rows and records when, in one transaction', async () => {
        const before = Date.now();
        const { res, tx } = await run();
        expect(res.status).toBe(200);
        for (const table of TABLES) expect(tx[table].deleteMany).toHaveBeenCalledWith({ where: { userId: UID } });
        const { where, data } = tx.user.update.mock.calls[0][0];
        expect(where).toEqual({ id: UID });
        expect(data.analyticsResetAt.getTime()).toBeGreaterThanOrEqual(before);
        // The device that pressed it remembers the same moment, or it would clear itself again.
        expect(res.body.analyticsResetAt).toBe(data.analyticsResetAt.toISOString());
    });

    it('leaves nothing stale in the dashboard cache', async () => {
        const invalidate = vi.spyOn(dashboardCache, 'invalidate');
        await run();
        expect(invalidate).toHaveBeenCalledWith(UID);
    });

    it('a failure records nothing and says so', async () => {
        vi.spyOn(prisma, '$transaction').mockRejectedValue(new Error('db down'));
        const res = await request(makeApp()).delete('/api/analytics/purge').set(as());
        expect(res.status).toBe(500);
        expect(res.body.analyticsResetAt).toBeUndefined();
    });

    it('needs a signed-in user', async () => {
        const res = await request(makeApp()).delete('/api/analytics/purge');
        expect(res.status).toBe(401);
    });
});
