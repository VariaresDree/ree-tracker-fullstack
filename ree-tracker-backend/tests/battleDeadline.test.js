import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// A battle used to finish only when every player in the socket server's memory
// submitted, or when an in-memory timer fired on a lobby that still existed.
// A restart, the idle-lobby clean-up or an eviction lost the lobby, the timer
// then found nothing, and the battle stayed IN_PROGRESS for good: the player
// who stayed could never review it, and the one who left could never come
// back. Players and their answers are now kept in BattleParticipant rows, and
// a battle whose time is up is settled from them, exactly once, by whichever
// of the timer, the sweep or a read gets there first.

const telemetryService = require('../src/services/telemetryService');
const examHistory = require('../src/services/examHistory');
const prisma = require('../src/config/db');
const {
    deadlineDelayMs, absentAtStart, DEADLINE_GRACE_MS, battleTiming, answersToJson, answersFromJson,
    publicAnswers, fillBlanks, applyAnswer,
} = require('../src/utils/battleLogic');
const lifecycle = require('../src/services/battleLifecycle');
const { __test } = require('../src/sockets/battleSocket');
const { installFakeBattleDb } = require('./helpers/fakeBattleDb');

const KEY = { q1: 'A', q2: 'B', q3: 'C' };
const QUESTIONS = Object.entries(KEY).map(([id, answer]) => ({ id, answer, text: id, options: ['A', 'B', 'C'], fixedExplanation: `why ${id}` }));
const LIMIT = 600;

const emits = [];
const ns = { to: (room) => ({ emit: (event, data) => emits.push({ room, event, data }) }) };
const emitted = (event) => emits.filter((e) => e.event === event);

const participant = (id, extra = {}) => ({
    id, displayName: id, score: 0, itemsAnswered: 0, connected: true, finished: false,
    answers: new Map(), ...extra,
});

let db;
let recordAttempts;
beforeEach(() => {
    emits.length = 0;
    lifecycle.battleLobbies.clear();
    db = installFakeBattleDb(vi, prisma);
    recordAttempts = vi.spyOn(telemetryService, 'recordAttempts')
        .mockImplementation(async ({ attempts }) => ({ graded: attempts.filter((a) => !a.blank).map((a) => ({ isCorrect: a.isCorrect })) }));
    vi.spyOn(examHistory, 'finalizeSession').mockResolvedValue({});
});
afterEach(() => {
    for (const lobby of lifecycle.battleLobbies.values()) if (lobby.deadlineTimer) clearTimeout(lobby.deadlineTimer);
    lifecycle.battleLobbies.clear();
    vi.restoreAllMocks();
});

/** A running battle, started `agoMs` ago, with the given players' rows. */
function runningBattle(id, agoMs, players = {}) {
    db.addBattle({ id, status: 'IN_PROGRESS', questions: QUESTIONS, timeLimitSecs: LIMIT, startedAt: new Date(Date.now() - agoMs) });
    for (const [userId, over] of Object.entries(players)) {
        db.addUser(userId);
        db.addParticipant(id, userId, over);
    }
}
const PAST_DEADLINE = (LIMIT + 60) * 1000;
const answered = (map) => Object.fromEntries(Object.entries(map).map(([q, a]) => [q, { userAnswer: a, confidenceLevel: 'MED', timeSpentMs: 1000 }]));

describe('deadline rules', () => {
    it('is the time limit plus the grace, from the start', () => {
        const start = 1_000_000;
        expect(deadlineDelayMs(start, 600, start)).toBe(600_000 + DEADLINE_GRACE_MS);
        expect(deadlineDelayMs(start, 600, start + 700_000)).toBe(0);
        expect(deadlineDelayMs(null, 600, start)).toBeNull();
        expect(deadlineDelayMs(start, 0, start)).toBeNull();
    });

    it('names the players not connected at the start', () => {
        const m = new Map([['a', participant('a')], ['b', participant('b', { connected: false })]]);
        expect(absentAtStart(m)).toEqual(['b']);
    });

    it('times a battle from its start, or from its creation for an old row', () => {
        const start = new Date(1_000_000);
        const t = battleTiming({ startedAt: start, timeLimitSecs: 60 }, 1_000_000 + 10_000);
        expect(t).toMatchObject({ endsAt: 1_060_000, closesAt: 1_060_000 + DEADLINE_GRACE_MS, remainingMs: 50_000, closed: false });
        expect(battleTiming({ startedAt: start, timeLimitSecs: 60 }, 1_060_000 + DEADLINE_GRACE_MS).closed).toBe(true);
        expect(battleTiming({ startedAt: null, createdAt: start, timeLimitSecs: 60 }, 1_000_000).endsAt).toBe(1_060_000);
        expect(battleTiming({ startedAt: null, timeLimitSecs: 60 }, 0)).toBeNull();
    });
});

