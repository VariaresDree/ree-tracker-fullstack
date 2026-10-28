const { z } = require('zod');
const { KEY_DATE_LIMITS: LIMITS, keyDateErrors, planPrefsErrors } = require('@ree/shared');

// Key dates (POST/PUT /api/user/key-dates) and the plan preferences
// (PUT /api/user/plan-prefs). The field rules are the shared keyDateErrors and
// planPrefsErrors, the same functions the client runs before a change goes
// into the offline queue, so a queued change can't be rejected on replay.

const optionalText = (max) => z.string().trim().max(max).nullable().optional()
    .transform((v) => (v ? v : null));

const fields = {
    kind: z.string().max(20),
    title: z.string().trim().min(1).max(LIMITS.title),
    startsOn: z.string().max(10),
    endsOn: z.string().max(10).nullable().optional().transform((v) => (v ? v : null)),
    subject: z.string().max(20).nullable().optional().transform((v) => (v ? v : null)),
    topicIds: z.array(z.string().max(LIMITS.topicId)).max(LIMITS.topics).nullable().optional()
        .transform((v) => [...new Set(v || [])]),
    note: optionalText(LIMITS.note),
};

const issues = (rule) => (value, ctx) => {
    for (const [path, message] of Object.entries(rule(value))) ctx.addIssue({ code: 'custom', path: [path], message });
};

// The id is generated on the device (crypto.randomUUID).
const keyDateCreateSchema = z.object({ id: z.string().uuid(), ...fields }).strip().superRefine(issues(keyDateErrors));

// PUT is a full replace of the editable fields.
const keyDateUpdateSchema = z.object(fields).strip().superRefine(issues(keyDateErrors));

// Both fields every time: a queued change replaces an older queued one.
const planPrefsSchema = z.object({
    restWeekdays: z.array(z.number().int()).max(7),
    reviewMode: z.string().max(10),
}).strip().superRefine(issues(planPrefsErrors));

module.exports = { keyDateCreateSchema, keyDateUpdateSchema, planPrefsSchema };
