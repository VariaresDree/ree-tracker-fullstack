import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// See questionRoutes.authz.test.js for why the patch comes before the requires.
const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const routes = require('../src/routes/drawPrefsRoutes');

const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const GOOD = { drawMode: 'own', ownCounts: { EE: { Electromagnetism: 12 }, Mathematics: { Algebra: 0 } } };

describe('/api/user/draw-prefs', () => {
    let app;
    let update;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/user', routes);
        verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
        vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: 'u1' });
        vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ drawPrefs: null });
        update = vi.spyOn(prisma.user, 'update').mockResolvedValue({});
    });

    afterEach(() => vi.restoreAllMocks());

    it('needs a sign-in', async () => {
        expect((await request(app).get('/api/user/draw-prefs')).status).toBe(401);
        expect((await request(app).put('/api/user/draw-prefs').send(GOOD)).status).toBe(401);
    });

    it('someone who has never chosen reads null', async () => {
        const res = await request(app).get('/api/user/draw-prefs').set(as('u1'));
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ prefs: null });
    });

    it('saves to the caller’s own row, and reads it back', async () => {
        const res = await request(app).put('/api/user/draw-prefs').set(as('u1')).send(GOOD);
        expect(res.status).toBe(200);
        expect(res.body.prefs).toEqual(GOOD);
        expect(update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { drawPrefs: GOOD } });
        prisma.user.findUnique.mockResolvedValue({ drawPrefs: GOOD });
        expect((await request(app).get('/api/user/draw-prefs').set(as('u1'))).body.prefs).toEqual(GOOD);
        expect(prisma.user.findUnique.mock.calls.at(-1)[0].where).toEqual({ id: 'u1' });
    });

    it.each([
        ['an unknown mode', { drawMode: 'weighted', ownCounts: {} }],
        ['a missing field', { drawMode: 'even' }],
        ['an unknown subject', { drawMode: 'own', ownCounts: { Other: { A: 1 } } }],
        ['a negative count', { drawMode: 'own', ownCounts: { EE: { A: -1 } } }],
        ['a fraction', { drawMode: 'own', ownCounts: { EE: { A: 1.5 } } }],
        ['too many topics', { drawMode: 'own', ownCounts: { EE: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`T${i}`, 1])) } }],
        ['another field', { drawMode: 'even', ownCounts: {}, userId: 'someone-else' }],
    ])('refuses %s', async (_label, body) => {
        expect((await request(app).put('/api/user/draw-prefs').set(as('u1')).send(body)).status).toBe(400);
        expect(update).not.toHaveBeenCalled();
    });
});
