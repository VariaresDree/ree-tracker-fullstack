import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// GET /api/battles/me/active and GET /api/battles/:id. A player who closed the
// app mid-battle had no way back: nothing remembered the battle, and the exam
// room restarted with blank answers and the full time. These give "Return to
// battle" its list, and the exam room the player's saved answers and the
// server's clock.
//
// Then a finished battle: your history (GET /me/history), the replay with
// everyone's picks (players only: it used to serve any battle to anyone), and
// Rematch (POST /:id/rematch), which makes one new lobby per battle.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const telemetryService = require('../src/services/telemetryService');
const examHistory = require('../src/services/examHistory');
const prisma = require('../src/config/db');
const lifecycle = require('../src/services/battleLifecycle');
const questionPool = require('../src/services/questionPool');
const battleCreate = require('../src/services/battleCreate');
const pushService = require('../src/services/pushService');
const battleRoutes = require('../src/routes/battleRoutes');
const { installFakeBattleDb } = require('./helpers/fakeBattleDb');

const QUESTIONS = [{ id: 'q1', answer: 'A', text: 'one', options: ['A', 'B'] }, { id: 'q2', answer: 'B', text: 'two', options: ['A', 'B'] }];
const LIMIT = 600;

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/battles', battleRoutes);
    return app;
}
const get = (path, uid = 'me') => request(makeApp()).get(`/api/battles${path}`).set({ Authorization: `Bearer ${uid}` });
const post = (path, uid = 'me', body = {}) => request(makeApp()).post(`/api/battles${path}`).set({ Authorization: `Bearer ${uid}` }).send(body);

let db;
beforeEach(() => {
    lifecycle.battleLobbies.clear();
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    db = installFakeBattleDb(vi, prisma);
    vi.spyOn(telemetryService, 'recordAttempts').mockImplementation(async ({ attempts }) => ({ graded: attempts.map((a) => ({ isCorrect: a.isCorrect })) }));
    vi.spyOn(examHistory, 'finalizeSession').mockResolvedValue({});
});
afterEach(() => {
    for (const lobby of lifecycle.battleLobbies.values()) if (lobby.deadlineTimer) clearTimeout(lobby.deadlineTimer);
    lifecycle.battleLobbies.clear();
    vi.restoreAllMocks();
});

function running(id, agoMs, players) {
    db.addBattle({ id, status: 'IN_PROGRESS', questions: QUESTIONS, timeLimitSecs: LIMIT, startedAt: new Date(Date.now() - agoMs) });
    for (const [userId, over] of Object.entries(players)) {
        db.addUser(userId);
        db.addParticipant(id, userId, over);
    }
}

describe('GET /api/battles/me/active', () => {
    it('needs a sign-in', async () => {
        const res = await request(makeApp()).get('/api/battles/me/active');
        expect(res.status).toBe(401);
    });

    it("lists only the caller's running battles, with the time left", async () => {
        running('ACT001', 60_000, { me: {}, other: {} });
        running('ACT002', 60_000, { other: {} });
        running('ACT003', 30_000, { me: { finishedAt: new Date(), score: 1 } });
        db.addBattle({ id: 'ACT004', status: 'COMPLETED', questions: QUESTIONS });
        db.addParticipant('ACT004', 'me');

        const res = await get('/me/active');
        expect(res.status).toBe(200);
        const byId = Object.fromEntries(res.body.items.map((i) => [i.battleId, i]));
        expect(Object.keys(byId).sort()).toEqual(['ACT001', 'ACT003']);
        expect(byId.ACT001.finished).toBe(false);
        expect(byId.ACT003.finished).toBe(true);
        expect(byId.ACT001.remainingMs).toBeGreaterThan(530_000);
        expect(byId.ACT001.remainingMs).toBeLessThanOrEqual(540_000);
        expect(res.body.serverNow).toBeTypeOf('number');
    });

    it('leaves out a battle whose time is up and finishes it', async () => {
        running('ACT005', (LIMIT + 60) * 1000, { me: {} });
        const res = await get('/me/active');
        expect(res.body.items).toEqual([]);
        await vi.waitFor(() => expect(db.state.battles.get('ACT005').status).toBe('COMPLETED'));
    });
});

