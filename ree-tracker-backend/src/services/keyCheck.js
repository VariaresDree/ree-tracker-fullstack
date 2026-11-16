// src/services/keyCheck.js
//
// Admin › Question bank › Fix › Questions to check (2026-11-16): signs that a
// live question's key is wrong, found by engine/keyCheck.js, kept as
// QuestionCheck rows, and settled in one tap each. Every question had been
// through "Fix questions with another AI", yet two EE keys were still wrong
// while their own explanations worked out the right option.
//
// A scan reads only what the checks need (the key, the options, the
// explanation's answer line and an md5 of the question, made in Postgres),
// about 5 MB for the whole bank: egress is the free tier's binding limit.

'use strict';

const prisma = require('../config/db');
const logger = require('../utils/logger');
const { questionContentHash } = require('@ree/shared');
const { findIssues, learnersChoseOther, MIN_LEARNERS } = require('../engine/keyCheck');
const { withJobRun } = require('./jobRuns');
const questionReplace = require('./questionReplace');

const JOB = 'key-check';
const PAGE = 1000;
const LIST_MAX = 50;
const ALREADY = 'Someone has already settled this one.';
// Strongest sign first: the explanation itself disagrees with the key.
const ORDER = ['explanation-names-other', 'learners-chose-other', 'duplicate-options'];
const KEY_REASONS = ['explanation-names-other', 'learners-chose-other'];
// The explanation's answer line, as engine/keyCheck.answerLine reads it.
const LINE_RE = '\\*\\*Answer:?\\*\\*:?([^\\n]*)';

/** One page of the live bank, by id, as the checks need it. */
function scanPage(afterId) {
    return prisma.$queryRaw`
        SELECT "id", "answer", "options",
               substring("fixedExplanation" from ${LINE_RE}) AS "line",
               md5(coalesce("text", '') || chr(31) || array_to_string("options", chr(31)) || chr(31)
                   || coalesce("answer", '') || chr(31) || coalesce("fixedExplanation", '')) AS "hash"
        FROM "Question"
        WHERE NOT "isFlagged" AND "id" > ${afterId}
        ORDER BY "id"
        LIMIT ${PAGE}`;
}

/**
 * Who picked what, per question, by learners (not answers), for questions with
 * at least MIN_LEARNERS learners, or for the given ids.
 */
function learnerPicks(ids = null) {
    return ids
        ? prisma.$queryRaw`
            SELECT a."questionId", a."selectedAnswer" AS "option", COUNT(DISTINCT a."userId")::int AS "learners",
                   bool_or(a."selectedAnswer" = q."answer") AS "isKey"
            FROM "QuestionAttempt" a JOIN "Question" q ON q."id" = a."questionId"
            WHERE a."questionId" = ANY(${ids}::text[]) AND a."selectedAnswer" IS NOT NULL AND btrim(a."selectedAnswer") <> ''
            GROUP BY a."questionId", a."selectedAnswer"`
        : prisma.$queryRaw`
            SELECT a."questionId", a."selectedAnswer" AS "option", COUNT(DISTINCT a."userId")::int AS "learners",
                   bool_or(a."selectedAnswer" = q."answer") AS "isKey"
            FROM "QuestionAttempt" a JOIN "Question" q ON q."id" = a."questionId"
            WHERE NOT q."isFlagged" AND a."selectedAnswer" IS NOT NULL AND btrim(a."selectedAnswer") <> ''
              AND a."questionId" IN (
                  SELECT "questionId" FROM "QuestionAttempt" WHERE "selectedAnswer" IS NOT NULL
                  GROUP BY "questionId" HAVING COUNT(DISTINCT "userId") >= ${MIN_LEARNERS})
            GROUP BY a."questionId", a."selectedAnswer"`;
}

const groupBy = (rows, key) => {
    const out = new Map();
    for (const r of rows) {
        if (!out.has(r[key])) out.set(r[key], []);
        out.get(r[key]).push(r);
    }
    return out;
};

let running = false;

/**
 * Checks the whole live bank and keeps the findings. A finding the admin
 * settled stays settled while the question is unchanged; one that no longer
 * shows (fixed some other way) is closed as "gone".
 * { scanned, open, added, reopened, gone } or { skipped: 'running' }.
 */
