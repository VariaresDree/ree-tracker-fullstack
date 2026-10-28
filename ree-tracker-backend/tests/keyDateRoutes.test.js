import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// /api/user/key-dates and /api/user/plan-prefs: the learner's own calendar
// and rest weekdays (CELE round, 2026-10). Same identity/Prisma pattern as
// outsideScoreRoutes.test.js; no Idempotency-Key is sent, so the middleware
// steps aside.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');

const UID = 'uid-keydates';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const ID = '0f8b7c1e-9a3d-4e2f-8b6a-1c2d3e4f5a6b';

const entry = (over = {}) => ({
    id: ID,
    kind: 'preboard',
    title: 'RC Preboard 2',
    startsOn: '2026-11-07',
    endsOn: null,
    subject: 'ALL',
    topicIds: [],
    note: '',
    ...over,
});
const body = (over = {}) => { const { id: _id, ...rest } = entry(over); return rest; };

function makeApp() {
    delete require.cache[require.resolve('../src/routes/keyDateRoutes')];
    const routes = require('../src/routes/keyDateRoutes');
    const app = express();
    app.use(express.json());
    app.use('/api/user', routes);
    return app;
}

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
    vi.spyOn(prisma.keyDate, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.keyDate, 'create').mockImplementation(async ({ data }) => ({ ...data, createdAt: new Date(), updatedAt: new Date() }));
});

afterEach(() => vi.restoreAllMocks());

describe('GET /key-dates', () => {
    it('lists the caller’s dates, oldest first, with the plan preferences', async () => {
        const findMany = vi.spyOn(prisma.keyDate, 'findMany').mockResolvedValue([{ id: ID, userId: UID, title: 'A' }]);
        vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ restWeekdays: [0, 6], reviewMode: 'self' });
        const res = await request(makeApp()).get('/api/user/key-dates').set(as(UID));
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ items: [{ id: ID, title: 'A' }], prefs: { restWeekdays: [0, 6], reviewMode: 'self' } });
        expect(findMany.mock.calls[0][0].where).toEqual({ userId: UID });
    });

    it('needs a signed-in caller', async () => {
        expect((await request(makeApp()).get('/api/user/key-dates')).status).toBe(401);
    });
});

describe('POST /key-dates', () => {
    it('stores the device’s id for the caller, blank text as null', async () => {
        const res = await request(makeApp()).post('/api/user/key-dates').set(as(UID)).send(entry({ topicIds: ['t1', 't1'] }));
        expect(res.status).toBe(201);
        expect(prisma.keyDate.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ id: ID, userId: UID, kind: 'preboard', endsOn: null, note: null, topicIds: ['t1'] }),
        });
        expect(res.body.item).not.toHaveProperty('userId');
    });

    it('checks the entry with the shared rule', async () => {
        for (const bad of [{ kind: 'party' }, { title: '' }, { startsOn: '2026-13-01' }, { endsOn: '2026-11-01' }, { endsOn: '2026-12-31' }]) {
            const res = await request(makeApp()).post('/api/user/key-dates').set(as(UID)).send(entry(bad));
            expect(res.status).toBe(400);
        }
        expect(prisma.keyDate.create).not.toHaveBeenCalled();
    });

    it('a replay past the idempotency window answers with the caller’s row', async () => {
        prisma.keyDate.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }));
        vi.spyOn(prisma.keyDate, 'findFirst').mockResolvedValue({ id: ID, userId: UID, title: 'RC Preboard 2' });
        const res = await request(makeApp()).post('/api/user/key-dates').set(as(UID)).send(entry());
        expect(res.status).toBe(200);
        expect(res.body.item).toEqual({ id: ID, title: 'RC Preboard 2' });
    });

    it('stops at the per-account cap', async () => {
        prisma.keyDate.count.mockResolvedValue(400);
        expect((await request(makeApp()).post('/api/user/key-dates').set(as(UID)).send(entry())).status).toBe(400);
    });
});

describe('PUT and DELETE /key-dates/:id', () => {
    it('replaces the caller’s entry, scoped to the caller, and 404s for anyone else’s', async () => {
        const update = vi.spyOn(prisma.keyDate, 'update').mockImplementation(async ({ data }) => ({ id: ID, userId: UID, ...data }));
        let res = await request(makeApp()).put(`/api/user/key-dates/${ID}`).set(as(UID)).send(body({ kind: 'coaching', endsOn: '2026-11-09' }));
        expect(res.status).toBe(200);
        expect(update).toHaveBeenCalledWith({ where: { id: ID, userId: UID }, data: expect.objectContaining({ kind: 'coaching', endsOn: '2026-11-09' }) });
        update.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'P2025' }));
        res = await request(makeApp()).put(`/api/user/key-dates/${ID}`).set(as(UID)).send(body());
        expect(res.status).toBe(404);
    });

    it('a delete always answers 200, so a replay never lands in Sync issues', async () => {
        const deleteMany = vi.spyOn(prisma.keyDate, 'deleteMany').mockResolvedValue({ count: 0 });
        const res = await request(makeApp()).delete(`/api/user/key-dates/${ID}`).set(as(UID));
        expect(res.status).toBe(200);
        expect(deleteMany).toHaveBeenCalledWith({ where: { id: ID, userId: UID } });
    });
});

describe('PUT /plan-prefs', () => {
    it('saves the rest weekdays, sorted, and the review mode', async () => {
        const update = vi.spyOn(prisma.user, 'update').mockResolvedValue({});
        const res = await request(makeApp()).put('/api/user/plan-prefs').set(as(UID)).send({ restWeekdays: [6, 0], reviewMode: 'self' });
        expect(res.status).toBe(200);
        expect(res.body.prefs).toEqual({ restWeekdays: [0, 6], reviewMode: 'self' });
        expect(update).toHaveBeenCalledWith({ where: { id: UID }, data: { restWeekdays: [0, 6], reviewMode: 'self' } });
    });

    it('refuses a repeated day, a day out of range, a week of rest, and an unknown mode', async () => {
        const update = vi.spyOn(prisma.user, 'update');
        for (const bad of [
            { restWeekdays: [1, 1], reviewMode: 'self' },
            { restWeekdays: [7], reviewMode: 'self' },
            { restWeekdays: [0, 1, 2, 3, 4, 5, 6], reviewMode: 'self' },
            { restWeekdays: [], reviewMode: 'tutor' },
        ]) {
            expect((await request(makeApp()).put('/api/user/plan-prefs').set(as(UID)).send(bad)).status).toBe(400);
        }
        expect(update).not.toHaveBeenCalled();
    });
});
