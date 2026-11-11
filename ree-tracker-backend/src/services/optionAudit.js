// src/services/optionAudit.js
//
// Where the key sits across the live bank, for Admin › Question bank's
// "Answer positions" card (GET /api/questions/option-audit). Learners see a
// per-sitting order everywhere now (@ree/shared optionOrder), and new
// questions are stored shuffled (reviewService.storageOrder); this shows
// whether the stored bank still leans, and lists the rows an admin should fix:
//   • keys that aren't one of their options: ungradable (a bare letter, a
//     typo), since grading compares the option's text. One that matches an
//     option up to form (no `$`, a dropped full stop: @ree/shared
//     matchOption) is listed as a fix, applied by fixKeys;
//   • explanations that name an option by letter ("option B is wrong"),
//     which stop making sense once the options are shuffled;
//   • questions whose options name others by letter ("Both A and B"), which
//     keep their stored order and so aren't shuffled at all;
//   • math that won't render: a stray `$` in the text, an option or the
//     explanation leaves the rest of it as raw LaTeX;
//   • two identical options, where a learner can't tell which is meant.
// Existing rows are never reordered here: rewording comes first.

'use strict';

const prisma = require('../config/db');
const { answerPositions, isLetterReference, matchOption, hasUnbalancedMath } = require('@ree/shared');
const { buildVersionSnapshot } = require('./reviewService');
const questionBankCache = require('./questionBankCache');

const SAMPLE = 20;
// "option B", "choice (C)", "letter D", "the answer is A". Units in brackets
// ("5 (A)") and bare letters are left alone: too many false alarms.
const LETTER_IN_TEXT = [
    /\b(?:[Oo]ption|[Cc]hoice|[Ll]etter)\s*\(?[A-F]\)?(?![A-Za-z0-9])/,
    /\b[Aa]nswer\s+is\s+\(?[A-F]\)?(?![A-Za-z0-9])/,
];

/** Pure: does this explanation name an option by its letter? */
const namesOptionByLetter = (text) => typeof text === 'string' && LETTER_IN_TEXT.some((re) => re.test(text));

/** Percent of the rows whose key is among their options, at each place. */
function sharesOf(positions) {
    const placed = positions.A + positions.B + positions.C + positions.D + positions.other;
    const share = (n) => (placed > 0 ? Math.round((n / placed) * 1000) / 10 : 0);
    return { A: share(positions.A), B: share(positions.B), C: share(positions.C), D: share(positions.D), other: share(positions.other) };
}

/** Pure: the audit of a set of rows ({ id, options, answer, fixedExplanation }). */
function auditOptions(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const positions = answerPositions(list);
    const missing = [];
    const keyFixes = [];
    const fixedOrder = [];
    const letterInExplanation = [];
    let letterInExplanationCount = 0;
    const brokenMath = [];
    let brokenMathCount = 0;
    const duplicateOptions = [];
    let duplicateOptionsCount = 0;
    for (const q of list) {
        const options = Array.isArray(q.options) ? q.options : [];
        if (!options.includes(q.answer)) {
            if (missing.length < SAMPLE) missing.push(q.id);
            const to = matchOption(q.answer, options);
            if (to !== null && keyFixes.length < SAMPLE) keyFixes.push({ id: q.id, from: q.answer, to });
        }
        if (options.some(isLetterReference) && fixedOrder.length < SAMPLE) fixedOrder.push(q.id);
        if ([q.text, q.fixedExplanation, ...options].some(hasUnbalancedMath)) {
            brokenMathCount += 1;
            if (brokenMath.length < SAMPLE) brokenMath.push(q.id);
        }
        const forms = options.map((o) => (typeof o === 'string' ? o.replace(/\s+/g, ' ').trim() : o));
        if (new Set(forms).size !== forms.length) {
            duplicateOptionsCount += 1;
            if (duplicateOptions.length < SAMPLE) duplicateOptions.push(q.id);
        }
        if (namesOptionByLetter(q.fixedExplanation)) {
            letterInExplanationCount += 1;
            if (letterInExplanation.length < SAMPLE) letterInExplanation.push(q.id);
        }
    }
    return {
        total: list.length,
        positions,
        shares: sharesOf(positions),
        letterInExplanation: letterInExplanationCount,
        brokenMath: brokenMathCount,
        duplicateOptions: duplicateOptionsCount,
        samples: { missing, fixedOrder, letterInExplanation, brokenMath, duplicateOptions },
        // Keys that match an option up to form, with the option they become.
        keyFixes,
    };
}

