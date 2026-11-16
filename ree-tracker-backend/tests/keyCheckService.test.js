import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Admin › Question bank › Fix › Questions to check (2026-11-16): the scan keeps
// what it finds, a settled finding stays settled until the question changes,
// and each one is settled in one tap.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { invalidateRole } = require('../src/middlewares/roleMiddleware');
const questionReplace = require('../src/services/questionReplace');
const keyCheck = require('../src/services/keyCheck');
const questionRoutes = require('../src/routes/questionRoutes');

const ADMIN = 'uid-admin';
const USER = 'uid-user';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const app = () => { const a = express(); a.use(express.json()); a.use('/api/questions', questionRoutes); return a; };

const line = (s) => s;
// Rows as the scan's page query returns them.
const page = [
    { id: 'q1', answer: '0.853 H', options: ['0.853 H', '0.700 H', '0.953 H', '0.600 H'], line: line(' The total inductance is $0.953\\ \\text{H}$.'), hash: 'h1' },
    { id: 'q2', answer: '24V', options: ['9V', '12V', '24V', '48V'], line: line(' $24V$.'), hash: 'h2' },
    { id: 'q3', answer: '1', options: ['1', '2', '2', '3'], line: null, hash: 'h3' },
    { id: 'q4', answer: 'A', options: ['A', 'B', 'C', 'D'], line: null, hash: 'h4' },
];
const isPage = (strings) => strings.join('').includes('md5(');

let existing;
beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockImplementation(async ({ where }) => ({ id: where.id }));
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => ({ role: where.id === ADMIN ? 'ADMIN' : 'USER' }));
    invalidateRole(ADMIN);
    invalidateRole(USER);
    existing = [];
    vi.spyOn(prisma, '$queryRaw').mockImplementation(async (strings) => (isPage(strings)
        ? page
        // Learners' picks: q4 has 5 learners, 4 on B.
        : [{ questionId: 'q4', option: 'B', learners: 4, isKey: false }, { questionId: 'q4', option: 'A', learners: 1, isKey: true }]));
    vi.spyOn(prisma.questionCheck, 'findMany').mockImplementation(async () => existing);
    vi.spyOn(prisma.questionCheck, 'createMany').mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.questionCheck, 'update').mockResolvedValue({});
    vi.spyOn(prisma.questionCheck, 'updateMany').mockResolvedValue({ count: 1 });
    vi.spyOn(prisma.questionCheck, 'count').mockResolvedValue(3);
    vi.spyOn(prisma.jobRun, 'create').mockResolvedValue({});
    vi.spyOn(prisma.jobRun, 'deleteMany').mockResolvedValue({ count: 0 });
});
afterEach(() => vi.restoreAllMocks());

describe('scanBank', () => {
    it('keeps each finding with the question as it was found', async () => {
        const out = await keyCheck.scanBank();
        expect(out).toMatchObject({ scanned: 4, added: 3, reopened: 0, gone: 0 });
        const made = prisma.questionCheck.createMany.mock.calls[0][0].data;
        expect(made.map((m) => [m.questionId, m.reason, m.contentHash])).toEqual([
            ['q1', 'explanation-names-other', 'h1'],
            ['q3', 'duplicate-options', 'h3'],
            ['q4', 'learners-chose-other', 'h4'],
        ]);
        expect(made[0].detail).toMatchObject({ option: '0.953 H' });
        expect(prisma.jobRun.create.mock.calls[0][0].data).toMatchObject({ job: 'key-check', ok: true });
    });

    it("leaves a settled one settled while the question is unchanged, reopens it once it changes, and closes what's gone", async () => {
        existing = [
            { id: 'c1', questionId: 'q1', reason: 'explanation-names-other', contentHash: 'h1', resolvedAt: new Date() },
            { id: 'c3', questionId: 'q3', reason: 'duplicate-options', contentHash: 'old', resolvedAt: new Date() },
            { id: 'c9', questionId: 'q2', reason: 'explanation-names-other', contentHash: 'h2', resolvedAt: null },
        ];
        const out = await keyCheck.scanBank();
        expect(out).toMatchObject({ added: 1, reopened: 1, gone: 1 });
        expect(prisma.questionCheck.update.mock.calls.map(([a]) => a.where.id)).toEqual(['c3']);
        expect(prisma.questionCheck.update.mock.calls[0][0].data).toMatchObject({ resolvedAt: null, contentHash: 'h3' });
        expect(prisma.questionCheck.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: { in: ['c9'] } }, data: { resolution: 'gone' } });
    });
});

