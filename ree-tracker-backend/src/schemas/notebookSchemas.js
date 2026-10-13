const { z } = require('zod');
const { MISTAKE_CAUSES, NOTE_MAX } = require('@ree/shared');

// PUT /api/user/mistakes/:questionId — the mistake's tag state (queued
// offline with supersede). `resolved` left out keeps the fixed mark as it
// stands: a cause tagged from a screen that doesn't know the mark (the
// sitting review) must not clear it.
const mistakeTagSchema = z.object({
    cause: z.enum(MISTAKE_CAUSES).nullable(),
    resolved: z.boolean().optional(),
}).strip();

// PUT /api/user/notes/:type/:targetId — the note's whole text; empty deletes it.
const noteSchema = z.object({
    body: z.string().max(NOTE_MAX, `Keep notes under ${NOTE_MAX} characters.`),
}).strip();

module.exports = { mistakeTagSchema, noteSchema };
