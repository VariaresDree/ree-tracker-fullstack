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
        questionId: z.string().min(1).max(200),
        // Per-field caps mirror the battle schema so a single attempt can't carry
        // a multi-MB string (subject/subtopic also flow into UserTopicPerformance).
        userAnswer: z.string().max(500).optional(),
        subject: z.string().max(120).optional().default('General'),
        subtopic: z.string().max(120).optional().default('General'),
        isCorrect: z.boolean().optional(),
        confidenceLevel: z.enum(['LOW', 'MED', 'HIGH']).optional().default('MED'),
        timeSpentMs: z.number().nonnegative().optional().default(0),
        // Client-generated per-attempt id — the server's durable dedupe handle
        // against replayed batches (unique per user among non-null values).
        clientAttemptId: z.string().min(8).max(80).optional(),
    // Cap the batch: unbounded, one request could open a huge write transaction
    // (findMany over thousands of ids + createMany + per-topic upserts). The
    // client coalesces answers but a full PRC exam is 100 items; 500 is ample.
    })).min(1).max(500),
});

module.exports = { telemetryBulkSchema, VALID_MODES };
