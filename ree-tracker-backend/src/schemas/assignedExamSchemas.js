const { z } = require('zod');

// Admin › Assigned exams. The subject isn't sent: the server reads it off the
// questions (services/assignedExams.subjectOf).
const MIN_ITEMS = 5; // a battle's smallest paper
const MAX_ITEMS = 100; // one PRC subject paper

const questionIds = z.array(z.string().trim().min(1).max(100))
    .min(MIN_ITEMS, `Pick at least ${MIN_ITEMS} questions.`)
    .max(MAX_ITEMS, `An exam holds up to ${MAX_ITEMS} questions.`)
    .refine((ids) => new Set(ids).size === ids.length, 'A question is in the list twice.');

const assignedExamSchema = z.object({
    title: z.string().trim().min(1, 'Give the exam a title.').max(120),
    description: z.string().trim().max(500).nullish().transform((v) => v || null),
    questionIds,
    timeLimitSecs: z.coerce.number().int().min(60).max(6 * 3600),
    status: z.enum(['draft', 'published']).default('draft'),
}).strict();

// Publish or unpublish without resending the questions.
const assignedExamStatusSchema = z.object({ status: z.enum(['draft', 'published']) }).strict();

module.exports = { assignedExamSchema, assignedExamStatusSchema, MIN_ITEMS, MAX_ITEMS };
