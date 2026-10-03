import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Every path that writes a LIVE question resolves its topic through
// topicResolver.resolveQuestionTopic: matched within the question's own
// subject, and refused (not silently left untagged) when the label is outside
// that subject's taxonomy. Background: the Library's AI ingestion offered a
// stale hardcoded EE list, so AI questions went live as "Transient Response" /
// "AC Impedance" with topicId NULL — invisible to topic-targeted Smart Drill
// and CAT. Prisma is spied, following reviewServiceBulkRetry.test.js.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const logger = require('../src/utils/logger');
const { invalidateRole } = require('../src/middlewares/roleMiddleware');
const { invalidateTopicCache, normKey } = require('../src/services/topicResolver');
const { createLiveQuestion, approveBulk, approveOneRow } = require('../src/services/reviewService');
const questionRoutes = require('../src/routes/questionRoutes');
const reviewRoutes = require('../src/routes/reviewRoutes');

const ADMIN_UID = 'uid-admin';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

// The live (TOS-editor managed) taxonomy shape: curriculum-course names.
const topic = (subject, name) => ({ id: `t-${normKey(name)}`, subject, name, normKey: normKey(name), aliases: [], active: true });
const TOPICS = [
    topic('EE', 'Electrical Transient Analysis'),
    topic('EE', 'Electric Circuits 2'),
    topic('Mathematics', 'Algebra'),
];

const question = (over = {}) => ({
    subject: 'EE',
    subtopic: 'Electric Circuits 2',
    text: 'What is the impedance of a purely resistive 10-ohm load?',
    options: ['10 ohms', '0 ohms', 'Infinite', 'j10 ohms'],
    answer: '10 ohms',
    ...over,
});

let createSpy;

beforeEach(() => {
    invalidateTopicCache();
    vi.spyOn(prisma.topic, 'findMany').mockResolvedValue(TOPICS);
    createSpy = vi.spyOn(prisma.question, 'create').mockImplementation(async ({ data }) => ({ id: data.id || 'q-new', ...data }));
    vi.spyOn(logger, 'error').mockImplementation(() => {});

    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: ADMIN_UID });
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ role: 'ADMIN' });
    invalidateRole(ADMIN_UID);
});

afterEach(() => {
    vi.restoreAllMocks();
    invalidateTopicCache();
});

describe('createLiveQuestion — single create path (manual add + single approve)', () => {
    it('links the question to its topic and stores the canonical topic name', async () => {
        await createLiveQuestion(question({ subtopic: '  electric circuits 2 ' }));
        expect(createSpy.mock.calls[0][0].data).toMatchObject({ topicId: 't-electric circuits 2', subtopic: 'Electric Circuits 2' });
    });

    it('refuses a label outside the subject taxonomy instead of publishing it untagged', async () => {
        await expect(createLiveQuestion(question({ subtopic: 'Transient Response' }))).rejects.toMatchObject({ code: 'UNKNOWN_TOPIC' });
        expect(createSpy).not.toHaveBeenCalled();
    });

    it('never borrows a topic from another subject', async () => {
        await expect(createLiveQuestion(question({ subtopic: 'Algebra' }))).rejects.toMatchObject({ code: 'UNKNOWN_TOPIC' });
        expect(createSpy).not.toHaveBeenCalled();
    });
});

describe('approveBulk / approveOneRow — Accept All', () => {
    const row = (id, over = {}) => ({ id, status: 'PENDING', promotedQuestionId: null, ...question(over) });

    beforeEach(() => {
        vi.spyOn(prisma.questionPendingReview, 'update').mockResolvedValue({});
        vi.spyOn(prisma.questionVersion, 'create').mockResolvedValue({});
        vi.spyOn(prisma, '$transaction').mockImplementation(async (ops) => ops.map(() => ({})));
    });

    it('publishes known-topic rows with topicId and leaves unknown-topic rows in the queue', async () => {
        vi.spyOn(prisma.questionPendingReview, 'findMany').mockResolvedValue([
            row('rev-ok'),
            row('rev-stale', { subtopic: 'AC Impedance' }),
        ]);

        const result = await approveBulk(['rev-ok', 'rev-stale'], ADMIN_UID);

        expect(result.approved).toEqual(['rev-ok']);
        expect(result.failed).toEqual([{ id: 'rev-stale', reason: 'unknown-topic' }]);
        expect(createSpy).toHaveBeenCalledTimes(1);
        expect(createSpy.mock.calls[0][0].data).toMatchObject({ topicId: 't-electric circuits 2' });
    });

    it('the per-item fallback reports unknown-topic too', async () => {
        const result = await approveOneRow(row('rev-stale', { subtopic: 'Transient Response' }), ADMIN_UID);
        expect(result).toEqual({ id: 'rev-stale', ok: false, reason: 'unknown-topic' });
        expect(createSpy).not.toHaveBeenCalled();
    });
});

