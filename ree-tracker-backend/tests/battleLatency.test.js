import { describe, it, expect } from 'vitest';
const { gradeAnswer, applyAnswer, mergeSubmitAttempts, computeElapsedSecs, rankParticipants } = require('../src/utils/battleLogic');

// Phase 4 gate: "a Battle completes correctly under simulated network latency
// with server-authoritative scoring." These tests replay the latency-induced
// event orderings a flaky network produces (delays, duplicates, reordering,
// disconnect gap-fills) against the extracted scoring rules and assert the
// final result is identical to the well-ordered case.

const KEY = { q1: 'A', q2: 'B', q3: 'C' };

const mkParticipant = (id) => ({
    id,
    displayName: id,
    score: 0,
    itemsAnswered: 0,
    connected: true,
    finished: false,
    answers: new Map(),
});

describe('applyAnswer — live answers under latency', () => {
    it('grades against the server key only (client cannot claim credit)', () => {
        const p = mkParticipant('u1');
        applyAnswer(p, { questionId: 'q1', userAnswer: 'B', isCorrect: true }, KEY); // wrong answer, tampered flag
        expect(p.answers.get('q1').isCorrect).toBe(false);
        expect(p.score).toBe(0);
    });

    it('a delayed re-answer REPLACES the old one — never double-counts', () => {
        const p = mkParticipant('u1');
        applyAnswer(p, { questionId: 'q1', userAnswer: 'B' }, KEY); // wrong first
        applyAnswer(p, { questionId: 'q1', userAnswer: 'A' }, KEY); // corrected later
        expect(p.itemsAnswered).toBe(1);
        expect(p.score).toBe(1);
    });

    it('a late answer arriving AFTER the participant finished is ignored', () => {
        const p = mkParticipant('u1');
        applyAnswer(p, { questionId: 'q1', userAnswer: 'A' }, KEY);
        p.finished = true; // submit already processed
        const applied = applyAnswer(p, { questionId: 'q2', userAnswer: 'B' }, KEY);
        expect(applied).toBe(false);
        expect(p.answers.has('q2')).toBe(false);
        expect(p.score).toBe(1);
    });

    it('answers for questions not in this battle are dropped', () => {
        const p = mkParticipant('u1');
        expect(applyAnswer(p, { questionId: 'zz', userAnswer: 'A' }, KEY)).toBe(false);
        expect(p.itemsAnswered).toBe(0);
    });
});

describe('mergeSubmitAttempts — disconnect gap-fill at submit time', () => {
    it('fills only the gaps the server never saw, re-graded server-side', () => {
        const p = mkParticipant('u1');
        applyAnswer(p, { questionId: 'q1', userAnswer: 'A' }, KEY); // seen live (correct)
        // Client claims q1 was wrong (stale) and q2/q3 correct (q3 is a lie).
        const merged = mergeSubmitAttempts(p, [
            { questionId: 'q1', userAnswer: 'B', isCorrect: false },
            { questionId: 'q2', userAnswer: 'B', isCorrect: true },
            { questionId: 'q3', userAnswer: 'X', isCorrect: true },
            { questionId: 'zz', userAnswer: 'A', isCorrect: true },
        ], KEY);
        expect(merged).toBe(2);                                  // q2 + q3 only
        expect(p.answers.get('q1').userAnswer).toBe('A');        // live answer wins
        expect(p.answers.get('q2').isCorrect).toBe(true);        // re-graded, real
        expect(p.answers.get('q3').isCorrect).toBe(false);       // tampered flag ignored
        expect(p.answers.has('zz')).toBe(false);                 // foreign question dropped
    });
});

describe('computeElapsedSecs — server-clock timing', () => {
    it('uses the server clock and clamps to the battle limit', () => {
        const startedAt = 1_000_000;
        expect(computeElapsedSecs(startedAt, startedAt + 30_000, 600)).toBe(30);
        // Slow network: submit lands way past the limit → clamped.
        expect(computeElapsedSecs(startedAt, startedAt + 999_000, 600)).toBe(600);
        // Not started (lobby rebuilt) → 0, never negative.
        expect(computeElapsedSecs(null, startedAt, 600)).toBe(0);
        expect(computeElapsedSecs(startedAt + 5_000, startedAt, 600)).toBe(0);
    });
});

