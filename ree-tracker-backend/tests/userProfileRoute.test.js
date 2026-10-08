import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// GET and PUT /api/user/profile returned the raw User row. Its globalStreak is
// the write-side value, only rewritten by an answer, so it could show a run
// that broke days ago; the dashboard route is where the streak is judged.
// The response is now the account fields only.
//
// Same identity/Prisma pattern as plannerRoutes.test.js.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');

const UID = 'uid-profile';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

const row = (over = {}) => ({
    id: UID,
    email: `${UID}@example.com`,
    displayName: 'Engr. Cruz',
    photoURL: null,
    role: 'USER',
    globalStreak: 9,
    thetaRating: 1.2,
    standardError: 0.4,
    activityCalendar: { '2026-01-01': 4 },
    microTopics: { Algebra: {} },
    examDate: '2027-04-01',
    dailyTarget: 50,
    eloRating: 1200,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    lastActive: new Date('2026-10-08T00:00:00Z'),
    ...over,
});

const ACCOUNT_FIELDS = ['createdAt', 'dailyTarget', 'displayName', 'email', 'examDate', 'id', 'lastActive', 'photoURL', 'role'];

function makeApp() {
    delete require.cache[require.resolve('../src/routes/userRoutes')];
    const userRoutes = require('../src/routes/userRoutes');
    const app = express();
    app.use(express.json());
    app.use('/api/user', userRoutes);
    return app;
}

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    // authMiddleware and the GET handler both upsert the caller's row.
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue(row());
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('/api/user/profile responds with account fields only', () => {
    it('GET leaves out the stored streak and the rating/JSON columns', async () => {
        const res = await request(makeApp()).get('/api/user/profile').set(as(UID));
        expect(res.status).toBe(200);
        expect(Object.keys(res.body.user).sort()).toEqual(ACCOUNT_FIELDS);
        expect(res.body.user.displayName).toBe('Engr. Cruz');
        expect(res.body.user).not.toHaveProperty('globalStreak');
    });

    it('GET backfills a missing name and answers with the same shape', async () => {
        prisma.user.upsert.mockResolvedValue(row({ displayName: null }));
        vi.spyOn(prisma.user, 'update').mockResolvedValue(row({ displayName: 'uid-profile' }));
        const res = await request(makeApp()).get('/api/user/profile').set(as(UID));
        expect(res.status).toBe(200);
        expect(Object.keys(res.body.user).sort()).toEqual(ACCOUNT_FIELDS);
        expect(res.body.user.displayName).toBe('uid-profile');
    });

    it('PUT answers with the same shape', async () => {
        vi.spyOn(prisma.user, 'update').mockResolvedValue(row({ displayName: 'Engr. Reyes' }));
        const res = await request(makeApp()).put('/api/user/profile').set(as(UID)).send({ displayName: 'Engr. Reyes' });
        expect(res.status).toBe(200);
        expect(Object.keys(res.body.user).sort()).toEqual(ACCOUNT_FIELDS);
        expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: UID }, data: { displayName: 'Engr. Reyes' } });
    });

    it('PUT rejects a name over the shared 32-character limit', async () => {
        const update = vi.spyOn(prisma.user, 'update');
        const res = await request(makeApp()).put('/api/user/profile').set(as(UID)).send({ displayName: 'x'.repeat(33) });
        expect(res.status).toBe(400);
        expect(update).not.toHaveBeenCalled();
    });
});
