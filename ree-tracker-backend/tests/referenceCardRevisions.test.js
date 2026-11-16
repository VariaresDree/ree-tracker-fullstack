import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Library round (2026-11-16): a card sits under a syllabus subtopic, and a
// rewrite of a live card waits for an admin instead of changing what learners see.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { invalidateTopicCache } = require('../src/services/topicResolver');
const { invalidateRole } = require('../src/middlewares/roleMiddleware');

const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const TOPICS = [{ id: 't-alg', subject: 'Mathematics', name: 'Algebra', normKey: 'algebra', aliases: [], active: true }];
const SUBTOPICS = [{ id: 's-expr', topicId: 't-alg', normKey: 'algebraic expressions' }];

function app() {
    delete require.cache[require.resolve('../src/routes/referenceCardRoutes')];
    const a = express();
    a.use(express.json());
    a.use('/api/reference-cards', require('../src/routes/referenceCardRoutes'));
    return a;
}

const card = (over = {}) => ({
    id: 'c1', kind: 'formula', name: 'One Base Law', symbol: '$1^n$', formulaLatex: '$1^n = 1$', valueUnit: null,
    description: 'One to any power.', variables: [{ symbol: '$n$', meaning: 'any exponent' }], purposeExamTip: 'Quick win.',
    subject: 'Mathematics', subtopicTag: 'Law of Exponents', dimensionless: true, status: 'LIVE', sourceId: null,
    createdAt: new Date(), updatedAt: new Date(), topic: { id: 't-alg', name: 'Algebra' }, subtopic: null, source: null, ...over,
});

let updateCard; let version; let updateRev;
beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockImplementation(async ({ where }) => ({ id: where.id }));
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => ({ role: where.id === 'admin' ? 'ADMIN' : 'USER' }));
    invalidateRole('admin'); invalidateRole('user');
    vi.spyOn(prisma.topic, 'findMany').mockResolvedValue(TOPICS);
    vi.spyOn(prisma.syllabusSubtopic, 'findFirst').mockImplementation(async ({ where }) => SUBTOPICS.find((s) => s.topicId === where.topicId && s.normKey === where.normKey) || null);
    vi.spyOn(prisma.idempotencyRecord, 'create').mockResolvedValue({});
    vi.spyOn(prisma.idempotencyRecord, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.idempotencyRecord, 'update').mockResolvedValue({});
    updateCard = vi.spyOn(prisma.referenceCard, 'update').mockImplementation(async ({ data }) => card({ ...data, subtopic: data.subtopicId ? { id: data.subtopicId, name: 'Algebraic Expressions', sortOrder: 0 } : null }));
    version = vi.spyOn(prisma.referenceCardVersion, 'create').mockResolvedValue({});
    updateRev = vi.spyOn(prisma.referenceCardRevision, 'update').mockResolvedValue({});
    vi.spyOn(prisma, '$transaction').mockImplementation(async (arg) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg)));
    invalidateTopicCache();
});
afterEach(() => vi.restoreAllMocks());

describe('a card under a syllabus subtopic', () => {
    it('an edit files it under a subtopic of its own topic, by name in any letter case', async () => {
        vi.spyOn(prisma.referenceCard, 'findUnique').mockResolvedValue(card());
        const res = await request(app()).put('/api/reference-cards/c1').set(as('admin')).send({ subtopic: 'algebraic EXPRESSIONS' });
        expect(res.status).toBe(200);
        expect(updateCard.mock.calls[0][0].data).toMatchObject({ subtopicId: 's-expr' });
    });

    it('refuses a subtopic its topic does not have', async () => {
        vi.spyOn(prisma.referenceCard, 'findUnique').mockResolvedValue(card());
        const res = await request(app()).put('/api/reference-cards/c1').set(as('admin')).send({ subtopic: 'Fourier Series' });
        expect(res.status).toBe(400);
        expect(res.body.reasons).toContain('unknown-subtopic');
        expect(updateCard).not.toHaveBeenCalled();
    });

    it("an edit that doesn't name one keeps the card's subtopic", async () => {
        vi.spyOn(prisma.referenceCard, 'findUnique').mockResolvedValue(card({ subtopic: { id: 's-expr', name: 'Algebraic Expressions', sortOrder: 0 } }));
        await request(app()).put('/api/reference-cards/c1').set(as('admin')).send({ description: 'One raised to any power is one.' });
        expect(updateCard.mock.calls[0][0].data).toMatchObject({ subtopicId: 's-expr' });
    });
});

