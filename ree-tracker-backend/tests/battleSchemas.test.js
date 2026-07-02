import { describe, it, expect } from 'vitest';

const { battleCreateSchema, battleAnswerSchema, battleSubmitSchema } = require('../src/schemas/battleSchemas');

describe('battleCreateSchema', () => {
    const valid = {
        battleId: 'A1B2C3',
        config: { mode: 'subject', subject: 'EE', count: 20, isPrcStandard: false },
        timeLimitSecs: 1800,
    };

    it('accepts a valid create payload', () => {
        expect(battleCreateSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects malformed battle ids', () => {
        expect(battleCreateSchema.safeParse({ ...valid, battleId: 'abc123' }).success).toBe(false); // lowercase
        expect(battleCreateSchema.safeParse({ ...valid, battleId: 'A1B2C' }).success).toBe(false);  // 5 chars
        expect(battleCreateSchema.safeParse({ ...valid, battleId: 'A1B2C3D' }).success).toBe(false); // 7 chars
    });

    it('rejects a client-supplied questions array shape (pool spec only)', () => {
        // Extra keys are stripped, not fatal — but count is bounded so nobody
        // can request a 1e6-question pool.
        expect(battleCreateSchema.safeParse({ ...valid, config: { ...valid.config, count: 1000 } }).success).toBe(false);
        expect(battleCreateSchema.safeParse({ ...valid, config: { ...valid.config, count: 4 } }).success).toBe(false);
    });

    it('bounds the time limit', () => {
        expect(battleCreateSchema.safeParse({ ...valid, timeLimitSecs: 30 }).success).toBe(false);
        expect(battleCreateSchema.safeParse({ ...valid, timeLimitSecs: 999999 }).success).toBe(false);
        expect(battleCreateSchema.safeParse({ ...valid, timeLimitSecs: 21600 }).success).toBe(true); // 6h PRC EE
    });
});

describe('battleAnswerSchema', () => {
    it('accepts a live answer and defaults optional fields', () => {
        const r = battleAnswerSchema.safeParse({ battleId: 'A1B2C3', questionId: 'q1', userAnswer: '42' });
        expect(r.success).toBe(true);
        expect(r.data.confidenceLevel).toBe('MED');
        expect(r.data.timeSpentMs).toBe(0);
    });

    it('allows null userAnswer (blank counts as wrong, like the real board)', () => {
        expect(battleAnswerSchema.safeParse({ battleId: 'A1B2C3', questionId: 'q1', userAnswer: null }).success).toBe(true);
    });

    it('rejects out-of-enum confidence and absurd timings', () => {
        expect(battleAnswerSchema.safeParse({ battleId: 'A1B2C3', questionId: 'q1', userAnswer: 'x', confidenceLevel: 'SUPER' }).success).toBe(false);
        expect(battleAnswerSchema.safeParse({ battleId: 'A1B2C3', questionId: 'q1', userAnswer: 'x', timeSpentMs: 10 * 3600_000 }).success).toBe(false);
    });
});

describe('battleSubmitSchema', () => {
    it('has NO score/total fields — the server computes them', () => {
        const r = battleSubmitSchema.safeParse({ battleId: 'A1B2C3', score: 999, total: 10, attempts: [] });
        expect(r.success).toBe(true);
        expect(r.data.score).toBeUndefined();
        expect(r.data.total).toBeUndefined();
    });

    it('caps attempts at 200', () => {
        const attempts = Array.from({ length: 201 }, (_, i) => ({ questionId: `q${i}`, userAnswer: 'a' }));
        expect(battleSubmitSchema.safeParse({ battleId: 'A1B2C3', attempts }).success).toBe(false);
    });
});
