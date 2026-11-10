import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// PUT /api/user/settings: Getting started is remembered on the account, so a
// second device doesn't show it again, and "Show it again" brings it back.
// The dashboard carries the setting back to the app, so its cache is dropped.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const dashboardCache = require('../src/services/dashboardCache');
const userRoutes = require('../src/routes/userRoutes');

const UID = 'uid-tour';
function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/user', userRoutes);
    return app;
}
const put = (body) => request(makeApp()).put('/api/user/settings').set({ Authorization: `Bearer ${UID}` }).send(body);

let update;
beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
    update = vi.spyOn(prisma.user, 'update').mockResolvedValue({ id: UID });
});
afterEach(() => vi.restoreAllMocks());

describe('PUT /api/user/settings', () => {
    it('stamps the time Getting started was finished or skipped', async () => {
        const before = Date.now();
        const res = await put({ tourDone: true });
        expect(res.status).toBe(200);
        const { where, data } = update.mock.calls[0][0];
        expect(where).toEqual({ id: UID });
        expect(data.tourDoneAt).toBeInstanceOf(Date);
        expect(data.tourDoneAt.getTime()).toBeGreaterThanOrEqual(before);
        expect(Object.keys(data)).toEqual(['tourDoneAt']);
    });

    it('clears it to show the card again', async () => {
        await put({ tourDone: false });
        expect(update.mock.calls[0][0].data).toEqual({ tourDoneAt: null });
    });

    it('drops the cached dashboard, which carries the settings back', async () => {
        dashboardCache.set(UID, { stale: true });
        await put({ examDate: '2027-04-10' });
        expect(dashboardCache.get(UID)).toBeNull();
    });

    it('still refuses a body with nothing to change, or a wrong type', async () => {
        expect((await put({})).status).toBe(400);
        expect((await put({ tourDone: 'yes' })).status).toBe(400);
        expect(update).not.toHaveBeenCalled();
    });
});
