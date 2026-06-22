const { z } = require('zod');

const examSubmitSchema = z.object({
    attempts: z.array(z.object({
        questionId: z.string().uuid(),
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
        questionId: z.string().uuid(),
        userAnswer: z.string()
    })).min(1)
});

module.exports = { examSubmitSchema, gradeSchema };