describe('stored answers', () => {
    it('round-trips without correctness, regraded on the way back, foreign ids dropped', () => {
        const p = participant('u');
        applyAnswer(p, { questionId: 'q1', userAnswer: 'A', confidenceLevel: 'HIGH', timeSpentMs: 5 }, KEY);
        applyAnswer(p, { questionId: 'q2', userAnswer: 'X', confidenceLevel: 'LOW', timeSpentMs: 7 }, KEY);
        const json = answersToJson(p.answers);
        expect(JSON.stringify(json)).not.toContain('isCorrect');
        const back = answersFromJson({ ...json, zz: { userAnswer: 'A' }, q3: { userAnswer: 'C', isCorrect: false } }, KEY);
        expect(back.get('q1')).toMatchObject({ isCorrect: true, confidenceLevel: 'HIGH', timeSpentMs: 5 });
        expect(back.get('q2').isCorrect).toBe(false);
        expect(back.get('q3').isCorrect).toBe(true); // graded by the key, not the stored flag
        expect(back.has('zz')).toBe(false);
    });

    it('gives the player their picks only, never whether they were right', () => {
        const p = participant('u');
        applyAnswer(p, { questionId: 'q1', userAnswer: 'A', confidenceLevel: 'HIGH' }, KEY);
        fillBlanks(p, KEY);
        expect(publicAnswers(p.answers)).toEqual({ q1: { userAnswer: 'A', confidenceLevel: 'HIGH' } });
    });

    it('ignores an identical re-send, keeping the first time', () => {
        const p = participant('u');
        expect(applyAnswer(p, { questionId: 'q1', userAnswer: 'A', confidenceLevel: 'MED', timeSpentMs: 9000 }, KEY)).toBe(true);
        expect(applyAnswer(p, { questionId: 'q1', userAnswer: 'A', confidenceLevel: 'MED', timeSpentMs: 0 }, KEY)).toBe(false);
        expect(p.answers.get('q1').timeSpentMs).toBe(9000);
    });

    it('fills blanks as wrong without counting them as answered', () => {
        const p = participant('u');
        applyAnswer(p, { questionId: 'q1', userAnswer: 'A' }, KEY);
        expect(fillBlanks(p, KEY)).toBe(2);
        expect(p).toMatchObject({ score: 1, itemsAnswered: 1 });
        expect(p.answers.get('q2')).toMatchObject({ userAnswer: null, isCorrect: false });
    });
});

