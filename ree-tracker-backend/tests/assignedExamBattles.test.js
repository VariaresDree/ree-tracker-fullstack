import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// A battle on an assigned exam: the server takes the exam's questions and time
// (never the client's), refuses a draft, and a rematch is the same exam again.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const battleRoutes = require('../src/routes/battleRoutes');
const { battleCreateSchema } = require('../src/schemas/battleSchemas');
const { createBattle } = require('../src/services/battleCreate');

const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const EXAM = { id: 'x1', title: 'EE prelim', subject: 'EE', questionIds: ['q3', 'q1', 'q2', 'q4', 'q5'], timeLimitSecs: 1800 };
const row = (id) => ({ id, subject: 'EE', answer: 'A', options: ['A', 'B'] });

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockImplementation(async ({ where }) => ({ id: where.id }));
    vi.spyOn(prisma.assignedExam, 'findFirst').mockImplementation(async ({ where }) => (where.id === 'x1' && where.status === 'published' ? EXAM : null));
    vi.spyOn(prisma.question, 'findMany').mockImplementation(async ({ where }) => where.id.in.map(row));
    vi.spyOn(prisma.battle, 'create').mockImplementation(async ({ data }) => data);
});

afterEach(() => vi.restoreAllMocks());

describe('battleCreateSchema', () => {
    const parse = (config) => battleCreateSchema.safeParse({ battleId: 'ABC123', timeLimitSecs: 600, config });
    it('takes an assigned exam by id, and needs the id', () => {
        expect(parse({ mode: 'assigned', assignedExamId: 'x1' }).success).toBe(true);
        expect(parse({ mode: 'assigned' }).success).toBe(false);
    });
    it('a finished battle’s stored settings pass again, so it can have a rematch', () => {
        const stored = { mode: 'assigned', assignedExamId: 'x1', title: 'EE prelim', subject: 'EE', isPrcStandard: false, count: 5, optionOrder: 'seeded-v1' };
        const settings = battleCreateSchema.omit({ battleId: true }).safeParse({ config: stored, timeLimitSecs: 1800 });
        expect(settings.success).toBe(true);
        expect(settings.data.config).toMatchObject({ mode: 'assigned', assignedExamId: 'x1' });
    });
    it('leaves the other modes as they were', () => {
        expect(parse({ mode: 'subject', subject: 'EE', count: 20 }).success).toBe(true);
    });
});

describe('createBattle on an assigned exam', () => {
    it('uses the exam’s questions in its order and its time, whatever the client sent', async () => {
        const battle = await createBattle({ hostId: 'ana', battleId: 'ABC123', config: { mode: 'assigned', assignedExamId: 'x1', count: 99, subject: 'Math' }, timeLimitSecs: 60 });
        expect(battle.questions.map((q) => q.id)).toEqual(EXAM.questionIds);
        expect(battle.timeLimitSecs).toBe(1800);
        expect(battle.config).toEqual({ mode: 'assigned', assignedExamId: 'x1', title: 'EE prelim', subject: 'EE', isPrcStandard: false, count: 5, optionOrder: expect.any(String) });
    });

    it('keeps the host’s one-order choice', async () => {
        const battle = await createBattle({ hostId: 'ana', battleId: 'ABC123', config: { mode: 'assigned', assignedExamId: 'x1', sameOrder: true }, timeLimitSecs: 60 });
        expect(battle.config.sameOrder).toBe(true);
    });

    it('a rematch is the same exam again, not the questions to avoid', async () => {
        const battle = await createBattle({ hostId: 'ana', battleId: 'DEF456', config: { mode: 'assigned', assignedExamId: 'x1' }, timeLimitSecs: 1800, rematchOfId: 'ABC123', avoidIds: EXAM.questionIds });
        expect(battle.questions.map((q) => q.id)).toEqual(EXAM.questionIds);
        expect(battle.rematchOfId).toBe('ABC123');
    });

    it('nothing for a draft or a deleted exam', async () => {
        expect(await createBattle({ hostId: 'ana', battleId: 'ABC123', config: { mode: 'assigned', assignedExamId: 'draft' }, timeLimitSecs: 60 })).toBeNull();
        expect(prisma.battle.create).not.toHaveBeenCalled();
    });
});

describe('POST /api/battles with an assigned exam', () => {
    const app = () => {
        const a = express();
        a.use(express.json());
        a.use('/api/battles', battleRoutes);
        return a;
    };
    it('hosts it', async () => {
        const res = await request(app()).post('/api/battles').set(as('ana'))
            .send({ battleId: 'ABC123', timeLimitSecs: 1800, config: { mode: 'assigned', assignedExamId: 'x1' } });
        expect(res.status).toBe(201);
        expect(res.body.battleId).toBe('ABC123');
    });
    it('a draft exam can’t be hosted', async () => {
        const res = await request(app()).post('/api/battles').set(as('ana'))
            .send({ battleId: 'ABC123', timeLimitSecs: 1800, config: { mode: 'assigned', assignedExamId: 'draft' } });
        expect(res.status).toBe(422);
    });
});
