import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// A cache that is never READ is indistinguishable from no cache: same output,
// same correctness, just the full query cost every time. That is exactly the
// defect being fixed in /api/config/flags — a warm 60s cache sat one import
// away from a handler that queried the whole table anyway — so the forecast
// route gets a test that drives real HTTP and counts database calls, rather
// than trusting that the wiring is there because the module is.
//
// firebase-admin/auth patched before the router is required, Prisma singleton
// spied — same pattern as analyticsDashboardConcurrency.test.js.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const forecastCache = require('../src/services/forecastCache');
const forecastRoutes = require('../src/routes/forecastRoutes');

const UID = 'uid-forecast';

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/forecast', forecastRoutes);
    return app;
}

let app;
let findUnique;
let snapshotFindFirst;

beforeEach(() => {
    app = makeApp();
    forecastCache.invalidate(UID);
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });

    // lastActive is AFTER the snapshot, which is the normal state for anyone
    // who is actually studying — so the route takes the recompute path. That
    // is the case that used to run five queries on every single call.
    findUnique = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        lastActive: new Date('2026-09-04T12:00:00Z'),
        thetaRating: 0.4,
        standardError: 0.5,
    });
    snapshotFindFirst = vi.spyOn(prisma.forecastSnapshot, 'findFirst').mockResolvedValue({
        id: 'snap-1', userId: UID, createdAt: new Date('2026-09-01T00:00:00Z'), passProbability: 0.6,
    });
    vi.spyOn(prisma.userAbility, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.userTopicPerformance, 'findMany').mockResolvedValue([
        { topic: 'Algebra', correct: 6, attempts: 10, updatedAt: new Date() },
    ]);
});

afterEach(() => {
    vi.restoreAllMocks();
    forecastCache.invalidate(UID);
});

const get = () => request(app).get('/api/forecast').set('Authorization', `Bearer ${UID}`);

describe('GET /api/forecast is served from cache after the first call', () => {
    it('hits the database once across two identical requests', async () => {
        const first = await get();
        expect(first.status).toBe(200);
        const callsAfterFirst = findUnique.mock.calls.length;
        expect(callsAfterFirst).toBeGreaterThan(0);         // it really did compute

        const second = await get();
        expect(second.status).toBe(200);
        expect(second.body).toEqual(first.body);
        // The assertion that matters: no additional queries at all.
        expect(findUnique.mock.calls.length).toBe(callsAfterFirst);
        expect(snapshotFindFirst).toHaveBeenCalledTimes(1);
    });

    it('recomputes once the cache is invalidated, as a write would', async () => {
        await get();
        // Stands in for recordAttempts, which busts all three page-load caches.
        forecastCache.invalidate(UID);
        await get();
        expect(snapshotFindFirst).toHaveBeenCalledTimes(2);
    });

    it('keeps one user out of another user\'s forecast', async () => {
        await get();
        const other = await request(app).get('/api/forecast').set('Authorization', 'Bearer uid-other');
        expect(other.status).toBe(200);
        // A uid-keyed cache must not answer for a different caller.
        expect(snapshotFindFirst).toHaveBeenCalledTimes(2);
        forecastCache.invalidate('uid-other');
    });

    it('does not cache a failure', async () => {
        snapshotFindFirst.mockRejectedValueOnce(new Error('db down'));
        const bad = await get();
        expect(bad.status).toBe(500);

        // A 500 stored in the cache would pin the error for the whole TTL.
        const good = await get();
        expect(good.status).toBe(200);
    });
});