describe('settling a battle whose time is up', () => {
    it('scores the player who dropped out on what the server received, then completes', async () => {
        const id = 'DEADL1';
        runningBattle(id, PAST_DEADLINE, {
            done: { answers: answered({ q1: 'A', q2: 'B' }), finishedAt: new Date(), score: 2, timeTakenSecs: 300 },
            dropped: { answers: answered({ q1: 'A' }) },
        });

        expect(await __test.finishAtDeadline(ns, id)).toBe('completed');

        expect(recordAttempts).toHaveBeenCalledTimes(1);
        const call = recordAttempts.mock.calls[0][0];
        expect(call).toMatchObject({ userId: 'dropped', sessionId: `${id}:dropped`, mode: 'BATTLE' });
        // The two items they never reached are recorded as blanks, so the
        // review says "left blank" rather than "not recorded".
        expect(call.attempts.map((a) => [a.questionId, a.blank])).toEqual([['q1', false], ['q2', true], ['q3', true]]);
        expect(emitted('participant-finished')[0].data).toMatchObject({ id: 'dropped', score: 1, total: 3, timeTakenSecs: LIMIT, timedOut: true });

        expect(db.state.battles.get(id).status).toBe('COMPLETED');
        expect(db.outcomesFor(id).map((o) => [o.userId, o.placement, o.score])).toEqual([['done', 1, 2], ['dropped', 2, 1]]);
        expect(db.participant(id, 'dropped')).toMatchObject({ score: 1, timeTakenSecs: LIMIT });
        expect(db.participant(id, 'dropped').finishedAt).toBeInstanceOf(Date);
        const complete = emitted('battle-complete')[0].data;
        expect(complete.results.map((r) => r.id)).toEqual(['done', 'dropped']);
        expect(complete.answerKey).toEqual(KEY);
        expect(db.state.users.get('done').eloRating).toBeGreaterThan(1200);
    });

    it('completes after the lobby was dropped (a restart or the idle clean-up)', async () => {
        const id = 'DEADL2';
        runningBattle(id, PAST_DEADLINE, {
            stayed: { answers: answered({ q1: 'A', q2: 'B', q3: 'C' }), finishedAt: new Date(), score: 3, timeTakenSecs: 200 },
            left: { answers: answered({ q1: 'B' }) },
        });
        expect(lifecycle.battleLobbies.has(id)).toBe(false);

        expect(await lifecycle.sweepDueBattles()).toBe(1);

        expect(db.state.battles.get(id).status).toBe('COMPLETED');
        expect(db.outcomesFor(id).map((o) => o.userId)).toEqual(['stayed', 'left']);
        expect(db.outcomesFor(id)[1].perQuestion).toHaveLength(3);
    });

    it('rebuilds the players into an empty lobby left by a refused join', async () => {
        const id = 'DEADL3';
        runningBattle(id, PAST_DEADLINE, { a: { answers: answered({ q1: 'A' }) }, b: { answers: answered({ q1: 'B' }) } });
        lifecycle.getLobby(id); // empty, never rebuilt

        expect(await lifecycle.settleBattle(id, { ns })).toBe('completed');
        expect(db.outcomesFor(id)).toHaveLength(2);
    });

    it('settles once when the timer, the sweep and a read race', async () => {
        const id = 'DEADL4';
        runningBattle(id, PAST_DEADLINE, { a: { answers: answered({ q1: 'A' }) }, b: { answers: answered({ q2: 'B' }) } });

        const results = await Promise.all([
            lifecycle.settleBattle(id, { ns }),
            lifecycle.settleBattle(id, { ns }),
            lifecycle.sweepDueBattles(),
            lifecycle.settleWithin(id, 5000),
        ]);

        expect(results[0]).toBe('completed');
        expect(recordAttempts).toHaveBeenCalledTimes(2); // one per player
        expect(emitted('battle-complete')).toHaveLength(1);
        expect(db.outcomesFor(id)).toHaveLength(2);
        expect(prisma.user.update).toHaveBeenCalledTimes(2);
    });

    it('waits for a submit already finishing a player instead of finishing them again', async () => {
        const id = 'DEADL5';
        runningBattle(id, 30_000, { slow: { answers: answered({ q1: 'A' }) }, other: { answers: answered({ q1: 'A', q2: 'B' }), finishedAt: new Date(), score: 2, timeTakenSecs: 20 } });
        const lobby = await lifecycle.hydrateLobby(id);
        let release;
        recordAttempts.mockImplementationOnce(({ attempts }) => new Promise((resolve) => {
            release = () => resolve({ graded: attempts.filter((a) => !a.blank).map((a) => ({ isCorrect: a.isCorrect })) });
        }));
        const submit = lifecycle.finishParticipant(id, lobby, 'slow', [{ questionId: 'q2', userAnswer: 'B', confidenceLevel: 'MED', timeSpentMs: 1 }]);
        await vi.waitFor(() => expect(release).toBeTypeOf('function'));

        // Time runs out while the submit is still being recorded.
        db.state.battles.get(id).startedAt = new Date(Date.now() - PAST_DEADLINE);
        lobby.startedAt = Date.now() - PAST_DEADLINE;
        const settle = lifecycle.settleBattle(id, { ns });
        release();
        await submit;
        expect(await settle).toBe('completed');

        expect(recordAttempts).toHaveBeenCalledTimes(1);
        expect(emitted('participant-finished')).toHaveLength(0); // the submit announces itself
        expect(db.outcomesFor(id).find((o) => o.userId === 'slow').score).toBe(2);
    });

    it('does nothing before the deadline', async () => {
        const id = 'DEADL6';
        runningBattle(id, 60_000, { a: {} });
        expect(await lifecycle.settleBattle(id, { ns })).toBe('not-due');
        expect(await lifecycle.sweepDueBattles()).toBe(0);
        expect(db.state.battles.get(id).status).toBe('IN_PROGRESS');
        expect(recordAttempts).not.toHaveBeenCalled();
    });

    it('does nothing once the battle has completed', async () => {
        const id = 'DEADL7';
        runningBattle(id, PAST_DEADLINE, { x: {} });
        db.state.battles.get(id).status = 'COMPLETED';
        expect(await __test.finishAtDeadline(ns, id)).toBe('not-in-progress');
        expect(recordAttempts).not.toHaveBeenCalled();
        expect(emits).toHaveLength(0);
    });

    it('writes no outcome or Elo when another instance completed it first', async () => {
        const id = 'DEADL8';
        runningBattle(id, PAST_DEADLINE, { a: { answers: answered({ q1: 'A' }) }, b: { answers: answered({ q1: 'B' }) } });
        prisma.battle.updateMany.mockResolvedValueOnce({ count: 0 });

        expect(await lifecycle.settleBattle(id, { ns })).toBe('lost-race');
        expect(db.outcomesFor(id)).toHaveLength(0);
        expect(prisma.user.update).not.toHaveBeenCalled();
        expect(emitted('battle-complete')).toHaveLength(0);
    });

    it('rolls the completion back on a failure, and the next settle completes it', async () => {
        const id = 'DEADL9';
        runningBattle(id, PAST_DEADLINE, { a: { answers: answered({ q1: 'A' }) }, b: { answers: answered({ q1: 'B' }) } });
        prisma.user.update.mockRejectedValueOnce(new Error('connection reset'));

        await expect(lifecycle.settleBattle(id, { ns })).rejects.toThrow('connection reset');
        expect(db.state.battles.get(id).status).toBe('IN_PROGRESS');
        expect(db.outcomesFor(id)).toHaveLength(0);
        expect(emitted('battle-complete')).toHaveLength(0);

        expect(await lifecycle.settleBattle(id, { ns })).toBe('completed');
        expect(db.outcomesFor(id)).toHaveLength(2);
        expect(recordAttempts).toHaveBeenCalledTimes(2); // finishing wasn't repeated
    });

    it('skips a player whose account was deleted', async () => {
        const id = 'DEADLA';
        runningBattle(id, PAST_DEADLINE, { a: { answers: answered({ q1: 'A' }) }, gone: { answers: answered({ q1: 'A', q2: 'B' }) } });
        db.state.users.delete('gone');

        expect(await lifecycle.settleBattle(id, { ns })).toBe('completed');
        expect(db.outcomesFor(id).map((o) => [o.userId, o.placement])).toEqual([['a', 1]]);
    });

    it('places a player who answered nothing last, with no sitting recorded against them', async () => {
        const id = 'DEADLB';
        runningBattle(id, PAST_DEADLINE, { a: { answers: answered({ q1: 'A' }) }, idle: {} });

        expect(await lifecycle.settleBattle(id, { ns })).toBe('completed');
        expect(recordAttempts.mock.calls.map((c) => c[0].userId)).toEqual(['a']);
        expect(db.outcomesFor(id).map((o) => [o.userId, o.score])).toEqual([['a', 1], ['idle', 0]]);
    });

    it('closes a battle stuck from before players were saved', async () => {
        const id = 'DEADLC';
        db.addBattle({ id, status: 'IN_PROGRESS', questions: QUESTIONS, timeLimitSecs: LIMIT, startedAt: null, createdAt: new Date(Date.now() - PAST_DEADLINE) });
        expect(await lifecycle.sweepDueBattles()).toBe(1);
        expect(db.state.battles.get(id).status).toBe('COMPLETED');
    });

    it('arms one timer per lobby', () => {
        vi.useFakeTimers();
        const lobby = { participants: new Map(), startedAt: Date.now(), timeLimitSecs: 60 };
        __test.armDeadline(ns, 'DEADLD', lobby);
        const first = lobby.deadlineTimer;
        __test.armDeadline(ns, 'DEADLD', lobby);
        expect(lobby.deadlineTimer).toBe(first);
        clearTimeout(first);
        vi.useRealTimers();
    });
});

