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
    // Lifecycle status. AI/vision ingestion sends 'quarantined'; the field used
    // to be dropped here (schema omitted it), so those questions were created
    // LIVE and immediately drawable — a wrong "correct answer" could reach
    // candidates un-reviewed. Now it's accepted and honored (see isPendingReview).
    status: z.enum(['live', 'quarantined']).optional(),
    bloomLevel: z.enum(BLOOM_LEVELS).optional().default('REMEMBER'),
    difficultyTier: z.number().int().min(1).max(3).optional().default(1),
    competencyArea: z.string().nullable().optional()
});

// Strip any baked-in answer-choice labels ("A.", "b)", "(C)") from options and
// the answer AFTER validation, so the exact-match grading invariant holds and
// the quiz UI never renders a duplicate label. Runs on every validated POST.
const questionCreateSchema = baseQuestionSchema.transform(sanitizeQuestionShape);

// TRUE partial for updates — built without .default()s. Zod's .partial() on
// defaulted fields still INJECTS the defaults on parse ({} came back with
// subject:'Unknown', difficulty:0, isFlagged:false, …), so any partial edit
// silently reset fields the caller never sent — including UN-flagging a
// flagged question. Absent must mean absent (Prisma then skips the column).
const questionUpdateSchema = z.object({
    subject: z.string().min(1).optional(),
    subtopic: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
    options: z.array(z.string()).min(2).max(6).optional(),
    answer: z.string().min(1).optional(),
    difficulty: z.number().optional(),
    fixedExplanation: z.string().nullable().optional(),
    source: z.string().optional(),
    type: z.string().optional(),
    isFlagged: z.boolean().optional(),
    status: z.enum(['live', 'quarantined']).optional(),
    bloomLevel: z.enum(BLOOM_LEVELS).optional(),
    difficultyTier: z.number().int().min(1).max(3).optional(),
    competencyArea: z.string().nullable().optional(),
}).transform(sanitizeQuestionShape);

// A question submitted as 'quarantined' (AI/vision ingestion) must not go live.
// Callers flag it so pool sampling (WHERE isFlagged=false) skips it and it lands
// in the existing /quarantine admin review queue for approve/reject.
const isPendingReview = (data) => data?.status === 'quarantined';

// Explanation-cache write (PUT /:id/cache) — a legit per-user AI-explanation
// cache, so it stays authenticated (not admin-gated), but it was the only
// question-mutation route with NO validate(). Constrain it so it can only ever
// touch the explanation, never smuggle other columns, and bound the size.
const questionCacheSchema = z.object({
    cachedExplanation: z.string().max(20000).optional(),
    fixedExplanation: z.string().max(20000).optional(),
}).strip();

module.exports = { questionCreateSchema, questionUpdateSchema, questionCacheSchema, isPendingReview };
