import { describe, it, expect } from 'vitest';
const { VALID_MODES, telemetryBulkSchema } = require('../src/schemas/telemetrySchemas');

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
