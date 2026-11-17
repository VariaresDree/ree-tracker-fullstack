import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Hidden handouts (2026-11-17): the admin hides a folder or a file instead of
// deleting it. Learners never receive it, nor anything inside a hidden folder,
// quiz files included; admins get everything, flagged.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { forLearner, hiddenFolderIds } = require('../src/services/handoutVisibility');
const { invalidateRole } = require('../src/middlewares/roleMiddleware');

const as = (uid) => ({ Authorization: `Bearer ${uid}` });
// Review Centers (hidden) › Center A › notes; Lectures (shown).
const FOLDERS = [
    { id: 'rc', name: 'Review Centers', parentId: null, hidden: true },
    { id: 'rcA', name: 'Center A', parentId: 'rc', hidden: false },
    { id: 'lec', name: 'Lectures', parentId: null, hidden: false },
];
const MATERIALS = [
    { id: 'm-rc', name: 'In hidden folder', folderId: 'rcA', hidden: false },
    { id: 'm-lec', name: 'Lecture 1', folderId: 'lec', hidden: false },
    { id: 'm-off', name: 'Hidden file', folderId: 'lec', hidden: true },
    { id: 'm-top', name: 'Top level', folderId: null, hidden: false },
];
const QUIZZES = [
    { id: 'q-rc', name: 'Center quiz', folderId: 'rcA' },
    { id: 'q-top', name: 'Open quiz', folderId: null },
];

function app() {
    const a = express();
    a.use(express.json());
    a.use('/api/materials', require('../src/routes/materialRoutes'));
    a.use('/api/quiz-files', require('../src/routes/quizFileRoutes'));
    return a;
}

let role;
beforeEach(() => {
    role = 'USER';
    invalidateRole?.('learner'); invalidateRole?.('admin');
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockImplementation(async () => ({ id: role === 'ADMIN' ? 'admin' : 'learner', role }));
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async () => ({ role }));
    vi.spyOn(prisma.folder, 'findMany').mockResolvedValue(FOLDERS);
    vi.spyOn(prisma.material, 'findMany').mockResolvedValue(MATERIALS);
    vi.spyOn(prisma.quizFile, 'findMany').mockResolvedValue(QUIZZES);
});
afterEach(() => vi.restoreAllMocks());

describe('handoutVisibility', () => {
    it('a hidden folder hides its whole subtree', () => {
        expect([...hiddenFolderIds(FOLDERS)].sort()).toEqual(['rc', 'rcA']);
    });

    it('the learner view drops hidden folders, files in them, hidden files and their quiz files', () => {
        const v = forLearner({ folders: FOLDERS, materials: MATERIALS, quizFiles: QUIZZES });
        expect(v.folders.map((f) => f.id)).toEqual(['lec']);
        expect(v.materials.map((m) => m.id)).toEqual(['m-lec', 'm-top']);
        expect(v.quizFiles.map((q) => q.id)).toEqual(['q-top']);
    });
});

describe('GET /api/materials', () => {
    it('a learner gets only what is shown', async () => {
        const res = await request(app()).get('/api/materials').set(as('learner'));
        expect(res.status).toBe(200);
        expect(res.body.folders.map((f) => f.id)).toEqual(['lec']);
        expect(res.body.materials.map((m) => m.id)).toEqual(['m-lec', 'm-top']);
        expect(res.body.quizFiles.map((q) => q.id)).toEqual(['q-top']);
    });

    it('an admin gets everything, with the flags', async () => {
        role = 'ADMIN';
        const res = await request(app()).get('/api/materials').set(as('admin'));
        expect(res.body.folders).toHaveLength(3);
        expect(res.body.materials).toHaveLength(4);
        expect(res.body.folders.find((f) => f.id === 'rc').hidden).toBe(true);
    });
});

describe('/api/quiz-files', () => {
    it('lists only quiz files outside hidden folders, and refuses a hidden one', async () => {
        const list = await request(app()).get('/api/quiz-files').set(as('learner'));
        expect(list.body.items.map((q) => q.id)).toEqual(['q-top']);
        vi.spyOn(prisma.quizFile, 'findUnique').mockResolvedValue({ fileName: 'c.zip', bytes: Buffer.from('PK'), folderId: 'rcA' });
        expect((await request(app()).get('/api/quiz-files/q-rc/file').set(as('learner'))).status).toBe(404);
    });

    it('an admin can still download it', async () => {
        role = 'ADMIN';
        vi.spyOn(prisma.quizFile, 'findUnique').mockResolvedValue({ fileName: 'c.zip', bytes: Buffer.from('PK'), folderId: 'rcA' });
        expect((await request(app()).get('/api/quiz-files/q-rc/file').set(as('admin'))).status).toBe(200);
    });
});

describe('PATCH hidden', () => {
    it('hides and shows a folder and a file; refuses a non-boolean; admin only', async () => {
        role = 'ADMIN';
        const fu = vi.spyOn(prisma.folder, 'update').mockResolvedValue({ id: 'rc', hidden: false });
        const mu = vi.spyOn(prisma.material, 'update').mockResolvedValue({ id: 'm-off', hidden: false });
        expect((await request(app()).patch('/api/materials/folders/rc').set(as('admin')).send({ hidden: false })).status).toBe(200);
        expect(fu.mock.calls[0][0].data).toEqual({ hidden: false });
        expect((await request(app()).patch('/api/materials/m-off').set(as('admin')).send({ hidden: true })).status).toBe(200);
        expect(mu.mock.calls[0][0].data).toEqual({ hidden: true });
        expect((await request(app()).patch('/api/materials/m-off').set(as('admin')).send({ hidden: 'yes' })).status).toBe(400);
        role = 'USER'; invalidateRole?.('admin'); invalidateRole?.('learner');
        expect((await request(app()).patch('/api/materials/m-off').set(as('learner')).send({ hidden: false })).status).toBe(403);
    });
});