describe('GET /api/battles/:id', () => {
    it("gives a player their saved picks (never whether they were right) and the server's clock", async () => {
        running('GET001', 90_000, { me: { answers: { q1: { userAnswer: 'A', confidenceLevel: 'HIGH', timeSpentMs: 5000 } } } });
        const res = await get('/GET001');
        expect(res.status).toBe(200);
        const { battle } = res.body;
        expect(battle.me).toEqual({ answers: { q1: { userAnswer: 'A', confidenceLevel: 'HIGH' } }, finished: false, itemsAnswered: 1 });
        expect(JSON.stringify(battle)).not.toContain('isCorrect');
        expect(battle.questions[0]).not.toHaveProperty('answer');
        expect(battle.timing.remainingMs).toBeGreaterThan(500_000);
        expect(battle.timing.closesAt - battle.timing.endsAt).toBe(30_000);
    });

    it('has no saved answers for someone who is not a player', async () => {
        running('GET002', 90_000, { other: {} });
        const res = await get('/GET002');
        expect(res.body.battle.me).toBeNull();
    });

    it('finishes a battle whose time is up before answering', async () => {
        running('GET003', (LIMIT + 60) * 1000, { me: { answers: { q1: { userAnswer: 'A' } } }, other: {} });
        const res = await get('/GET003');
        expect(res.body.battle.status).toBe('COMPLETED');
        expect(res.body.battle).not.toHaveProperty('me');
        expect(db.outcomesFor('GET003')).toHaveLength(2);
    });
});

// A finished battle, each player { placement, score, name, answers, perQuestion, at }.
const CONFIG = { mode: 'subject', subject: 'EE', count: 20, timeLimitMins: 30, isPrcStandard: false };
function finished(id, players, over = {}) {
    db.addBattle({ id, status: 'COMPLETED', questions: QUESTIONS, config: CONFIG, timeLimitSecs: 1800, startedAt: new Date(Date.now() - 3_600_000), ...over });
    for (const [userId, p] of Object.entries(players)) {
        db.addUser(userId, { displayName: `${userId} (account)` });
        db.addParticipant(id, userId, { displayName: p.name ?? userId, answers: p.answers ?? {}, finishedAt: new Date(), score: p.score });
        db.addOutcome(id, userId, {
            placement: p.placement, score: p.score, total: 2, timeTakenSecs: 300, eloDelta: p.eloDelta ?? 0,
            perQuestion: p.perQuestion ?? [], createdAt: p.at ?? new Date(),
        });
    }
}
const pick = (userAnswer, timeSpentMs) => ({ userAnswer, confidenceLevel: 'MED', timeSpentMs });

describe('POST /api/battles', () => {
    it('makes the lobby under the code sent, hosted by the caller, from questions the server picks', async () => {
        const samplePool = vi.spyOn(questionPool, 'samplePool').mockResolvedValue(QUESTIONS);
        const body = { battleId: 'NEW001', config: { mode: 'subject', subject: 'EE', count: 5 }, timeLimitSecs: 600 };
        const res = await post('/', 'me', body);
        expect(res.status).toBe(201);
        expect(res.body).toEqual({ success: true, battleId: 'NEW001' });
        expect(db.state.battles.get('NEW001')).toMatchObject({ hostId: 'me', status: 'WAITING', questions: QUESTIONS, config: { subject: 'EE', count: 2 }, timeLimitSecs: 600 });
        expect(samplePool).toHaveBeenCalledWith({ subject: 'EE', subtopic: undefined, limit: 5 });

        expect((await post('/', 'me', body)).status).toBe(409);
        samplePool.mockResolvedValue([]);
        expect((await post('/', 'me', { ...body, battleId: 'NEW002' })).status).toBe(422);
    });
});

describe('GET /api/battles/me/history', () => {
    it("lists the caller's finished battles with who they played, under the names they played as", async () => {
        finished('HIS001', {
            me: { placement: 2, score: 1, eloDelta: -8, name: 'Rey', answers: { q1: pick('B', 4000), q2: pick(null, 0) } },
            ana: { placement: 1, score: 2, eloDelta: 8, name: 'Ana' },
            ben: { placement: 3, score: 0, name: 'Ben' },
        });
        db.addBattle({ id: 'HIS002', hostId: 'ana', rematchOfId: 'HIS001' });
        finished('HIS003', { other: { placement: 1, score: 2 } });

        const res = await get('/me/history');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            items: [{
                battleId: 'HIS001', createdAt: expect.any(String), config: CONFIG, timeLimitSecs: 1800,
                score: 1, total: 2, placement: 2, players: 3, eloDelta: -8, tierAfter: 'BRONZE', answered: 1,
                opponents: [
                    { userId: 'ana', displayName: 'Ana', placement: 1, score: 2 },
                    { userId: 'ben', displayName: 'Ben', placement: 3, score: 0 },
                ],
                rematch: { battleId: 'HIS002', status: 'WAITING' },
            }],
            nextBefore: null,
        });
    });

    it('pages back in time with before, and says when there is nothing older', async () => {
        const t = Date.now();
        ['PAG001', 'PAG002', 'PAG003'].forEach((id, i) => finished(id, { me: { placement: 1, score: 1, at: new Date(t - (3 - i) * 60_000) } }));

        const first = await get('/me/history?limit=2');
        expect(first.body.items.map((i) => i.battleId)).toEqual(['PAG003', 'PAG002']);
        expect(first.body.items[0]).toMatchObject({ players: 1, opponents: [], rematch: null, answered: 0 });
        expect(first.body.nextBefore).toBe(first.body.items[1].createdAt);

        const second = await get(`/me/history?limit=2&before=${encodeURIComponent(first.body.nextBefore)}`);
        expect(second.body.items.map((i) => i.battleId)).toEqual(['PAG001']);
        expect(second.body.nextBefore).toBeNull();

        expect((await get('/me/history?before=soon')).status).toBe(400);
    });
});

