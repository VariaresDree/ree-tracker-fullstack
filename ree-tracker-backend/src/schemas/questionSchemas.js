const { z } = require('zod');
const { sanitizeQuestionShape } = require('../utils/sanitizeOptions');

const BLOOM_LEVELS = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'];

const baseQuestionSchema = z.object({
    subject: z.string().min(1).default('Unknown'),
    subtopic: z.string().min(1).default('General'),
    text: z.string().min(1),
    options: z.array(z.string()).min(2).max(6),
    answer: z.string().min(1),
    difficulty: z.number().optional().default(0.0),
    fixedExplanation: z.string().nullable().optional(),
    source: z.string().optional().default('manual'),
    type: z.string().optional().default('calculation'),
    isFlagged: z.boolean().optional().default(false),
    bloomLevel: z.enum(BLOOM_LEVELS).optional().default('REMEMBER'),
    difficultyTier: z.number().int().min(1).max(3).optional().default(1),
    competencyArea: z.string().nullable().optional()
});

// Strip any baked-in answer-choice labels ("A.", "b)", "(C)") from options and
// the answer AFTER validation, so the exact-match grading invariant holds and
// the quiz UI never renders a duplicate label. Runs on every validated POST.
const questionCreateSchema = baseQuestionSchema.transform(sanitizeQuestionShape);

const questionUpdateSchema = baseQuestionSchema.partial().transform(sanitizeQuestionShape);

module.exports = { questionCreateSchema, questionUpdateSchema };
