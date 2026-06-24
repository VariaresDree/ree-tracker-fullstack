const { z } = require('zod');

const VALID_MODES = ['ACTIVE_REVIEW', 'BOARD_SIM', 'GAUNTLET', 'COMBAT', 'BATTLE', 'LEGACY'];

const telemetryBulkSchema = z.object({
    sessionId: z.string().optional().nullable(),
    mode: z.enum(VALID_MODES).optional().default('LEGACY'),
    targetSubject: z.string().optional(),
    attempts: z.array(z.object({
        // Question IDs are legacy 20-char Firebase push IDs (e.g. "00QkwHdB8OvPY3Choa4L"),
        // NOT UUIDs — the Question model uses `id String @id` with no uuid() default.
        // A `.uuid()` constraint here silently 400s every telemetry batch, so nothing
        // ever persists. Accept any non-empty id; the server re-validates against the
        // master Question table before writing.
        questionId: z.string().min(1),
        userAnswer: z.string().optional(),
        subject: z.string().optional().default('General'),
        subtopic: z.string().optional().default('General'),
        isCorrect: z.boolean().optional(),
        confidenceLevel: z.enum(['LOW', 'MED', 'HIGH']).optional().default('MED'),
        timeSpentMs: z.number().nonnegative().optional().default(0),
    })).min(1),
});

module.exports = { telemetryBulkSchema, VALID_MODES };
