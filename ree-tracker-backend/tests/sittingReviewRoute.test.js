import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// GET /api/analytics/deep/sittings/:id/review. A past sitting could not be
// reopened at all: the results screen kept its items in the tab's memory, the
// full board reviewed only its last section, and the placement test showed no
// answers. Answers are revealed only once a sitting is closed.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const analyticsDeepRoutes = require('../src/routes/analyticsDeepRoutes');
const { isSittingClosed, orderReviewRows } = require('../src/services/sittingReview');

const UID = 'uid-review';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const NOW = Date.now();

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/analytics/deep', analyticsDeepRoutes);
    return app;
}

const q = (id, subject, answer = 'A') => ({ id, subject, subtopic: `${subject} topic`, text: `Q ${id}`, options: ['A', 'B', 'C', 'D'], answer, fixedExplanation: `Why ${id}`, type: 'computational' });
const attempt = (questionId, subject, over = {}) => ({
    id: `a-${questionId}`, questionId, subject, subtopic: `${subject} topic`, isCorrect: false, confidenceLevel: 'MED',
    timeSpentMs: 60000, selectedAnswer: 'B', itemIndex: 0, answeredAt: new Date(NOW), createdAt: new Date(NOW), ...over,
});

let session;
let attempts;
let battle;
beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
    session = null;
    attempts = [];
    battle = null;
    vi.spyOn(prisma.examSession, 'findFirst').mockImplementation(async ({ where }) =>
        (session && where.id === session.id && where.userId === UID ? session : null));
    vi.spyOn(prisma.questionAttempt, 'findMany').mockImplementation(async () => attempts);
    vi.spyOn(prisma.battle, 'findUnique').mockImplementation(async () => battle);
    vi.spyOn(prisma.question, 'findMany').mockImplementation(async ({ where }) =>
        where.id.in.map((id) => q(id, id.startsWith('m') ? 'Mathematics' : id.startsWith('s') ? 'ESAS' : 'EE')));
});

afterEach(() => vi.restoreAllMocks());

const get = (id, uid = UID) => request(makeApp()).get(`/api/analytics/deep/sittings/${id}/review`).set(as(uid));

