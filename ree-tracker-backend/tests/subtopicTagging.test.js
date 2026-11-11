import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Tagging questions with a subtopic of their own topic (Admin › Question bank ›
// Subtopics). A pick from another topic, or a retired subtopic, is refused.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { invalidateRole } = require('../src/middlewares/roleMiddleware');
const { applyTags, clearTags, questionsForTagging, taggingOverview } = require('../src/services/subtopicTagging');
const { invalidateTopicCache } = require('../src/services/topicResolver');
const questionRoutes = require('../src/routes/questionRoutes');

const ADMIN = 'uid-admin';
const USER = 'uid-user';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const app = () => { const a = express(); a.use(express.json()); a.use('/api/questions', questionRoutes); return a; };

afterEach(() => vi.restoreAllMocks());

describe('applyTags', () => {
    beforeEach(() => {
        vi.spyOn(prisma.question, 'findMany').mockResolvedValue([
            { id: 'q1', topicId: 'circuits' }, { id: 'q2', topicId: 'circuits' }, { id: 'q3', topicId: 'machines' },
        ]);
        vi.spyOn(prisma.syllabusSubtopic, 'findMany').mockResolvedValue([
            { id: 's-ac', topicId: 'circuits', active: true },
            { id: 's-old', topicId: 'circuits', active: false },
        ]);
        vi.spyOn(prisma.question, 'updateMany').mockImplementation((args) => args);
        vi.spyOn(prisma, '$transaction').mockImplementation(async (ops) => ops.map((o) => ({ count: o.where.id.in.length })));
    });

    it('saves a subtopic of the question’s own topic, guarded by that topic', async () => {
        const out = await applyTags([{ id: 'q1', subtopicId: 's-ac' }, { id: 'q2', subtopicId: 's-ac' }]);
        expect(out).toEqual({ saved: 2, refused: [] });
        expect(prisma.question.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['q1', 'q2'] }, topicId: 'circuits' }, data: { subtopicId: 's-ac' } });
    });

    it('refuses another topic’s subtopic, a retired one, and an unknown question, and saves the rest', async () => {
        const out = await applyTags([
            { id: 'q3', subtopicId: 's-ac' },
            { id: 'q2', subtopicId: 's-old' },
            { id: 'gone', subtopicId: 's-ac' },
            { id: 'q1', subtopicId: 's-ac' },
        ]);
        expect(out.refused).toEqual([
            { id: 'q3', reason: 'other-topic' },
            { id: 'q2', reason: 'no-such-subtopic' },
            { id: 'gone', reason: 'not-found' },
        ]);
        expect(out.saved).toBe(1);
    });

    it('null untags', async () => {
        await applyTags([{ id: 'q3', subtopicId: null }]);
        expect(prisma.question.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['q3'] } }, data: { subtopicId: null } });
    });

    it('writes nothing when everything is refused', async () => {
        const out = await applyTags([{ id: 'q3', subtopicId: 's-ac' }]);
        expect(out.saved).toBe(0);
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });
});

describe('clearTags and the pages', () => {
    it('clears one topic only', async () => {
        const update = vi.spyOn(prisma.question, 'updateMany').mockResolvedValue({ count: 7 });
        expect(await clearTags({ topicId: 'circuits' })).toEqual({ cleared: 7 });
        expect(update).toHaveBeenCalledWith({ where: { topicId: 'circuits', subtopicId: { not: null } }, data: { subtopicId: null } });
    });

    it('a page: untagged live questions in a stable order, at most 50', async () => {
        vi.spyOn(prisma.topic, 'findUnique').mockResolvedValue({ id: 't', subject: 'EE', name: 'Circuits', subtopics: [{ id: 's', name: 'AC' }] });
        vi.spyOn(prisma.question, 'count').mockResolvedValueOnce(10).mockResolvedValueOnce(4);
        const find = vi.spyOn(prisma.question, 'findMany').mockResolvedValue([]);
        const page = await questionsForTagging({ topicId: 't', limit: 500, offset: 3 });
        expect(page).toMatchObject({ topic: { id: 't', name: 'Circuits' }, subtopics: [{ id: 's', name: 'AC' }], total: 10, tagged: 4 });
        expect(find.mock.calls[0][0]).toMatchObject({ where: { isFlagged: false, topicId: 't', subtopicId: null }, take: 50, skip: 3 });
    });

    it('an unknown topic is null', async () => {
        vi.spyOn(prisma.topic, 'findUnique').mockResolvedValue(null);
        expect(await questionsForTagging({ topicId: 'x' })).toBeNull();
    });

    it('the overview counts each topic’s tagged questions', async () => {
        vi.spyOn(prisma.topic, 'findMany').mockResolvedValue([{ id: 't1', subject: 'EE', name: 'Circuits', _count: { subtopics: 5 } }, { id: 't2', subject: 'EE', name: 'Machines', _count: { subtopics: 3 } }]);
        vi.spyOn(prisma.question, 'groupBy')
            .mockResolvedValueOnce([{ topicId: 't1', _count: { _all: 20 } }])
            .mockResolvedValueOnce([{ topicId: 't1', _count: { _all: 6 } }]);
        expect((await taggingOverview({ subject: 'EE' })).topics).toEqual([
            { id: 't1', subject: 'EE', name: 'Circuits', subtopics: 5, total: 20, tagged: 6 },
            { id: 't2', subject: 'EE', name: 'Machines', subtopics: 3, total: 0, tagged: 0 },
        ]);
    });
});

