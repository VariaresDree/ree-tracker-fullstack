import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// A battle's questions keep their key from the battle's own players until the
// battle closes, on every route that would show it (services/answerGate.js).

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { lockedQuestionIds } = require('../src/services/answerGate');
const bookmarkRoutes = require('../src/routes/bookmarkRoutes');

const UID = 'uid-gate';
const NOW = Date.UTC(2026, 9, 13, 8, 0);
const battle = (id, questions, startMin, limitSecs = 600) => ({
    battle: { id, questions, startedAt: new Date(NOW + startMin * 60_000), timeLimitSecs: limitSecs, createdAt: new Date(NOW + startMin * 60_000) },
});

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
});
afterEach(() => vi.restoreAllMocks());

describe('lockedQuestionIds', () => {
    it('locks the asked-for questions of an open battle, and none of a closed one', async () => {
        vi.spyOn(prisma.battleParticipant, 'findMany').mockResolvedValue([
            battle('LIVE', [{ id: 'q1' }, { id: 'q2' }], -2),
            battle('OVER', [{ id: 'q3' }], -60, 60),
        ]);
        const locked = await lockedQuestionIds(UID, ['q1', 'q3', 'q9'], NOW);
        expect([...locked]).toEqual(['q1']);
    });

    it('treats a battle that never started as open', async () => {
        vi.spyOn(prisma.battleParticipant, 'findMany').mockResolvedValue([
            { battle: { id: 'LOBBY', questions: [{ id: 'q1' }], startedAt: null, createdAt: null, timeLimitSecs: 600 } },
        ]);
        expect([...await lockedQuestionIds(UID, ['q1'], NOW)]).toEqual(['q1']);
    });

    it('skips the lookup when nothing is asked', async () => {
        const findMany = vi.spyOn(prisma.battleParticipant, 'findMany');
        expect((await lockedQuestionIds(UID, [], NOW)).size).toBe(0);
        expect(findMany).not.toHaveBeenCalled();
    });
});

describe('GET /api/bookmarks', () => {
    function makeApp() {
        const app = express();
        app.use(express.json());
        app.use('/api/bookmarks', bookmarkRoutes);
        return app;
    }
    const saved = (id) => ({ id: `b-${id}`, createdAt: new Date(NOW), question: { id, text: `Q ${id}`, answer: 'A', fixedExplanation: 'why' } });

    it("hides the key of a saved question that is in the learner's open battle", async () => {
        vi.spyOn(prisma.bookmark, 'findMany').mockResolvedValue([saved('q1'), saved('q2')]);
        vi.spyOn(prisma.battleParticipant, 'findMany').mockResolvedValue([battle('LIVE', [{ id: 'q1' }], 0)]);
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(NOW + 60_000);
        try {
            const res = await request(makeApp()).get('/api/bookmarks').set({ Authorization: `Bearer ${UID}` });
            expect(res.status).toBe(200);
            const [a, b] = res.body.items;
            expect(a).toMatchObject({ id: 'q1', answer: null, fixedExplanation: null, answerWithheld: true });
            expect(b).toMatchObject({ id: 'q2', answer: 'A', fixedExplanation: 'why' });
            expect(b.answerWithheld).toBeUndefined();
        } finally {
            vi.useRealTimers();
        }
    });
});
