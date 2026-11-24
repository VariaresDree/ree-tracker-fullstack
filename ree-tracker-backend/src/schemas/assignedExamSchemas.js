const { z } = require('zod');

// Admin › Assigned exams. The subject isn't sent: the server reads it off the
// questions (services/assignedExams.subjectOf).
const MIN_ITEMS = 5; // a battle's smallest paper
const MAX_ITEMS = 100; // one PRC subject paper

const questionIds = z.array(z.string().trim().min(1).max(100))
    .min(MIN_ITEMS, `Pick at least ${MIN_ITEMS} questions.`)
    .max(MAX_ITEMS, `An exam holds up to ${MAX_ITEMS} questions.`)
    .refine((ids) => new Set(ids).size === ids.length, 'A question is in the list twice.');

// An instant from the admin's browser (ISO, with its offset), or none.
const when = z.string().datetime({ offset: true }).nullish().transform((v) => (v ? new Date(v) : null));

const assignedExamSchema = z.object({
    title: z.string().trim().min(1, 'Give the exam a title.').max(120),
    description: z.string().trim().max(500).nullish().transform((v) => v || null),
    questionIds,
    timeLimitSecs: z.coerce.number().int().min(60).max(6 * 3600),
    status: z.enum(['draft', 'published']).default('draft'),
    opensAt: when,
    closesAt: when,
}).strict().refine((e) => !e.opensAt || !e.closesAt || e.closesAt > e.opensAt, {
    message: 'It has to close after it opens.', path: ['closesAt'],
});

// Publish or unpublish, lock or unlock, without resending the questions.
const assignedExamStatusSchema = z.object({
    status: z.enum(['draft', 'published']).optional(),
    locked: z.boolean().optional(),
}).strict().refine((p) => p.status !== undefined || p.locked !== undefined, 'Nothing to change.');

module.exports = { assignedExamSchema, assignedExamStatusSchema, MIN_ITEMS, MAX_ITEMS };