describe('GET /api/battles/:id/replay', () => {
    const replayBattle = () => finished('REP001', {
        ana: {
            placement: 1, score: 2, eloDelta: 8, name: 'Ana',
            answers: { q1: pick('A', 42_000), q2: pick('B', 3000) },
            perQuestion: [{ questionId: 'q1', isCorrect: true, timeMs: 42_000 }, { questionId: 'q2', isCorrect: true, timeMs: 3000 }],
        },
        me: {
            placement: 2, score: 1, name: 'Rey',
            answers: { q1: pick('A', 4000), q2: pick('A', 9000) },
            perQuestion: [{ questionId: 'q1', isCorrect: true, timeMs: 4000 }, { questionId: 'q2', isCorrect: false, timeMs: 9000 }],
        },
        // Answered nothing, then the time ran out.
        ben: { placement: 3, score: 0, name: 'Ben' },
    });

    it("is for the battle's players only: anyone else gets a 404", async () => {
        replayBattle();
        expect((await get('/REP001/replay', 'stranger')).status).toBe(404);
        expect((await get('/NOPE01/replay')).status).toBe(404);
        running('RUN001', 60_000, { me: {} });
        expect((await get('/RUN001/replay')).status).toBe(404);
    });

    it("gives the podium and everyone's picks, with no key", async () => {
        replayBattle();
        const res = await get('/REP001/replay');
        expect(res.status).toBe(200);
        expect(res.body.battle).toEqual({ id: 'REP001', config: CONFIG, timeLimitSecs: 1800, createdAt: expect.any(String), questionOrder: ['q1', 'q2'], rematch: null });
        expect(res.body.players).toEqual([
            { userId: 'ana', displayName: 'Ana', placement: 1, score: 2, total: 2, timeTakenSecs: 300, eloDelta: 8 },
            { userId: 'me', displayName: 'Rey', placement: 2, score: 1, total: 2, timeTakenSecs: 300, eloDelta: 0 },
            { userId: 'ben', displayName: 'Ben', placement: 3, score: 0, total: 2, timeTakenSecs: 300, eloDelta: 0 },
        ]);
        expect(res.body.picks.q2).toEqual([
            { userId: 'ana', answer: 'B', isCorrect: true, timeMs: 3000 },
            { userId: 'me', answer: 'A', isCorrect: false, timeMs: 9000 },
            { userId: 'ben', answer: null, isCorrect: false, timeMs: 0 },
        ]);
        const body = JSON.stringify(res.body);
        for (const leak of ['answerKey', 'correctAnswer', '"questions"', '"text"', 'photoURL', 'explanation']) expect(body).not.toContain(leak);
    });

    it('leaves out the picks for a question that is in a battle the caller is still playing', async () => {
        replayBattle();
        db.addBattle({ id: 'REM001', hostId: 'ana', rematchOfId: 'REP001' });
        db.addBattle({ id: 'LIVE01', status: 'IN_PROGRESS', questions: [QUESTIONS[0]], startedAt: new Date(Date.now() - 60_000) });
        db.addParticipant('LIVE01', 'me');
        const res = await get('/REP001/replay');
        expect(Object.keys(res.body.picks)).toEqual(['q2']);
        expect(res.body.battle).toMatchObject({ questionOrder: ['q1', 'q2'], rematch: { battleId: 'REM001', status: 'WAITING' } });
        // Not for a player who isn't in that battle.
        expect(Object.keys((await get('/REP001/replay', 'ana')).body.picks)).toEqual(['q1', 'q2']);
    });
});