describe('routes', () => {
    beforeEach(() => {
        verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
        vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: ADMIN });
        vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => ({ role: where.id === ADMIN ? 'ADMIN' : 'USER' }));
        invalidateRole(ADMIN);
        invalidateRole(USER);
        vi.spyOn(prisma.idempotencyRecord, 'create').mockResolvedValue({});
        vi.spyOn(prisma.idempotencyRecord, 'findUnique').mockResolvedValue(null);
        vi.spyOn(prisma.idempotencyRecord, 'update').mockResolvedValue({});
    });

    it.each([
        ['get', '/api/questions/tagging-overview', undefined],
        ['get', '/api/questions/for-tagging?topicId=t', undefined],
        ['post', '/api/questions/tag-bulk', { items: [{ id: 'q1', subtopicId: 's' }] }],
        ['post', '/api/questions/tag-clear', { topicId: 't' }],
    ])('%s %s refuses a learner', async (method, url, body) => {
        const update = vi.spyOn(prisma.question, 'updateMany');
        const res = await request(app())[method](url).set(as(USER)).send(body);
        expect(res.status).toBe(403);
        expect(update).not.toHaveBeenCalled();
    });

    it('takes at most 200 tags at a time', async () => {
        const items = Array.from({ length: 201 }, (_, i) => ({ id: `q${i}`, subtopicId: 's' }));
        expect((await request(app()).post('/api/questions/tag-bulk').set(as(ADMIN)).send({ items })).status).toBe(400);
    });

    it('asks for a topic', async () => {
        expect((await request(app()).get('/api/questions/for-tagging').set(as(ADMIN))).status).toBe(400);
    });
});

describe('moving a question to another topic drops its tag', () => {
    beforeEach(() => {
        verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
        vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: ADMIN });
        vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ role: 'ADMIN' });
        invalidateRole(ADMIN);
        vi.spyOn(prisma.questionVersion, 'create').mockResolvedValue({});
        vi.spyOn(prisma, '$transaction').mockResolvedValue([]);
        invalidateTopicCache();
        vi.spyOn(prisma.topic, 'findMany').mockResolvedValue([
            { id: 't-circuits', subject: 'EE', name: 'Circuits', normKey: 'circuits', active: true },
            { id: 't-machines', subject: 'EE', name: 'Machines', normKey: 'machines', active: true },
        ]);
    });
    afterEach(() => invalidateTopicCache());

    const previous = { id: 'q1', subject: 'EE', subtopic: 'Circuits', topicId: 't-circuits', subtopicId: 's-ac', text: 'Q?', options: ['a', 'b'], answer: 'a', isFlagged: true };

    it.each([
        ['another topic', { id: 't-machines', name: 'Machines' }, { subtopicId: null }],
        ['the same topic', { id: 't-circuits', name: 'Circuits' }, {}],
    ])('approving out of quarantine into %s', async (_, topic, expected) => {
        vi.spyOn(prisma.question, 'findUnique').mockResolvedValue(previous);
        const update = vi.spyOn(prisma.question, 'update').mockImplementation((args) => args);
        await request(app()).put('/api/questions/quarantine/q1/approve').set(as(ADMIN)).send({ subject: 'EE', subtopic: topic.name });
        const data = update.mock.calls[0][0].data;
        if ('subtopicId' in expected) expect(data.subtopicId).toBeNull();
        else expect(data).not.toHaveProperty('subtopicId');
    });
});
