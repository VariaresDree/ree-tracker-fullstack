const { z } = require('zod');
const {
    OUTSIDE_SCORE_LIMITS: LIMITS, normalizeOutsideSubject, outsideScoreErrors, todayManila, dayAfter,
} = require('@ree/shared');

// Outside scores (POST/PUT /api/user/outside-scores). The field rules are the
// shared outsideScoreErrors, the same function the client runs before an entry
// goes into the offline queue, so a queued entry can't be rejected on replay.
// "Not in the future" allows one day ahead of the server's Manila day: a
// device clock a little fast just after midnight is not an error.

const optionalText = (max) => z.string().trim().max(max).nullable().optional()
    .transform((v) => (v ? v : null));

const fields = {
    title: z.string().trim().min(1).max(LIMITS.title),
    source: optionalText(LIMITS.source),
    takenOn: z.string().max(10),
    // Any common spelling; outsideScoreErrors rejects what doesn't normalise.
    subject: z.string().max(60).transform(normalizeOutsideSubject),
    score: z.number(),
    total: z.number(),
    note: optionalText(LIMITS.note),
    retestOfId: z.string().uuid().nullable().optional().transform((v) => v ?? null),
    // The assessment log's fields. A bare .nullable().optional(): a key left
    // out stays undefined (the route then keeps the stored value, so an older
    // app's edit or a write queued before these existed can't wipe them), and
    // an explicit null clears it. Never a helper that maps undefined to null.
    parts: z.array(z.object({
        subject: z.string().max(20),
        score: z.number(),
        total: z.number(),
    }).strip()).max(3).nullable().optional(),
    minutesUsed: z.number().int().nullable().optional(),
    guessed: z.number().int().nullable().optional(),
    skipped: z.number().int().nullable().optional(),
    improveTopicIds: z.array(z.string().max(LIMITS.topicId)).max(LIMITS.maxTopics).nullable().optional(),
};

const checkEntry = (entry, ctx) => {
    for (const [path, message] of Object.entries(outsideScoreErrors(entry, dayAfter(todayManila())))) {
        ctx.addIssue({ code: 'custom', path: [path], message });
    }
};

// The id is generated on the device (crypto.randomUUID), so an entry created
// offline and edited or deleted offline is one row when the queue replays.
const outsideScoreCreateSchema = z.object({ id: z.string().uuid(), ...fields }).strip().superRefine(checkEntry);

// PUT is a full replace of the editable fields.
const outsideScoreUpdateSchema = z.object(fields).strip().superRefine(checkEntry);

module.exports = { outsideScoreCreateSchema, outsideScoreUpdateSchema };
