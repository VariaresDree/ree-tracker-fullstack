const { z } = require('zod');
const { storableTimeMs } = require('../config/telemetryBounds');

const VALID_MODES = ['ACTIVE_REVIEW', 'BOARD_SIM', 'GAUNTLET', 'COMBAT', 'BATTLE', 'LEGACY'];

const telemetryBulkSchema = z.object({
    // Length-capped: this value is used as an ExamSession primary key and was
    // previously an unbounded free-form string. Deliberately NO minimum and no
    // format constraint — the client's id generator has a Math.random() fallback
    // that can emit a short string, and rejecting the request would discard the
    // whole batch, which is the data loss this validation exists to prevent.
    // Cross-user misuse is stopped by the compound (id, userId) upsert key in
    // telemetryService, not by guessing at the id's shape here.
    sessionId: z.string().max(64).optional().nullable(),
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
        // CLAMPED, not rejected. QuestionAttempt.timeSpentMs is an int4: an
        // out-of-range value used to throw inside createMany and roll back the
        // WHOLE batch (up to 500 attempts) on one bad field, and >=1e21
        // stringifies exponentially so parseInt returned 1ms silently. A
        // `.max()` here would 400 the batch and lose the same data a different
        // way, so clamp instead — an implausible duration is still a real
        // answer worth keeping.
        timeSpentMs: z.number().optional().default(0).transform(storableTimeMs),
        // Client-generated per-attempt id — the server's durable dedupe handle
        // against replayed batches (unique per user among non-null values).
        clientAttemptId: z.string().min(8).max(80).optional(),
        // Answered offline and synced later. Stored for audit; the server still
        // re-grades authoritatively and logs any client/server disagreement.
        offline: z.boolean().optional().default(false),
        // When the client says the user actually answered (ISO string). Persisted
        // as QuestionAttempt.answeredAt so an offline batch lands on the day it
        // was answered, not the day it synced. Deliberately validated loosely: a
        // malformed clock value must never 400 a whole batch and lose real
        // attempts — clampAnsweredAt falls back to server `now` instead.
        createdAt: z.string().max(40).optional(),
    // Cap the batch: unbounded, one request could open a huge write transaction
    // (findMany over thousands of ids + createMany + per-topic upserts). The
    // client coalesces answers but a full PRC exam is 100 items; 500 is ample.
    })).min(1).max(500),
});

module.exports = { telemetryBulkSchema, VALID_MODES };