describe('full battle under simulated latency', () => {
    // Replay a 2-player battle where the network delays/reorders each player's
    // events, then assert the outcome matches the well-ordered ground truth.
    const runBattle = (eventLog) => {
        const players = { u1: mkParticipant('u1'), u2: mkParticipant('u2') };
        // Realistic epoch (Date.now()-like) — `ev.at` is an offset from start.
        const startedAt = 1_700_000_000_000;
        for (const ev of eventLog) {
            const p = players[ev.user];
            if (ev.type === 'answer') {
                applyAnswer(p, ev.payload, KEY);
            } else if (ev.type === 'submit') {
                if (p.finished) continue; // double-submit guard (handler behavior)
                mergeSubmitAttempts(p, ev.carried || [], KEY);
                p.finished = true;
                p.timeTakenSecs = computeElapsedSecs(startedAt, startedAt + ev.at, 600);
                p.score = [...p.answers.values()].filter((a) => a.isCorrect).length;
            }
        }
        return rankParticipants(Object.values(players)).map((r) => ({ id: r.id, score: r.score, t: r.timeTakenSecs }));
    };

    // u1 answers all 3 correctly and submits at t=100s.
    // u2 answers 2 correctly and submits at t=90s.
    const u1Events = [
        { type: 'answer', user: 'u1', payload: { questionId: 'q1', userAnswer: 'A' } },
        { type: 'answer', user: 'u1', payload: { questionId: 'q2', userAnswer: 'B' } },
        { type: 'answer', user: 'u1', payload: { questionId: 'q3', userAnswer: 'C' } },
        { type: 'submit', user: 'u1', at: 100_000 },
    ];
    const u2Events = [
        { type: 'answer', user: 'u2', payload: { questionId: 'q1', userAnswer: 'A' } },
        { type: 'answer', user: 'u2', payload: { questionId: 'q2', userAnswer: 'X' } },
        { type: 'answer', user: 'u2', payload: { questionId: 'q3', userAnswer: 'C' } },
        { type: 'submit', user: 'u2', at: 90_000 },
    ];

    it('arbitrary interleavings of two players yield the same final ranking', () => {
        const ordered = runBattle([...u1Events, ...u2Events]);
        // Latency shuffle: players' streams interleaved, u2 finishing first.
        const shuffled = runBattle([
            u2Events[0], u1Events[0], u1Events[1], u2Events[1],
            u2Events[2], u2Events[3], u1Events[2], u1Events[3],
        ]);
        expect(shuffled).toEqual(ordered);
        expect(shuffled[0]).toMatchObject({ id: 'u1', score: 3 });
        expect(shuffled[1]).toMatchObject({ id: 'u2', score: 2 });
    });

    it('a duplicate (retried) submit is a no-op — score and time unchanged', () => {
        const withDup = runBattle([
            ...u2Events, ...u1Events,
            { type: 'submit', user: 'u2', at: 400_000, carried: [{ questionId: 'q2', userAnswer: 'B' }] },
        ]);
        const without = runBattle([...u2Events, ...u1Events]);
        expect(withDup).toEqual(without);
    });

    it('disconnect gap-fill: answers lost in transit still score via submit carry', () => {
        const result = runBattle([
            { type: 'answer', user: 'u1', payload: { questionId: 'q1', userAnswer: 'A' } },
            // q2/q3 never reached the server live — carried at submit.
            { type: 'submit', user: 'u1', at: 120_000, carried: [
                { questionId: 'q2', userAnswer: 'B' },
                { questionId: 'q3', userAnswer: 'C' },
            ] },
            ...u2Events,
        ]);
        expect(result[0]).toMatchObject({ id: 'u1', score: 3 });
    });

    it('ties break by faster time', () => {
        const result = runBattle([
            { type: 'answer', user: 'u1', payload: { questionId: 'q1', userAnswer: 'A' } },
            { type: 'submit', user: 'u1', at: 200_000 },
            { type: 'answer', user: 'u2', payload: { questionId: 'q1', userAnswer: 'A' } },
            { type: 'submit', user: 'u2', at: 150_000 },
        ]);
        expect(result.map((r) => r.id)).toEqual(['u2', 'u1']);
    });
});

describe('gradeAnswer', () => {
    it('null/undefined answers never score', () => {
        expect(gradeAnswer(KEY, 'q1', null)).toBe(false);
        expect(gradeAnswer(KEY, 'q1', undefined)).toBe(false);
        expect(gradeAnswer(KEY, 'q1', 'A')).toBe(true);
    });
});
