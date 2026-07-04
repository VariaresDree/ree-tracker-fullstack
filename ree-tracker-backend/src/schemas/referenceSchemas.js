const { z } = require('zod');

// Admin-managed reference library validation. Kept intentionally permissive on
// text fields (values/equations are LaTeX strings), with the natural-key fields
// required so the DB unique constraints (category+name / subject+title) hold.

const constantCreateSchema = z.object({
    category: z.string().min(1),
    name: z.string().min(1),
    value: z.string().min(1),
    keyword: z.string().nullable().optional(),
    subject: z.string().nullable().optional(),
});
const constantUpdateSchema = constantCreateSchema.partial();

const formulaCreateSchema = z.object({
    subject: z.string().min(1),
    title: z.string().min(1),
    eq: z.string().min(1),
    subtopics: z.array(z.string()).optional().default([]),
});
const formulaUpdateSchema = formulaCreateSchema.partial();

// Bulk import — used by the admin "seed bundled library into DB" action so the
// hardcoded lists become fully editable. Best-effort (skipDuplicates on write).
const importSchema = z.object({
    constants: z.array(constantCreateSchema).optional().default([]),
    formulas: z.array(formulaCreateSchema).optional().default([]),
});

module.exports = {
    constantCreateSchema,
    constantUpdateSchema,
    formulaCreateSchema,
    formulaUpdateSchema,
    importSchema,
};
