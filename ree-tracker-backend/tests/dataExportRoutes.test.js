import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// See questionRoutes.authz.test.js for why the patch comes before the requires.
const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const routes = require('../src/routes/dataExportRoutes');
const userRoutes = require('../src/routes/userRoutes');

const { OWN_ROWS } = routes;
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

describe('the data export', () => {
    let app;
    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/user', routes);
        app.use('/api/user', userRoutes);
        verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
        vi.spyOn(prisma.user, 'upsert').mockImplementation(async ({ where }) => ({ id: where.id, role: 'USER' }));
        vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => ({ id: where.id, email: 'a@b.c', role: 'USER' }));
        for (const name of Object.keys(OWN_ROWS)) {
            vi.spyOn(OWN_ROWS[name](), 'findMany').mockResolvedValue([{ id: `${name}-1`, userId: 'me' }]);
        }
    });
    afterEach(() => vi.restoreAllMocks());

    it('needs a sign-in', async () => {
        expect((await request(app).get('/api/user/export')).status).toBe(401);
    });

    it('asks every table for the caller’s rows only', async () => {
        const res = await request(app).get('/api/user/export').set(as('me'));
        expect(res.status).toBe(200);
        for (const name of Object.keys(OWN_ROWS)) {
            expect(OWN_ROWS[name]().findMany.mock.calls[0][0].where).toEqual({ userId: 'me' });
        }
    });

    it('returns each table by name, without the owner id on every row', async () => {
        const res = await request(app).get('/api/user/export').set(as('me2'));
        expect(res.body.user.id).toBe('me2');
        expect(res.body.rows.notes).toEqual([{ id: 'notes-1' }]);
        expect(Object.keys(res.body.rows).sort()).toEqual(Object.keys(OWN_ROWS).sort());
        expect(res.body.exportedAt).toBeTruthy();
    });

    it('never includes tokens or plumbing', () => {
        const names = Object.keys(OWN_ROWS).join(' ').toLowerCase();
        expect(names).not.toMatch(/token|idempot|leaderboard/);
    });

    it('a failure is a plain 500', async () => {
        OWN_ROWS.notes().findMany.mockRejectedValue(new Error('db down'));
        const res = await request(app).get('/api/user/export').set(as('me3'));
        expect(res.status).toBe(500);
        expect(res.body.error).not.toContain('db down');
    });

    it('limits how often, per person', async () => {
        for (let i = 0; i < 10; i += 1) expect((await request(app).get('/api/user/export').set(as('busy'))).status).toBe(200);
        expect((await request(app).get('/api/user/export').set(as('busy'))).status).toBe(429);
        expect((await request(app).get('/api/user/export').set(as('calm'))).status).toBe(200);
    });
});

describe('deleting an account', () => {
    let app;
    let txn;
    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/user', userRoutes);
        verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
        vi.spyOn(prisma.user, 'upsert').mockImplementation(async ({ where }) => ({ id: where.id, role: 'USER' }));
        for (const [table, fn] of [['questionFlag', 'deleteMany'], ['idempotencyRecord', 'deleteMany'], ['leaderboardEntry', 'deleteMany'], ['battle', 'updateMany'], ['user', 'deleteMany']]) {
            vi.spyOn(prisma[table], fn).mockImplementation((args) => ({ table, fn, args }));
        }
        txn = vi.spyOn(prisma, '$transaction').mockResolvedValue([]);
    });
    afterEach(() => vi.restoreAllMocks());

    it('clears the tables no cascade reaches, in one transaction with the user', async () => {
        const res = await request(app).delete('/api/user/profile').set(as('me'));
        expect(res.status).toBe(200);
        const ops = txn.mock.calls[0][0];
        expect(ops.map((o) => o.table)).toEqual(['questionFlag', 'idempotencyRecord', 'leaderboardEntry', 'battle', 'user']);
        expect(ops[0].args.where).toEqual({ userId: 'me' });
        expect(ops[3].args).toEqual({ where: { hostId: 'me' }, data: { hostId: 'deleted-account' } });
        expect(ops[4].args.where).toEqual({ id: 'me' });
    });

    it('an account that never synced is still a success', async () => {
        txn.mockResolvedValue([{ count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }]);
        expect((await request(app).delete('/api/user/profile').set(as('never'))).status).toBe(200);
    });

    it('a failure reports one, and says nothing went', async () => {
        txn.mockRejectedValue(new Error('db down'));
        const res = await request(app).delete('/api/user/profile').set(as('me'));
        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Account deletion failed.');
    });
});
