const { z } = require('zod');

// Battle ids are 6-char uppercase alphanumeric invite codes minted client-side
// (Arena lobby). The join form enforces the same shape.
const battleIdSchema = z.string().regex(/^[A-Z0-9]{6}$/);

// POST /api/battles — the client sends a pool SPEC, never the pool itself.
// The server samples the questions so answer keys never round-trip.
const battleCreateSchema = z.object({
    battleId: battleIdSchema,
    config: z.object({
        mode: z.enum(['custom', 'prc', 'blended', 'subject']).default('custom'),
        subject: z.string().max(64).optional(),
        subtopic: z.string().max(128).optional(),
        count: z.coerce.number().int().min(5).max(100).default(20),
        timeLimitMins: z.coerce.number().int().min(1).max(400).optional(),
        isPrcStandard: z.boolean().default(false),
    }).default({ mode: 'custom', count: 20, isPrcStandard: false }),
    timeLimitSecs: z.coerce.number().int().min(60).max(6 * 3600),
});

// Shared per-question attempt shape for socket payloads. userAnswer may be
// null (blank answers count as wrong, like the real board exam).
const battleAttemptItem = z.object({
    questionId: z.string().min(1).max(64),
    userAnswer: z.string().max(500).nullable().default(null),
    confidenceLevel: z.enum(['LOW', 'MED', 'HIGH']).default('MED'),
    timeSpentMs: z.number().nonnegative().max(3_600_000).default(0),
});

// socket `battle-answer` — one live answer, graded server-side.
const battleAnswerSchema = battleAttemptItem.extend({
    battleId: battleIdSchema,
});

// socket `battle-submit` — final attempts. Client score/total are NOT part of
// the schema: the server computes them.
const battleSubmitSchema = z.object({
    battleId: battleIdSchema,
    attempts: z.array(battleAttemptItem).max(200).default([]),
});

module.exports = { battleCreateSchema, battleAnswerSchema, battleSubmitSchema, battleAttemptItem };
