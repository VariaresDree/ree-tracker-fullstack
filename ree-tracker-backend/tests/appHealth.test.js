import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// See questionRoutes.authz.test.js for why the patch comes before the requires.
const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { invalidateRole } = require('../src/middlewares/roleMiddleware');
const appHealthRoutes = require('../src/routes/appHealthRoutes');
const adminRoutes = require('../src/routes/adminRoutes');
const { fingerprintOf, stripEmails, healthSummary, recordErrors } = require('../src/services/appHealthService');
const ServerErrorCapture = require('../src/services/serverErrorCapture');

const ADMIN_UID = 'uid-admin';
const USER_UID = 'uid-user';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

let app;

beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/user', appHealthRoutes);
    app.use('/api/admin', adminRoutes);
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: USER_UID });
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => ({
        role: where.id === ADMIN_UID ? 'ADMIN' : 'USER',
    }));
    invalidateRole(ADMIN_UID);
    invalidateRole(USER_UID);
});

afterEach(() => vi.restoreAllMocks());

describe('POST /api/user/app-version', () => {
    it('refuses without a sign-in, and writes nothing', async () => {
        const upsert = vi.spyOn(prisma.appVersionSeen, 'upsert').mockResolvedValue({});
        const res = await request(app).post('/api/user/app-version').send({ version: 'abc1234' });
        expect(res.status).toBe(401);
        expect(upsert).not.toHaveBeenCalled();
    });

    it('saves the version against the signed-in person, not one they name', async () => {
        const upsert = vi.spyOn(prisma.appVersionSeen, 'upsert').mockResolvedValue({});
        const res = await request(app).post('/api/user/app-version').set(as(USER_UID)).send({ version: 'abc1234', userId: 'someone-else' });
        expect(res.status).toBe(204);
        expect(upsert.mock.calls[0][0].create).toMatchObject({ userId: USER_UID, version: 'abc1234' });
    });

    it.each([['<script>'], ['x'.repeat(41)], [''], [42]])('refuses the version %s', async (version) => {
        const upsert = vi.spyOn(prisma.appVersionSeen, 'upsert').mockResolvedValue({});
        const res = await request(app).post('/api/user/app-version').set(as(USER_UID)).send({ version });
        expect(res.status).toBe(400);
        expect(upsert).not.toHaveBeenCalled();
    });
});

describe('POST /api/user/client-errors', () => {
    const one = { message: 'Cannot read x', route: '/practice', version: 'abc1234' };

    it('refuses without a sign-in', async () => {
        const res = await request(app).post('/api/user/client-errors').send({ errors: [one] });
        expect(res.status).toBe(401);
    });

    it('saves an error with no user id, always as from the app', async () => {
        const upsert = vi.spyOn(prisma.appError, 'upsert').mockResolvedValue({});
        const res = await request(app).post('/api/user/client-errors').set(as(USER_UID))
            .send({ errors: [{ ...one, source: 'server', count: 9999 }] });
        expect(res.status).toBe(204);
        const { create, update } = upsert.mock.calls[0][0];
        expect(create).toMatchObject({ source: 'client', message: 'Cannot read x', count: 1 });
        expect(update.count).toEqual({ increment: 1 });
        expect(JSON.stringify(create)).not.toContain(USER_UID);
    });

    it.each([
        ['too many', { errors: Array(11).fill(one) }],
        ['none', { errors: [] }],
        ['too long', { errors: [{ ...one, message: 'x'.repeat(501) }] }],
        ['no message', { errors: [{ route: '/x' }] }],
    ])('refuses %s', async (_name, body) => {
        const upsert = vi.spyOn(prisma.appError, 'upsert').mockResolvedValue({});
        const res = await request(app).post('/api/user/client-errors').set(as(USER_UID)).send(body);
        expect(res.status).toBe(400);
        expect(upsert).not.toHaveBeenCalled();
    });
});

