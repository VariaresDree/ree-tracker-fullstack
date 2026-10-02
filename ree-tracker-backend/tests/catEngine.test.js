import { describe, it, expect } from 'vitest';
const {
    pickCatItem, estimateSubjects, nextDiagnosticSubject, subjectDone, plannedLength,
    DIAGNOSTIC_CAPS, SE_TARGET,
} = require('../src/engine/cat');
const { _internals } = require('../src/engine/forecast');

const rng = (seed = 5) => _internals.createRng(seed);
const item = (id, b, topic = 'T') => ({ id, irtA: 1, irtB: b, irtC: 0.2, difficulty: null, topicId: topic, subtopic: topic });

describe('pickCatItem — information, exposure control, content balance', () => {
    it('picks among the most informative items at θ', () => {
        const pool = [item('easy', -3), item('a', 0), item('b', 0.1), item('c', -0.1), item('hard', 3)];
        for (let s = 1; s < 20; s++) {
            expect(['a', 'b', 'c']).toContain(pickCatItem({ theta: 0, pool, rng: rng(s) }));
        }
    });

    it('is randomesque — not always the single best item', () => {
        const pool = [item('a', 0), item('b', 0.05), item('c', -0.05)];
        const picks = new Set(Array.from({ length: 30 }, (_, s) => pickCatItem({ theta: 0, pool, rng: rng(s + 1) })));
        expect(picks.size).toBeGreaterThan(1);
    });

    it('steers toward topics the session has not covered yet', () => {
        // Both at b = 0, equally informative; "Machines" was already asked twice.
        const pool = [item('m', 0, 'Machines'), item('p', 0, 'Protection')];
        const covered = { Machines: 2 };
        const picks = Array.from({ length: 20 }, (_, s) => pickCatItem({ theta: 0, pool, coveredTopics: covered, k: 1, rng: rng(s + 1) }));
        expect(new Set(picks)).toEqual(new Set(['p']));
    });

    it('returns null for an empty pool', () => {
        expect(pickCatItem({ theta: 0, pool: [] })).toBeNull();
    });
});

describe('estimateSubjects — per-subject 3PL estimate from a wide prior', () => {
    it('folds each subject separately from N(0, 1)', () => {
        const est = estimateSubjects([
            { subject: 'EE', isCorrect: true, params: { a: 1, b: 0, c: 0.2 } },
            { subject: 'EE', isCorrect: true, params: { a: 1, b: 0.5, c: 0.2 } },
            { subject: 'Mathematics', isCorrect: false, params: { a: 1, b: 0, c: 0.2 } },
        ]);
        expect(est.EE.n).toBe(2);
        expect(est.EE.correct).toBe(2);
        expect(est.EE.theta).toBeGreaterThan(0);
        expect(est.Mathematics.theta).toBeLessThan(0);
        expect(est.ESAS).toMatchObject({ n: 0, theta: 0, se: 1 });
    });
});

describe('stopping and subject rotation', () => {
    it('stops a subject at its cap, or once SE reaches the target with at least 3 items', () => {
        expect(subjectDone('EE', { n: DIAGNOSTIC_CAPS.EE, se: 0.9 })).toBe(true);
        expect(subjectDone('EE', { n: 4, se: SE_TARGET })).toBe(true);
        expect(subjectDone('EE', { n: 2, se: 0.3 })).toBe(false);
        expect(subjectDone('EE', { n: 4, se: 0.6 })).toBe(false);
    });

    it('rotates to the subject furthest behind its share, heavier subject first on a tie', () => {
        const est = (n) => ({ n, se: 1, theta: 0 });
        expect(nextDiagnosticSubject({ Mathematics: est(0), ESAS: est(0), EE: est(0) })).toBe('EE');
        expect(nextDiagnosticSubject({ Mathematics: est(0), ESAS: est(1), EE: est(1) })).toBe('Mathematics');
        expect(nextDiagnosticSubject({ Mathematics: est(5), ESAS: est(6), EE: est(8) })).toBeNull();
    });

    it('a full placement is 15–19 items', () => {
        expect(plannedLength()).toBe(19);
        expect(DIAGNOSTIC_CAPS).toEqual({ Mathematics: 5, ESAS: 6, EE: 8 });
    });
});
