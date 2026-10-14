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
