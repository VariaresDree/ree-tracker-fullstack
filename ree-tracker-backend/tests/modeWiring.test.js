import { describe, it, expect } from 'vitest';
const { VALID_MODES, telemetryBulkSchema } = require('../src/schemas/telemetrySchemas');
const { gradeSchema, examSubmitSchema } = require('../src/schemas/examSchemas');

describe('telemetry mode wiring', () => {
    it('exposes the five quiz-surface modes plus LEGACY', () => {
        for (const m of ['ACTIVE_REVIEW', 'BOARD_SIM', 'GAUNTLET', 'COMBAT', 'BATTLE', 'LEGACY']) {
            expect(VALID_MODES).toContain(m);
        }
    });

    it('telemetry-bulk schema accepts a known mode', () => {
        const ok = telemetryBulkSchema.safeParse({
            mode: 'BATTLE',
            attempts: [{ questionId: '11111111-1111-4111-8111-111111111111' }],
        });
        expect(ok.success).toBe(true);
    });

    it('telemetry-bulk schema rejects an unknown mode', () => {
        const bad = telemetryBulkSchema.safeParse({
            mode: 'ADAPTIVE_QUIZ',
            attempts: [{ questionId: '11111111-1111-4111-8111-111111111111' }],
        });
        expect(bad.success).toBe(false);
    });

    it('telemetry-bulk schema defaults mode to LEGACY', () => {
        const parsed = telemetryBulkSchema.parse({
            attempts: [{ questionId: '11111111-1111-4111-8111-111111111111' }],
        });
        expect(parsed.mode).toBe('LEGACY');
    });
});

describe('legacy Firebase question IDs are accepted (not UUIDs)', () => {
    // Real Question.id values are 20-char Firebase push IDs, e.g. "00QkwHdB8OvPY3Choa4L".
    // A `.uuid()` constraint silently 400s every attempt, so analytics never persists.
    const legacyId = '00QkwHdB8OvPY3Choa4L';

    it('telemetry-bulk accepts a legacy push id', () => {
        const ok = telemetryBulkSchema.safeParse({ attempts: [{ questionId: legacyId }] });
        expect(ok.success).toBe(true);
    });

    it('grade schema accepts a legacy push id', () => {
        const ok = gradeSchema.safeParse({ answers: [{ questionId: legacyId, userAnswer: 'A' }] });
        expect(ok.success).toBe(true);
    });

    it('exam-submit schema accepts a legacy push id', () => {
        const ok = examSubmitSchema.safeParse({ attempts: [{ questionId: legacyId, userAnswer: 'A' }] });
        expect(ok.success).toBe(true);
    });

    it('still rejects an empty question id', () => {
        const bad = telemetryBulkSchema.safeParse({ attempts: [{ questionId: '' }] });
        expect(bad.success).toBe(false);
    });
});
