const { z } = require('zod');

// Planner tasks. `text` was `.trim()`ed in the handler without a type check, so
// a non-string body (e.g. { text: 123 }) threw a TypeError → 500. Trimming in
// the schema also guarantees a non-empty task. dueDate is a nullable String
// column, so it's kept as a bounded optional string.
const plannerTaskCreateSchema = z.object({
    text: z.string().trim().min(1).max(500),
    dueDate: z.string().max(40).nullable().optional(),
}).strip();

const plannerTaskUpdateSchema = z.object({
    text: z.string().trim().min(1).max(500).optional(),
    dueDate: z.string().max(40).nullable().optional(),
    completed: z.boolean().optional(),
}).strip();

// generate-plan was the ONLY route in this file with no validation, and it is
// the one that drives an unbounded write: `examDate` fed straight into
// `new Date()` and `topics` had only a truthiness/array check, so a far-future
// date plus a large topics array produced a single createMany of tens of
// thousands of rows — repeatable, with no idempotency guard. An unparseable
// date was worse than an error: `new Date('nonsense')` is Invalid Date, so
// totalDays became NaN, `Math.min(NaN, n)` is NaN, the loop body never ran, and
// the endpoint returned 201 { tasksCreated: 0, totalDays: null } as if it had
// succeeded.
//
// The bounds below are generous relative to a real study plan (a PRC candidate
// preparing over a year, across every subtopic in the syllabus) and small
// enough that the worst case is a few hundred rows.
const plannerGenerateSchema = z.object({
    // ISO calendar date. Refined rather than merely length-capped so an
    // unparseable value is a 400, not a silent no-op.
    examDate: z.string().min(8).max(40).refine(
        (v) => !Number.isNaN(new Date(v).getTime()),
        { message: 'examDate must be a parseable date' },
    ),
    topics: z.array(z.object({
        subject: z.string().trim().min(1).max(120),
        subtopic: z.string().trim().min(1).max(160),
    })).min(1).max(400),
}).strip();

module.exports = { plannerTaskCreateSchema, plannerTaskUpdateSchema, plannerGenerateSchema };