/**
 * The audit of the live (unflagged) bank. Every row the backend reads from the
 * database counts against the free tier's egress, and reading the whole bank
 * was 16 MB a press (3 GB in four weeks). So Postgres counts the key positions
 * and sends only the rows that could have a problem, and auditOptions judges
 * those. Each SQL test below is exact or looser than its JS rule, never
 * stricter, so no problem row is left behind (tests/integration/
 * optionAudit.dbtest.js checks the two agree):
 *   • key not an option: exact (answer = ANY(options));
 *   • unbalanced math: exact, the same rule (drop each backslash-$, then $,
 *     and count the $ left);
 *   • letter references: an option of only the characters LETTERS_ONLY can
 *     match (A-F, brackets, "& , .", spaces, the letters of both, either,
 *     neither, only, and, or, nor), with a capital A-F;
 *   • two identical options: equal once every space is removed;
 *   • an explanation naming an option: the JS patterns, ignoring case.
 * The space classes list JS's whitespace: [[:space:]] alone misses the
 * no-break and other Unicode spaces.
 */
async function auditLiveBank() {
    const [counts] = await prisma.$queryRaw`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE p = 1)::int AS "A",
               COUNT(*) FILTER (WHERE p = 2)::int AS "B",
               COUNT(*) FILTER (WHERE p = 3)::int AS "C",
               COUNT(*) FILTER (WHERE p = 4)::int AS "D",
               COUNT(*) FILTER (WHERE p > 4)::int AS other,
               COUNT(*) FILTER (WHERE p IS NULL)::int AS missing
        FROM (SELECT array_position("options", "answer") AS p FROM "Question" WHERE "isFlagged" = false) s`;
    const rows = await prisma.$queryRaw`
        SELECT "id", "text", "options", "answer", "fixedExplanation" FROM "Question" q
        WHERE q."isFlagged" = false AND (
            NOT (q."answer" = ANY(q."options"))
            OR EXISTS (SELECT 1 FROM unnest(q."options") o
                       WHERE o ~ '[A-F]' AND o ~ '^[A-FHILNORTYabdehilnorty()&,.[:space:]\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]*$')
            OR EXISTS (SELECT 1 FROM unnest(q."options" || ARRAY[q."text", COALESCE(q."fixedExplanation", '')]) x,
                       LATERAL (SELECT replace(replace(x, '\\$', ''), '$$', '') AS m) d
                       WHERE (length(d.m) - length(replace(d.m, '$', ''))) % 2 = 1)
            OR (SELECT COUNT(*) <> COUNT(DISTINCT regexp_replace(o, '[[:space:]\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]', '', 'g'))
                FROM unnest(q."options") o)
            OR COALESCE(q."fixedExplanation", '') ~* '(option|choice|letter)[[:space:]\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]*\\(?[a-f]\\)?([^a-z0-9]|$)'
            OR COALESCE(q."fixedExplanation", '') ~* 'answer[[:space:]\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]+is[[:space:]\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]+\\(?[a-f]\\)?([^a-z0-9]|$)'
        )`;
    const audit = auditOptions(rows);
    const positions = { A: counts.A, B: counts.B, C: counts.C, D: counts.D, other: counts.other, missing: counts.missing, fixedOrder: audit.positions.fixedOrder };
    return { ...audit, total: counts.total, positions, shares: sharesOf(positions), checkedAt: new Date().toISOString() };
}

/**
 * Set each listed question's key to the option it matches up to form, with a
 * LIVE_EDIT version of the row before, like any edit. A row whose key already
 * is an option, or matches none (or two), is left alone and reported.
 * @returns {{ fixed: string[], skipped: { id: string, reason: string }[] }}
 */
async function fixKeys(ids, editor) {
    const rows = await prisma.question.findMany({ where: { id: { in: ids } } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const fixed = [];
    const skipped = [];
    for (const id of ids) {
        const row = byId.get(id);
        if (!row) { skipped.push({ id, reason: 'not-found' }); continue; }
        const options = Array.isArray(row.options) ? row.options : [];
        if (options.includes(row.answer)) { skipped.push({ id, reason: 'already-an-option' }); continue; }
        const to = matchOption(row.answer, options);
        if (to === null) { skipped.push({ id, reason: 'no-single-match' }); continue; }
        await prisma.$transaction([
            prisma.question.update({ where: { id }, data: { answer: to } }),
            prisma.questionVersion.create({
                data: { questionId: id, action: 'LIVE_EDIT', editor: editor || null, snapshot: buildVersionSnapshot(row) },
            }),
        ]);
        fixed.push(id);
    }
    if (fixed.length) questionBankCache.invalidateAll();
    return { fixed, skipped };
}

module.exports = { auditOptions, auditLiveBank, fixKeys, namesOptionByLetter };
