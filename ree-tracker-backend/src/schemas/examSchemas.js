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

module.exports = { examSubmitSchema, gradeSchema };
