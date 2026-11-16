import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Several topics at once (2026-11-16): a learner can practise, sit a mock or
// host a battle on, say, Algebra, Complex Numbers and Trigonometry together.
// The draw spreads evenly across the picked topics; one topic draws as before.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const questionPool = require('../src/services/questionPool');
const { battleCreateSchema } = require('../src/schemas/battleSchemas');

const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const app = () => {
    delete require.cache[require.resolve('../src/routes/questionRoutes')];
    const a = express();
    a.use(express.json());
    a.use('/api/questions', require('../src/routes/questionRoutes'));
    return a;
};

let raw;
beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockImplementation(async ({ where }) => ({ id: where.id }));
    vi.spyOn(prisma.battleParticipant, 'findMany').mockResolvedValue([]); // no open battles to hide questions from
    raw = vi.spyOn(prisma, '$queryRawUnsafe').mockResolvedValue([{ id: 'q1' }, { id: 'q2' }]);
    vi.spyOn(prisma.question, 'findMany').mockImplementation(async ({ where }) => (where.id?.in || []).map((id) => ({ id, subtopic: 'Algebra' })));
});
afterEach(() => vi.restoreAllMocks());

describe('topicList', () => {
    it('cleans a name or a list: no blanks, no All, each once', () => {
        expect(questionPool.topicList(undefined)).toEqual([]);
        expect(questionPool.topicList('All')).toEqual([]);
        expect(questionPool.topicList(' Algebra ')).toEqual(['Algebra']);
        expect(questionPool.topicList(['Algebra', 'All', '', 'Algebra', 'Trigonometry', 7])).toEqual(['Algebra', 'Trigonometry']);
        expect(questionPool.topicList(Array.from({ length: 60 }, (_, i) => `T${i}`))).toHaveLength(questionPool.TOPICS_MAX);
    });
});

describe('samplePool with several topics', () => {
    it('two or more topics: spread evenly across them, bound as one array', async () => {
        await questionPool.samplePool({ subject: 'Mathematics', topics: ['Algebra', 'Complex Numbers', 'Trigonometry'], limit: 20 });
        const [sql, ...params] = raw.mock.calls[0];
        expect(sql).toMatch(/PARTITION BY "subtopic"/);
        expect(sql).toMatch(/"subtopic" = ANY\(\$6::text\[\]\)/);
        expect(params[5]).toEqual(['Algebra', 'Complex Numbers', 'Trigonometry']);
        expect(sql).not.toMatch(/\$\{/);
    });

    it('one topic, by either field, draws from it as before', async () => {
        await questionPool.samplePool({ subject: 'Mathematics', topics: ['Algebra'], limit: 20 });
        await questionPool.samplePool({ subject: 'Mathematics', subtopic: 'Algebra', limit: 20 });
        for (const [sql, , topic] of raw.mock.calls) {
            expect(sql).toMatch(/"subtopic" = \$2/);
            expect(topic).toBe('Algebra');
        }
    });

    it('no topics: the whole subject, with no topic filter', async () => {
        await questionPool.samplePool({ subject: 'Mathematics', subtopic: 'All', limit: 20 });
        expect(raw.mock.calls[0][6]).toBeNull();
    });

    it('picked topics take precedence over a draw blueprint, and a subtopic needs exactly one topic', async () => {
        const findIds = prisma.question.findMany;
        await questionPool.samplePool({ subject: 'EE', topics: ['Machines', 'Protection'], limit: 10, groups: { EE: [{ items: 10, topics: ['Machines'] }] }, subtopicId: 'sub-1' });
        expect(findIds.mock.calls.every(([arg]) => !arg.select)).toBe(true); // the blueprint reads id + topic rows
        const params = raw.mock.calls[0].slice(1);
        expect(params[4]).toBeNull(); // no subtopic across several topics
        expect(params[5]).toEqual(['Machines', 'Protection']);
    });
});

describe('GET /api/questions', () => {
    it('takes ?topics= repeated', async () => {
        const res = await request(app()).get('/api/questions?subject=Mathematics&subtopic=All&limit=20&topics=Algebra&topics=Trigonometry').set(as('uid-1'));
        expect(res.status).toBe(200);
        const [, ...params] = raw.mock.calls[0];
        expect(params[5]).toEqual(['Algebra', 'Trigonometry']);
    });

    it('the admin grid filters by them too', async () => {
        const res = await request(app()).get('/api/questions?sort=recent&subject=Mathematics&topics=Algebra&topics=Trigonometry').set(as('uid-1'));
        expect(res.status).toBe(200);
        expect(prisma.question.findMany.mock.calls[0][0].where.subtopic).toEqual({ in: ['Algebra', 'Trigonometry'] });
    });
});

describe('battle config', () => {
    const base = { battleId: 'ABC123', timeLimitSecs: 1800 };
    it('accepts two or more topics, and not one or none in the list', () => {
        expect(battleCreateSchema.safeParse({ ...base, config: { mode: 'subject', subject: 'Mathematics', topics: ['Algebra', 'Trigonometry'], count: 20 } }).success).toBe(true);
        expect(battleCreateSchema.safeParse({ ...base, config: { mode: 'subject', subject: 'Mathematics', topics: ['Algebra'], count: 20 } }).success).toBe(false);
        expect(battleCreateSchema.safeParse({ ...base, config: { mode: 'subject', subject: 'Mathematics', topics: [], count: 20 } }).success).toBe(false);
    });
});
