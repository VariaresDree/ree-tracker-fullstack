import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Today's loop: due reviews and open mistakes as one session, mixed across the
// board subjects by weight (heaviest first), due before mistakes within a
// subject, each question once, and never a live battle's question.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { buildTodayLoop } = require('../src/services/todayLoop');
const todayLoopRoutes = require('../src/routes/todayLoopRoutes');

const W = { Mathematics: 0.25, ESAS: 0.3, EE: 0.45 };
const q = (id, subject) => ({ id, subject, subtopic: 't', text: id, options: ['A', 'B'], answer: 'A' });
const many = (prefix, subject, n) => Array.from({ length: n }, (_, i) => q(`${prefix}${i + 1}`, subject));

describe('buildTodayLoop', () => {
    it('mixes subjects by board weight, heaviest first', () => {
        const due = [...many('m', 'Mathematics', 10), ...many('s', 'ESAS', 10), ...many('e', 'EE', 10)];
        const { items } = buildTodayLoop({ due, weights: W, max: 20 });
        expect(items[0].subject).toBe('EE');
        const share = (s) => items.filter((i) => i.subject === s).length;
        expect([share('EE'), share('ESAS'), share('Mathematics')]).toEqual([9, 6, 5]);
        // Mixed, not blocked: no subject runs more than twice in a row here.
        const runs = items.map((i) => i.subject).join(',');
        expect(runs).not.toMatch(/(EE,){3}/);
    });

    it('puts due reviews before mistakes within a subject and lists a question once', () => {
        const { items, counts } = buildTodayLoop({
            due: [q('d1', 'EE')],
            mistakes: [q('d1', 'EE'), q('x1', 'EE'), q('x2', 'Mathematics')],
            weights: W,
        });
        expect(items.filter((i) => i.subject === 'EE').map((i) => [i.id, i.loop.reason])).toEqual([['d1', 'due'], ['x1', 'mistake']]);
        expect(counts).toEqual({ due: 1, mistakes: 2 });
    });

    it('caps the session and says how many are left', () => {
        const { items, more } = buildTodayLoop({ due: many('e', 'EE', 30), weights: W, max: 25 });
        expect(items).toHaveLength(25);
        expect(more).toBe(5);
    });

    it('keeps a subject the board does not weight, at the end of the mix', () => {
        const { items } = buildTodayLoop({ due: [q('o1', 'Chemistry'), q('e1', 'EE')], weights: W });
        expect(items.map((i) => i.id)).toEqual(['e1', 'o1']);
    });
});

describe('GET /api/user/today-loop', () => {
    function makeApp() {
        const app = express();
        app.use(express.json());
        app.use('/api/user', todayLoopRoutes);
        return app;
    }
    beforeEach(() => {
        verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
        vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: 'uid-loop' });
    });
    afterEach(() => vi.restoreAllMocks());

    it("builds the caller's loop, leaving out a live battle's question, with the cards due", async () => {
        const srs = vi.spyOn(prisma.sRSCard, 'findMany').mockResolvedValue([{ question: q('due-ee', 'EE') }, { question: q('in-battle', 'ESAS') }]);
        vi.spyOn(prisma.questionAttempt, 'findMany').mockImplementation(async ({ where }) => (where.isCorrect
            ? []
            : [{ questionId: 'miss-math', subject: 'Mathematics', subtopic: 't', selectedAnswer: 'B', confidenceLevel: 'MED', timeSpentMs: 1000, answeredAt: new Date(), createdAt: new Date(), mode: 'DRILL' }]));
        vi.spyOn(prisma.question, 'findMany').mockImplementation(async ({ where }) => where.id.in.map((id) => q(id, 'Mathematics')));
        vi.spyOn(prisma.mistakeTag, 'findMany').mockResolvedValue([]);
        vi.spyOn(prisma.syllabusWeight, 'findMany').mockResolvedValue([]);
        const cards = vi.spyOn(prisma.cardReview, 'count').mockResolvedValue(3);
        vi.spyOn(prisma.battleParticipant, 'findMany').mockResolvedValue([
            { battle: { id: 'LIVE01', questions: [{ id: 'in-battle' }], startedAt: new Date(), timeLimitSecs: 600, createdAt: new Date() } },
        ]);

        const res = await request(makeApp()).get('/api/user/today-loop').set({ Authorization: 'Bearer uid-loop' });

        expect(res.status).toBe(200);
        expect(res.body.items.map((i) => [i.id, i.loop.reason])).toEqual([['due-ee', 'due'], ['miss-math', 'mistake']]);
        expect(res.body.items[1]).toMatchObject({ answer: 'A', text: 'miss-math' });
        expect(res.body).toMatchObject({ counts: { due: 1, mistakes: 1 }, cardsDue: 3, more: 0 });
        expect(srs.mock.calls[0][0].where.userId).toBe('uid-loop');
        expect(cards.mock.calls[0][0].where).toMatchObject({ userId: 'uid-loop', card: { status: 'LIVE' } });
    });
});
