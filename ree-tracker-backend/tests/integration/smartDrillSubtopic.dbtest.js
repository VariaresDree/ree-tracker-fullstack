import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Smart drill's lean on the weakest subtopic (2026-11-15), against a real
// Postgres: the grouped count joins answers, questions and the subtopic's name,
// and about half the drill comes from that subtopic.

const verifyIdToken = vi.fn(async (token) => ({ uid: token, email: `${token}@example.test` }));
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../../src/config/db');
const smartDrillRoutes = require('../../src/routes/smartDrillRoutes');

const RUN = `sd${Date.now().toString(36)}`;
const U = `${RUN}-u`;
const app = express();
app.use(express.json());
app.use('/api/smart-drill', smartDrillRoutes);

let topic;

beforeAll(async () => {
    await prisma.user.create({ data: { id: U, email: `${U}@example.test` } });
    topic = await prisma.topic.create({ data: { name: `${RUN} Protection`, subject: 'EE', normKey: `${RUN} protection` } });
    const relays = await prisma.syllabusSubtopic.create({ data: { topicId: topic.id, name: 'Relays', normKey: 'relays' } });
    const fuses = await prisma.syllabusSubtopic.create({ data: { topicId: topic.id, name: 'Fuses', normKey: 'fuses' } });
    const q = (sub, i) => ({
        id: `${RUN}-${sub === relays ? 'r' : 'f'}${i}`, subject: 'EE', subtopic: topic.name, topicId: topic.id, subtopicId: sub.id,
        text: `${RUN} ${i}?`, options: ['1', '2', '3', '4'], answer: '1', difficulty: 2,
    });
    await prisma.question.createMany({ data: [1, 2, 3, 4, 5, 6].flatMap((i) => [q(relays, i), q(fuses, i)]) });
    // Two days ago, so none is held back as seen in the last day.
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await prisma.questionAttempt.createMany({
        data: [1, 2, 3].flatMap((i) => [
            { userId: U, questionId: `${RUN}-r${i}`, subject: 'EE', subtopic: topic.name, isCorrect: false, createdAt: twoDaysAgo },
            { userId: U, questionId: `${RUN}-f${i}`, subject: 'EE', subtopic: topic.name, isCorrect: true, createdAt: twoDaysAgo },
        ]),
    });
});

afterAll(async () => {
    await prisma.questionAttempt.deleteMany({ where: { userId: U } });
    await prisma.question.deleteMany({ where: { id: { startsWith: RUN } } });
    await prisma.syllabusSubtopic.deleteMany({ where: { topicId: topic?.id } });
    await prisma.topic.deleteMany({ where: { id: topic?.id } });
    await prisma.user.deleteMany({ where: { id: U } });
    await prisma.$disconnect();
});

describe('smart drill by subtopic', () => {
    it('names the weakest subtopic from real answers and serves about half the drill from it', async () => {
        const res = await request(app).get(`/api/smart-drill?limit=4&topicId=${topic.id}`).set({ Authorization: `Bearer ${U}` });
        expect(res.status).toBe(200);
        expect(res.body.weakAreas[0].subtopic).toMatchObject({ name: 'Relays', answered: 3, correct: 0 });
        const ids = res.body.items.map((x) => x.id);
        expect(ids).toHaveLength(4);
        expect(ids.filter((id) => id.startsWith(`${RUN}-r`)).length).toBeGreaterThanOrEqual(2);
    });
});
