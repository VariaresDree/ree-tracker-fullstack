import { describe, it, expect } from 'vitest';

const { readinessSnapshotSchema } = require('../src/schemas/readinessSchemas');
const { nextItemSchema } = require('../src/schemas/examSchemas');
const { profileUpdateSchema, settingsUpdateSchema } = require('../src/schemas/userSchemas');

describe('readinessSnapshotSchema', () => {
    it('accepts a sane snapshot and defaults omitted fields', () => {
        const r = readinessSnapshotSchema.safeParse({ score: 72, accuracyRate: 0.8 });
        expect(r.success).toBe(true);
        expect(r.data.topicCoverage).toBe(0);
    });

    it('rejects forged out-of-range values', () => {
        expect(readinessSnapshotSchema.safeParse({ score: 150 }).success).toBe(false);
        expect(readinessSnapshotSchema.safeParse({ score: -5 }).success).toBe(false);
        expect(readinessSnapshotSchema.safeParse({ accuracyRate: 2 }).success).toBe(false);
        expect(readinessSnapshotSchema.safeParse({ theta: 9 }).success).toBe(false);
    });
});

describe('nextItemSchema', () => {
    it('defaults poolSize to 80 and accepts a normal request', () => {
        const r = nextItemSchema.safeParse({ subject: 'EE' });
        expect(r.success).toBe(true);
        expect(r.data.poolSize).toBe(80);
        expect(r.data.recentIds).toEqual([]);
    });

    it('caps poolSize (the old handler passed it straight into take:)', () => {
        expect(nextItemSchema.safeParse({ poolSize: 1000000 }).success).toBe(false);
        expect(nextItemSchema.safeParse({ poolSize: 5 }).success).toBe(false);
        expect(nextItemSchema.safeParse({ poolSize: 200 }).success).toBe(true);
    });

    it('caps recentIds and sessionAttempts array sizes', () => {
        expect(nextItemSchema.safeParse({ recentIds: Array(501).fill('q') }).success).toBe(false);
        expect(nextItemSchema.safeParse({
            sessionAttempts: Array(201).fill({ questionId: 'q', isCorrect: true }),
        }).success).toBe(false);
    });
});

describe('user schemas', () => {
    it('profile: trims and bounds displayName', () => {
        const r = profileUpdateSchema.safeParse({ displayName: '  Nikola  ' });
        expect(r.success).toBe(true);
        expect(r.data.displayName).toBe('Nikola');
        expect(profileUpdateSchema.safeParse({ displayName: '' }).success).toBe(false);
        expect(profileUpdateSchema.safeParse({ displayName: 'x'.repeat(33) }).success).toBe(false);
    });

    it('settings: requires at least one field and validates shapes', () => {
        expect(settingsUpdateSchema.safeParse({}).success).toBe(false);
        expect(settingsUpdateSchema.safeParse({ examDate: '2026-09-15' }).success).toBe(true);
        expect(settingsUpdateSchema.safeParse({ examDate: 'next week' }).success).toBe(false);
        expect(settingsUpdateSchema.safeParse({ dailyTarget: 50 }).success).toBe(true);
        expect(settingsUpdateSchema.safeParse({ dailyTarget: 0 }).success).toBe(false);
        expect(settingsUpdateSchema.safeParse({ dailyTarget: 501 }).success).toBe(false);
    });
});
