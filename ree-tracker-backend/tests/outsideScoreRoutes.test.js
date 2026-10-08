import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// /api/user/outside-scores: self-reported scores from outside the app. Same
// identity/Prisma pattern as plannerRoutes.test.js. No Idempotency-Key is sent
// here, so the middleware steps aside and each handler runs as written.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { dayAfter, todayManila } = require('@ree/shared');

const UID = 'uid-outside';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const ID = '0f8b7c1e-9a3d-4e2f-8b6a-1c2d3e4f5a6b';
const FIRST = '1a2b3c4d-1111-4222-8333-944455566677';
const RETEST = '2b3c4d5e-2222-4333-8444-a55566677788';

const entry = (over = {}) => ({
    id: ID,
    title: 'RC Preboard 2',
    source: 'Review center',
    takenOn: '2026-10-01',
    subject: 'EE',
    score: 72,
    total: 100,
    note: '',
    ...over,
});

function makeApp() {
    delete require.cache[require.resolve('../src/routes/outsideScoreRoutes')];
    const routes = require('../src/routes/outsideScoreRoutes');
    const app = express();
    app.use(express.json());
    app.use('/api/user', routes);
    return app;
}

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
    vi.spyOn(prisma.outsideScore, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.outsideScore, 'create').mockImplementation(async ({ data }) => ({ ...data, createdAt: new Date(), updatedAt: new Date() }));
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('GET /outside-scores', () => {
    it('lists only the caller’s entries, newest first, without the owner id', async () => {
        const findMany = vi.spyOn(prisma.outsideScore, 'findMany').mockResolvedValue([{ id: ID, userId: UID, title: 'A' }]);
        const res = await request(makeApp()).get('/api/user/outside-scores').set(as(UID));
        expect(res.status).toBe(200);
        expect(res.body.items).toEqual([{ id: ID, title: 'A' }]);
        expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId: UID },
            orderBy: [{ takenOn: 'desc' }, { createdAt: 'desc' }],
        }));
    });

    it('needs a signed-in caller', async () => {
        const res = await request(makeApp()).get('/api/user/outside-scores');
        expect(res.status).toBe(401);
    });
});

describe('POST /outside-scores', () => {
    it('stores the device’s id for the caller, with the subject normalised and blank text as null', async () => {
        const res = await request(makeApp()).post('/api/user/outside-scores').set(as(UID))
            .send(entry({ subject: 'math', source: '  ', note: '' }));
        expect(res.status).toBe(201);
        expect(prisma.outsideScore.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ id: ID, userId: UID, subject: 'Mathematics', source: null, note: null, retestOfId: null }),
        });
        expect(res.body.item).not.toHaveProperty('userId');
    });

    it.each([
        ['a future date', { takenOn: '2099-01-01' }, 'takenOn'],
        ['a date that does not exist', { takenOn: '2026-02-30' }, 'takenOn'],
        ['a score above the items', { score: 101 }, 'score'],
        ['a negative score', { score: -1 }, 'score'],
        ['a fractional item count', { total: 99.5 }, 'total'],
        ['an unknown subject', { subject: 'Physics' }, 'subject'],
        ['no title', { title: '   ' }, 'title'],
    ])('rejects %s', async (_label, over, field) => {
        const res = await request(makeApp()).post('/api/user/outside-scores').set(as(UID)).send(entry(over));
        expect(res.status).toBe(400);
        expect(res.body.details).toHaveProperty(field);
        expect(prisma.outsideScore.create).not.toHaveBeenCalled();
    });

    it('rejects an id that is not a UUID', async () => {
        const res = await request(makeApp()).post('/api/user/outside-scores').set(as(UID)).send(entry({ id: 'abc' }));
        expect(res.status).toBe(400);
    });

    it('accepts tomorrow’s Manila date (a device clock a little ahead), not the day after', async () => {
        const ok = await request(makeApp()).post('/api/user/outside-scores').set(as(UID)).send(entry({ takenOn: dayAfter(todayManila()) }));
        expect(ok.status).toBe(201);
        const late = await request(makeApp()).post('/api/user/outside-scores').set(as(UID)).send(entry({ takenOn: dayAfter(dayAfter(todayManila())) }));
        expect(late.status).toBe(400);
    });

    it('links a retest of a retest to the first try', async () => {
        vi.spyOn(prisma.outsideScore, 'findFirst')
            .mockResolvedValueOnce({ id: RETEST, subject: 'EE', retestOfId: FIRST })
            .mockResolvedValueOnce({ id: FIRST, subject: 'EE' });
        const res = await request(makeApp()).post('/api/user/outside-scores').set(as(UID)).send(entry({ retestOfId: RETEST }));
        expect(res.status).toBe(201);
        expect(prisma.outsideScore.create.mock.calls[0][0].data.retestOfId).toBe(FIRST);
        expect(prisma.outsideScore.findFirst.mock.calls[0][0].where).toEqual({ id: RETEST, userId: UID });
    });

    it('rejects a retest in another subject, of a missing entry, or of itself', async () => {
        const findFirst = vi.spyOn(prisma.outsideScore, 'findFirst');
        findFirst.mockResolvedValueOnce({ id: FIRST, subject: 'ESAS', retestOfId: null });
        let res = await request(makeApp()).post('/api/user/outside-scores').set(as(UID)).send(entry({ retestOfId: FIRST }));
        expect(res.status).toBe(400);

        findFirst.mockResolvedValueOnce(null); // someone else's, or deleted
        res = await request(makeApp()).post('/api/user/outside-scores').set(as(UID)).send(entry({ retestOfId: FIRST }));
        expect(res.status).toBe(400);

        res = await request(makeApp()).post('/api/user/outside-scores').set(as(UID)).send(entry({ retestOfId: ID }));
        expect(res.status).toBe(400);
        expect(prisma.outsideScore.create).not.toHaveBeenCalled();
    });

    it('stops at the per-account cap', async () => {
        prisma.outsideScore.count.mockResolvedValue(500);
        const res = await request(makeApp()).post('/api/user/outside-scores').set(as(UID)).send(entry());
        expect(res.status).toBe(400);
        expect(prisma.outsideScore.create).not.toHaveBeenCalled();
    });

    it('a replay of the caller’s own entry answers with the row; someone else’s id is a 400, never a 409', async () => {
        prisma.outsideScore.create.mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }));
        const findFirst = vi.spyOn(prisma.outsideScore, 'findFirst').mockResolvedValueOnce({ id: ID, userId: UID, title: 'RC Preboard 2' });
        let res = await request(makeApp()).post('/api/user/outside-scores').set(as(UID)).send(entry());
        expect(res.status).toBe(200);
        expect(res.body.item).toEqual({ id: ID, title: 'RC Preboard 2' });
        expect(findFirst).toHaveBeenCalledWith({ where: { id: ID, userId: UID } });

        findFirst.mockResolvedValueOnce(null);
        res = await request(makeApp()).post('/api/user/outside-scores').set(as(UID)).send(entry());
        expect(res.status).toBe(400);
    });
});

