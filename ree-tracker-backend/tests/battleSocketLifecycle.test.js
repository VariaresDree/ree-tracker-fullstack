import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The battle socket handlers against an in-memory database: who may join, a
// rejoin after the server lost its memory, a start that can only happen once,
// answers after the deadline, and submits that are always answered. A player
// who closed the app mid-battle used to be refused on return (after a
// restart), or put back into the exam with blank answers and the full time.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const telemetryService = require('../src/services/telemetryService');
const examHistory = require('../src/services/examHistory');
const prisma = require('../src/config/db');
const lifecycle = require('../src/services/battleLifecycle');
const { setupBattleSocket } = require('../src/sockets/battleSocket');
const { DEADLINE_GRACE_MS } = require('../src/utils/battleLogic');
const { installFakeBattleDb } = require('./helpers/fakeBattleDb');

const KEY = { q1: 'A', q2: 'B', q3: 'C' };
const QUESTIONS = Object.entries(KEY).map(([id, answer]) => ({ id, answer, text: id, options: ['A', 'B', 'C'] }));
const LIMIT = 600;
const PAST_DEADLINE = (LIMIT + 60) * 1000;

function fakeIo() {
    const ns = {
        middlewares: [],
        connection: null,
        sockets: [],
        broadcasts: [],
        use(fn) { this.middlewares.push(fn); },
        on(event, fn) { if (event === 'connection') this.connection = fn; },
        to(room) {
            return {
                emit: (event, data) => {
                    ns.broadcasts.push({ room, event, data });
                    for (const s of ns.sockets) if (s.rooms.has(room)) s.received.push({ event, data, via: 'room' });
                },
            };
        },
    };
    return { of: () => ns, ns };
}

let ns;
function connect(userId) {
    const s = {
        userId,
        displayName: userId,
        handshake: { auth: {} },
        handlers: {},
        received: [],
        rooms: new Set(),
        on(event, fn) { this.handlers[event] = fn; },
        emit(event, data) { this.received.push({ event, data }); },
        join(room) { this.rooms.add(room); },
        to(room) {
            return {
                emit: (event, data) => {
                    ns.broadcasts.push({ room, event, data, from: userId });
                    for (const o of ns.sockets) if (o !== s && o.rooms.has(room)) o.received.push({ event, data, via: 'room' });
                },
            };
        },
    };
    ns.sockets.push(s);
    ns.connection(s);
    return s;
}
const got = (s, event) => s.received.filter((r) => r.event === event).map((r) => r.data);
const broadcast = (event) => ns.broadcasts.filter((b) => b.event === event);

let db;
let recordAttempts;
beforeEach(() => {
    lifecycle.battleLobbies.clear();
    db = installFakeBattleDb(vi, prisma);
    recordAttempts = vi.spyOn(telemetryService, 'recordAttempts')
        .mockImplementation(async ({ attempts }) => ({ graded: attempts.filter((a) => !a.blank).map((a) => ({ isCorrect: a.isCorrect })) }));
    vi.spyOn(examHistory, 'finalizeSession').mockResolvedValue({});
    const io = fakeIo();
    ns = io.ns;
    setupBattleSocket(io);
});
afterEach(() => {
    for (const lobby of lifecycle.battleLobbies.values()) if (lobby.deadlineTimer) clearTimeout(lobby.deadlineTimer);
    lifecycle.battleLobbies.clear();
    vi.restoreAllMocks();
});

function battle(id, over = {}) {
    return db.addBattle({ id, hostId: 'host', questions: QUESTIONS, timeLimitSecs: LIMIT, ...over });
}
function running(id, agoMs, players) {
    battle(id, { status: 'IN_PROGRESS', startedAt: new Date(Date.now() - agoMs) });
    for (const [userId, over] of Object.entries(players)) {
        db.addUser(userId);
        db.addParticipant(id, userId, { isHost: userId === 'host', ...over });
    }
}
const saved = (map) => Object.fromEntries(Object.entries(map).map(([q, a]) => [q, { userAnswer: a, confidenceLevel: 'MED', timeSpentMs: 4000 }]));

describe('socket sign-in', () => {
    it('makes sure the player has a user row, with their real email', async () => {
        verifyIdToken.mockResolvedValue({ uid: 'new-user', email: 'new@example.com', name: 'New' });
        const next = vi.fn();
        const socket = { handshake: { auth: { token: 't' } } };
        await ns.middlewares[0](socket, next);
        expect(next).toHaveBeenCalledWith();
        expect(socket.userId).toBe('new-user');
        expect(prisma.user.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'new-user' },
            create: expect.objectContaining({ email: 'new@example.com', displayName: 'New' }),
        }));
    });
});

