const { z } = require('zod');
const { CANONICAL_SUBJECTS } = require('@ree/shared');

const name = z.string().trim().min(1).max(120);
const subject = z.enum(CANONICAL_SUBJECTS).nullable();
const description = z.string().trim().max(300).nullable();

// What the admin's browser read from the file. An upload's body is the file
// itself, so these come in the query string.
const fileFields = {
    fileName: z.string().trim().max(200).regex(/\.(quiz|caq)$/i),
    questionCount: z.coerce.number().int().min(1).max(100000),
    skippedCount: z.coerce.number().int().min(0).max(100000).default(0),
};

const quizFileCreateSchema = z.object({
    ...fileFields,
    name,
    subject: subject.optional().default(null),
    description: z.string().trim().max(300).optional().transform((v) => v || null),
});

const quizFileReplaceSchema = z.object(fileFields);

const quizFileUpdateSchema = z.object({
    name: name.optional(),
    subject: subject.optional(),
    description: description.optional().transform((v) => (v === undefined ? undefined : v || null)),
}).strict();

module.exports = { quizFileCreateSchema, quizFileReplaceSchema, quizFileUpdateSchema };