describe('POST /outside-scores replay', () => {
    // The offline queue resends the same body with the same Idempotency-Key
    // (a hash of the body, which carries the device's id). The second send
    // must answer from the first, not create again.
    it('answers a replayed key from the first response without creating twice', async () => {
        const records = new Map();
        vi.spyOn(prisma.idempotencyRecord, 'create').mockImplementation(async ({ data }) => {
            if (records.has(data.key)) throw Object.assign(new Error('dup'), { code: 'P2002' });
            records.set(data.key, { ...data, createdAt: new Date(), updatedAt: new Date() });
            return records.get(data.key);
        });
        vi.spyOn(prisma.idempotencyRecord, 'findUnique').mockImplementation(async ({ where }) => records.get(where.key) || null);
        vi.spyOn(prisma.idempotencyRecord, 'update').mockImplementation(async ({ where, data }) => {
            records.set(where.key, { ...records.get(where.key), ...data });
            return records.get(where.key);
        });
        vi.spyOn(prisma.idempotencyRecord, 'deleteMany').mockResolvedValue({ count: 0 });

        const app = makeApp();
        const send = () => request(app).post('/api/user/outside-scores').set(as(UID)).set('Idempotency-Key', 'c-abc123').send(entry());
        const first = await send();
        const replay = await send();
        expect(first.status).toBe(201);
        expect(replay.status).toBe(201);
        expect(replay.headers['idempotency-replay']).toBe('true');
        expect(replay.body).toEqual(first.body);
        expect(prisma.outsideScore.create).toHaveBeenCalledTimes(1);
    });
});

describe('PUT /outside-scores/:id', () => {
    const body = (over = {}) => { const { id: _id, ...rest } = entry(over); return rest; };

    it('replaces the caller’s entry, scoped to the caller', async () => {
        vi.spyOn(prisma.outsideScore, 'findFirst').mockResolvedValueOnce({ id: ID, subject: 'EE', _count: { retests: 0 } });
        const update = vi.spyOn(prisma.outsideScore, 'update').mockImplementation(async ({ data }) => ({ id: ID, userId: UID, ...data }));
        const res = await request(makeApp()).put(`/api/user/outside-scores/${ID}`).set(as(UID)).send(body({ score: 80 }));
        expect(res.status).toBe(200);
        expect(update).toHaveBeenCalledWith({ where: { id: ID, userId: UID }, data: expect.objectContaining({ score: 80, retestOfId: null }) });
        expect(prisma.outsideScore.findFirst.mock.calls[0][0].where).toEqual({ id: ID, userId: UID });
    });

    it('404s for an entry that isn’t the caller’s', async () => {
        vi.spyOn(prisma.outsideScore, 'findFirst').mockResolvedValueOnce(null);
        const update = vi.spyOn(prisma.outsideScore, 'update');
        const res = await request(makeApp()).put(`/api/user/outside-scores/${ID}`).set(as(UID)).send(body());
        expect(res.status).toBe(404);
        expect(update).not.toHaveBeenCalled();
    });

    it('a first try with retests can’t become a retest or change subject', async () => {
        const findFirst = vi.spyOn(prisma.outsideScore, 'findFirst');
        const update = vi.spyOn(prisma.outsideScore, 'update');
        findFirst.mockResolvedValueOnce({ id: ID, subject: 'EE', _count: { retests: 2 } });
        let res = await request(makeApp()).put(`/api/user/outside-scores/${ID}`).set(as(UID)).send(body({ retestOfId: FIRST }));
        expect(res.status).toBe(400);
        findFirst.mockResolvedValueOnce({ id: ID, subject: 'EE', _count: { retests: 2 } });
        res = await request(makeApp()).put(`/api/user/outside-scores/${ID}`).set(as(UID)).send(body({ subject: 'ESAS' }));
        expect(res.status).toBe(400);
        expect(update).not.toHaveBeenCalled();
    });
});

describe('DELETE /outside-scores/:id', () => {
    it('deletes only the caller’s entry and answers 200 even when it was already gone', async () => {
        const deleteMany = vi.spyOn(prisma.outsideScore, 'deleteMany').mockResolvedValue({ count: 0 });
        const res = await request(makeApp()).delete(`/api/user/outside-scores/${ID}`).set(as(UID));
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, deleted: 0 });
        expect(deleteMany).toHaveBeenCalledWith({ where: { id: ID, userId: UID } });
    });
});