describe('routes', () => {
    const app = express();
    app.use(express.json());
    app.use('/api/questions', questionRoutes);
    app.use('/api/review', reviewRoutes);

    it('POST /api/questions (admin manual add) links the topic', async () => {
        const res = await request(app).post('/api/questions').set(as(ADMIN_UID)).send(question({ subtopic: 'Electrical Transient Analysis' }));
        expect(res.status).toBe(201);
        expect(createSpy.mock.calls[0][0].data.topicId).toBe('t-electrical transient analysis');
    });

    it('POST /api/questions answers 400 with the reason for an unknown topic', async () => {
        const res = await request(app).post('/api/questions').set(as(ADMIN_UID)).send(question({ subtopic: 'Transient Response' }));
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/"Transient Response" is not a topic in the EE syllabus/);
        expect(createSpy).not.toHaveBeenCalled();
    });

    it('PUT /api/review/:id/approve answers 400 for an unknown topic and publishes nothing', async () => {
        vi.spyOn(prisma.questionPendingReview, 'findUnique').mockResolvedValue({ id: 'rev-1', status: 'PENDING', promotedQuestionId: null, ...question({ subtopic: 'AC Impedance' }) });
        const res = await request(app).put('/api/review/rev-1/approve').set(as(ADMIN_UID)).send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/AC Impedance/);
        expect(createSpy).not.toHaveBeenCalled();
    });

    it('PUT /api/questions/:id re-resolves within the stored subject when the edit omits it', async () => {
        vi.spyOn(prisma.question, 'findUnique').mockResolvedValue({ id: 'q1', ...question({ subtopic: 'Transient Response' }), topicId: null });
        const update = vi.spyOn(prisma.question, 'update').mockResolvedValue({});
        vi.spyOn(prisma.questionVersion, 'create').mockResolvedValue({});
        vi.spyOn(prisma, '$transaction').mockResolvedValue([]);

        const res = await request(app).put('/api/questions/q1').set(as(ADMIN_UID)).send({ subtopic: 'Electrical Transient Analysis' });

        expect(res.status).toBe(200);
        expect(update.mock.calls[0][0].data).toMatchObject({ topicId: 't-electrical transient analysis', subtopic: 'Electrical Transient Analysis' });
    });

    it('PUT /api/questions/quarantine/:id/approve (legacy un-flag) links the topic as it returns to the pool', async () => {
        vi.spyOn(prisma.question, 'findUnique').mockResolvedValue({ id: 'q1', ...question(), topicId: null, isFlagged: true });
        const update = vi.spyOn(prisma.question, 'update').mockResolvedValue({});
        vi.spyOn(prisma.questionVersion, 'create').mockResolvedValue({});
        vi.spyOn(prisma, '$transaction').mockResolvedValue([]);

        const res = await request(app).put('/api/questions/quarantine/q1/approve').set(as(ADMIN_UID))
            .send({ subject: 'EE', subtopic: 'electric circuits 2' });

        expect(res.status).toBe(200);
        expect(update.mock.calls[0][0].data).toMatchObject({ isFlagged: false, topicId: 't-electric circuits 2', subtopic: 'Electric Circuits 2' });
    });

    it('PUT /api/questions/:id never cross-links a label from another subject', async () => {
        vi.spyOn(prisma.question, 'findUnique').mockResolvedValue({ id: 'q1', ...question(), topicId: 't-electric circuits 2' });
        const update = vi.spyOn(prisma.question, 'update').mockResolvedValue({});
        vi.spyOn(prisma.questionVersion, 'create').mockResolvedValue({});
        vi.spyOn(prisma, '$transaction').mockResolvedValue([]);

        await request(app).put('/api/questions/q1').set(as(ADMIN_UID)).send({ subtopic: 'Algebra' });

        expect(update.mock.calls[0][0].data).toMatchObject({ topicId: null, subtopic: 'Algebra' });
    });
});
