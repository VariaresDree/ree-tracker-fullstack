import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// GET /api/battles/me/active and GET /api/battles/:id. A player who closed the
// app mid-battle had no way back: nothing remembered the battle, and the exam
// room restarted with blank answers and the full time. These give "Return to
// battle" its list, and the exam room the player's saved answers and the
// server's clock.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const telemetryService = require('../src/services/telemetryService');
const examHistory = require('../src/services/examHistory');
const prisma = require('../src/config/db');
const lifecycle = require('../src/services/battleLifecycle');
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
