const { z } = require('zod');
const { SYLLABUS_NOTE_MAX, syllabusProgressErrors } = require('@ree/shared');

// PUT /api/user/syllabus/:topicId — one topic's FULL checklist state. Full
// state, not a patch: the client queues these offline and a newer one
// replaces an older one for the same topic (queuePendingWrite supersede),
// which is only safe when each carries everything. The field rules are the
// shared syllabusProgressErrors, the same function the client runs.
const day = z.string().max(10).nullable().optional().transform((v) => v || null);

const syllabusProgressSchema = z.object({
    read: z.boolean(),
    watched: z.boolean(),
    drilled: z.boolean(),
    startedOn: day,
    finishedOn: day,
    note: z.string().max(SYLLABUS_NOTE_MAX).nullable().optional().transform((v) => (v && v.trim() ? v.trim() : null)),
    // The learner's own rating (CELE round). A bare .nullable().optional():
    // a key left out stays undefined and the route keeps the stored value, so
    // an older app's tick, or one queued before these existed, can't wipe it;
    // an explicit null clears it.
    confidence: z.number().int().nullable().optional(),
    dread: z.number().int().nullable().optional(),
}).strip().superRefine((state, ctx) => {
    for (const [path, message] of Object.entries(syllabusProgressErrors(state))) {
        ctx.addIssue({ code: 'custom', path: [path], message });
    }
});

module.exports = { syllabusProgressSchema };
