import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';

// A finished battle's history, replay and rematch against a real database:
// the nested history read (opponents, the rematch relation), the replay's
// players-only rule, and the unique index that keeps a battle to one rematch
// when two players press Rematch at once.

const verifyIdToken = vi.fn(async (token) => ({ uid: token, email: `${token}@example.test` }));
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../../src/config/db');
const pushService = require('../../src/services/pushService');

const RUN = `rm${Date.now().toString(36)}`;
const A = `${RUN}-a`;
const B = `${RUN}-b`;
const STRANGER = `${RUN}-s`;
const Q = (n) => `${RUN}-q${n}`;
const SUBTOPIC = `${RUN}-sub`;
// Six-character codes, unique to this run.
const OLD = `R${Date.now().toString(36).slice(-5)}`.toUpperCase();
const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const CONFIG = { mode: 'subject', subject: 'EE', subtopic: SUBTOPIC, count: 5, timeLimitMins: 10, isPrcStandard: false };

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/battles', require('../../src/routes/battleRoutes'));
    return app;
}

beforeAll(async () => {
    vi.spyOn(pushService, 'sendToUser').mockResolvedValue(null);
    await prisma.user.createMany({ data: [A, B, STRANGER].map((id) => ({ id, email: `${id}@example.test` })) });
    await prisma.question.createMany({
        data: [1, 2, 3, 4, 5, 6].map((n) => ({ id: Q(n), subject: 'EE', subtopic: SUBTOPIC, text: `Q${n}`, options: ['A', 'B', 'C', 'D'], answer: 'A' })),
    });
    // A finished two-player battle on q1–q2: A won.
    await prisma.battle.create({
        data: {
            id: OLD, hostId: A, config: CONFIG, questions: [{ id: Q(1), answer: 'A' }, { id: Q(2), answer: 'A' }], timeLimitSecs: 600,
            status: 'COMPLETED', startedAt: new Date(Date.now() - 3_600_000),
            participants: {
                create: [
                    { userId: A, displayName: 'Ana', isHost: true, finishedAt: new Date(), score: 2, answers: { [Q(1)]: { userAnswer: 'A', timeSpentMs: 4000 }, [Q(2)]: { userAnswer: 'A', timeSpentMs: 5000 } } },
                    { userId: B, displayName: 'Ben', finishedAt: new Date(), score: 1, answers: { [Q(1)]: { userAnswer: 'A', timeSpentMs: 7000 }, [Q(2)]: { userAnswer: 'C', timeSpentMs: 8000 } } },
                ],
            },
            outcomes: {
                create: [
                    { userId: A, score: 2, total: 2, timeTakenSecs: 60, placement: 1, eloBefore: 1200, eloAfter: 1216, eloDelta: 16, tierBefore: 'BRONZE', tierAfter: 'BRONZE', perQuestion: [{ questionId: Q(1), isCorrect: true, timeMs: 4000 }, { questionId: Q(2), isCorrect: true, timeMs: 5000 }] },
                    { userId: B, score: 1, total: 2, timeTakenSecs: 90, placement: 2, eloBefore: 1200, eloAfter: 1184, eloDelta: -16, tierBefore: 'BRONZE', tierAfter: 'BRONZE', perQuestion: [{ questionId: Q(1), isCorrect: true, timeMs: 7000 }, { questionId: Q(2), isCorrect: false, timeMs: 8000 }] },
                ],
            },
        },
    });
});

afterAll(async () => {
    vi.restoreAllMocks();
    await prisma.battle.deleteMany({ where: { OR: [{ id: OLD }, { rematchOfId: OLD }, { hostId: { in: [A, B] } }] } });
    await prisma.user.deleteMany({ where: { id: { in: [A, B, STRANGER] } } });
    await prisma.question.deleteMany({ where: { subtopic: SUBTOPIC } });
    await prisma.$disconnect();
});

describe('replay', () => {
    it("is for the battle's players only, with everyone's picks", async () => {
        expect((await request(makeApp()).get(`/api/battles/${OLD}/replay`).set(as(STRANGER))).status).toBe(404);
        const res = await request(makeApp()).get(`/api/battles/${OLD}/replay`).set(as(B));
        expect(res.status).toBe(200);
        expect(res.body.players.map((p) => p.displayName)).toEqual(['Ana', 'Ben']);
        expect(res.body.picks[Q(2)]).toEqual([
            { userId: A, answer: 'A', isCorrect: true, timeMs: 5000 },
            { userId: B, answer: 'C', isCorrect: false, timeMs: 8000 },
        ]);
    });
});

describe('rematch', () => {
    it('makes one rematch when both players ask at once, with fresh questions from the same settings, repeating as few as it must', async () => {
        const app = makeApp();
        const [ra, rb] = await Promise.all([
            request(app).post(`/api/battles/${OLD}/rematch`).set(as(A)),
            request(app).post(`/api/battles/${OLD}/rematch`).set(as(B)),
        ]);
        expect([ra.status, rb.status].sort()).toEqual([200, 201]);
        expect(ra.body.battleId).toBe(rb.body.battleId);

        const made = await prisma.battle.findMany({ where: { rematchOfId: OLD } });
        expect(made).toHaveLength(1);
        expect(made[0]).toMatchObject({ id: ra.body.battleId, status: 'WAITING', timeLimitSecs: 600, config: CONFIG });
        expect(made[0].questions.map((q) => q.id).every((id) => id.startsWith(`${RUN}-q`))).toBe(true);
        expect(made[0].questions).toHaveLength(5);
        // The last battle's questions (q1, q2: their key was revealed) come
        // last: all four others are in, and only one repeat fills the fifth.
        const ids = made[0].questions.map((q) => q.id);
        expect(ids).toEqual(expect.arrayContaining([Q(3), Q(4), Q(5), Q(6)]));
        expect(ids.filter((id) => id === Q(1) || id === Q(2))).toHaveLength(1);

        // The unique index itself: a second rematch of the same battle is refused.
        await expect(prisma.battle.create({
            data: { id: `X${OLD.slice(1)}`, hostId: B, config: CONFIG, questions: [], timeLimitSecs: 600, rematchOfId: OLD },
        })).rejects.toMatchObject({ code: 'P2002' });
    });

    it('shows in both histories, with the opponent and the rematch', async () => {
        const res = await request(makeApp()).get('/api/battles/me/history').set(as(B));
        expect(res.status).toBe(200);
        const [item] = res.body.items;
        const rematch = await prisma.battle.findUnique({ where: { rematchOfId: OLD }, select: { id: true } });
        expect(item).toMatchObject({
            battleId: OLD, placement: 2, players: 2, score: 1, eloDelta: -16, answered: 2,
            opponents: [{ userId: A, displayName: 'Ana', placement: 1, score: 2 }],
            rematch: { battleId: rematch.id, status: 'WAITING' },
        });
        expect(res.body.nextBefore).toBeNull();
    });
});
