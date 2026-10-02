import { describe, it, expect } from 'vitest';

const { studySessionSchema } = require('../src/schemas/studySessionSchemas');
const { plannerTaskCreateSchema, plannerTaskUpdateSchema } = require('../src/schemas/plannerSchemas');
const { bookmarkCreateSchema } = require('../src/schemas/bookmarkSchemas');

// R1 — these routes previously wrote req.body unchecked, turning bad client
// input into a 500. (The SRS review schema went with POST /srs/review — cards
// are now scheduled server-side from telemetry; see engine/srs.js.)

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