describe('GET /sittings/:id/review', () => {
    it('needs a sign-in', async () => {
        const res = await request(makeApp()).get('/api/analytics/deep/sittings/x/review');
        expect(res.status).toBe(401);
    });

    it('answers 404 for a sitting that isn’t yours', async () => {
        session = { id: 'mine', mode: 'BOARD_SIM', config: { finalizedAt: 'x' }, createdAt: new Date() };
        const res = await get('someone-elses');
        expect(res.status).toBe(404);
    });

    it('never reveals an open sitting (a full board mid-way)', async () => {
        session = { id: 'fb', mode: 'BOARD_SIM', config: { kind: 'full-board' }, createdAt: new Date() };
        attempts = [attempt('m1', 'Mathematics')];
        const res = await get('fb');
        expect(res.status).toBe(409);
        expect(res.body.code).toBe('IN_PROGRESS');
        expect(prisma.question.findMany).not.toHaveBeenCalled();
    });

    it('lists a finished full board section by section, your answer beside the key', async () => {
        session = { id: 'fb', mode: 'BOARD_SIM', config: { kind: 'full-board', finalizedAt: 'x', generalAverage: 68.4, markedQuestionIds: ['s1'] }, verdict: 'FAILED', createdAt: new Date() };
        attempts = [
            attempt('e1', 'EE', { itemIndex: 0 }),
            attempt('s2', 'ESAS', { itemIndex: 1, isCorrect: true, selectedAnswer: 'A' }),
            attempt('s1', 'ESAS', { itemIndex: 0, selectedAnswer: '' }),
            attempt('m1', 'Mathematics', { itemIndex: 0 }),
        ];
        const res = await get('fb');
        expect(res.status).toBe(200);
        expect(res.body.items.map((i) => i.questionId)).toEqual(['m1', 's1', 's2', 'e1']);
        expect(res.body.items[0]).toMatchObject({ order: 1, selectedAnswer: 'B', correctAnswer: 'A', answered: true, isCorrect: false, explanation: 'Why m1' });
        expect(res.body.items[1]).toMatchObject({ selectedAnswer: '', answered: false, marked: true });
        expect(res.body.session).toMatchObject({ kind: 'full-board', verdict: 'FAILED', generalAverage: 68.4, hasMarks: true });
    });

    it('says when an answer from an older sitting wasn’t recorded', async () => {
        session = { id: 'old', mode: 'BOARD_SIM', config: { finalizedAt: 'x' }, createdAt: new Date() };
        attempts = [attempt('e1', 'EE', { selectedAnswer: null, itemIndex: null })];
        const res = await get('old');
        expect(res.body.items[0]).toMatchObject({ selectedAnswer: null, answered: null });
    });

    it('keeps a battle closed until everyone is done, then follows its question order', async () => {
        session = { id: 'ABC123:uid-review', mode: 'BATTLE', config: { kind: 'battle', finalizedAt: 'x' }, createdAt: new Date() };
        attempts = [attempt('e2', 'EE'), attempt('e1', 'EE')];
        battle = { status: 'IN_PROGRESS', questions: [{ id: 'e1' }, { id: 'e2' }] };
        expect((await get('ABC123:uid-review')).status).toBe(409);
        battle.status = 'COMPLETED';
        const res = await get('ABC123:uid-review');
        expect(res.status).toBe(200);
        expect(res.body.items.map((i) => i.questionId)).toEqual(['e1', 'e2']);
    });

    it('reviews a finished placement test from its stored responses', async () => {
        session = {
            id: 'diag', mode: 'DIAGNOSTIC', verdict: 'COMPLETED', createdAt: new Date(),
            config: { responses: [
                { questionId: 'm9', subject: 'Mathematics', userAnswer: 'C', isCorrect: false, confidenceLevel: 'HIGH', timeSpentMs: 30000 },
                { questionId: 'e9', subject: 'EE', userAnswer: 'A', isCorrect: true, confidenceLevel: 'MED', timeSpentMs: 90000 },
            ] },
        };
        const res = await get('diag');
        expect(res.status).toBe(200);
        expect(res.body.session.kind).toBe('placement');
        expect(res.body.items.map((i) => [i.questionId, i.selectedAnswer])).toEqual([['m9', 'C'], ['e9', 'A']]);
    });

    it('answers 409 SYNCING while a closed sitting’s answers are still queued', async () => {
        session = { id: 's', mode: 'BOARD_SIM', config: { finalizedAt: 'x' }, createdAt: new Date() };
        attempts = [];
        const res = await get('s');
        expect(res.status).toBe(409);
        expect(res.body.code).toBe('SYNCING');
    });
});

describe('isSittingClosed / orderReviewRows', () => {
    it('treats a sitting left open for over a week as abandoned and reviewable', () => {
        const old = { mode: 'BOARD_SIM', config: {}, createdAt: new Date(NOW - 8 * 86400000) };
        expect(isSittingClosed(old, { now: NOW })).toBe(true);
        expect(isSittingClosed({ ...old, createdAt: new Date(NOW) }, { now: NOW })).toBe(false);
        expect(isSittingClosed({ mode: 'ACTIVE_REVIEW', config: {} }, { now: NOW })).toBe(false);
    });

    it('orders by position, then answer time, for rows without one', () => {
        const rows = [
            { id: 'b', questionId: 'x', itemIndex: null, answeredAt: new Date(2) },
            { id: 'a', questionId: 'y', itemIndex: 3 },
            { id: 'c', questionId: 'z', itemIndex: 1 },
        ];
        expect(orderReviewRows(rows).map((r) => r.id)).toEqual(['c', 'a', 'b']);
    });
});