async function scanBank() {
    if (running) return { skipped: 'running' };
    running = true;
    try {
        return await withJobRun(JOB, async () => {
            const found = new Map(); // `${questionId}|${reason}` → { questionId, reason, detail, hash }
            const hashOf = new Map();
            let scanned = 0;
            let after = '';
            for (;;) {
                const rows = await scanPage(after);
                for (const r of rows) {
                    hashOf.set(r.id, r.hash);
                    const issues = findIssues({ answer: r.answer, options: r.options, fixedExplanation: r.line ? `**Answer:** ${r.line}` : null });
                    for (const i of issues) found.set(`${r.id}|${i.reason}`, { questionId: r.id, ...i, hash: r.hash });
                }
                scanned += rows.length;
                if (rows.length < PAGE) break;
                after = rows[rows.length - 1].id;
            }
            for (const [questionId, picks] of groupBy(await learnerPicks(), 'questionId')) {
                const crowd = learnersChoseOther(picks);
                if (crowd && hashOf.has(questionId)) {
                    found.set(`${questionId}|learners-chose-other`, { questionId, reason: 'learners-chose-other', detail: crowd, hash: hashOf.get(questionId) });
                }
            }

            const existing = await prisma.questionCheck.findMany({
                select: { id: true, questionId: true, reason: true, contentHash: true, resolvedAt: true },
            });
            const byKey = new Map(existing.map((e) => [`${e.questionId}|${e.reason}`, e]));
            const fresh = [];
            let reopened = 0;
            for (const [key, f] of found) {
                const ex = byKey.get(key);
                if (!ex) { fresh.push(f); continue; }
                // Settled, and the question is as it was then: leave it settled.
                if (ex.resolvedAt && ex.contentHash === f.hash) continue;
                // Open and unchanged: nothing to write. Learners' counts move, so those are; and a
                // duplicate found before 2026-11-16 gets which two options it is.
                if (!ex.resolvedAt && ex.contentHash === f.hash && f.reason === 'explanation-names-other') continue;
                if (ex.resolvedAt) reopened += 1;
                await prisma.questionCheck.update({
                    where: { id: ex.id },
                    data: { detail: f.detail ?? undefined, contentHash: f.hash, resolvedAt: null, resolution: null, resolvedBy: null },
                });
            }
            if (fresh.length) {
                await prisma.questionCheck.createMany({
                    data: fresh.map((f) => ({ questionId: f.questionId, reason: f.reason, detail: f.detail ?? undefined, contentHash: f.hash })),
                    skipDuplicates: true,
                });
            }
            const goneIds = existing.filter((e) => !e.resolvedAt && !found.has(`${e.questionId}|${e.reason}`)).map((e) => e.id);
            if (goneIds.length) {
                await prisma.questionCheck.updateMany({ where: { id: { in: goneIds } }, data: { resolvedAt: new Date(), resolution: 'gone' } });
            }
            const open = await prisma.questionCheck.count({ where: { resolvedAt: null } });
            return { scanned, open, added: fresh.length, reopened, gone: goneIds.length };
        });
    } finally {
        running = false;
    }
}

/** The open findings, strongest first, each with its question and learners' picks. */
async function openChecks() {
    const [rows, lastScan] = await Promise.all([
        prisma.questionCheck.findMany({
            where: { resolvedAt: null, question: { isFlagged: false } },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true, reason: true, detail: true, createdAt: true,
                question: { select: { id: true, subject: true, subtopic: true, text: true, options: true, answer: true, fixedExplanation: true } },
            },
        }),
        prisma.jobRun.findFirst({ where: { job: JOB }, orderBy: { startedAt: 'desc' }, select: { startedAt: true, ok: true, summary: true } }),
    ]);
    const byReason = Object.fromEntries(ORDER.map((r) => [r, rows.filter((x) => x.reason === r).length]));
    const shown = [...rows]
        .sort((a, b) => ORDER.indexOf(a.reason) - ORDER.indexOf(b.reason))
        .slice(0, LIST_MAX);
    const picks = shown.length ? groupBy(await learnerPicks([...new Set(shown.map((s) => s.question.id))]), 'questionId') : new Map();
    return {
        total: rows.length,
        byReason,
        lastScan,
        items: shown.map((s) => ({
            ...s,
            picks: (picks.get(s.question.id) || []).map(({ option, learners, isKey }) => ({ option, learners, isKey: !!isKey })),
        })),
    };
}

