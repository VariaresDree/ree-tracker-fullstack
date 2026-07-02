import { describe, it, expect } from 'vitest';

const { sanitizeBattleQuestions, buildAnswerKey } = require('../src/utils/battleSanitizer');

const FULL_QUESTION = {
    id: 'q1',
    subject: 'EE',
    subtopic: 'AC Circuits',
    text: 'What is the impedance?',
    options: ['1 Ω', '2 Ω', '3 Ω', '4 Ω'],
    answer: '2 Ω',
    difficulty: 1.2,
    fixedExplanation: 'Because Z = V/I.',
    type: 'calculation',
    bloomLevel: 'APPLY',
    irtA: 1.1,
    irtB: 0.4,
    irtC: 0.2,
    calibrationN: 55,
    explanationStatus: 'APPROVED',
    isFlagged: false,
    createdAt: '2026-01-01T00:00:00Z',
};

describe('sanitizeBattleQuestions', () => {
    it('strips the answer key and calibration internals', () => {
        const [q] = sanitizeBattleQuestions([FULL_QUESTION]);
        expect(q.answer).toBeUndefined();
        expect(q.fixedExplanation).toBeUndefined();
        expect(q.irtA).toBeUndefined();
        expect(q.irtB).toBeUndefined();
        expect(q.irtC).toBeUndefined();
        expect(q.calibrationN).toBeUndefined();
        expect(q.explanationStatus).toBeUndefined();
    });

    it('keeps everything the exam UI needs', () => {
        const [q] = sanitizeBattleQuestions([FULL_QUESTION]);
        expect(q).toEqual({
            id: 'q1',
            subject: 'EE',
            subtopic: 'AC Circuits',
            text: 'What is the impedance?',
            options: ['1 Ω', '2 Ω', '3 Ω', '4 Ω'],
            type: 'calculation',
            difficulty: 1.2,
            bloomLevel: 'APPLY',
        });
    });

    it('tolerates non-array and sparse input', () => {
        expect(sanitizeBattleQuestions(null)).toEqual([]);
        expect(sanitizeBattleQuestions(undefined)).toEqual([]);
        expect(sanitizeBattleQuestions([{ id: 'x' }])).toEqual([{ id: 'x' }]);
    });
});

describe('buildAnswerKey', () => {
    it('maps question ids to answers', () => {
        expect(buildAnswerKey([FULL_QUESTION, { ...FULL_QUESTION, id: 'q2', answer: '4 Ω' }]))
            .toEqual({ q1: '2 Ω', q2: '4 Ω' });
    });

    it('skips malformed entries and non-arrays', () => {
        expect(buildAnswerKey(null)).toEqual({});
        expect(buildAnswerKey([{ id: null, answer: 'x' }, { id: 'ok', answer: 'y' }])).toEqual({ ok: 'y' });
    });
});
