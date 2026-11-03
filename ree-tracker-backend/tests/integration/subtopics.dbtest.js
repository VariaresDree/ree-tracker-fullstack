import { describe, it, expect, afterAll, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// The raw bulk statements and the upsert against a real Postgres: nulls and
// booleans survive jsonb_to_recordset, a second save updates, one learner never
// touches another's row, and reordering stays inside the topic.

const verifyIdToken = vi.fn(async (token) => ({ uid: token, email: `${token}@example.test` }));
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../../src/config/db');
const userRoutes = require('../../src/routes/userSubtopicRoutes');
const adminRoutes = require('../../src/routes/adminSubtopicRoutes');
const { mergeSubtopics, subtopicProgress } = require('@ree/shared');

const A = 'subtopics-a';
const B = 'subtopics-b';
const ADMIN = 'subtopics-admin';
const USERS = [A, B, ADMIN];
const T1 = 'subtopics-topic-1';
const T2 = 'subtopics-topic-2';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

const app = express();
app.use(express.json());
app.use('/api/user', userRoutes);
app.use('/api/admin/subtopics', adminRoutes);

const cleanUp = async () => {
    await prisma.topic.deleteMany({ where: { id: { in: [T1, T2] } } });
    await prisma.user.deleteMany({ where: { id: { in: USERS } } });
};

beforeEach(async () => {
    await cleanUp();
    await prisma.user.createMany({ data: USERS.map((id) => ({ id, email: `${id}@example.test`, role: id === ADMIN ? 'ADMIN' : 'USER' })) });
    await prisma.topic.createMany({ data: [
        { id: T1, subject: 'Mathematics', name: 'Subtopics Test One', normKey: 'subtopics test one' },
        { id: T2, subject: 'Mathematics', name: 'Subtopics Test Two', normKey: 'subtopics test two' },
    ] });
});

afterAll(async () => {
    await cleanUp();
    await prisma.$disconnect();
});

const addAll = (topicId, names) => request(app).post('/api/admin/subtopics').set(as(ADMIN)).send({ topicId, names });

describe('subtopics', () => {
    it('admin adds, skips repeats, reorders within the topic, renames and retires', async () => {
        const res = await addAll(T1, ['First', 'Second', 'first']);
        expect(res.status).toBe(200);
        expect(res.body.items.map((s) => s.name)).toEqual(['First', 'Second']);
        const [first, second] = res.body.items;
        const other = (await addAll(T2, ['Elsewhere'])).body.items[0];

        const moved = await request(app).post('/api/admin/subtopics/reorder').set(as(ADMIN)).send({ topicId: T1, ids: [second.id, first.id, other.id] });
        expect(moved.body.items.map((s) => s.name)).toEqual(['Second', 'First']);
        expect((await prisma.syllabusSubtopic.findUnique({ where: { id: other.id } })).sortOrder).toBe(0);

        expect((await request(app).put(`/api/admin/subtopics/${first.id}`).set(as(ADMIN)).send({ name: 'Second' })).status).toBe(409);
        expect((await request(app).put(`/api/admin/subtopics/${first.id}`).set(as(ADMIN)).send({ name: 'Renamed' })).body.item.name).toBe('Renamed');

        await request(app).put(`/api/admin/subtopics/${first.id}`).set(as(ADMIN)).send({ active: false });
        const back = await addAll(T1, ['renamed']);
        expect(back.body.added).toBe(1);
        expect(back.body.items.find((s) => s.id === first.id).active).toBe(true);
    });

    it('a learner’s tick upserts, follows a rename, and survives a retirement', async () => {
        const [sub] = (await addAll(T1, ['Topic A'])).body.items;
        const tick = { topicId: T1, subtopicId: sub.id, done: true, doneOn: '2026-11-03' };
        expect((await request(app).put(`/api/user/syllabus-subtopics/${sub.id}`).set(as(A)).send(tick)).status).toBe(200);
        expect((await request(app).put(`/api/user/syllabus-subtopics/${sub.id}`).set(as(A)).send({ ...tick, hidden: true })).body.item.hidden).toBe(true);
        expect((await request(app).put(`/api/user/syllabus-subtopics/${sub.id}`).set(as(B)).send({ ...tick, done: false })).status).toBe(200);

        const mine = (await request(app).get('/api/user/syllabus-subtopics').set(as(A))).body.items;
        expect(mine).toHaveLength(1);
        expect(mine[0]).toMatchObject({ id: sub.id, done: true, hidden: true });

        await request(app).put(`/api/admin/subtopics/${sub.id}`).set(as(ADMIN)).send({ name: 'Topic A renamed', active: false });
        const premade = await prisma.syllabusSubtopic.findMany({ where: { topicId: T1 } });
        expect(mergeSubtopics(premade, mine).map((r) => r.name)).toEqual(['Topic A renamed']);
    });

    it('an unknown topic or suggested subtopic is a 404, single or bulk', async () => {
        expect((await request(app).put('/api/user/syllabus-subtopics/own-1').set(as(A)).send({ topicId: 'no-such-topic', name: 'Mine' })).status).toBe(404);
        expect((await request(app).put('/api/user/syllabus-subtopics/no-such').set(as(A)).send({ topicId: T1, subtopicId: 'no-such' })).status).toBe(404);
        expect((await request(app).post('/api/user/syllabus-subtopics/bulk').set(as(A)).send({ items: [{ id: 'own-2', topicId: 'no-such-topic', name: 'Mine' }] })).status).toBe(404);
    });

    it('bulk keeps nulls and booleans, updates on a second save, and leaves others alone', async () => {
        const subs = (await addAll(T1, ['One', 'Two'])).body.items;
        const items = subs.map((s) => ({ id: s.id, topicId: T1, subtopicId: s.id, done: true, doneOn: '2026-11-03' }));
        items.push({ id: 'own-row-1', topicId: T1, name: 'Mine', sortOrder: 5 });
        const res = await request(app).post('/api/user/syllabus-subtopics/bulk').set(as(A)).send({ items });
        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(3);
        const own = res.body.items.find((r) => r.id === 'own-row-1');
        expect(own).toMatchObject({ subtopicId: null, name: 'Mine', done: false, doneOn: null, sortOrder: 5, hidden: false });
        expect(res.body.items.find((r) => r.id === subs[0].id)).toMatchObject({ name: null, sortOrder: null, done: true });

        await request(app).post('/api/user/syllabus-subtopics/bulk').set(as(A)).send({ items: subs.map((s) => ({ id: s.id, topicId: T1, subtopicId: s.id, done: false })) });
        const mine = (await request(app).get('/api/user/syllabus-subtopics').set(as(A))).body.items;
        const premade = await prisma.syllabusSubtopic.findMany({ where: { topicId: T1 } });
        expect(subtopicProgress(mergeSubtopics(premade, mine))).toEqual({ done: 0, total: 3 });

        await request(app).post('/api/user/syllabus-subtopics/bulk').set(as(B)).send({ items: [{ id: subs[0].id, topicId: T1, subtopicId: subs[0].id, done: true }] });
        expect((await request(app).get('/api/user/syllabus-subtopics').set(as(A))).body.items.find((r) => r.id === subs[0].id).done).toBe(false);

        expect((await request(app).delete('/api/user/syllabus-subtopics/own-row-1').set(as(B))).body.deleted).toBe(0);
        expect((await request(app).delete('/api/user/syllabus-subtopics/own-row-1').set(as(A))).body.deleted).toBe(1);
    });

    it('a learner’s rows go with their account', async () => {
        const [sub] = (await addAll(T1, ['Gone'])).body.items;
        await request(app).put(`/api/user/syllabus-subtopics/${sub.id}`).set(as(A)).send({ topicId: T1, subtopicId: sub.id, done: true });
        await prisma.user.delete({ where: { id: A } });
        expect(await prisma.userSubtopic.count({ where: { userId: A } })).toBe(0);
        expect(await prisma.syllabusSubtopic.count({ where: { id: sub.id } })).toBe(1);
    });
});
