const { z } = require('zod');
const { storableTimeMs } = require('../config/telemetryBounds');

// NOTE: Question IDs are legacy 20-char Firebase push IDs, not UUIDs. A
// `.uuid()` constraint here 400s every Gauntlet/Board-Sim submission. Accept
// any non-empty id; the grade/submit handlers re-validate against the master
// Question table before scoring or persisting.
const examSubmitSchema = z.object({
    attempts: z.array(z.object({
        questionId: z.string().min(1),
        userAnswer: z.string(),
        confidence: z.enum(['LOW', 'MED', 'HIGH']).optional().default('LOW'),
        // Clamped for the same int4 reason as telemetrySchemas.timeSpentMs —
        // this value is multiplied by 1000 before it reaches the column.
        timeSpentSecs: z.number().optional().default(0)
            .transform((s) => storableTimeMs(Number(s) * 1000) / 1000),
        subject: z.string().optional(),
        subtopic: z.string().optional(),
        clientAttemptId: z.string().min(8).max(80).optional()
    })).min(1),
    config: z.object({
        mode: z.string().optional(),
        subject: z.string().optional()
    }).optional().default({}),
    timeRemaining: z.number().nonnegative().default(0),
    totalExamTime: z.number().nonnegative().default(0)
}).refine((v) => v.timeRemaining <= v.totalExamTime, {
    // examRoutes derives timeTakenSecs as (totalExamTime - timeRemaining).
    // Validated independently, those two could produce a NEGATIVE duration
    // that then flowed into ExamSession.timeTakenSecs and the study-time chart.
    message: 'timeRemaining cannot exceed totalExamTime',
    path: ['timeRemaining'],
});

// IMPORTANT: zod's validate() REPLACES req.body with the parsed result, so
// any field missing from this schema is silently stripped. The gauntlet
// already sends confidenceLevel/timeSpentMs — omitting them here downgraded
// every gauntlet attempt to LOW confidence / 0ms.
// A Gauntlet run names its tier and run id so the server can apply the ladder
// (services/gauntletService). Optional: entries queued by older clients carry
// none and are graded exactly as before.
const gauntletRunSchema = z.object({
    level: z.number().int().min(1).max(7),
    runId: z.string().min(8).max(64),
    // The level this device last knew. Adopted ONCE, for accounts whose ladder
    // so far lived only on their device (see gauntletService).
    knownLevel: z.number().int().min(1).max(5).optional(),
    startedAt: z.string().max(40).optional(),
    finishedAt: z.string().max(40).optional(),
});

const gradeSchema = z.object({
    answers: z.array(z.object({
        questionId: z.string().min(1),
        userAnswer: z.string(),
        confidenceLevel: z.enum(['LOW', 'MED', 'HIGH']).optional(),
        timeSpentMs: z.number().optional().transform((v) => (v === undefined ? undefined : storableTimeMs(v))),
        clientAttemptId: z.string().min(8).max(80).optional(),
        itemIndex: z.number().int().min(0).max(999).optional(),
    })).min(1),
    mode: z.string().optional(),
    gauntlet: gauntletRunSchema.optional(),
}).refine((v) => !v.gauntlet || !v.mode || v.mode === 'GAUNTLET', {
    message: 'A Gauntlet run must be graded in GAUNTLET mode.',
    path: ['mode'],
});

// POST /exams/gauntlet/forfeit — leaving a started run counts as not passing.
const gauntletForfeitSchema = z.object({
    level: z.number().int().min(1).max(7),
    runId: z.string().min(8).max(64),
    knownLevel: z.number().int().min(1).max(5).optional(),
    at: z.string().max(40).optional(),
});

// POST /exams/next-item — CAT item picker. poolSize is capped so a forged
// request can't pull an unbounded candidate set into memory.
const nextItemSchema = z.object({
    subject: z.string().max(64).optional(),
    recentIds: z.array(z.string().min(1)).max(500).default([]),
    sessionAttempts: z.array(z.object({
        questionId: z.string().min(1),
        isCorrect: z.boolean()
    })).max(200).default([]),
    poolSize: z.number().int().min(10).max(200).default(80)
});

// POST /exams/sessions/:id/finalize — the client may only DESCRIBE the sitting;
// grading comes from the session's recorded attempts (services/examHistory).
const finalizeSchema = z.object({
    kind: z.enum(['subject', 'blended', 'custom', 'full-board', 'battle', 'retake']).optional(),
    isPrcStandard: z.boolean().optional(),
    targetSubject: z.string().max(32).optional(),
    // Items the learner marked for review during the sitting, kept for the
    // review's "Marked" filter. A full board sends the union of its sections.
    markedQuestionIds: z.array(z.string().min(1).max(200)).max(300).optional(),
}).strip();

module.exports = { examSubmitSchema, gradeSchema, gauntletForfeitSchema, nextItemSchema, finalizeSchema };
