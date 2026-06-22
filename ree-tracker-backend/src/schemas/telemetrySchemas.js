const { z } = require('zod');

const telemetryBulkSchema = z.object({
    attempts: z.array(z.object({
        questionId: z.string().uuid(),
        userAnswer: z.string().optional(),
        subject: z.string().optional().default('General'),
        subtopic: z.string().optional().default('General'),
        isCorrect: z.boolean().optional(),
        confidenceLevel: z.enum(['LOW', 'MED', 'HIGH']).optional().default('MED'),
        timeSpentMs: z.number().nonnegative().optional().default(0)
    })).min(1)
});

module.exports = { telemetryBulkSchema };
