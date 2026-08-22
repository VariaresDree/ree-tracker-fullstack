import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// THE FIRST ROUTE-LEVEL TESTS IN THIS BACKEND.
//
// Every existing backend test is a unit test of an extracted pure function. That
// is precisely why the authorization holes this file covers survived: the route
// handlers were both the un-extracted logic AND the untested logic, and the
// standing CI guard only asked "is any authenticated user allowed?", which is
// the wrong question.
//
// These prove the fixes NEGATIVELY — that a non-admin is refused — because a
// test that only shows the happy path would have passed before the fix too.
//
// firebase-admin/auth is mocked so a request can carry an identity without a
// real Firebase project; the Prisma singleton is spied on, following the
// pattern in reviewServiceBulkRetry.test.js.

const verifyIdToken = vi.fn();

// vi.mock's factory does not intercept a CommonJS require(), and authMiddleware
// DESTRUCTURES `getAuth` at module-load time — so it captures whatever the
// export is at the moment it is first required. Patching the cached module
// object BEFORE requiring the router is therefore both necessary and
// sufficient; the order of the three statements below is load-bearing.
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { invalidateRole } = require('../src/middlewares/roleMiddleware');
const questionRoutes = require('../src/routes/questionRoutes');

const ADMIN_UID = 'uid-admin';
const USER_UID = 'uid-user';

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/questions', questionRoutes);
    return app;
}

let app;

beforeEach(() => {
    app = makeApp();

    // Identity: the token IS the uid, so tests read clearly.
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));

    // authMiddleware upserts a User row on first sight of a uid.
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: USER_UID });

    // Role lookups drive requireAdmin / isAdminUser.
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => ({
        role: where.id === ADMIN_UID ? 'ADMIN' : 'USER',
    }));

    // Roles are cached for 60s inside the process; clear between tests so a
    // previous test's role cannot leak into the next.
    invalidateRole(ADMIN_UID);
    invalidateRole(USER_UID);
});

afterEach(() => {
    vi.restoreAllMocks();
});

const as = (uid) => ({ Authorization: `Bearer ${uid}` });

describe('POST /api/questions — non-admins cannot write the live bank', () => {
    it('routes a NON-ADMIN submission into the pending-review queue', async () => {
        const pendingCreate = vi.spyOn(prisma.questionPendingReview, 'create')
            .mockResolvedValue({ id: 'review-1', subject: 'EE', subtopic: 'AC', text: 't', options: [], answer: 'a' });
        vi.spyOn(prisma.questionVersion, 'create').mockResolvedValue({});
        const liveCreate = vi.spyOn(prisma.question, 'create').mockResolvedValue({ id: 'q-live' });

        const res = await request(app)
            .post('/api/questions')
            .set(as(USER_UID))
            // NOTE: no `status` field. That omission used to be enough to write
            // straight into the live shared bank with a caller-supplied answer
            // key, which every grading surface then scores against.
            .send({
                subject: 'EE',
                subtopic: 'AC Electric Circuits',
                text: 'What is the impedance of a purely resistive 10-ohm load?',
                options: ['10 ohms', '0 ohms', 'Infinite', 'j10 ohms'],
                answer: '10 ohms',
            });

        expect(res.status).toBe(201);
        expect(res.body.pendingReview).toBe(true);
        expect(pendingCreate).toHaveBeenCalled();
        // The critical assertion: nothing reached the live Question table.
        expect(liveCreate).not.toHaveBeenCalled();
    });

    it('still lets an ADMIN publish directly', async () => {
        vi.spyOn(prisma.question, 'create').mockResolvedValue({ id: 'q-live' });
        vi.spyOn(prisma.topic, 'findMany').mockResolvedValue([]);

        const res = await request(app)
            .post('/api/questions')
            .set(as(ADMIN_UID))
            .send({
                subject: 'EE',
                subtopic: 'AC Electric Circuits',
                text: 'What is the impedance of a purely resistive 10-ohm load?',
                options: ['10 ohms', '0 ohms', 'Infinite', 'j10 ohms'],
                answer: '10 ohms',
            });

        expect(res.status).toBe(201);
        expect(res.body.pendingReview).toBeUndefined();
    });

    it('rejects an unauthenticated submission', async () => {
        const res = await request(app).post('/api/questions').send({ subject: 'EE' });
        expect(res.status).toBe(401);
    });
});

