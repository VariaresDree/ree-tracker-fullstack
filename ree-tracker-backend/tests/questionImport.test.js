import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// POST /api/questions/import: what another AI wrote, on its way to the review
// queue. Never to the live bank, and never twice.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { invalidateRole } = require('../src/middlewares/roleMiddleware');
const { invalidateTopicCache } = require('../src/services/topicResolver');
const { stemKey } = require('../src/services/questionImport');
const questionRoutes = require('../src/routes/questionRoutes');

const ADMIN = 'uid-admin';
const USER = 'uid-user';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const item = (over = {}) => ({
    subject: 'EE', subtopic: 'Electric Circuits 2', text: 'What is $I$?', options: ['1 A', '2 A', '3 A', '4 A'], answer: '2 A',
    fixedExplanation: '**Answer:** 2 A', type: 'calculation', difficulty: 2, ...over,
});

function app() {
    const a = express();
    a.use(express.json());
    a.use('/api/questions', questionRoutes);
    return a;
}
const send = (items, uid = ADMIN) => request(app()).post('/api/questions/import').set(as(uid)).send({ items });

let createMany; let versions; let tx; let raw;
beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: ADMIN });
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => ({ role: where.id === ADMIN ? 'ADMIN' : 'USER' }));
    invalidateRole(ADMIN);
    invalidateRole(USER);
    vi.spyOn(prisma.idempotencyRecord, 'create').mockResolvedValue({});
    vi.spyOn(prisma.idempotencyRecord, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.idempotencyRecord, 'update').mockResolvedValue({});
    vi.spyOn(prisma.topic, 'findMany').mockResolvedValue([
        { id: 't1', subject: 'EE', name: 'Electric Circuits 2', normKey: 'electric circuits 2', aliases: [], active: true },
        { id: 't2', subject: 'ESAS', name: 'Fluid Mechanics', normKey: 'fluid mechanics', aliases: [], active: true },
    ]);
    invalidateTopicCache();
    createMany = vi.spyOn(prisma.questionPendingReview, 'createMany').mockResolvedValue({ count: 1 });
    versions = vi.spyOn(prisma.questionVersion, 'createMany').mockResolvedValue({ count: 1 });
    tx = vi.spyOn(prisma, '$transaction').mockImplementation(async (ops) => Promise.all(ops));
    raw = vi.spyOn(prisma, '$queryRaw').mockResolvedValue([]);
});
afterEach(() => vi.restoreAllMocks());

describe('stemKey', () => {
    it('ignores spacing, case and math delimiters', () => {
        expect(stemKey('What is  $I$ ?')).toBe(stemKey('what is I?'));
        expect(stemKey('What is I?')).not.toBe(stemKey('What is V?'));
    });
});

describe('POST /api/questions/import', () => {
    it('queues clean items for review, with an audit row, never live', async () => {
        const create = vi.spyOn(prisma.question, 'create');
        const res = await send([item()]);
        expect(res.status).toBe(200);
        expect(res.body.queued).toHaveLength(1);
        expect(res.body.rejected).toEqual([]);
        expect(create).not.toHaveBeenCalled();
        const row = createMany.mock.calls[0][0].data[0];
        expect(row).toMatchObject({ source: 'external_ai', text: 'What is $I$?', answer: '2 A', submittedBy: ADMIN, bloomLevel: 'APPLY' });
        expect([...row.options].sort()).toEqual(['1 A', '2 A', '3 A', '4 A']);
        expect(versions.mock.calls[0][0].data[0]).toMatchObject({ reviewId: row.id, action: 'SUBMITTED' });
        expect(tx.mock.calls[0][1]).toMatchObject({ timeout: expect.any(Number) });
    });

    it('says why each item was refused, by position, and queues the rest', async () => {
        const res = await send([
            item({ text: 'Good one?' }),
            item({ text: 'Bad key?', answer: 'Nope' }),
            item({ text: 'No explanation?', fixedExplanation: null }),
            item({ text: 'Broken $math?' }),
            item({ text: 'Bad topic?', subtopic: 'Nope' }),
            item({ text: 'Other subject topic?', subtopic: 'Fluid Mechanics' }),
            item({ text: 'Bad subject?', subject: 'Chemistry' }),
            { text: 'Shape?' },
        ]);
        expect(res.body.queued).toHaveLength(1);
        const reasons = Object.fromEntries(res.body.rejected.map((r) => [r.index, r.reasons]));
        expect(reasons[1]).toContain('key-not-an-option');
        expect(reasons[2]).toContain('missing-explanation');
        expect(reasons[3]).toContain('unbalanced-math');
        expect(reasons[4]).toContain('unknown-topic');
        expect(reasons[5]).toContain('unknown-topic');
        expect(reasons[6]).toContain('invalid-subject');
        expect(reasons[7].length).toBeGreaterThan(0);
    });

    it('refuses a stem already live or pending, and a repeat within the paste', async () => {
        raw.mockResolvedValueOnce([{ key: stemKey('Already here?') }]);
        const res = await send([item({ text: 'Already here?' }), item({ text: 'New one?' }), item({ text: 'new  ONE?' })]);
        expect(res.body.queued).toHaveLength(1);
        expect(res.body.rejected).toEqual([
            { index: 0, reasons: ['duplicate'] },
            { index: 2, reasons: ['duplicate'] },
        ]);
    });

    it('writes nothing when every item is refused', async () => {
        const res = await send([item({ answer: 'Nope' })]);
        expect(res.body.queued).toEqual([]);
        expect(tx).not.toHaveBeenCalled();
    });

    it('takes at most 25 at a time', async () => {
        const res = await send(Array.from({ length: 26 }, (_, i) => item({ text: `Q${i}?` })));
        expect(res.status).toBe(400);
    });

    it('is admin only', async () => {
        const res = await send([item()], USER);
        expect(res.status).toBe(403);
        expect(createMany).not.toHaveBeenCalled();
    });
});
