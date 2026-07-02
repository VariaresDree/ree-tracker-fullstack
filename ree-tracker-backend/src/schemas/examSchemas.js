const { z } = require('zod');

// NOTE: Question IDs are legacy 20-char Firebase push IDs, not UUIDs. A
// `.uuid()` constraint here 400s every Gauntlet/Board-Sim submission. Accept
// any non-empty id; the grade/submit handlers re-validate against the master
// Question table before scoring or persisting.
const examSubmitSchema = z.object({
    attempts: z.array(z.object({
        questionId: z.string().min(1),
        userAnswer: z.string(),
        confidence: z.enum(['LOW', 'MED', 'HIGH']).optional().default('LOW'),
        timeSpentSecs: z.number().nonnegative().optional().default(0),
        subject: z.string().optional(),
        subtopic: z.string().optional()
    })).min(1),
    config: z.object({
        mode: z.string().optional(),
        subject: z.string().optional()
    }).optional().default({}),
    timeRemaining: z.number().nonnegative().default(0),
    totalExamTime: z.number().nonnegative().default(0)
});

const gradeSchema = z.object({
    answers: z.array(z.object({
        questionId: z.string().min(1),
        userAnswer: z.string()
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
