import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// A bookmark made offline can reach a server that already has it (saved on another
// device, or the same write sent twice). That has to count as done: the offline queue
// retries a 409, so one would sit there for ever.
const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');

const UID = 'uid-bookmarks';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const QUESTION = 'q-1';

function makeApp() {
    delete require.cache[require.resolve('../src/routes/bookmarkRoutes')];
    const app = express();
    app.use(express.json());
    app.use('/api/bookmarks', require('../src/routes/bookmarkRoutes'));
    return app;
}

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
});
afterEach(() => vi.restoreAllMocks());

describe('POST /api/bookmarks', () => {
    it('creates one', async () => {
        const create = vi.spyOn(prisma.bookmark, 'create').mockResolvedValue({ id: 'b1' });
        const res = await request(makeApp()).post('/api/bookmarks').set(as(UID)).send({ questionId: QUESTION });
        expect(res.status).toBe(201);
        expect(create.mock.calls[0][0].data).toEqual({ userId: UID, questionId: QUESTION });
    });

    it('one already saved is a success, not a 409', async () => {
        vi.spyOn(prisma.bookmark, 'create').mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }));
        const res = await request(makeApp()).post('/api/bookmarks').set(as(UID)).send({ questionId: QUESTION });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, alreadySaved: true });
    });

    it('a question that no longer exists is still refused', async () => {
        vi.spyOn(prisma.bookmark, 'create').mockRejectedValue(Object.assign(new Error('fk'), { code: 'P2003' }));
        const res = await request(makeApp()).post('/api/bookmarks').set(as(UID)).send({ questionId: 'gone' });
        expect(res.status).toBe(404);
    });
});
