import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Subtopic tagging in the background (services/subtopicAutoTag.js): off unless
// switched on; sure picks save, the rest are kept for review; an AI failure
// stops the run without recording anything, so the batch is asked again.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { invalidateFlagCache } = require('../src/services/featureFlags');
const { invalidateRole } = require('../src/middlewares/roleMiddleware');
const autoTag = require('../src/services/subtopicAutoTag');
const { AiUnavailableError } = require('../src/services/ai/aiRouter');
const questionRoutes = require('../src/routes/questionRoutes');
const cronRoutes = require('../src/routes/cronRoutes');

const ADMIN = 'uid-admin';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const app = () => {
    const a = express();
    a.use(express.json());
    a.use('/api/questions', questionRoutes);
    a.use('/api/cron', cronRoutes);
    return a;
};

const TOPIC = { id: 't-circ', subject: 'EE', name: 'Circuits', subtopics: [{ id: 's-ac', name: 'AC Circuits' }, { id: 's-dc', name: 'DC Circuits' }] };
const ITEMS = [
    { id: 'q1', text: 'Find the RMS of 10 sin wt', options: ['7.07', '10'] },
    { id: 'q2', text: 'A 12 V battery and 4 ohm', options: ['3 A'] },
    { id: 'q3', text: 'Thevenin of a bridge', options: [] },
];
const flagOn = (on) => {
    invalidateFlagCache();
    vi.spyOn(prisma.featureFlag, 'findMany').mockResolvedValue(on ? [{ key: 'subtopic-autotag', enabled: true }] : []);
};
const aiReply = (tags) => vi.fn(async () => ({ text: JSON.stringify({ tags }) }));

beforeEach(() => {
    // nextBatch: the topic to work on, then its questions.
    vi.spyOn(prisma, '$queryRaw')
        .mockResolvedValueOnce([{ topicId: TOPIC.id }])
        .mockResolvedValueOnce(ITEMS)
        .mockResolvedValue([]);
    vi.spyOn(prisma.topic, 'findUnique').mockResolvedValue(TOPIC);
    // applyTags
    vi.spyOn(prisma.question, 'findMany').mockImplementation(async ({ where }) => where.id.in.map((id) => ({ id, topicId: TOPIC.id })));
    vi.spyOn(prisma.syllabusSubtopic, 'findMany').mockResolvedValue(TOPIC.subtopics.map((s) => ({ ...s, topicId: TOPIC.id, active: true })));
    vi.spyOn(prisma.question, 'updateMany').mockImplementation((args) => args);
    vi.spyOn(prisma.subtopicSuggestion, 'deleteMany').mockImplementation((args) => args);
    vi.spyOn(prisma.subtopicSuggestion, 'createMany').mockImplementation((args) => args);
    vi.spyOn(prisma, '$transaction').mockImplementation(async (ops) => ops.map((o) => ({ count: o.where?.id?.in?.length ?? 0 })));
});
afterEach(() => { vi.restoreAllMocks(); invalidateFlagCache(); });

describe('runAutoTag', () => {
    it('does nothing while switched off', async () => {
        flagOn(false);
        const run = vi.fn();
        expect(await autoTag.runAutoTag({ run })).toEqual({ skipped: 'off' });
        expect(run).not.toHaveBeenCalled();
    });

    it('saves the sure picks and keeps the unsure and unnamed ones for review', async () => {
        flagOn(true);
        const run = aiReply([
            { n: 1, subtopic: 'AC Circuits', sure: true },
            { n: 2, subtopic: 'DC Circuits', sure: false },
            { n: 3, subtopic: 'Bridges', sure: true }, // not on the list
        ]);
        const out = await autoTag.runAutoTag({ calls: 1, run });
        expect(out).toMatchObject({ batches: 1, saved: 1, queued: 2 });
        expect(run.mock.calls[0][0]).toMatchObject({ task: 'classify', json: true, temperature: 0 });
        expect(run.mock.calls[0][0].contents).toContain('- AC Circuits');
        expect(prisma.question.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['q1'] }, topicId: TOPIC.id }, data: { subtopicId: 's-ac' } });
        const kept = prisma.subtopicSuggestion.createMany.mock.calls[0][0].data;
        expect(kept).toEqual([
            { questionId: 'q2', topicId: TOPIC.id, subtopicId: 's-dc', guess: 'DC Circuits' },
            { questionId: 'q3', topicId: TOPIC.id, subtopicId: null, guess: 'Bridges' },
        ]);
    });

    it('stops at an AI failure and records nothing, so the batch is asked again', async () => {
        flagOn(true);
        const run = vi.fn(async () => { throw new AiUnavailableError('busy', [], 'exhausted'); });
        const out = await autoTag.runAutoTag({ calls: 3, run });
        expect(out).toMatchObject({ batches: 0, stopped: 'exhausted' });
        expect(run).toHaveBeenCalledTimes(1);
        expect(prisma.subtopicSuggestion.createMany).not.toHaveBeenCalled();
    });

    it('a reply that is not JSON records nothing either', async () => {
        flagOn(true);
        const out = await autoTag.runAutoTag({ calls: 1, run: vi.fn(async () => ({ text: 'Sorry, I cannot.' })) });
        expect(out).toMatchObject({ batches: 0, stopped: 'error' });
        expect(prisma.subtopicSuggestion.createMany).not.toHaveBeenCalled();
    });

    it('ends when every question has been looked at', async () => {
        flagOn(true);
        prisma.$queryRaw.mockReset().mockResolvedValue([]);
        const run = vi.fn();
        expect(await autoTag.runAutoTag({ run })).toMatchObject({ batches: 0, done: true });
        expect(run).not.toHaveBeenCalled();
    });
});

