const { z } = require('zod');
const {
    PRACTICE_SET_LIMITS: SETS, USER_LINK_LIMITS: LINKS, practiceSetErrors, userLinkErrors, linkUrl,
} = require('@ree/shared');

// Sets to finish (/api/user/practice-sets) and personal links
// (/api/user/links). The field rules are the shared practiceSetErrors and
// userLinkErrors, the same functions the client runs before a change goes
// into the offline queue, so a queued change can't be rejected on replay.

const nullableText = (max) => z.string().trim().max(max).nullable().optional().transform((v) => (v ? v : null));

const issues = (rule) => (value, ctx) => {
    for (const [path, message] of Object.entries(rule(value))) ctx.addIssue({ code: 'custom', path: [path], message });
};

const setFields = {
    collection: z.string().trim().min(1).max(SETS.collection),
    title: z.string().trim().min(1).max(SETS.title),
    subject: z.string().max(20),
    status: z.string().max(10),
    doneOn: z.string().max(10).nullable().optional().transform((v) => (v ? v : null)),
    // A plain id (the outside score it was logged as); never looked up here.
    outsideScoreId: z.string().max(64).nullable().optional().transform((v) => (v ? v : null)),
    sortOrder: z.number().int().optional().transform((v) => v ?? 0),
};

const practiceSetCreateSchema = z.object({ id: z.string().uuid(), ...setFields }).strip().superRefine(issues(practiceSetErrors));
const practiceSetUpdateSchema = z.object(setFields).strip().superRefine(issues(practiceSetErrors));

// A template's sets, all or none (at most SETS.bulk).
const practiceSetBulkSchema = z.object({
    items: z.array(z.object({ id: z.string().uuid(), ...setFields }).strip().superRefine(issues(practiceSetErrors))).min(1).max(SETS.bulk),
}).strip();

const linkFields = {
    title: z.string().trim().min(1).max(LINKS.title),
    // Stored as the parsed address: "drive.google.com/…" gains its https://.
    url: z.string().trim().max(LINKS.url).transform((v) => linkUrl(v) || v),
    subject: z.string().max(20),
    topicId: z.string().max(LINKS.topicId).nullable().optional().transform((v) => (v ? v : null)),
    pinned: z.boolean().optional().transform((v) => !!v),
    note: nullableText(LINKS.note),
};

const userLinkCreateSchema = z.object({ id: z.string().uuid(), ...linkFields }).strip().superRefine(issues(userLinkErrors));
const userLinkUpdateSchema = z.object(linkFields).strip().superRefine(issues(userLinkErrors));

module.exports = {
    practiceSetCreateSchema, practiceSetUpdateSchema, practiceSetBulkSchema, userLinkCreateSchema, userLinkUpdateSchema,
};
