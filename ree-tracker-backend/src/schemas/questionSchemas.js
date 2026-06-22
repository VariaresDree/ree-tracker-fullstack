const { z } = require('zod');

const questionCreateSchema = z.object({
    subject: z.string().min(1).default('Unknown'),
    subtopic: z.string().min(1).default('General'),
    text: z.string().min(1),
    options: z.array(z.string()).min(2).max(6),
    answer: z.string().min(1),
    difficulty: z.number().optional().default(0.0),
    fixedExplanation: z.string().nullable().optional(),
    source: z.string().optional().default('manual'),
    type: z.string().optional().default('calculation'),
    isFlagged: z.boolean().optional().default(false)
});

const questionUpdateSchema = questionCreateSchema.partial();

module.exports = { questionCreateSchema, questionUpdateSchema };