describe('joining', () => {
    it('refuses someone who is not a player once it has started, without making a lobby', async () => {
        running('SOCK01', 10_000, { host: {}, a: {} });
        const stranger = connect('stranger');
        await stranger.handlers['join-battle']({ battleId: 'SOCK01' });
        expect(got(stranger, 'error')[0].message).toMatch(/no longer accepting/);
        expect(lifecycle.battleLobbies.has('SOCK01')).toBe(false);
    });

    it('records a player who joins while it is gathering', async () => {
        battle('SOCK02');
        const a = connect('a');
        await a.handlers['join-battle']({ battleId: 'SOCK02' });
        expect(db.participant('SOCK02', 'a')).toMatchObject({ displayName: 'a', isHost: false });
        expect(broadcast('lobby-update')[0].data).toMatchObject({ status: 'WAITING', questionCount: 3, timing: null });
    });

    it('puts a player back with their answers and the server deadline after a restart', async () => {
        const startedAgo = 120_000;
        running('SOCK03', startedAgo, { host: { answers: saved({ q1: 'A' }) }, a: { answers: saved({ q1: 'B', q2: 'B' }) } });
        const a = connect('a');
        await a.handlers['join-battle']({ battleId: 'SOCK03' });

        const update = broadcast('lobby-update')[0].data;
        expect(update.status).toBe('IN_PROGRESS');
        const startedAt = db.state.battles.get('SOCK03').startedAt.getTime();
        expect(update.timing).toMatchObject({ endsAt: startedAt + LIMIT * 1000, closesAt: startedAt + LIMIT * 1000 + DEADLINE_GRACE_MS });
        // Both players are back in the rebuilt lobby, answers regraded.
        const lobby = lifecycle.battleLobbies.get('SOCK03');
        expect(lobby.participants.get('a')).toMatchObject({ connected: true, itemsAnswered: 2, score: 1 });
        expect(lobby.participants.get('host')).toMatchObject({ connected: false, itemsAnswered: 1 });
        expect(update.participants.find((p) => p.id === 'a')).not.toHaveProperty('answers');

        // The client re-sends what it restored: nothing changes, nothing is broadcast.
        await a.handlers['battle-answer']({ battleId: 'SOCK03', questionId: 'q1', userAnswer: 'B', confidenceLevel: 'MED', timeSpentMs: 0 });
        expect(broadcast('opponent-progress')).toHaveLength(0);
        await a.handlers['battle-answer']({ battleId: 'SOCK03', questionId: 'q3', userAnswer: 'C', confidenceLevel: 'HIGH', timeSpentMs: 3000 });
        expect(broadcast('opponent-progress')[0].data).toMatchObject({ id: 'a', itemsAnswered: 3, score: 2 });
        await lifecycle.flushBattleWrites('SOCK03');
        expect(db.participant('SOCK03', 'a').answers.q3).toEqual({ userAnswer: 'C', confidenceLevel: 'HIGH', timeSpentMs: 3000 });
    });

    it('replays a completed battle to that player only', async () => {
        running('SOCK04', PAST_DEADLINE, { host: { answers: saved({ q1: 'A' }) }, a: { answers: saved({ q1: 'B' }) } });
        await lifecycle.settleBattle('SOCK04');
        ns.broadcasts.length = 0;

        const a = connect('a');
        await a.handlers['join-battle']({ battleId: 'SOCK04' });
        expect(got(a, 'lobby-update')[0]).toMatchObject({ status: 'COMPLETED' });
        expect(got(a, 'battle-graded')[0]).toMatchObject({ score: 0, total: 3 });
        expect(got(a, 'battle-complete')[0].results.map((r) => r.id)).toEqual(['host', 'a']);
        expect(got(a, 'battle-complete')[0].answerKey).toEqual(KEY);
        expect(ns.broadcasts).toHaveLength(0);
    });

    it('keeps a player who comes back after the end in the room, so they hear of a rematch', async () => {
        running('SOCK16', PAST_DEADLINE, { host: { answers: saved({ q1: 'A' }) }, a: { answers: saved({ q1: 'B' }) } });
        await lifecycle.settleBattle('SOCK16');
        const a = connect('a');
        await a.handlers['join-battle']({ battleId: 'SOCK16' });
        expect(a.rooms.has('SOCK16')).toBe(true);
        expect(got(a, 'battle-complete')[0].rematch).toBeNull();

        const stranger = connect('stranger');
        await stranger.handlers['join-battle']({ battleId: 'SOCK16' });
        expect(stranger.rooms.has('SOCK16')).toBe(false);

        lifecycle.notifyRoom('SOCK16', 'rematch-ready', { battleId: 'NEW016', by: { userId: 'host', displayName: 'host' } });
        expect(got(a, 'rematch-ready')).toEqual([{ battleId: 'NEW016', by: { userId: 'host', displayName: 'host' } }]);
        expect(got(stranger, 'rematch-ready')).toEqual([]);
    });

    it("carries the battle's rematch in the results replayed to a player who comes back", async () => {
        running('SOCK17', PAST_DEADLINE, { host: { answers: saved({ q1: 'A' }) }, a: { answers: saved({ q1: 'B' }) } });
        await lifecycle.settleBattle('SOCK17');
        battle('NEW017', { hostId: 'a', rematchOfId: 'SOCK17' });
        const host = connect('host');
        await host.handlers['join-battle']({ battleId: 'SOCK17' });
        expect(got(host, 'battle-complete')[0].rematch).toEqual({ battleId: 'NEW017', status: 'WAITING', by: { userId: 'a', displayName: 'a' } });
        expect((await lifecycle.completionFor('SOCK17')).payload.rematch).toMatchObject({ battleId: 'NEW017' });
    });

    it("holds back the key to a question the player is still answering in another battle", async () => {
        running('SOCK18', PAST_DEADLINE, { host: { answers: saved({ q1: 'A' }) }, a: { answers: saved({ q1: 'B' }) } });
        await lifecycle.settleBattle('SOCK18');
        // The rematch had to repeat q1 (a small pool), and is under way.
        running('NEW018', 10_000, { host: {}, a: {} });
        db.state.battles.get('NEW018').questions = [QUESTIONS[0]];
        const a = connect('a');
        await a.handlers['join-battle']({ battleId: 'SOCK18' });
        expect(got(a, 'battle-complete')[0].answerKey).toEqual({ q2: 'B', q3: 'C' });
    });

    it('finishes a battle whose time is up when a player comes back, then shows the results', async () => {
        running('SOCK05', PAST_DEADLINE, { host: { answers: saved({ q1: 'A' }) }, a: { answers: saved({ q2: 'B' }) } });
        const a = connect('a');
        await a.handlers['join-battle']({ battleId: 'SOCK05' });
        expect(db.state.battles.get('SOCK05').status).toBe('COMPLETED');
        expect(got(a, 'battle-complete')).toHaveLength(1);
    });
});

