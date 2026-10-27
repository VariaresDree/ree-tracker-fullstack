const { z } = require('zod');
const {
    PAPER_SET_LIMITS: L, PRINT_ID_RE, ANSWER_RE, PAPER_PROFILES, PAPER_KINDS, itemEditErrors,
} = require('@ree/shared');

// Printed paper sets and their scanned answer sheets
// (/api/user/printed-sets, routes/printedSetRoutes.js).
//
// A set is drawn on the device (drawExamPaper) and sent whole, once; after
// that only its edits, print preferences and "printed" flag change. The edit
// rules are the shared itemEditErrors, the same function the editor runs
// before an edit goes into the offline queue, so a queued edit can't be
// refused on replay. The key version and every score are the server's, never
// the client's: keyVersion is not even accepted here.

const SUBJECTS = ['Mathematics', 'ESAS', 'EE'];
const CODES = ['EE', 'ESAS', 'MATH', 'BLENDED'];
const KINDS = ['subject', 'blended'];

const nullableText = (max) => z.string().max(max).nullable().optional().transform((v) => v ?? null);
const count = (max) => z.number().int().min(0).max(max);

// "1".."150": an item number as an edits key.
const editKey = z.string().regex(/^[1-9][0-9]{0,2}$/, 'An edit names an item by its number.');

// --- The set as drawn ---------------------------------------------------------

// One question as drawn: its options in the order printed, and the index of
// the key among them (-1 when the stored answer matched none of them).
const itemSchema = z.object({
    n: z.number().int().min(1).max(L.items),
    id: z.union([z.string().max(200), z.number()]).nullable().optional().transform((v) => v ?? null),
    subject: z.enum(SUBJECTS),
    subtopic: nullableText(200),
    difficulty: z.union([z.number(), z.string().max(40)]).nullable().optional().transform((v) => v ?? null),
    type: nullableText(80),
    text: z.string().max(L.stem),
    options: z.array(z.string().max(L.option)).min(2).max(L.options),
    answer: z.string().max(L.stem).nullable().optional().transform((v) => v ?? ''),
    answerIndex: z.number().int().min(-1).max(L.options - 1),
    explanation: nullableText(L.explanation),
    figure: z.boolean().optional().default(false),
}).strip().refine((it) => it.answerIndex < it.options.length, {
    path: ['answerIndex'], message: 'The key names an option the question doesn’t have.',
});

// Part I, II, III of the paper: items from..to.
const sectionSchema = z.object({
    subject: z.enum(SUBJECTS),
    title: z.string().max(L.title),
    from: z.number().int().min(1).max(L.items),
    to: z.number().int().min(1).max(L.items),
    requested: count(1000).optional(),
    drawn: count(L.items).optional(),
}).strip();

// resolveExportPlan's output, which the print page and the .tex read back.
const planSchema = z.object({
    kind: z.enum(KINDS),
    profile: z.enum(PAPER_PROFILES),
    code: z.enum(CODES),
    title: z.string().max(L.title),
    topic: nullableText(200),
    sections: z.array(z.object({
        subject: z.enum(SUBJECTS),
        title: z.string().max(L.title),
        count: count(1000),
        subtopic: z.string().max(200).optional(),
    }).strip()).min(1).max(3),
    cognitiveFocus: z.string().max(40).optional(),
    totalCount: count(1000),
    timeAllotmentMins: z.number().min(0).max(24 * 60),
}).strip();

// The setup screen's config, kept only so "Draw a new set" can draw again.
// The server never reads it, so a field of the wrong type is dropped rather
// than refusing the whole set; anything else the screen holds is stripped.
const loose = (schema) => schema.optional().catch(undefined);
const configSchema = z.object({
    mode: loose(z.string().max(40)),
    subject: loose(z.string().max(120)),
    subtopic: loose(z.string().max(200)),
    count: loose(z.number().int().min(1).max(1000)),
    isPrcStandard: loose(z.boolean()),
    source: loose(z.string().max(40)),
    timeLimitMins: loose(z.number().min(0).max(24 * 60)),
    cognitiveFocus: loose(z.string().max(40)),
}).strip().transform((c) => Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined)));

