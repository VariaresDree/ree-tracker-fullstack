const { z } = require('zod');
const { MISTAKE_CAUSES, NOTE_MAX } = require('@ree/shared');

// PUT /api/user/mistakes/:questionId — the mistake's FULL tag state (queued
// offline with supersede, so each write carries everything).
const mistakeTagSchema = z.object({
    cause: z.enum(MISTAKE_CAUSES).nullable(),
    resolved: z.boolean(),
}).strip();

// PUT /api/user/notes/:type/:targetId — the note's whole text; empty deletes it.
const noteSchema = z.object({
    body: z.string().max(NOTE_MAX, `Keep notes under ${NOTE_MAX} characters.`),
}).strip();

module.exports = { mistakeTagSchema, noteSchema };
