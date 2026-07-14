const { z } = require('zod');

// POST /api/analytics/study-sessions — a completed study-session summary. The
// counts land in Int columns; a non-numeric totalQuestions used to reach
// parseInt() → NaN → Prisma 500. coerce keeps numeric-string tolerance while
// rejecting garbage with a 400.
const studySessionSchema = z.object({
    mode: z.string().min(1).max(40),
    subject: z.string().min(1).max(60),
    subtopic: z.string().max(120).nullable().optional(),
    totalQuestions: z.coerce.number().int().min(0).max(100000),
    correctAnswers: z.coerce.number().int().min(0).max(100000).optional().default(0),
    durationSecs: z.coerce.number().int().min(0).max(604800).optional().default(0),
}).strip();

module.exports = { studySessionSchema };