describe('admin reads', () => {
    it.each([['get', '/api/admin/app-health'], ['delete', '/api/admin/app-health/errors/e1']])('%s %s refuses a learner', async (method, url) => {
        const del = vi.spyOn(prisma.appError, 'deleteMany').mockResolvedValue({ count: 0 });
        const res = await request(app)[method](url).set(as(USER_UID));
        expect(res.status).toBe(403);
        expect(del).not.toHaveBeenCalled();
    });

    it('sums versions per week, and clears what’s past keeping', async () => {
        const errDel = vi.spyOn(prisma.appError, 'deleteMany').mockResolvedValue({ count: 0 });
        vi.spyOn(prisma.appVersionSeen, 'deleteMany').mockResolvedValue({ count: 0 });
        const seen = new Date('2026-11-03T00:00:00Z');
        const group = vi.spyOn(prisma.appVersionSeen, 'groupBy').mockResolvedValue([{ version: 'v1', _count: { _all: 3 }, _max: { lastSeenAt: seen } }]);
        vi.spyOn(prisma.appError, 'findMany').mockResolvedValue([]);
        const now = new Date('2026-11-03T00:00:00Z');
        const out = await healthSummary(now);
        expect(out.versions).toEqual([{ version: 'v1', people: 3, lastSeenAt: seen }]);
        expect(group.mock.calls[0][0].where.lastSeenAt.gte).toEqual(new Date('2026-10-27T00:00:00Z'));
        expect(errDel.mock.calls[0][0].where.lastSeenAt.lt).toEqual(new Date('2026-09-04T00:00:00Z'));
    });

    it('an admin dismisses one error', async () => {
        const del = vi.spyOn(prisma.appError, 'deleteMany').mockResolvedValue({ count: 1 });
        const res = await request(app).delete('/api/admin/app-health/errors/e1').set(as(ADMIN_UID));
        expect(res.status).toBe(204);
        expect(del).toHaveBeenCalledWith({ where: { id: 'e1' } });
    });
});

describe('grouping and privacy', () => {
    it('the same error with another id or number is one row', () => {
        expect(fingerprintOf('client', 'Question 123 not found')).toBe(fingerprintOf('client', 'Question 987 not found'));
        expect(fingerprintOf('client', 'Failed for deadbeef01')).toBe(fingerprintOf('client', 'Failed for cafebabe02'));
        expect(fingerprintOf('client', 'A broke')).not.toBe(fingerprintOf('client', 'B broke'));
        expect(fingerprintOf('client', 'A broke')).not.toBe(fingerprintOf('server', 'A broke'));
    });

    it('removes addresses', () => {
        expect(stripEmails('No user pat.lee+x@mail.example.com here')).toBe('No user [email] here');
    });

    it('a failed write never throws, because the server’s own errors come through here', async () => {
        vi.spyOn(prisma.appError, 'upsert').mockRejectedValue(new Error('db down'));
        await expect(recordErrors([{ message: 'x' }], 'server')).resolves.toBeUndefined();
    });
});

describe('capturing the server’s error lines', () => {
    const capture = (record) => {
        const t = new ServerErrorCapture({ record, version: 'abcdef1234567890' });
        clearInterval(t.timer);
        return t;
    };

    it('groups repeats, and keeps only the message, error, stack and path', async () => {
        const record = vi.fn(async () => {});
        const t = capture(record);
        const line = { level: 'error', message: 'Unhandled error', error: 'boom', stack: 'at x', path: '/api/q?token=secret', userEmail: 'a@b.co' };
        t.log(line, () => {});
        t.log(line, () => {});
        await t.flush();
        expect(record).toHaveBeenCalledTimes(1);
        const [items, source] = record.mock.calls[0];
        expect(source).toBe('server');
        expect(items).toEqual([{ message: 'Unhandled error: boom', stack: 'at x', route: '/api/q', version: 'abcdef1', count: 2 }]);
    });

    it('sends nothing when nothing happened, and each line only once', async () => {
        const record = vi.fn(async () => {});
        const t = capture(record);
        await t.flush();
        expect(record).not.toHaveBeenCalled();
        t.log({ message: 'x' }, () => {});
        await t.flush();
        await t.flush();
        expect(record).toHaveBeenCalledTimes(1);
    });

    it('holds a limited number of distinct errors during an outage', async () => {
        const record = vi.fn(async () => {});
        const t = capture(record);
        for (let i = 0; i < 80; i += 1) t.log({ message: `e${i}` }, () => {});
        await t.flush();
        expect(record.mock.calls[0][0]).toHaveLength(50);
    });

    it('only takes error-level lines', () => {
        expect(capture(vi.fn()).level).toBe('error');
    });
});