describe('resolveCheck', () => {
    const question = { id: 'q1', text: 'Two coils…', options: ['0.853 H', '0.700 H', '0.953 H', '0.600 H'], answer: '0.853 H', fixedExplanation: '**Answer:** 0.953 H', isFlagged: false };
    const found = (over = {}) => vi.spyOn(prisma.questionCheck, 'findUnique').mockResolvedValue({ id: 'c1', reason: 'explanation-names-other', resolvedAt: null, question, ...over });

    it('makes the named option the key through the reviewed path, regrading past answers', async () => {
        found();
        const replace = vi.spyOn(questionReplace, 'replaceQuestions').mockResolvedValue({ applied: [{ id: 'q1', keyChanged: true, regraded: 3, unrecorded: 1 }], skipped: [] });
        const out = await keyCheck.resolveCheck('c1', { action: 'use-option', answer: '0.953 H' }, ADMIN);
        expect(out).toMatchObject({ status: 200, regraded: 3, unrecorded: 1 });
        expect(replace.mock.calls[0][0][0]).toMatchObject({ id: 'q1', answer: '0.953 H', confirmKeyChange: true, text: question.text, options: question.options });
        expect(replace.mock.calls[0][1]).toBe(ADMIN);
        expect(prisma.questionCheck.updateMany.mock.calls[0][0]).toMatchObject({ where: { questionId: 'q1', resolvedAt: null }, data: { resolution: 'key-changed', resolvedBy: ADMIN } });
    });

    it('refuses an answer that is not an option, the same key, and says why a change was refused', async () => {
        found();
        expect(await keyCheck.resolveCheck('c1', { action: 'use-option', answer: '9 H' }, ADMIN)).toMatchObject({ status: 400 });
        expect(await keyCheck.resolveCheck('c1', { action: 'use-option', answer: '0.853 H' }, ADMIN)).toMatchObject({ status: 400 });
        vi.spyOn(questionReplace, 'replaceQuestions').mockResolvedValue({ applied: [], skipped: [{ id: 'q1', reason: 'in-battle' }] });
        expect(await keyCheck.resolveCheck('c1', { action: 'use-option', answer: '0.953 H' }, ADMIN)).toMatchObject({ status: 409, error: expect.stringMatching(/battle/) });
        expect(prisma.questionCheck.updateMany).not.toHaveBeenCalled();
    });

    it("'Key is right' closes the question's key findings; 'Remove' takes it out of the bank", async () => {
        found();
        await keyCheck.resolveCheck('c1', { action: 'keep' }, ADMIN);
        expect(prisma.questionCheck.updateMany.mock.calls[0][0]).toMatchObject({
            where: { questionId: 'q1', resolvedAt: null, reason: { in: ['explanation-names-other', 'learners-chose-other'] } },
            data: { resolution: 'kept' },
        });
        const flag = vi.spyOn(prisma.question, 'update').mockResolvedValue({});
        await keyCheck.resolveCheck('c1', { action: 'remove' }, ADMIN);
        expect(flag).toHaveBeenCalledWith({ where: { id: 'q1' }, data: { isFlagged: true } });
        expect(prisma.questionCheck.updateMany.mock.calls[1][0].data).toMatchObject({ resolution: 'removed' });
    });

    it('a finding already settled, or not there, is not settled again', async () => {
        found({ resolvedAt: new Date() });
        expect(await keyCheck.resolveCheck('c1', { action: 'keep' }, ADMIN)).toMatchObject({ status: 409 });
        prisma.questionCheck.findUnique.mockResolvedValue(null);
        expect(await keyCheck.resolveCheck('nope', { action: 'keep' }, ADMIN)).toMatchObject({ status: 404 });
    });
});