const warningsSchema = z.object({
    unmatched: z.array(z.number().int().min(1).max(L.items)).max(L.items).default([]),
    shortfall: z.array(z.object({
        subject: z.enum(SUBJECTS),
        requested: count(1000),
        drawn: count(L.items),
    }).strip()).max(3).default([]),
    focusFallback: z.boolean().default(false),
}).strip();

// What prints: the paper size, which documents, and the worked solutions.
const prefsSchema = z.object({
    paper: z.enum(PAPER_KINDS),
    docs: z.object({ paper: z.boolean(), sheet: z.boolean(), key: z.boolean() }).strip(),
    solutions: z.boolean(),
}).strip();

// --- Edits -------------------------------------------------------------------

// One item's edit, laid over the drawn item (@ree/shared effectiveItems). New
// options must name the answer among them; a missing explanation keeps the
// bank's, null removes it.
const itemEditSchema = z.object({
    text: z.string().max(L.stem).optional(),
    options: z.array(z.string().trim().min(1, 'Fill in every option, or remove it.').max(L.option))
        .min(2).max(L.options).optional(),
    answerIndex: z.number().int().min(0).max(L.options - 1).optional(),
    explanation: z.string().max(L.explanation).nullable().optional(),
}).strip().superRefine((edit, ctx) => {
    for (const [path, message] of Object.entries(itemEditErrors(edit))) {
        ctx.addIssue({ code: 'custom', path: [path], message });
    }
});

/**
 * What's wrong with these edits against these items, as { "<n>": message },
 * or null. The shared rules can't see the drawn item, so the item-dependent
 * checks live here: the item exists, and an answer chosen without new options
 * is one of the item's own.
 */
function editsAgainstItems(items, edits) {
    const problems = {};
    for (const [key, edit] of Object.entries(edits || {})) {
        if (!edit) continue;
        const item = items[Number(key) - 1];
        if (!item) { problems[key] = `There is no item ${key} on this paper.`; continue; }
        if (!Array.isArray(edit.options) && Number.isInteger(edit.answerIndex)
            && edit.answerIndex >= (item.options || []).length) {
            problems[key] = `Item ${key} has no option ${String.fromCharCode(65 + edit.answerIndex)}.`;
        }
    }
    return Object.keys(problems).length ? problems : null;
}

/** An edit that changes nothing is no edit: dropped, so the item isn't shown as edited. */
const isEmptyEdit = (edit) => !edit || Object.keys(edit).length === 0;

// --- POST /printed-sets ----------------------------------------------------------

