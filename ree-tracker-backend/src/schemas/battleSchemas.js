const { z } = require('zod');

// Battle ids are 6-char uppercase alphanumeric invite codes minted client-side
// (Arena lobby). The join form enforces the same shape.
const battleIdSchema = z.string().regex(/^[A-Z0-9]{6}$/);

// POST /api/battles — the client sends a pool SPEC, never the pool itself.
// The server samples the questions so answer keys never round-trip.
const { ownCountsBySubject } = require('./userSchemas');
const { MAX_ITEMS, MAX_SECS } = require('./assignedExamSchemas');

// A battle the host sets up draws 5 to 100 items in up to 6 hours. A battle on
// an assigned exam is the exam's size and time (up to 300 items and a day).
const DRAWN = { minCount: 5, maxCount: 100, maxSecs: 6 * 3600 };
const drawnCount = (c) => c.mode === 'assigned' || (c.count >= DRAWN.minCount && c.count <= DRAWN.maxCount);
const drawnTime = (b) => b.config.mode === 'assigned' || b.timeLimitSecs <= DRAWN.maxSecs;
const TIME_MESSAGE = { message: 'A battle runs at most 6 hours.', path: ['timeLimitSecs'] };

const battleFields = {
    battleId: battleIdSchema,
    config: z.object({
        // 'assigned': an exam the admin published (Exams › Assigned); the server
        // takes its questions and time from the exam, not from these fields.
        mode: z.enum(['custom', 'prc', 'blended', 'subject', 'assigned']).default('custom'),
        assignedExamId: z.string().min(1).max(100).optional(),
        subject: z.string().max(64).optional(),
        subtopic: z.string().max(128).optional(),
        // Two or more topics to draw from instead of one (2026-11-16).
        topics: z.array(z.string().trim().min(1).max(128)).min(2).max(40).optional(),
        // One subtopic of that topic (Question.subtopicId), and its name to show.
        subtopicId: z.string().min(1).max(100).optional(),
        subtopicName: z.string().max(128).optional(),
        // One order of questions and choices for every player (the host's
        // choice); otherwise each player gets their own (the default).
        sameOrder: z.boolean().optional(),
        count: z.coerce.number().int().min(1).max(MAX_ITEMS).default(20),
        timeLimitMins: z.coerce.number().int().min(1).max(400).optional(),
        isPrcStandard: z.boolean().default(false),
        // How the questions are picked, the host's choice (services/questionPool).
        drawMode: z.enum(['even', 'board', 'own']).optional(),
        ownCounts: ownCountsBySubject.optional(),
    }).refine((c) => c.mode !== 'assigned' || !!c.assignedExamId, { message: 'Which exam?', path: ['assignedExamId'] })
        .refine(drawnCount, { message: 'A battle draws 5 to 100 questions.', path: ['count'] })
        .default({ mode: 'custom', count: 20, isPrcStandard: false }),
    timeLimitSecs: z.coerce.number().int().min(60).max(MAX_SECS),
};

const battleCreateSchema = z.object(battleFields).refine(drawnTime, TIME_MESSAGE);
// A finished battle's stored settings, read again for its rematch.
const battleSettingsSchema = z.object(battleFields).omit({ battleId: true }).refine(drawnTime, TIME_MESSAGE);

// Shared per-question attempt shape for socket payloads. userAnswer may be
// null (blank answers count as wrong, like the real board exam).
const battleAttemptItem = z.object({
    questionId: z.string().min(1).max(64),
    userAnswer: z.string().max(500).nullable().default(null),
    confidenceLevel: z.enum(['LOW', 'MED', 'HIGH', 'UNRATED']).default('UNRATED'),
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
    attempts: z.array(battleAttemptItem).max(MAX_ITEMS).default([]),
});

module.exports = { battleCreateSchema, battleSettingsSchema, battleAnswerSchema, battleSubmitSchema, battleAttemptItem };