describe('PUT /api/questions/:id/cache — global explanation is admin-only', () => {
    it('403s a non-admin', async () => {
        const update = vi.spyOn(prisma.question, 'update').mockResolvedValue({ id: 'q1' });

        const res = await request(app)
            .put('/api/questions/q1/cache')
            .set(as(USER_UID))
            .send({ fixedExplanation: 'vandalised' });

        expect(res.status).toBe(403);
        // Question.fixedExplanation is a GLOBAL column served to every user, not
        // the per-user cache the route name implies.
        expect(update).not.toHaveBeenCalled();
    });

    it('lets an admin through, and re-opens the explanation for review', async () => {
        vi.spyOn(prisma, '$transaction').mockImplementation(async (fn) => fn({
            question: { update: vi.fn().mockResolvedValue({ id: 'q1', explanationStatus: 'PENDING' }) },
            questionVersion: { create: vi.fn().mockResolvedValue({}) },
        }));

        const res = await request(app)
            .put('/api/questions/q1/cache')
            .set(as(ADMIN_UID))
            .send({ fixedExplanation: 'A corrected derivation.' });

        expect(res.status).toBe(200);
        // An APPROVED explanation used to stay APPROVED after being replaced,
        // which made the whole review workflow bypassable by writing after
        // approval.
        expect(res.body.explanationStatus).toBe('PENDING');
    });
});

describe('PATCH /api/questions/:id/flag — one account cannot quarantine the bank', () => {
    beforeEach(() => {
        vi.spyOn(prisma.question, 'findUnique').mockResolvedValue({ id: 'q1' });
        vi.spyOn(prisma.questionFlag, 'upsert').mockResolvedValue({});
    });

    it('records the report but does NOT quarantine below the threshold', async () => {
        vi.spyOn(prisma.questionFlag, 'count').mockResolvedValue(1);
        const update = vi.spyOn(prisma.question, 'update').mockResolvedValue({});

        const res = await request(app).patch('/api/questions/q1/flag').set(as(USER_UID)).send({});

        expect(res.status).toBe(200);
        expect(res.body.quarantined).toBe(false);
        // isFlagged removes a question from EVERY sampling path for EVERY user,
        // and only an admin can undo it — so a single report must not set it.
        expect(update).not.toHaveBeenCalled();
    });

    it('quarantines once enough distinct users agree', async () => {
        vi.spyOn(prisma.questionFlag, 'count').mockResolvedValue(3);
        const update = vi.spyOn(prisma.question, 'update').mockResolvedValue({});

        const res = await request(app).patch('/api/questions/q1/flag').set(as(USER_UID)).send({});

        expect(res.status).toBe(200);
        expect(res.body.quarantined).toBe(true);
        expect(update).toHaveBeenCalled();
    });

    it('lets an admin quarantine immediately', async () => {
        vi.spyOn(prisma.questionFlag, 'count').mockResolvedValue(1);
        const update = vi.spyOn(prisma.question, 'update').mockResolvedValue({});

        const res = await request(app).patch('/api/questions/q1/flag').set(as(ADMIN_UID)).send({});

        expect(res.body.quarantined).toBe(true);
        expect(update).toHaveBeenCalled();
    });

    it('404s an unknown question instead of creating a dangling flag', async () => {
        prisma.question.findUnique.mockResolvedValue(null);
        const res = await request(app).patch('/api/questions/nope/flag').set(as(USER_UID)).send({});
        expect(res.status).toBe(404);
    });
});
