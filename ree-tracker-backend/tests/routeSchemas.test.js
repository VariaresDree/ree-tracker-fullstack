import { describe, it, expect } from 'vitest';

const { srsReviewSchema } = require('../src/schemas/srsSchemas');
const { studySessionSchema } = require('../src/schemas/studySessionSchemas');
const { plannerTaskCreateSchema, plannerTaskUpdateSchema } = require('../src/schemas/plannerSchemas');
const { bookmarkCreateSchema } = require('../src/schemas/bookmarkSchemas');

// R1 — these routes previously wrote req.body unchecked, turning bad client
// input into a 500 (or, for SRS, an Invalid Date that corrupts scheduling).

describe('srsReviewSchema', () => {
    it('accepts a valid SM-2 review and coerces numeric strings', () => {
        const r = srsReviewSchema.safeParse({ questionId: 'q1', quality: 4, interval: '6', easeFactor: 2.5, repetitions: 2 });
        expect(r.success).toBe(true);
        expect(r.data.interval).toBe(6); // coerced number, safe for date math
    });

    it('rejects a non-numeric interval (the Invalid-Date bug)', () => {
        expect(srsReviewSchema.safeParse({ questionId: 'q1', quality: 3, interval: 'soon' }).success).toBe(false);
    });

    it('requires questionId + quality and bounds quality to 0..5', () => {
        expect(srsReviewSchema.safeParse({ quality: 3 }).success).toBe(false);
        expect(srsReviewSchema.safeParse({ questionId: 'q1' }).success).toBe(false);
        expect(srsReviewSchema.safeParse({ questionId: 'q1', quality: 9 }).success).toBe(false);
    });
});

describe('studySessionSchema', () => {
    it('accepts a valid summary and defaults optional counts', () => {
        const r = studySessionSchema.safeParse({ mode: 'ACTIVE_REVIEW', subject: 'EE', totalQuestions: 20 });
        expect(r.success).toBe(true);
        expect(r.data.correctAnswers).toBe(0);
        expect(r.data.durationSecs).toBe(0);
    });

    it('rejects a non-numeric totalQuestions (the parseInt→NaN bug)', () => {
        expect(studySessionSchema.safeParse({ mode: 'ACTIVE_REVIEW', subject: 'EE', totalQuestions: 'abc' }).success).toBe(false);
    });

    it('requires mode + subject', () => {
        expect(studySessionSchema.safeParse({ totalQuestions: 5 }).success).toBe(false);
    });
});

describe('plannerTaskCreateSchema / plannerTaskUpdateSchema', () => {
    it('trims text and rejects a non-string text (the .trim() TypeError bug)', () => {
        const ok = plannerTaskCreateSchema.safeParse({ text: '  study ohms law  ' });
        expect(ok.success).toBe(true);
        expect(ok.data.text).toBe('study ohms law');
        expect(plannerTaskCreateSchema.safeParse({ text: 123 }).success).toBe(false);
        expect(plannerTaskCreateSchema.safeParse({ text: '   ' }).success).toBe(false);
    });

    it('update accepts a partial body', () => {
        expect(plannerTaskUpdateSchema.safeParse({ completed: true }).success).toBe(true);
        expect(plannerTaskUpdateSchema.safeParse({ text: 5 }).success).toBe(false);
    });
});

describe('bookmarkCreateSchema', () => {
    it('requires a string questionId', () => {
        expect(bookmarkCreateSchema.safeParse({ questionId: 'q1' }).success).toBe(true);
        expect(bookmarkCreateSchema.safeParse({}).success).toBe(false);
        expect(bookmarkCreateSchema.safeParse({ questionId: 42 }).success).toBe(false);
    });
});
