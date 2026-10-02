import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// generate-plan and DELETE /tasks/:id were written INSIDE the clear-plan
// handler body, so they were only registered once someone had called
// clear-plan at runtime — and registered again on every later call. On a fresh
// server, "Generate study plan" and deleting a single task fell through to the
// 404 handler. `node --check` cannot see this: the file is syntactically valid,
// the routes simply do not exist yet. Each test below builds a FRESH router and
// never calls clear-plan first, which is exactly the state a cold Render
// instance boots into.
//
// Same identity/Prisma pattern as questionRoutes.authz.test.js.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');

const UID = 'uid-planner';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

function makeApp() {
    // A fresh module instance per test, so no earlier clear-plan call can have
    // registered anything on the router being tested.
    // The router is loaded through Node's own require, so its cache entry is
    // what has to go; the Prisma singleton it requires stays shared, which is
    // what keeps the spies below effective.
    delete require.cache[require.resolve('../src/routes/plannerRoutes')];
    const plannerRoutes = require('../src/routes/plannerRoutes');
    const app = express();
    app.use(express.json());
    app.use('/api/user', plannerRoutes);
    app.use((req, res) => res.status(404).json({ error: 'not found' }));
    return app;
}

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('planner routes are registered on a fresh router', () => {
    it('POST /tasks/generate-plan is reachable without a prior clear-plan call', async () => {
        vi.spyOn(prisma.questionAttempt, 'groupBy').mockResolvedValue([]);
        const createMany = vi.spyOn(prisma.plannerTask, 'createMany').mockResolvedValue({ count: 2 });

        const res = await request(makeApp())
            .post('/api/user/tasks/generate-plan')
            .set(as(UID))
            .send({ examDate: '2099-01-01', topics: [{ subject: 'EE', subtopic: 'Machines' }] });

        expect(res.status).toBe(201);
        expect(createMany).toHaveBeenCalledTimes(1);
    });

    it('DELETE /tasks/:id is reachable and owner-scoped', async () => {
        const del = vi.spyOn(prisma.plannerTask, 'delete').mockResolvedValue({ id: 'task-1' });

        const res = await request(makeApp())
            .delete('/api/user/tasks/task-1')
            .set(as(UID));

        expect(res.status).toBe(200);
        expect(del).toHaveBeenCalledWith({ where: { id: 'task-1', userId: UID } });
    });

    it('DELETE /tasks/clear-plan still wins over /tasks/:id', async () => {
        const deleteMany = vi.spyOn(prisma.plannerTask, 'deleteMany').mockResolvedValue({ count: 3 });
        const del = vi.spyOn(prisma.plannerTask, 'delete').mockResolvedValue({});

        const res = await request(makeApp())
            .delete('/api/user/tasks/clear-plan')
            .set(as(UID));

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, deleted: 3 });
        expect(deleteMany).toHaveBeenCalledTimes(1);
        expect(del).not.toHaveBeenCalled();
    });
});
