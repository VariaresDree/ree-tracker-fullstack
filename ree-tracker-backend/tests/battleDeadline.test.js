import { describe, it, expect, vi, beforeEach } from 'vitest';

// A battle used to finish only when EVERY participant submitted. One player who
// dropped out (closed the tab, lost signal) left everyone else waiting forever,
// and a lobby member who was disconnected at the start was still counted. The
// server now drops absent players at the start and finishes the battle itself
// at the time limit plus a grace, scoring a non-submitter on what it graded.

// battleSocket destructures these at load time, so they are patched first.
const telemetryService = require('../src/services/telemetryService');
const recordAttempts = vi.fn();
telemetryService.recordAttempts = recordAttempts;
const examHistory = require('../src/services/examHistory');
examHistory.finalizeSession = vi.fn(async () => ({}));

const prisma = require('../src/config/db');
const { deadlineDelayMs, absentAtStart, DEADLINE_GRACE_MS } = require('../src/utils/battleLogic');
const { __test } = require('../src/sockets/battleSocket');

const emits = [];
const battleNs = { to: () => ({ emit: (event, data) => emits.push({ event, data }) }) };

const participant = (id, extra = {}) => ({
    id, displayName: id, score: 0, itemsAnswered: 0, connected: true, finished: false,
    answers: new Map(), ...extra,
});

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
});

describe('finishing at the deadline', () => {
    beforeEach(() => {
        emits.length = 0;
        vi.restoreAllMocks();
        recordAttempts.mockReset();
        recordAttempts.mockImplementation(async ({ attempts }) => ({ graded: attempts.map((a) => ({ isCorrect: a.isCorrect })) }));
        vi.spyOn(prisma.battle, 'findUnique').mockResolvedValue({ status: 'IN_PROGRESS' });
        vi.spyOn(prisma.battle, 'updateMany').mockResolvedValue({ count: 1 });
        vi.spyOn(prisma.user, 'findMany').mockResolvedValue([]);
        vi.spyOn(prisma, '$transaction').mockResolvedValue([]);
        vi.spyOn(prisma.battleOutcome, 'upsert').mockReturnValue({});
        vi.spyOn(prisma.user, 'update').mockReturnValue({});
    });

    it('scores the player who dropped out on what the server graded, then completes', async () => {
        const id = 'DEADL1';
        const dropped = participant('dropped', { connected: false });
        dropped.answers.set('q1', { questionId: 'q1', userAnswer: 'A', isCorrect: true, confidenceLevel: 'MED', timeSpentMs: 1000 });
        const done = participant('done', { finished: true, score: 2, timeTakenSecs: 300 });
        __test.battleLobbies.set(id, {
            participants: new Map([['done', done], ['dropped', dropped]]),
            startedAt: Date.now() - 700_000,
            timeLimitSecs: 600,
            answerKey: { q1: 'A', q2: 'B' },
            explanationKey: {},
            questionCount: 2,
            lastActivity: Date.now(),
        });

        await __test.finishAtDeadline(battleNs, id);

        expect(recordAttempts).toHaveBeenCalledWith(expect.objectContaining({ userId: 'dropped', sessionId: `${id}:dropped` }));
        expect(dropped.finished).toBe(true);
        expect(dropped.timeTakenSecs).toBe(600); // clamped to the limit
        const finished = emits.find((e) => e.event === 'participant-finished');
        expect(finished.data).toMatchObject({ id: 'dropped', score: 1, total: 2, timedOut: true });
        const complete = emits.find((e) => e.event === 'battle-complete');
        expect(complete.data.results.map((r) => r.id)).toEqual(['done', 'dropped']);
        expect(complete.data.results[0]).toMatchObject({ total: 2, placement: 1 });
        __test.battleLobbies.delete(id);
    });

    it('does nothing once the battle has already completed', async () => {
        prisma.battle.findUnique.mockResolvedValue({ status: 'COMPLETED' });
        const id = 'DEADL2';
        __test.battleLobbies.set(id, { participants: new Map([['x', participant('x')]]), answerKey: { q1: 'A' }, questionCount: 1 });
        await __test.finishAtDeadline(battleNs, id);
        expect(recordAttempts).not.toHaveBeenCalled();
        expect(emits).toHaveLength(0);
        __test.battleLobbies.delete(id);
    });

    it('arms one timer per battle', () => {
        vi.useFakeTimers();
        const lobby = { participants: new Map(), startedAt: Date.now(), timeLimitSecs: 60 };
        __test.armDeadline(battleNs, 'DEADL3', lobby);
        const first = lobby.deadlineTimer;
        __test.armDeadline(battleNs, 'DEADL3', lobby);
        expect(lobby.deadlineTimer).toBe(first);
        clearTimeout(first);
        vi.useRealTimers();
    });
});
