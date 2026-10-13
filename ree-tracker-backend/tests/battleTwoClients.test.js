import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import { Server } from 'socket.io';
import { io as connectClient } from 'socket.io-client';

// Two real socket.io clients against the real battle namespace on a real
// server, with the battle tables in memory (helpers/fakeBattleDb.js): join,
// start, answer, submit, and the results both players see. This check used to
// run outside the repo because socket.io-client wasn't a backend dependency.

const verifyIdToken = vi.fn(async (token) => ({ uid: token, email: `${token}@example.com`, name: token }));
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const telemetryService = require('../src/services/telemetryService');
const examHistory = require('../src/services/examHistory');
const prisma = require('../src/config/db');
const lifecycle = require('../src/services/battleLifecycle');
const { setupBattleSocket } = require('../src/sockets/battleSocket');
const { installFakeBattleDb } = require('./helpers/fakeBattleDb');

const KEY = { q1: 'A', q2: 'B', q3: 'C' };
const QUESTIONS = Object.entries(KEY).map(([id, answer]) => ({ id, answer, text: id, options: ['A', 'B', 'C'] }));

let server;
let io;
let url;
let db;
const clients = [];

beforeEach(async () => {
    lifecycle.battleLobbies.clear();
    db = installFakeBattleDb(vi, prisma);
    vi.spyOn(telemetryService, 'recordAttempts')
        .mockImplementation(async ({ attempts }) => ({ graded: attempts.filter((a) => !a.blank).map((a) => ({ isCorrect: a.isCorrect })) }));
    vi.spyOn(examHistory, 'finalizeSession').mockResolvedValue({});
    server = http.createServer();
    io = new Server(server);
    setupBattleSocket(io);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${server.address().port}/battle`;
});

afterEach(async () => {
    for (const c of clients.splice(0)) c.close();
    for (const lobby of lifecycle.battleLobbies.values()) if (lobby.deadlineTimer) clearTimeout(lobby.deadlineTimer);
    lifecycle.battleLobbies.clear();
    await new Promise((resolve) => io.close(() => resolve()));
    vi.restoreAllMocks();
});

/** A client that keeps every event it receives, and can wait for one. */
function player(uid) {
    const socket = connectClient(url, { auth: { token: uid }, transports: ['websocket'], reconnection: false });
    const seen = [];
    socket.onAny((event, data) => seen.push({ event, data }));
    const waitFor = (event, match = () => true, ms = 5000) => new Promise((resolve, reject) => {
        const hit = seen.find((s) => s.event === event && match(s.data));
        if (hit) return resolve(hit.data);
        const timer = setTimeout(() => {
            socket.offAny(on);
            reject(new Error(`${uid}: no ${event} within ${ms} ms (saw ${seen.map((s) => s.event).join(', ')})`));
        }, ms);
        const on = (e, data) => {
            if (e !== event || !match(data)) return;
            clearTimeout(timer);
            socket.offAny(on);
            resolve(data);
        };
        socket.onAny(on);
    });
    clients.push(socket);
    return { socket, seen, waitFor };
}

describe('a battle between two real clients', () => {
    it('joins, starts, takes answers and ranks both players the same way for each', async () => {
        db.addBattle({ id: 'E2E001', hostId: 'host', questions: QUESTIONS, timeLimitSecs: 600 });
        db.addUser('host'); db.addUser('guest');
        const host = player('host');
        const guest = player('guest');
        await Promise.all([host, guest].map((p) => new Promise((resolve) => p.socket.on('connect', resolve))));

        host.socket.emit('join-battle', { battleId: 'E2E001' });
        await host.waitFor('lobby-update', (u) => u.participants?.some((p) => p.id === 'host'));
        guest.socket.emit('join-battle', { battleId: 'E2E001' });
        await host.waitFor('lobby-update', (u) => u.participants?.length === 2);

        // Only the host may start.
        guest.socket.emit('start-battle', { battleId: 'E2E001' });
        expect((await guest.waitFor('error')).message).toMatch(/Only the host/);

        host.socket.emit('start-battle', { battleId: 'E2E001' });
        const [startedForHost, startedForGuest] = await Promise.all([host.waitFor('battle-started'), guest.waitFor('battle-started')]);
        expect(startedForGuest.startedAt).toBe(startedForHost.startedAt);
        expect(startedForHost.timeLimitSecs).toBe(600);

        // A live answer reaches the opponent, scored by the server.
        guest.socket.emit('battle-answer', { battleId: 'E2E001', questionId: 'q1', userAnswer: 'A', confidenceLevel: 'HIGH', timeSpentMs: 3000 });
        expect(await host.waitFor('opponent-progress')).toMatchObject({ id: 'guest', itemsAnswered: 1, score: 1 });

        const attempts = (answers) => Object.entries(answers).map(([questionId, userAnswer]) => ({ questionId, userAnswer, confidenceLevel: 'MED', timeSpentMs: 4000 }));
        host.socket.emit('battle-submit', { battleId: 'E2E001', attempts: attempts({ q1: 'A', q2: 'B', q3: 'C' }) });
        const hostGraded = await host.waitFor('battle-graded');
        expect(hostGraded).toMatchObject({ score: 3, total: 3 });
        // No key for anyone while the guest is still answering.
        expect(guest.seen.some((s) => s.event === 'battle-complete')).toBe(false);
        expect(await guest.waitFor('participant-finished')).toMatchObject({ id: 'host', score: 3 });

        guest.socket.emit('battle-submit', { battleId: 'E2E001', attempts: attempts({ q1: 'A', q2: 'C' }) });
        expect(await guest.waitFor('battle-graded')).toMatchObject({ score: 1, total: 3 });

        const [forHost, forGuest] = await Promise.all([host.waitFor('battle-complete'), guest.waitFor('battle-complete')]);
        expect(forHost.results.map((r) => r.id)).toEqual(['host', 'guest']);
        expect(forGuest.results.map((r) => r.id)).toEqual(['host', 'guest']);
        expect(forGuest.answerKey).toEqual(KEY);
        expect(db.state.battles.get('E2E001').status).toBe('COMPLETED');
        expect(db.outcomesFor('E2E001').map((o) => [o.userId, o.placement])).toEqual([['host', 1], ['guest', 2]]);
    });

    it('refuses a socket with no token', async () => {
        const socket = connectClient(url, { auth: {}, transports: ['websocket'], reconnection: false });
        clients.push(socket);
        const err = await new Promise((resolve) => socket.on('connect_error', resolve));
        expect(err.message).toMatch(/Authentication required/);
    });
});
