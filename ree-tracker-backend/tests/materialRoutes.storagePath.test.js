import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// See questionRoutes.authz.test.js for why the patch comes before the requires.
const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const storage = require('../src/services/storage');
const routes = require('../src/routes/materialRoutes');

const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const LINK = { name: 'Notes', type: 'pdf', url: 'https://firebasestorage.example/x' };

describe('a handout uploaded to Firebase keeps its file path', () => {
    let app;
    let create;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/materials', routes);
        verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
        vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: 'admin', role: 'ADMIN' });
        vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'admin', role: 'ADMIN' });
        create = vi.spyOn(prisma.material, 'create').mockImplementation(async ({ data }) => ({ id: 'm1', ...data }));
    });

    afterEach(() => vi.restoreAllMocks());

    it('saves the path the client sends', async () => {
        const res = await request(app).post('/api/materials/upload').set(as('admin'))
            .send({ ...LINK, storagePath: 'board_materials/admin/1_notes.pdf' });
        expect(res.status).toBe(201);
        expect(create.mock.calls[0][0].data.storagePath).toBe('board_materials/admin/1_notes.pdf');
    });

    it('ignores a path outside the handouts folder', async () => {
        await request(app).post('/api/materials/upload').set(as('admin')).send({ ...LINK, storagePath: '../../etc/passwd' });
        expect(create.mock.calls[0][0].data.storagePath).toBeNull();
    });

    it('a link with no file has no path', async () => {
        await request(app).post('/api/materials/upload').set(as('admin')).send(LINK);
        expect(create.mock.calls[0][0].data.storagePath).toBeNull();
    });

    it('deleting one leaves its file to the client: the server’s storage driver never held it', async () => {
        vi.spyOn(prisma.material, 'findUnique').mockResolvedValue({ id: 'm1', storagePath: 'board_materials/admin/1_notes.pdf' });
        vi.spyOn(prisma.material, 'delete').mockResolvedValue({});
        const driverDelete = vi.spyOn(storage, 'delete').mockResolvedValue();
        const res = await request(app).delete('/api/materials/m1').set(as('admin'));
        expect(res.status).toBe(200);
        expect(driverDelete).not.toHaveBeenCalled();
    });

    it('a file the server’s driver holds is still deleted there', async () => {
        vi.spyOn(prisma.material, 'findUnique').mockResolvedValue({ id: 'm2', storagePath: 'root/ab12-notes.pdf' });
        vi.spyOn(prisma.material, 'delete').mockResolvedValue({});
        const driverDelete = vi.spyOn(storage, 'delete').mockResolvedValue();
        await request(app).delete('/api/materials/m2').set(as('admin'));
        expect(driverDelete).toHaveBeenCalledWith('root/ab12-notes.pdf');
    });
});