describe('POST /api/battles/:id/rematch', () => {
    const POOL = Array.from({ length: 20 }, (_, i) => ({ id: `n${i}`, answer: 'A', text: `new ${i}`, options: ['A', 'B'] }));
    let samplePool;
    let notifyRoom;
    let sendToUser;
    beforeEach(() => {
        samplePool = vi.spyOn(questionPool, 'samplePool').mockResolvedValue(POOL);
        notifyRoom = vi.spyOn(lifecycle, 'notifyRoom');
        sendToUser = vi.spyOn(pushService, 'sendToUser').mockResolvedValue(null);
    });
    const twoPlayers = (id = 'OLD001', over = {}) => finished(id, {
        me: { placement: 1, score: 2, name: 'Rey' },
        ana: { placement: 2, score: 1, name: 'Ana' },
    }, over);
    const rematchesOf = (id) => Array.from(db.state.battles.values()).filter((b) => b.rematchOfId === id);

    it("refuses someone who didn't play (404) and a battle that isn't over (409)", async () => {
        twoPlayers();
        expect((await post('/OLD001/rematch', 'stranger')).status).toBe(404);
        expect((await post('/NOPE01/rematch')).status).toBe(404);
        running('RUN002', 60_000, { me: {} });
        expect((await post('/RUN002/rematch')).status).toBe(409);
        expect(samplePool).not.toHaveBeenCalled();
        expect(notifyRoom).not.toHaveBeenCalled();
    });

    it('makes a new lobby with the same settings and fresh questions, hosted by the caller, and tells the old room', async () => {
        twoPlayers();
        const res = await post('/OLD001/rematch');
        expect(res.status).toBe(201);
        expect(res.body).toEqual({ battleId: expect.stringMatching(/^[A-Z0-9]{6}$/), created: true });
        const made = db.state.battles.get(res.body.battleId);
        expect(made).toMatchObject({ hostId: 'me', status: 'WAITING', rematchOfId: 'OLD001', config: CONFIG, timeLimitSecs: 1800 });
        expect(made.questions).toEqual(POOL);
        expect(samplePool).toHaveBeenCalledWith({ subject: 'EE', subtopic: undefined, limit: 20 });
        expect(notifyRoom).toHaveBeenCalledWith('OLD001', 'rematch-ready', { battleId: res.body.battleId, by: { userId: 'me', displayName: 'Rey' } });
        await vi.waitFor(() => expect(sendToUser).toHaveBeenCalledTimes(1));
        expect(sendToUser).toHaveBeenCalledWith('ana', expect.objectContaining({ data: { route: `/battle/${res.body.battleId}` } }));
    });

    it('gives everyone the one rematch: asking again makes no second lobby', async () => {
        twoPlayers();
        const first = await post('/OLD001/rematch');
        const again = await post('/OLD001/rematch');
        const theirs = await post('/OLD001/rematch', 'ana');
        expect(again.status).toBe(200);
        expect(again.body).toEqual({ battleId: first.body.battleId, created: false });
        expect(theirs.body).toEqual({ battleId: first.body.battleId, created: false });
        expect(rematchesOf('OLD001')).toHaveLength(1);
        expect(notifyRoom).toHaveBeenCalledTimes(1);
    });

    it('when two ask at once, the one whose insert loses gets the winner', async () => {
        twoPlayers();
        const insert = prisma.battle.create.getMockImplementation();
        prisma.battle.create.mockImplementationOnce(async (args) => {
            // Ana's rematch lands between this request's check and its insert.
            db.addBattle({ id: 'WINNER', hostId: 'ana', rematchOfId: 'OLD001' });
            return insert(args);
        });
        const res = await post('/OLD001/rematch');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ battleId: 'WINNER', created: false });
        expect(rematchesOf('OLD001').map((b) => b.id)).toEqual(['WINNER']);
        expect(notifyRoom).not.toHaveBeenCalled();
    });

    it('says so when the saved settings no longer pass the rules', async () => {
        twoPlayers('OLD002', { config: { mode: 'subject', subject: 'EE', count: 3 } });
        const res = await post('/OLD002/rematch');
        expect(res.status).toBe(422);
        expect(rematchesOf('OLD002')).toHaveLength(0);
    });

    it('mints battle ids from the crypto generator, drawing again when one is taken', async () => {
        const crypto = require('crypto');
        db.addBattle({ id: 'AAAAAA' });
        const draws = [...Array(6).fill(0), ...Array(6).fill(1)];
        const randomInt = vi.spyOn(crypto, 'randomInt').mockImplementation(() => draws.shift());
        expect(await battleCreate.mintBattleId()).toBe('BBBBBB');
        expect(randomInt).toHaveBeenCalledWith(36);
    });
});
