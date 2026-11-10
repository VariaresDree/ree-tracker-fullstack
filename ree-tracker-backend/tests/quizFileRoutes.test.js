import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import crypto from 'node:crypto';

// See questionRoutes.authz.test.js for why the patch comes before the requires.
const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const learnerRoutes = require('../src/routes/quizFileRoutes');
const adminRoutes = require('../src/routes/adminQuizFileRoutes');
const { MAX_QUIZ_FILE_BYTES, LIST_SELECT } = require('../src/services/quizFiles');

const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const ZIP = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('quiz contents')]);
const QUERY = 'name=AC%20circuits&fileName=ac.quiz&questionCount=36&skippedCount=2&subject=EE';

const postFile = (app, who, body = ZIP, query = QUERY) => request(app)
    .post(`/api/admin/quiz-files?${query}`)
    .set(as(who))
    .set('Content-Type', 'application/octet-stream')
    .send(body);

describe('shared quiz file routes', () => {
    let app;
    const quizFile = {};

    beforeEach(() => {
        app = express();
        app.use(express.json({ limit: '2mb' }));
        app.use('/api/quiz-files', learnerRoutes);
        app.use('/api/admin/quiz-files', adminRoutes);
        verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
        const role = (id) => ({ id, role: id === 'admin' ? 'ADMIN' : 'USER' });
        vi.spyOn(prisma.user, 'upsert').mockImplementation(async ({ where }) => role(where.id));
        vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => role(where.id));
        for (const fn of ['findMany', 'findUnique', 'create', 'update', 'delete']) {
            quizFile[fn] = vi.spyOn(prisma.quizFile, fn);
        }
        quizFile.create.mockImplementation(async ({ data }) => ({ id: 'f1', ...data }));
        quizFile.update.mockImplementation(async ({ where, data }) => ({ id: where.id, ...data }));
    });

    afterEach(() => vi.restoreAllMocks());

    describe('for a learner', () => {
        it('lists without the bytes', async () => {
            quizFile.findMany.mockResolvedValue([{ id: 'f1', name: 'AC' }]);
            const res = await request(app).get('/api/quiz-files').set(as('learner'));
            expect(res.status).toBe(200);
            expect(res.body.items).toEqual([{ id: 'f1', name: 'AC' }]);
            expect(quizFile.findMany.mock.calls[0][0].select).toBe(LIST_SELECT);
            expect(LIST_SELECT.bytes).toBeUndefined();
        });

        it('downloads the file as an attachment, byte for byte', async () => {
            quizFile.findUnique.mockResolvedValue({ fileName: 'ac circuits.quiz', bytes: new Uint8Array(ZIP) });
            const res = await request(app).get('/api/quiz-files/f1/file').set(as('learner')).buffer(true)
                .parse((r, cb) => { const parts = []; r.on('data', (d) => parts.push(d)); r.on('end', () => cb(null, Buffer.concat(parts))); });
            expect(res.status).toBe(200);
            expect(Buffer.compare(res.body, ZIP)).toBe(0);
            expect(res.headers['content-type']).toContain('application/octet-stream');
            expect(res.headers['content-disposition']).toContain('attachment');
            expect(res.headers['content-disposition']).toContain('ac circuits.quiz');
        });

        it('a deleted quiz is a plain 404', async () => {
            quizFile.findUnique.mockResolvedValue(null);
            const res = await request(app).get('/api/quiz-files/gone/file').set(as('learner'));
            expect(res.status).toBe(404);
        });

        it('needs a sign-in', async () => {
            expect((await request(app).get('/api/quiz-files')).status).toBe(401);
            expect((await request(app).get('/api/quiz-files/f1/file')).status).toBe(401);
        });

        it('can’t write anything', async () => {
            expect((await postFile(app, 'learner')).status).toBe(403);
            expect((await request(app).patch('/api/admin/quiz-files/f1').set(as('learner')).send({ name: 'x' })).status).toBe(403);
            expect((await request(app).delete('/api/admin/quiz-files/f1').set(as('learner'))).status).toBe(403);
            expect((await request(app).put('/api/admin/quiz-files/f1/file?fileName=a.quiz&questionCount=1').set(as('learner'))
                .set('Content-Type', 'application/octet-stream').send(ZIP)).status).toBe(403);
            expect(quizFile.create).not.toHaveBeenCalled();
            expect(quizFile.update).not.toHaveBeenCalled();
            expect(quizFile.delete).not.toHaveBeenCalled();
        });
    });

    describe('for the admin', () => {
        it('stores the bytes with a checksum the server worked out', async () => {
            const res = await postFile(app, 'admin');
            expect(res.status).toBe(201);
            const { data, select } = quizFile.create.mock.calls[0][0];
            expect(Buffer.compare(data.bytes, ZIP)).toBe(0);
            expect(data.sizeBytes).toBe(ZIP.length);
            expect(data.checksum).toBe(crypto.createHash('sha256').update(ZIP).digest('hex'));
            expect(data).toMatchObject({ name: 'AC circuits', fileName: 'ac.quiz', questionCount: 36, skippedCount: 2, subject: 'EE', uploadedBy: 'admin' });
            expect(select).toBe(LIST_SELECT);
        });

        it('refuses what isn’t a quiz file', async () => {
            const res = await postFile(app, 'admin', Buffer.from('not a zip at all'));
            expect(res.status).toBe(400);
            expect(res.body.error).toBe("That isn't a quiz file.");
            expect(quizFile.create).not.toHaveBeenCalled();
        });

        it('refuses a wrong type, an empty body and bad details', async () => {
            const wrongType = await request(app).post(`/api/admin/quiz-files?${QUERY}`).set(as('admin')).send({ a: 1 });
            expect(wrongType.status).toBe(415);
            expect((await postFile(app, 'admin', ZIP, 'name=x&fileName=notes.pdf&questionCount=1')).status).toBe(400);
            expect((await postFile(app, 'admin', ZIP, 'name=x&fileName=a.quiz&questionCount=0')).status).toBe(400);
            expect((await postFile(app, 'admin', ZIP, 'name=x&fileName=a.quiz&questionCount=3&subject=Physics')).status).toBe(400);
            expect(quizFile.create).not.toHaveBeenCalled();
        });

        it('refuses a file over 5 MB in plain words', async () => {
            const big = Buffer.concat([ZIP, Buffer.alloc(MAX_QUIZ_FILE_BYTES)]);
            const res = await postFile(app, 'admin', big);
            expect(res.status).toBe(413);
            expect(res.body.error).toBe('Quiz files can be up to 5 MB.');
        });

        it('takes a file of exactly 5 MB', async () => {
            const exact = Buffer.concat([ZIP, Buffer.alloc(MAX_QUIZ_FILE_BYTES - ZIP.length)]);
            expect((await postFile(app, 'admin', exact)).status).toBe(201);
        });

        it('names the quiz a duplicate already is', async () => {
            quizFile.create.mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }));
            quizFile.findUnique.mockResolvedValue({ name: 'AC set 1' });
            const res = await postFile(app, 'admin');
            expect(res.status).toBe(409);
            expect(res.body.error).toBe('That file is already here, as AC set 1.');
        });

        it('replacing changes the file and its checksum, not its name', async () => {
            const res = await request(app).put('/api/admin/quiz-files/f1/file?fileName=v2.quiz&questionCount=40').set(as('admin'))
                .set('Content-Type', 'application/octet-stream').send(ZIP);
            expect(res.status).toBe(200);
            const { data } = quizFile.update.mock.calls[0][0];
            expect(data.checksum).toHaveLength(64);
            expect(data).toMatchObject({ fileName: 'v2.quiz', questionCount: 40, skippedCount: 0 });
            expect(data.name).toBeUndefined();
        });

        it('renames, and clears a description or subject', async () => {
            const res = await request(app).patch('/api/admin/quiz-files/f1').set(as('admin')).send({ name: ' New ', subject: null, description: '' });
            expect(res.status).toBe(200);
            expect(quizFile.update.mock.calls[0][0].data).toEqual({ name: 'New', subject: null, description: null });
        });

        it('a rename can’t touch the bytes', async () => {
            const res = await request(app).patch('/api/admin/quiz-files/f1').set(as('admin')).send({ checksum: 'x' });
            expect(res.status).toBe(400);
            expect(quizFile.update).not.toHaveBeenCalled();
        });

        it('uploads into a folder, or the top level when none is named', async () => {
            await postFile(app, 'admin', ZIP, `${QUERY}&folderId=fold1`);
            expect(quizFile.create.mock.calls[0][0].data.folderId).toBe('fold1');
            await postFile(app, 'admin');
            expect(quizFile.create.mock.calls[1][0].data.folderId).toBeNull();
        });

        it('moves into a folder and back to the top level', async () => {
            await request(app).patch('/api/admin/quiz-files/f1').set(as('admin')).send({ folderId: 'fold1' });
            expect(quizFile.update.mock.calls[0][0].data).toEqual({ folderId: 'fold1' });
            await request(app).patch('/api/admin/quiz-files/f1').set(as('admin')).send({ folderId: null });
            expect(quizFile.update.mock.calls[1][0].data).toEqual({ folderId: null });
        });

        it('a folder that’s gone is a 404, not a 500 the offline queue would retry for ever', async () => {
            const gone = () => Object.assign(new Error('fk'), { code: 'P2003' });
            quizFile.update.mockRejectedValueOnce(gone());
            const moved = await request(app).patch('/api/admin/quiz-files/f1').set(as('admin')).send({ folderId: 'gone' });
            expect(moved.status).toBe(404);
            expect(moved.body.code).toBe('NO_FOLDER');
            quizFile.create.mockRejectedValueOnce(gone());
            const uploaded = await postFile(app, 'admin', ZIP, `${QUERY}&folderId=gone`);
            expect(uploaded.status).toBe(404);
            expect(uploaded.body.code).toBe('NO_FOLDER');
        });

        it('deletes, and a missing one is a 404', async () => {
            quizFile.delete.mockResolvedValueOnce({});
            expect((await request(app).delete('/api/admin/quiz-files/f1').set(as('admin'))).status).toBe(200);
            quizFile.delete.mockRejectedValueOnce(Object.assign(new Error('gone'), { code: 'P2025' }));
            expect((await request(app).delete('/api/admin/quiz-files/f2').set(as('admin'))).status).toBe(404);
        });
    });
});