describe('saving answers as they arrive', () => {
    it('coalesces a burst into the latest whole map, one write at a time', async () => {
        const id = 'SAVE01';
        runningBattle(id, 10_000, { u: {} });
        const lobby = await lifecycle.hydrateLobby(id);
        const p = lobby.participants.get('u');

        let inFlight = 0;
        let maxInFlight = 0;
        const real = prisma.battleParticipant.updateMany.getMockImplementation();
        prisma.battleParticipant.updateMany.mockImplementation(async (args) => {
            inFlight += 1; maxInFlight = Math.max(maxInFlight, inFlight);
            await new Promise((r) => setTimeout(r, 5));
            inFlight -= 1;
            return real(args);
        });
        for (const [q, a] of Object.entries({ q1: 'A', q2: 'B', q3: 'X' })) {
            applyAnswer(p, { questionId: q, userAnswer: a }, KEY);
            lifecycle.persistAnswers(id, p);
        }
        await lifecycle.flushBattleWrites(id);

        expect(maxInFlight).toBe(1);
        expect(prisma.battleParticipant.updateMany.mock.calls.length).toBeLessThanOrEqual(2);
        expect(Object.keys(db.participant(id, 'u').answers)).toEqual(['q1', 'q2', 'q3']);
    });

    it('never overwrites a finished row', async () => {
        const id = 'SAVE02';
        runningBattle(id, 10_000, { u: { answers: answered({ q1: 'A' }), finishedAt: new Date(), score: 1 } });
        const p = participant('u');
        applyAnswer(p, { questionId: 'q2', userAnswer: 'B' }, KEY);
        await lifecycle.persistAnswers(id, p);
        expect(Object.keys(db.participant(id, 'u').answers)).toEqual(['q1']);
    });
});
