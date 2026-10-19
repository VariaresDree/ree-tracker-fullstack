import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Admin › Question bank's "Answer positions": where the key sits across the
// live bank, and which rows to fix before their options are shuffled.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { invalidateRole } = require('../src/middlewares/roleMiddleware');
const questionRoutes = require('../src/routes/questionRoutes');
const { auditOptions, namesOptionByLetter } = require('../src/services/optionAudit');

const ADMIN_UID = 'uid-admin-audit';
const USER_UID = 'uid-user-audit';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

const row = (id, options, answer, fixedExplanation = null) => ({ id, options, answer, fixedExplanation });
const ROWS = [
    row('a1', ['K', 'x', 'y', 'z'], 'K'),
    row('a2', ['K', 'x', 'y', 'z'], 'K', 'Option B ignores the power factor.'),
    row('b1', ['x', 'K', 'y', 'z'], 'K', 'The 2.4 kA value forgets √3; I = 5 (A).'),
    row('c1', ['x', 'y', 'K', 'z'], 'K', 'Therefore the answer is C.'),
    row('m1', ['x', 'y', 'z', 'w'], 'B'),
    row('f1', ['1', '2', 'Both A and B', '3'], '1'),
];
// A key that lost its option's `$`: missing, and fixable.
const DOLLAR = row('k1', ['$1 - k^3$', '$1 - k^2$', '$k^3$', '$(1-k)^3$'], '1 - k^3');

describe('auditOptions', () => {
    it('counts the key per position and lists the rows to fix', () => {
        const audit = auditOptions(ROWS);
        expect(audit.total).toBe(6);
        expect(audit.positions).toMatchObject({ A: 3, B: 1, C: 1, D: 0, missing: 1, fixedOrder: 1 });
        expect(audit.shares).toMatchObject({ A: 60, B: 20, C: 20, D: 0 });
        expect(audit.samples).toEqual({ missing: ['m1'], fixedOrder: ['f1'], letterInExplanation: ['a2', 'c1'] });
        expect(audit.letterInExplanation).toBe(2);
    });

    it('flags an option named by letter, not units or ordinary words', () => {
        expect(namesOptionByLetter('Choice (D) uses line voltage.')).toBe(true);
        expect(namesOptionByLetter('so letter A is right')).toBe(true);
        expect(namesOptionByLetter('I = 5 (A) and C = 2 F.')).toBe(false);
        expect(namesOptionByLetter('An optional breaker; the options differ.')).toBe(false);
        expect(namesOptionByLetter(null)).toBe(false);
    });

    it('proposes the option a key matches up to form, and not a guess between duplicates', () => {
        const dup = row('d1', ['$F = A$', 'x', '$F = A$', 'y'], 'F = A');
        const audit = auditOptions([...ROWS, DOLLAR, dup]);
        expect(audit.samples.missing).toEqual(['m1', 'k1', 'd1']);
        expect(audit.keyFixes).toEqual([{ id: 'k1', from: '1 - k^3', to: '$1 - k^3$' }]);
    });

    it('handles an empty bank', () => {
        expect(auditOptions([])).toMatchObject({ total: 0, shares: { A: 0, B: 0, C: 0, D: 0, other: 0 } });
    });
});

describe('GET /api/questions/option-audit', () => {
    let app;
    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/questions', questionRoutes);
        verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
        vi.spyOn(prisma.user, 'upsert').mockImplementation(async ({ where }) => ({ id: where.id }));
        vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => ({ role: where.id === ADMIN_UID ? 'ADMIN' : 'USER' }));
        vi.spyOn(prisma.question, 'findMany').mockResolvedValue(ROWS);
        invalidateRole(ADMIN_UID);
        invalidateRole(USER_UID);
    });
    afterEach(() => vi.restoreAllMocks());

    it('is for admins only', async () => {
        const res = await request(app).get('/api/questions/option-audit').set(as(USER_UID));
        expect(res.status).toBe(403);
        expect(prisma.question.findMany).not.toHaveBeenCalled();
    });

    it('audits the live bank', async () => {
        const res = await request(app).get('/api/questions/option-audit').set(as(ADMIN_UID));
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ total: 6, positions: { A: 3 }, samples: { missing: ['m1'] } });
        expect(res.body.checkedAt).toEqual(expect.any(String));
        expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isFlagged: false } }));
    });
});

describe('POST /api/questions/option-audit/fix-keys', () => {
    let app;
    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/questions', questionRoutes);
        verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
        vi.spyOn(prisma.user, 'upsert').mockImplementation(async ({ where }) => ({ id: where.id }));
        vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => ({ role: where.id === ADMIN_UID ? 'ADMIN' : 'USER' }));
        vi.spyOn(prisma.question, 'findMany').mockResolvedValue([...ROWS, DOLLAR]);
        vi.spyOn(prisma.question, 'update').mockImplementation(async (args) => args);
        vi.spyOn(prisma.questionVersion, 'create').mockImplementation(async (args) => args);
        vi.spyOn(prisma, '$transaction').mockImplementation(async (ops) => Promise.all(ops));
        invalidateRole(ADMIN_UID);
        invalidateRole(USER_UID);
    });
    afterEach(() => vi.restoreAllMocks());

    it('is for admins only', async () => {
        const res = await request(app).post('/api/questions/option-audit/fix-keys').set(as(USER_UID)).send({ ids: ['k1'] });
        expect(res.status).toBe(403);
        expect(prisma.question.update).not.toHaveBeenCalled();
    });

    it('sets a key to its option, versioned, and leaves the rest alone', async () => {
        const res = await request(app).post('/api/questions/option-audit/fix-keys').set(as(ADMIN_UID)).send({ ids: ['k1', 'm1', 'a1', 'gone'] });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            fixed: ['k1'],
            skipped: [
                { id: 'm1', reason: 'no-single-match' },
                { id: 'a1', reason: 'already-an-option' },
                { id: 'gone', reason: 'not-found' },
            ],
        });
        expect(prisma.question.update).toHaveBeenCalledTimes(1);
        expect(prisma.question.update).toHaveBeenCalledWith({ where: { id: 'k1' }, data: { answer: '$1 - k^3$' } });
        expect(prisma.questionVersion.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ questionId: 'k1', action: 'LIVE_EDIT', editor: ADMIN_UID, snapshot: expect.objectContaining({ answer: '1 - k^3' }) }),
        });
    });

    it('needs a list of ids', async () => {
        const res = await request(app).post('/api/questions/option-audit/fix-keys').set(as(ADMIN_UID)).send({ ids: [] });
        expect(res.status).toBe(400);
    });
});
