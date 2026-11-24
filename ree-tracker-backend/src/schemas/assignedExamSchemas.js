const { z } = require('zod');

// Admin › Assigned exams. The subject isn't sent: the server reads it off the
// questions (services/assignedExams.subjectOf).
// Any size the admin likes, up to a full PRC board's worth (3 × 100), and any
// time up to a day: a 300-item EE paper at the board's pace is 18 hours.
const MIN_ITEMS = 1;
const MAX_ITEMS = 300;
const MAX_SECS = 24 * 3600;
// What kind of set it is, for sorting the admin's and the learners' lists.
const EXAM_KINDS = ['exam', 'quiz', 'problem-set', 'practice-set'];

const questionIds = z.array(z.string().trim().min(1).max(100))
    .min(MIN_ITEMS, 'Pick at least one question.')
    .max(MAX_ITEMS, `An exam holds up to ${MAX_ITEMS} questions.`)
    .refine((ids) => new Set(ids).size === ids.length, 'A question is in the list twice.');

// An instant from the admin's browser (ISO, with its offset), or none.
const when = z.string().datetime({ offset: true }).nullish().transform((v) => (v ? new Date(v) : null));

const assignedExamSchema = z.object({
    title: z.string().trim().min(1, 'Give the exam a title.').max(120),
    description: z.string().trim().max(500).nullish().transform((v) => v || null),
    questionIds,
    timeLimitSecs: z.coerce.number().int().min(60).max(MAX_SECS),
    status: z.enum(['draft', 'published']).default('draft'),
    kind: z.enum(EXAM_KINDS).default('exam'),
    opensAt: when,
    closesAt: when,
}).strict().refine((e) => !e.opensAt || !e.closesAt || e.closesAt > e.opensAt, {
    message: 'It has to close after it opens.', path: ['closesAt'],
});

// Publish or unpublish, lock or unlock, re-sort, without resending the questions.
const assignedExamStatusSchema = z.object({
    status: z.enum(['draft', 'published']).optional(),
    locked: z.boolean().optional(),
    kind: z.enum(EXAM_KINDS).optional(),
}).strict().refine((p) => p.status !== undefined || p.locked !== undefined || p.kind !== undefined, 'Nothing to change.');

module.exports = { assignedExamSchema, assignedExamStatusSchema, MIN_ITEMS, MAX_ITEMS, MAX_SECS, EXAM_KINDS };