describe('rewrites of live cards', () => {
    const rev = (over = {}) => ({ id: 'r1', status: 'PENDING', retire: false, note: null, cardId: 'c1',
        content: { name: 'Power of One', subtopic: 'Algebraic Expressions', subtopicTag: 'Laws of exponents', status: 'LIVE', subject: 'EE' }, ...over });

    it('approving copies the content onto the card in place, keeps a version, and ignores fields a rewrite may not set', async () => {
        vi.spyOn(prisma.referenceCardRevision, 'findUnique').mockResolvedValue(rev());
        vi.spyOn(prisma.referenceCard, 'findUnique').mockResolvedValue(card());
        const res = await request(app()).post('/api/reference-cards/revisions/r1/approve').set(as('admin'));
        expect(res.status).toBe(200);
        const data = updateCard.mock.calls[0][0];
        expect(data.where).toEqual({ id: 'c1' });
        expect(data.data).toMatchObject({ name: 'Power of One', subtopicId: 's-expr', subtopicTag: 'Laws of exponents', subject: 'Mathematics' });
        expect(data.data).not.toHaveProperty('status');
        expect(version.mock.calls[0][0].data).toMatchObject({ cardId: 'c1', action: 'EDITED', editor: 'admin' });
        expect(updateRev.mock.calls[0][0]).toMatchObject({ where: { id: 'r1' }, data: { status: 'APPLIED', reviewedBy: 'admin' } });
    });

    it('a retiring rewrite takes the card out, with a version kept', async () => {
        vi.spyOn(prisma.referenceCardRevision, 'findUnique').mockResolvedValue(rev({ retire: true, note: 'Same as Sum of Cubes Formula.', content: {} }));
        vi.spyOn(prisma.referenceCard, 'findUnique').mockResolvedValue(card());
        await request(app()).post('/api/reference-cards/revisions/r1/approve').set(as('admin'));
        expect(updateCard.mock.calls[0][0].data).toMatchObject({ status: 'REJECTED', reviewNote: 'Same as Sum of Cubes Formula.' });
        expect(version.mock.calls[0][0].data).toMatchObject({ action: 'REJECTED' });
    });

    it('refuses a rewrite that would leave the card incomplete, one already reviewed, and one whose card is gone', async () => {
        vi.spyOn(prisma.referenceCard, 'findUnique').mockResolvedValue(card());
        const find = vi.spyOn(prisma.referenceCardRevision, 'findUnique').mockResolvedValue(rev({ content: { variables: [] } }));
        let res = await request(app()).post('/api/reference-cards/revisions/r1/approve').set(as('admin'));
        expect(res.status).toBe(400);
        expect(res.body.reasons[0]).toMatch(/missing-variables/);
        find.mockResolvedValue(rev({ status: 'APPLIED' }));
        expect((await request(app()).post('/api/reference-cards/revisions/r1/approve').set(as('admin'))).status).toBe(409);
        find.mockResolvedValue(rev());
        prisma.referenceCard.findUnique.mockResolvedValue(card({ status: 'REJECTED' }));
        expect((await request(app()).post('/api/reference-cards/revisions/r1/approve').set(as('admin'))).status).toBe(409);
        expect(updateCard).not.toHaveBeenCalled();
    });

    it('Approve all applies each and says which failed', async () => {
        vi.spyOn(prisma.referenceCard, 'findUnique').mockResolvedValue(card());
        vi.spyOn(prisma.referenceCardRevision, 'findUnique').mockImplementation(async ({ where }) => (where.id === 'bad' ? rev({ id: 'bad', status: 'REJECTED' }) : rev({ id: where.id })));
        const res = await request(app()).post('/api/reference-cards/revisions/approve-bulk').set(as('admin')).send({ ids: ['r1', 'bad'] });
        expect(res.body).toMatchObject({ approved: ['r1'], failed: [{ id: 'bad', reason: 'already-reviewed' }] });
    });

    it('lists the waiting ones with their card, rejects one, and is for admins only', async () => {
        vi.spyOn(prisma.referenceCardRevision, 'findMany').mockResolvedValue([{ id: 'r1', content: {}, retire: false, note: null, createdAt: new Date(), card: card() }]);
        const list = await request(app()).get('/api/reference-cards/revisions').set(as('admin'));
        expect(list.body.items[0].card.name).toBe('One Base Law');
        const reject = vi.spyOn(prisma.referenceCardRevision, 'updateMany').mockResolvedValue({ count: 1 });
        expect((await request(app()).post('/api/reference-cards/revisions/r1/reject').set(as('admin'))).status).toBe(200);
        expect(reject.mock.calls[0][0]).toMatchObject({ where: { id: 'r1', status: 'PENDING' }, data: { status: 'REJECTED' } });
        for (const [m, path] of [['get', '/revisions'], ['post', '/revisions/r1/approve'], ['post', '/revisions/r1/reject'], ['post', '/revisions/approve-bulk']]) {
            expect((await request(app())[m](`/api/reference-cards${path}`).set(as('user')).send({ ids: ['r1'] })).status, path).toBe(403);
        }
    });
});