const REFUSED = {
    stale: 'The question changed since it was checked. Check the bank again.',
    'in-battle': "It's in a running battle. Try again when the battle ends.",
    'unbalanced-math': 'Its math has an unbalanced $. Fix it with another AI or the editor.',
    'missing-explanation': 'It has no explanation. Fix it with another AI or the editor.',
};

/**
 * Settles one finding: `keep` (the key is right), `use-option` (make the option
 * the explanation names the key, regrading past answers), `edited` (fixed in the
 * editor; the next scan judges the new version), or `remove` (take the question
 * out of the bank). Closes the question's other open key findings too.
 * { status, error? , ...result }.
 */
async function resolveCheck(checkId, { action, answer }, adminId) {
    const check = await prisma.questionCheck.findUnique({
        where: { id: checkId },
        select: { id: true, reason: true, detail: true, resolvedAt: true, question: { select: { id: true, text: true, options: true, answer: true, fixedExplanation: true, isFlagged: true } } },
    });
    if (!check) return { status: 404, error: 'Not found.' };
    if (check.resolvedAt) return { status: 409, error: ALREADY };
    const q = check.question;
    const close = (resolution, reasons) => prisma.questionCheck.updateMany({
        where: { questionId: q.id, resolvedAt: null, ...(reasons ? { reason: { in: reasons } } : {}) },
        data: { resolvedAt: new Date(), resolution, resolvedBy: adminId },
    });

    if (action === 'keep') {
        const reasons = KEY_REASONS.includes(check.reason) ? KEY_REASONS : [check.reason];
        const { count } = await close('kept', reasons);
        return { status: 200, closed: count };
    }
    // Fixed in the editor: closed for now; the next scan judges the new version.
    if (action === 'edited') {
        const { count } = await close('edited');
        return { status: 200, closed: count };
    }
    if (action === 'remove') {
        await prisma.question.update({ where: { id: q.id }, data: { isFlagged: true } });
        const { count } = await close('removed');
        return { status: 200, closed: count };
    }
    // use-option; with no answer given, the option its explanation works out.
    if (answer === undefined && check.reason === 'explanation-names-other') answer = check.detail?.option;
    if (typeof answer !== 'string' || !q.options.includes(answer)) return { status: 400, error: 'Pick one of its options.' };
    if (answer === q.answer) return { status: 400, error: "That's already the key." };
    const out = await questionReplace.replaceQuestions([{
        id: q.id, hash: questionContentHash(q), text: q.text, options: q.options, answer,
        fixedExplanation: q.fixedExplanation, confirmKeyChange: true,
    }], adminId);
    const refused = out.skipped[0];
    if (refused) return { status: 409, error: REFUSED[refused.reason] || 'It could not be changed.' };
    const { count } = await close('key-changed');
    const applied = out.applied[0] || {};
    logger.info('Key changed from Questions to check', { questionId: q.id, by: adminId, regraded: applied.regraded ?? 0 });
    return { status: 200, closed: count, regraded: applied.regraded ?? 0, unrecorded: applied.unrecorded ?? 0 };
}

const BULK_ACTIONS = ['keep', 'remove', 'use-option'];

/**
 * Settles many findings with one action, one after another (2026-11-16): the
 * admin ticks the ones that look the same way and settles them together. A
 * finding already closed by an earlier one of the same question counts as done;
 * the rest that can't be settled come back with why, and stay open.
 * `use-option` makes each one's explanation's answer the key, so it only takes
 * "explanation works out another option" findings.
 */
async function resolveMany(ids, action, adminId) {
    if (!BULK_ACTIONS.includes(action)) return { status: 400, error: 'Pick what to do with them.' };
    const out = { settled: 0, regraded: 0, failed: [] };
    for (const id of [...new Set(ids)]) {
        const res = await resolveCheck(id, { action }, adminId);
        if (!res.error) { out.settled += 1; out.regraded += res.regraded || 0; continue; }
        if (res.status === 409 && res.error === ALREADY) { out.settled += 1; continue; }
        out.failed.push({ id, error: res.error });
    }
    return { status: 200, ...out };
}

module.exports = { JOB, LIST_MAX, scanBank, openChecks, resolveCheck, resolveMany, __test: { scanPage, learnerPicks } };
