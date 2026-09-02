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
const gradeSchema = z.object({
    answers: z.array(z.object({
        questionId: z.string().min(1),
        userAnswer: z.string(),
        confidenceLevel: z.enum(['LOW', 'MED', 'HIGH']).optional(),
        timeSpentMs: z.number().optional().transform((v) => (v === undefined ? undefined : storableTimeMs(v))),
        clientAttemptId: z.string().min(8).max(80).optional()
    })).min(1),
    mode: z.string().optional()
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

module.exports = { examSubmitSchema, gradeSchema, nextItemSchema };
