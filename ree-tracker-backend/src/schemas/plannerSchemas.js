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

module.exports = { plannerTaskCreateSchema, plannerTaskUpdateSchema };