describe('starting', () => {
    it('starts once, drops absent players, and ignores a second start', async () => {
        battle('SOCK06');
        db.addUser('host'); db.addUser('a'); db.addUser('gone');
        const host = connect('host');
        const a = connect('a');
        const gone = connect('gone');
        for (const s of [host, a, gone]) await s.handlers['join-battle']({ battleId: 'SOCK06' });
        gone.handlers.disconnect();

        await host.handlers['start-battle']({ battleId: 'SOCK06' });
        const firstStart = db.state.battles.get('SOCK06').startedAt.getTime();
        expect(db.state.battles.get('SOCK06').status).toBe('IN_PROGRESS');
        expect(db.participant('SOCK06', 'gone')).toBeNull();
        expect(lifecycle.battleLobbies.get('SOCK06').participants.has('gone')).toBe(false);
        expect(broadcast('battle-started')[0].data).toMatchObject({ startedAt: firstStart, timeLimitSecs: LIMIT, closesAt: firstStart + LIMIT * 1000 + DEADLINE_GRACE_MS });

        await new Promise((r) => setTimeout(r, 5));
        await host.handlers['start-battle']({ battleId: 'SOCK06' });
        expect(broadcast('battle-started')).toHaveLength(1);
        expect(db.state.battles.get('SOCK06').startedAt.getTime()).toBe(firstStart);
    });

    it('only lets the host start', async () => {
        battle('SOCK07');
        const a = connect('a');
        await a.handlers['join-battle']({ battleId: 'SOCK07' });
        await a.handlers['start-battle']({ battleId: 'SOCK07' });
        expect(got(a, 'error')[0].message).toMatch(/host/);
        expect(db.state.battles.get('SOCK07').status).toBe('WAITING');
    });
});