const printedSetCreateSchema = z.object({
    id: z.string().regex(PRINT_ID_RE, 'A set code is 12 letters and digits.'),
    contentId: z.string().min(1).max(64),
    label: z.string().trim().min(1).max(40),
    title: z.string().trim().min(1).max(L.title),
    code: z.enum(CODES),
    profile: z.enum(PAPER_PROFILES),
    sittingKey: z.string().min(1).max(200),
    generatedAt: z.string().datetime({ offset: true }),
    config: configSchema,
    plan: planSchema,
    sections: z.array(sectionSchema).min(1).max(3),
    items: z.array(itemSchema).min(1).max(L.items),
    edits: z.record(editKey, itemEditSchema).default({})
        .transform((edits) => Object.fromEntries(Object.entries(edits).filter(([, e]) => !isEmptyEdit(e)))),
    prefs: prefsSchema,
    warnings: warningsSchema.nullable().optional(),
}).strip().superRefine((body, ctx) => {
    const N = body.items.length;
    const issue = (path, message) => ctx.addIssue({ code: 'custom', path, message });

    const misnumbered = body.items.findIndex((it, i) => it.n !== i + 1);
    if (misnumbered >= 0) issue(['items'], `Items must be numbered 1 to ${N} in order (item ${misnumbered + 1} isn’t).`);

    // The sections cover 1..N in order, with no gap or overlap, and each item
    // belongs to its section's subject (the per-subject scores read them).
    let next = 1;
    for (const s of body.sections) {
        if (s.from !== next || s.to < s.from) { issue(['sections'], `The parts must cover items 1 to ${N} in order.`); next = -1; break; }
        next = s.to + 1;
    }
    if (next !== -1 && next !== N + 1) issue(['sections'], `The parts must cover items 1 to ${N} in order.`);
    if (next === N + 1 && misnumbered < 0) {
        const off = body.sections.find((s) => body.items.slice(s.from - 1, s.to).some((it) => it.subject !== s.subject));
        if (off) issue(['sections'], `Items ${off.from} to ${off.to} aren’t all ${off.subject}.`);
    }

    const problems = editsAgainstItems(body.items, body.edits);
    if (problems) issue(['edits'], Object.values(problems)[0]);

    if (JSON.stringify(body).length > L.bytes) issue(['items'], 'This paper is too large to save. Print fewer items.');
});

// --- PATCH /printed-sets/:id -----------------------------------------------------

// Edits are merged per item (an item's edit is replaced whole; null reverts
// it to the bank's wording), prefs are replaced, and printed sets printedAt
// the first time only.
const printedSetPatchSchema = z.object({
    edits: z.record(editKey, itemEditSchema.nullable()).optional(),
    prefs: prefsSchema.optional(),
    printed: z.literal(true).optional(),
}).strip().refine((b) => b.edits !== undefined || b.prefs !== undefined || b.printed !== undefined, {
    message: 'Nothing to change.',
});

// --- Sheets ----------------------------------------------------------------------

const reviewSchema = z.object({
    corrected: z.array(z.number().int().min(1).max(L.items)).max(L.items).default([]),
    unsure: z.array(z.number().int().min(1).max(L.items)).max(L.items).default([]),
}).strip();

const answersSchema = z.string().min(1).max(L.items).regex(ANSWER_RE, 'Answers are A to F, - for blank or * for two marks.');

// Blank is no name; absent (PATCH) is "unchanged".
const takerNameSchema = z.string().trim().max(L.takerName).nullable().optional()
    .transform((v) => (v === undefined ? undefined : (v || null)));

const NAME_REQUIRED = 'Write the taker’s name.';

// POST /printed-sets/:id/sheets. Any score the client sends is stripped: the
// server scores the answers against the set's current key.
const sheetCreateSchema = z.object({
    id: z.string().uuid(),
    takerName: takerNameSchema,
    isSelf: z.boolean().default(false),
    answers: answersSchema,
    scannedAt: z.string().datetime({ offset: true }),
    review: reviewSchema.nullable().optional(),
    outsideScoreId: z.string().uuid().nullable().optional().transform((v) => v ?? null),
}).strip().superRefine((b, ctx) => {
    if (!b.isSelf && !b.takerName) ctx.addIssue({ code: 'custom', path: ['takerName'], message: NAME_REQUIRED });
});

// PATCH /printed-sets/:id/sheets/:sheetId: rename, correct the answers, link
// the self-check's history entry, or record the corrected rows. Re-scored.
const sheetPatchSchema = z.object({
    takerName: takerNameSchema,
    answers: answersSchema.optional(),
    outsideScoreId: z.string().uuid().nullable().optional(),
    review: reviewSchema.nullable().optional(),
}).strip().refine((b) => Object.values(b).some((v) => v !== undefined), { message: 'Nothing to change.' });

module.exports = {
    printedSetCreateSchema,
    printedSetPatchSchema,
    sheetCreateSchema,
    sheetPatchSchema,
    editsAgainstItems,
    isEmptyEdit,
    NAME_REQUIRED,
};
