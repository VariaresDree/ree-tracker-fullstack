import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// /api/user/practice-sets and /api/user/links (CELE round, 2026-10): sets to
// finish and personal links. Same identity/Prisma pattern as
// outsideScoreRoutes.test.js; no Idempotency-Key is sent.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');

const UID = 'uid-sets';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const ID = '0f8b7c1e-9a3d-4e2f-8b6a-1c2d3e4f5a6b';
const ID2 = '1a2b3c4d-1111-4222-8333-944455566677';

const set = (over = {}) => ({ id: ID, collection: 'Past boards', title: 'April 2025', subject: 'ALL', status: 'todo', doneOn: null, outsideScoreId: null, sortOrder: 1, ...over });
const link = (over = {}) => ({ id: ID, title: 'Machines folder', url: 'drive.google.com/drive/folders/abc', subject: 'EE', topicId: null, pinned: true, note: '', ...over });
const withoutId = (o) => { const { id: _id, ...rest } = o; return rest; };

function makeApp(file) {
    delete require.cache[require.resolve(`../src/routes/${file}`)];
    const app = express();
    app.use(express.json());
    app.use('/api/user', require(`../src/routes/${file}`));
    return app;
}

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
});

afterEach(() => vi.restoreAllMocks());

describe('practice sets', () => {
    const app = () => makeApp('practiceSetRoutes');

    it('lists only the caller’s sets, without the owner id', async () => {
        const findMany = vi.spyOn(prisma.practiceSet, 'findMany').mockResolvedValue([{ id: ID, userId: UID, title: 'A' }]);
        const res = await request(app()).get('/api/user/practice-sets').set(as(UID));
        expect(res.body.items).toEqual([{ id: ID, title: 'A' }]);
        expect(findMany.mock.calls[0][0].where).toEqual({ userId: UID });
    });

    it('stores a set for the caller, and refuses a bad one', async () => {
        vi.spyOn(prisma.practiceSet, 'count').mockResolvedValue(0);
        const create = vi.spyOn(prisma.practiceSet, 'create').mockImplementation(async ({ data }) => data);
        let res = await request(app()).post('/api/user/practice-sets').set(as(UID)).send(set());
        expect(res.status).toBe(201);
        expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ id: ID, userId: UID, title: 'April 2025', status: 'todo' }) });
        for (const bad of [{ status: 'maybe' }, { subject: 'Physics' }, { title: '' }, { doneOn: '2026-02-30' }]) {
            res = await request(app()).post('/api/user/practice-sets').set(as(UID)).send(set(bad));
            expect(res.status).toBe(400);
        }
    });

    it('adds a template’s sets all at once, skipping ones a replay already made', async () => {
        vi.spyOn(prisma.practiceSet, 'count').mockResolvedValue(0);
        const createMany = vi.spyOn(prisma.practiceSet, 'createMany').mockResolvedValue({ count: 2 });
        vi.spyOn(prisma.practiceSet, 'findMany').mockResolvedValue([{ id: ID, userId: UID }, { id: ID2, userId: UID }]);
        const res = await request(app()).post('/api/user/practice-sets/bulk').set(as(UID)).send({ items: [set(), set({ id: ID2, title: 'September 2024' })] });
        expect(res.status).toBe(201);
        expect(createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ id: ID, userId: UID }), expect.objectContaining({ id: ID2, userId: UID })], skipDuplicates: true });
        expect(res.body.items).toHaveLength(2);
    });

    it('a template that would pass the cap adds nothing', async () => {
        vi.spyOn(prisma.practiceSet, 'count').mockResolvedValue(599);
        const createMany = vi.spyOn(prisma.practiceSet, 'createMany');
        const res = await request(app()).post('/api/user/practice-sets/bulk').set(as(UID)).send({ items: [set(), set({ id: ID2 })] });
        expect(res.status).toBe(400);
        expect(createMany).not.toHaveBeenCalled();
    });

    it('ticks a set off, scoped to the caller, keeping the outside score as a plain id', async () => {
        const update = vi.spyOn(prisma.practiceSet, 'update').mockImplementation(async ({ data }) => ({ id: ID, userId: UID, ...data }));
        const res = await request(app()).put(`/api/user/practice-sets/${ID}`).set(as(UID))
            .send(withoutId(set({ status: 'done', doneOn: '2026-10-20', outsideScoreId: 'score-1' })));
        expect(res.status).toBe(200);
        expect(update).toHaveBeenCalledWith({ where: { id: ID, userId: UID }, data: expect.objectContaining({ status: 'done', doneOn: '2026-10-20', outsideScoreId: 'score-1' }) });
    });

    it('a delete always answers 200', async () => {
        const deleteMany = vi.spyOn(prisma.practiceSet, 'deleteMany').mockResolvedValue({ count: 0 });
        expect((await request(app()).delete(`/api/user/practice-sets/${ID}`).set(as(UID))).status).toBe(200);
        expect(deleteMany).toHaveBeenCalledWith({ where: { id: ID, userId: UID } });
    });
});

describe('links', () => {
    const app = () => makeApp('userLinkRoutes');

    it('lists the caller’s links, pinned first', async () => {
        const findMany = vi.spyOn(prisma.userLink, 'findMany').mockResolvedValue([]);
        await request(app()).get('/api/user/links').set(as(UID));
        expect(findMany.mock.calls[0][0]).toMatchObject({ where: { userId: UID }, orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }] });
    });

    it('stores the address with its https://, and refuses anything but http(s)', async () => {
        vi.spyOn(prisma.userLink, 'count').mockResolvedValue(0);
        const create = vi.spyOn(prisma.userLink, 'create').mockImplementation(async ({ data }) => data);
        let res = await request(app()).post('/api/user/links').set(as(UID)).send(link());
        expect(res.status).toBe(201);
        expect(create.mock.calls[0][0].data).toMatchObject({ userId: UID, url: 'https://drive.google.com/drive/folders/abc', pinned: true, note: null });
        for (const url of ['javascript:alert(1)', 'ftp://example.com/x', '']) {
            res = await request(app()).post('/api/user/links').set(as(UID)).send(link({ url }));
            expect(res.status).toBe(400);
        }
    });

    it('replaces and deletes only the caller’s link', async () => {
        const update = vi.spyOn(prisma.userLink, 'update').mockImplementation(async ({ data }) => ({ id: ID, ...data }));
        await request(app()).put(`/api/user/links/${ID}`).set(as(UID)).send(withoutId(link({ pinned: false })));
        expect(update.mock.calls[0][0].where).toEqual({ id: ID, userId: UID });
        const deleteMany = vi.spyOn(prisma.userLink, 'deleteMany').mockResolvedValue({ count: 1 });
        await request(app()).delete(`/api/user/links/${ID}`).set(as(UID));
        expect(deleteMany).toHaveBeenCalledWith({ where: { id: ID, userId: UID } });
    });
});