describe('resolveMany', () => {
    const question = { id: 'q1', text: 'Two coils…', options: ['0.853 H', '0.700 H', '0.953 H', '0.600 H'], answer: '0.853 H', fixedExplanation: '**Answer:** 0.953 H', isFlagged: false };
    const rows = {
        c1: { id: 'c1', reason: 'explanation-names-other', detail: { option: '0.953 H' }, resolvedAt: null, question },
        c2: { id: 'c2', reason: 'duplicate-options', detail: { options: [1, 2] }, resolvedAt: null, question: { ...question, id: 'q2' } },
        c3: { id: 'c3', reason: 'learners-chose-other', detail: { option: '0.700 H' }, resolvedAt: new Date(), question },
    };
    beforeEach(() => {
        vi.spyOn(prisma.questionCheck, 'findUnique').mockImplementation(async ({ where }) => rows[where.id] || null);
    });

    it("settles each one the same way; one already closed by its question's other finding counts as done", async () => {
        const out = await keyCheck.resolveMany(['c1', 'c2', 'c3', 'c1'], 'keep', ADMIN);
        expect(out).toMatchObject({ status: 200, settled: 3, failed: [] });
        expect(prisma.questionCheck.updateMany).toHaveBeenCalledTimes(2);
    });

    it("'use the explanation's answer' takes the option each explanation works out, and says which it couldn't do", async () => {
        const replace = vi.spyOn(questionReplace, 'replaceQuestions').mockResolvedValue({ applied: [{ id: 'q1', regraded: 2 }], skipped: [] });
        const out = await keyCheck.resolveMany(['c1', 'c2', 'missing'], 'use-option', ADMIN);
        expect(replace.mock.calls[0][0][0]).toMatchObject({ id: 'q1', answer: '0.953 H', confirmKeyChange: true });
        expect(out).toMatchObject({ settled: 1, regraded: 2 });
        expect(out.failed.map((f) => f.id)).toEqual(['c2', 'missing']);
    });

    it('refuses an action it does not take in bulk', async () => {
        expect(await keyCheck.resolveMany(['c1'], 'edited', ADMIN)).toMatchObject({ status: 400 });
    });
});

describe('routes', () => {
    it('are for admins only', async () => {
        for (const [method, path] of [['get', '/api/questions/key-checks'], ['post', '/api/questions/key-checks/scan'], ['post', '/api/questions/key-checks/c1/resolve'], ['post', '/api/questions/key-checks/resolve-bulk']]) {
            const body = path.endsWith('bulk') ? { ids: ['c1'], action: 'keep' } : { action: 'keep' };
            const res = await request(app())[method](path).set(as(USER)).send(body);
            expect(res.status, path).toBe(403);
        }
    });

    it('resolve checks the action, and answers with what happened', async () => {
        expect((await request(app()).post('/api/questions/key-checks/c1/resolve').set(as(ADMIN)).send({ action: 'nuke' })).status).toBe(400);
        vi.spyOn(keyCheck, 'resolveCheck').mockResolvedValue({ status: 200, closed: 1, regraded: 2 });
        const res = await request(app()).post('/api/questions/key-checks/c1/resolve').set(as(ADMIN)).send({ action: 'use-option', answer: 'B' });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ success: true, regraded: 2 });
    });

    it('resolve-bulk checks the ids and action, and answers with how many', async () => {
        expect((await request(app()).post('/api/questions/key-checks/resolve-bulk').set(as(ADMIN)).send({ ids: [], action: 'keep' })).status).toBe(400);
        expect((await request(app()).post('/api/questions/key-checks/resolve-bulk').set(as(ADMIN)).send({ ids: ['c1'], action: 'edited' })).status).toBe(400);
        vi.spyOn(keyCheck, 'resolveMany').mockResolvedValue({ status: 200, settled: 2, regraded: 0, failed: [] });
        const res = await request(app()).post('/api/questions/key-checks/resolve-bulk').set(as(ADMIN)).send({ ids: ['c1', 'c2'], action: 'keep' });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ success: true, settled: 2 });
    });
});
