const { z } = require('zod');
const { SUBTOPIC_LIMITS: LIMITS, userSubtopicErrors } = require('@ree/shared');

// One learner's row (/api/user/syllabus-subtopics) and the suggested list
// (/api/admin/subtopics). The learner's field rules are the shared
// userSubtopicErrors, which the client also runs before a change goes into the
// offline queue, so a queued change can't be rejected on replay.

const nullableText = (max) => z.string().trim().max(max).nullable().optional().transform((v) => (v ? v : null));

const fields = {
    topicId: z.string().min(1).max(64),
    subtopicId: z.string().max(64).nullable().optional().transform((v) => (v ? v : null)),
    name: nullableText(LIMITS.name),
    hidden: z.boolean().optional().transform((v) => !!v),
    done: z.boolean().optional().transform((v) => !!v),
    doneOn: z.string().max(10).nullable().optional().transform((v) => (v ? v : null)),
    sortOrder: z.number().int().nullable().optional().transform((v) => v ?? null),
};

const issues = (value, ctx) => {
    for (const [path, message] of Object.entries(userSubtopicErrors(value))) ctx.addIssue({ code: 'custom', path: [path], message });
};

const userSubtopicSchema = z.object(fields).strip().superRefine(issues);

const userSubtopicBulkSchema = z.object({
    items: z.array(z.object({ id: z.string().min(1).max(64), ...fields }).strip().superRefine(issues)).min(1).max(LIMITS.bulk),
}).strip();

const name = z.string().trim().min(1).max(LIMITS.name);

const adminAddSchema = z.object({
    topicId: z.string().min(1).max(64),
    names: z.array(name).min(1).max(LIMITS.bulk),
}).strip();

const adminUpdateSchema = z.object({
    name: name.optional(),
    active: z.boolean().optional(),
}).strip().refine((b) => b.name !== undefined || b.active !== undefined, { message: 'Nothing to change.' });

const adminReorderSchema = z.object({
    topicId: z.string().min(1).max(64),
    ids: z.array(z.string().min(1).max(64)).min(1).max(LIMITS.bulk),
}).strip();

module.exports = { userSubtopicSchema, userSubtopicBulkSchema, adminAddSchema, adminUpdateSchema, adminReorderSchema };