describe('answers', () => {
    it('takes an answer that arrives before the rejoin after a restart', async () => {
        running('SOCK08', 10_000, { host: {}, a: {} });
        const a = connect('a');
        await a.handlers['battle-answer']({ battleId: 'SOCK08', questionId: 'q1', userAnswer: 'A', confidenceLevel: 'MED', timeSpentMs: 2000 });
        await lifecycle.flushBattleWrites('SOCK08');
        expect(db.participant('SOCK08', 'a').answers.q1.userAnswer).toBe('A');
    });

    it("never makes a lobby for a stranger's answer", async () => {
        running('SOCK09', 10_000, { host: {} });
        const stranger = connect('stranger');
        await stranger.handlers['battle-answer']({ battleId: 'SOCK09', questionId: 'q1', userAnswer: 'A' });
        await stranger.handlers['battle-answer']({ battleId: 'ZZZZZZ', questionId: 'q1', userAnswer: 'A' });
        expect(lifecycle.battleLobbies.size).toBe(0);
    });

    it('ignores answers after the deadline and before the start', async () => {
        running('SOCK10', 10_000, { host: {}, a: {} });
        const lobby = await lifecycle.hydrateLobby('SOCK10');
        lobby.startedAt = Date.now() - PAST_DEADLINE;
        const a = connect('a');
        await a.handlers['battle-answer']({ battleId: 'SOCK10', questionId: 'q1', userAnswer: 'A' });
        expect(lobby.participants.get('a').answers.size).toBe(0);

        battle('SOCK11');
        const b = connect('b');
        await b.handlers['join-battle']({ battleId: 'SOCK11' });
        await b.handlers['battle-answer']({ battleId: 'SOCK11', questionId: 'q1', userAnswer: 'A' });
        expect(lifecycle.battleLobbies.get('SOCK11').participants.get('b').answers.size).toBe(0);
    });
});

describe('submitting', () => {
    it('answers every submit, announces it once, and completes when everyone is done', async () => {
        running('SOCK12', 30_000, { host: {}, a: {} });
        const host = connect('host');
        const a = connect('a');
        await host.handlers['join-battle']({ battleId: 'SOCK12' });
        await a.handlers['join-battle']({ battleId: 'SOCK12' });
        await a.handlers['battle-answer']({ battleId: 'SOCK12', questionId: 'q1', userAnswer: 'A' });

        const attempts = [{ questionId: 'q2', userAnswer: 'B' }, { questionId: 'q3', userAnswer: null }];
        await a.handlers['battle-submit']({ battleId: 'SOCK12', attempts });
        await a.handlers['battle-submit']({ battleId: 'SOCK12', attempts }); // resent after a reconnect
        expect(got(a, 'battle-graded')).toHaveLength(2);
        expect(got(a, 'battle-graded')[1]).toMatchObject({ score: 2, total: 3 });
        expect(broadcast('participant-finished')).toHaveLength(1);
        expect(recordAttempts).toHaveBeenCalledTimes(1);

        await host.handlers['battle-submit']({ battleId: 'SOCK12', attempts: [] });
        expect(broadcast('battle-complete')).toHaveLength(1);
        expect(db.state.battles.get('SOCK12').status).toBe('COMPLETED');
    });

    it('settles first, then answers, when the submit arrives after the deadline', async () => {
        running('SOCK13', PAST_DEADLINE, { host: { answers: saved({ q1: 'A' }) }, a: { answers: saved({ q1: 'A', q2: 'B' }) } });
        const a = connect('a');
        // The client's late gap-fill isn't counted: the server's record is final.
        await a.handlers['battle-submit']({ battleId: 'SOCK13', attempts: [{ questionId: 'q3', userAnswer: 'C' }] });
        expect(db.state.battles.get('SOCK13').status).toBe('COMPLETED');
        expect(got(a, 'battle-graded')[0]).toMatchObject({ score: 2, total: 3 });
        expect(got(a, 'battle-complete')).toHaveLength(1);
    });

    it('replays the result for a submit after completion', async () => {
        running('SOCK14', PAST_DEADLINE, { host: { answers: saved({ q1: 'A' }) }, a: { answers: saved({ q1: 'B' }) } });
        await lifecycle.settleBattle('SOCK14');
        const a = connect('a');
        await a.handlers['battle-submit']({ battleId: 'SOCK14', attempts: [] });
        expect(got(a, 'battle-graded')).toHaveLength(1);
        expect(got(a, 'battle-complete')).toHaveLength(1);
    });

    it("tells someone who isn't a player instead of staying silent", async () => {
        running('SOCK15', 10_000, { host: {} });
        const stranger = connect('stranger');
        await stranger.handlers['battle-submit']({ battleId: 'SOCK15', attempts: [] });
        expect(got(stranger, 'error')[0].message).toMatch(/not in this battle/);
    });
});