describe('resolveSuggestions', () => {
    it('tags the picked ones, skips the null ones, and closes both', async () => {
        const close = vi.spyOn(prisma.subtopicSuggestion, 'updateMany').mockResolvedValue({ count: 2 });
        const out = await autoTag.resolveSuggestions([{ id: 'q1', subtopicId: 's-ac' }, { id: 'q2', subtopicId: null }]);
        expect(out).toMatchObject({ saved: 1, skipped: 1, refused: [] });
        expect(close.mock.calls[0][0].where).toEqual({ questionId: { in: ['q1', 'q2'] }, resolvedAt: null });
    });
});

describe('routes', () => {
    beforeEach(() => {
        verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
        vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: ADMIN });
        vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => ({ role: where.id === ADMIN ? 'ADMIN' : 'USER' }));
        invalidateRole(ADMIN);
        invalidateRole('uid-user');
    });

    it('the review list and the status are admin only', async () => {
        expect((await request(app()).get('/api/questions/tag-suggestions/groups').set(as('uid-user'))).status).toBe(403);
        expect((await request(app()).get('/api/questions/tag-suggestions?topicId=t').set(as('uid-user'))).status).toBe(403);
        expect((await request(app()).get('/api/questions/auto-tag-status').set(as('uid-user'))).status).toBe(403);
    });

    // The pile in groups (2026-11-13): 561 one at a time was a chore.
    const ROWS = [
        { questionId: 'q1', topicId: TOPIC.id, subtopicId: 's-dc', guess: 'DC Circuits', question: { text: 'A 12 V battery', options: ['3 A'], topicId: TOPIC.id } },
        { questionId: 'q2', topicId: TOPIC.id, subtopicId: 's-dc', guess: 'DC Circuits', question: { text: 'A 6 V cell', options: [], topicId: TOPIC.id } },
        // A near name: groups under AC Circuits.
        { questionId: 'q3', topicId: TOPIC.id, subtopicId: null, guess: 'AC Circuit', question: { text: 'RMS of a sine', options: [], topicId: TOPIC.id } },
        { questionId: 'q4', topicId: TOPIC.id, subtopicId: null, guess: null, question: { text: 'Who wrote this?', options: [], topicId: TOPIC.id } },
        // Moved to another topic since: left out.
        { questionId: 'q9', topicId: TOPIC.id, subtopicId: 's-dc', guess: null, question: { text: 'Moved', options: [], topicId: 't-other' } },
    ];

    it('counts the pile per topic and suggestion, most first, no suggestion last', async () => {
        vi.spyOn(prisma.subtopicSuggestion, 'findMany').mockResolvedValue(ROWS);
        vi.spyOn(prisma.topic, 'findMany').mockResolvedValue([{ ...TOPIC, subtopics: [{ id: 's-ac', name: 'AC Circuits' }, { id: 's-dc', name: 'DC Circuits' }] }]);
        const res = await request(app()).get('/api/questions/tag-suggestions/groups').set(as(ADMIN));
        expect(res.status).toBe(200);
        expect(res.body.total).toBe(4);
        expect(res.body.topics[0]).toMatchObject({ id: TOPIC.id, name: 'Circuits', count: 4 });
        expect(res.body.topics[0].groups).toEqual([
            { subtopicId: 's-dc', name: 'DC Circuits', count: 2 },
            { subtopicId: 's-ac', name: 'AC Circuits', count: 1 },
            { subtopicId: null, name: null, count: 1 },
        ]);
    });

    it('gives one group’s questions with their text and options', async () => {
        vi.spyOn(prisma.subtopicSuggestion, 'findMany').mockResolvedValue(ROWS);
        vi.spyOn(prisma.topic, 'findMany').mockResolvedValue([{ ...TOPIC, subtopics: [{ id: 's-ac', name: 'AC Circuits' }, { id: 's-dc', name: 'DC Circuits' }] }]);
        const dc = await request(app()).get(`/api/questions/tag-suggestions?topicId=${TOPIC.id}&subtopicId=s-dc`).set(as(ADMIN));
        expect(dc.body.items.map((i) => i.id)).toEqual(['q1', 'q2']);
        expect(dc.body.items[0]).toMatchObject({ text: 'A 12 V battery', options: ['3 A'], subtopicId: 's-dc' });
        const none = await request(app()).get(`/api/questions/tag-suggestions?topicId=${TOPIC.id}&subtopicId=none`).set(as(ADMIN));
        expect(none.body.items.map((i) => i.id)).toEqual(['q4']);
        expect((await request(app()).get('/api/questions/tag-suggestions').set(as(ADMIN))).status).toBe(400);
    });

    it('keeps the in-page tool’s unsure picks for questions still in that topic', async () => {
        prisma.question.findMany.mockResolvedValue([{ id: 'q2' }]);
        const res = await request(app()).post('/api/questions/tag-suggestions').set(as(ADMIN))
            .send({ topicId: TOPIC.id, items: [{ id: 'q2', subtopicId: 's-dc', guess: 'DC Circuits' }, { id: 'q-moved', subtopicId: null, guess: null }] });
        expect(res.status).toBe(200);
        expect(res.body.kept).toBe(1);
    });

    it('the scheduled call needs the secret and answers at once', async () => {
        process.env.CRON_SECRET = 'a-long-random-secret-value';
        flagOn(false);
        expect((await request(app()).post('/api/cron/subtopic-tags')).status).toBe(401);
        const res = await request(app()).post('/api/cron/subtopic-tags').set('x-cron-secret', 'a-long-random-secret-value');
        expect(res.status).toBe(202);
        delete process.env.CRON_SECRET;
    });
});
