// src/services/reviewService.js
// AI content review loop (roadmap 3.6). Pure helpers for the pending-review →
// live-question promotion path, plus the ONE create function both manual
// creation (questionRoutes POST) and review approval share — so topic
// resolution and field defaults can never diverge between the two paths.
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { randomUUID } = require('crypto');
const { resolveTopic } = require('./topicResolver');
const { normalizeSubject, SUBJECT_VARIANTS } = require('../utils/subject');
const { sanitizeOptions, stripChoicePrefix } = require('../utils/sanitizeOptions');

// The content fields that define a question, shared by Question,
// QuestionPendingReview, and QuestionVersion.snapshot.
const CONTENT_FIELDS = [
    'subject', 'subtopic', 'text', 'options', 'answer', 'difficulty',
    'fixedExplanation', 'source', 'type', 'bloomLevel', 'difficultyTier',
];

/**
 * Pure: pick the content fields off a row for a QuestionVersion.snapshot.
 * Deliberately excludes ids/timestamps/status so snapshots diff cleanly.
 */
function buildVersionSnapshot(row) {
    const snap = {};
    for (const f of CONTENT_FIELDS) {
        if (row?.[f] !== undefined) snap[f] = row[f];
    }
    return snap;
}

/**
 * Pure: merge reviewer edits over a pending-review row into the payload for
 * live-question creation. Defined edit fields win; everything else comes from
 * the reviewed row (which already carries the AI submission's values).
 */
function toLiveQuestionData(reviewRow, edits = {}) {
    const merged = buildVersionSnapshot(reviewRow);
    for (const f of CONTENT_FIELDS) {
        if (edits[f] !== undefined) merged[f] = edits[f];
    }
    return merged;
}

/**
 * Pure: the field defaults for a live Question row, shared by the
 * single-create path (createLiveQuestion) and the bulk-batch path
 * (approveBulk) — so the two can never drift apart, per this file's header
 * comment. `id` is optional: omitted, Prisma generates one (the single-create
 * path); passed, the caller controls it so it can reference the SAME id in
 * other statements of the same transaction before that transaction commits
 * (the bulk path — see approveBulk).
 */
function buildQuestionCreateData(data, topic, id) {
    return {
        ...(id ? { id } : {}),
        subject: data.subject || 'Unknown',
        subtopic: topic?.name || data.subtopic || 'General',
        topicId: topic?.id ?? null,
        text: data.text || '',
        options: Array.isArray(data.options) ? data.options : [],
        answer: data.answer || '',
        difficulty: parseFloat(data.difficulty) || 2.0,
        fixedExplanation: data.fixedExplanation || null,
        source: data.source || 'manual',
        type: data.type || 'calculation',
        isFlagged: !!data.isFlagged,
        bloomLevel: data.bloomLevel || 'REMEMBER',
        difficultyTier: data.difficultyTier || 1,
        competencyArea: data.competencyArea || null,
    };
}

/**
 * Create a LIVE question — the single shared path for manual creation and
 * review-approval promotion. Resolves the taxonomy FK (Phase 3.3) and applies
 * the same defaults the manual POST has always used.
 */
// Publishing through the review queue changes the live bank just as much as a
// direct POST does, and it goes through this function rather than
// questionRoutes' router hook.
const questionBankCache = require('./questionBankCache');

async function createLiveQuestion(data) {
    // Hard taxonomy gate at the single promotion choke point: a live question
    // MUST normalize to a recognized canonical subject (Mathematics/ESAS/EE) or
    // it enters syllabus-weighted Board Simulator selection with no/wrong
    // weighting. normalizeSubject maps historical spellings to canonical and
    // passes unknowns through unchanged; SUBJECT_VARIANTS has an entry only for
    // the three real subjects, so this rejects 'Unknown'/absent/typo subjects.
    // Runs BEFORE any DB access so callers can translate it to a 400.
    // Pending-review drafts don't hit this path, so they can still default.
    if (!SUBJECT_VARIANTS[normalizeSubject(data.subject)]) {
        throw Object.assign(
            new Error('A valid subject (Mathematics, ESAS, or EE) is required to publish a live question.'),
            { code: 'INVALID_TAXONOMY' },
        );
    }
    const topic = await resolveTopic(data.subject, data.subtopic);
    const created = await prisma.question.create({ data: buildQuestionCreateData(data, topic) });
    questionBankCache.invalidateAll();
    return created;
}

/**
 * Pure: is a pending row clean enough for BULK approval? No human edits ride
 * along in bulk, so the row itself must already satisfy the invariants the
 * inline editor enforces one-by-one: a real subject, non-empty text, >= 2
 * options, and a sanitized answer that exactly matches a sanitized option
 * (the exact-match grading invariant). Anything failing stays in the queue
 * for individual review — bulk approval only sweeps clean items.
 */
function isBulkEligible(row) {
    if (!row) return false;
    if (!SUBJECT_VARIANTS[normalizeSubject(row.subject)]) return false;
    if (typeof row.text !== 'string' || row.text.trim().length === 0) return false;
    const options = sanitizeOptions(row.options);
    if (!Array.isArray(options) || options.length < 2) return false;
    const answer = stripChoicePrefix(row.answer);
    if (typeof answer !== 'string' || answer.trim().length === 0) return false;
    return options.includes(answer);
}

/**
 * Approve exactly ONE row via the ORIGINAL sequential path: createLiveQuestion
 * OUTSIDE the bookkeeping transaction (deliberate non-atomicity — see the
 * module comment on approveBulk), then a 2-statement transaction for the
 * status update + audit row. This is what approveBulk's per-item loop used
 * to do for every row; it's kept as the FALLBACK when the batched path below
 * throws, so one bad row (or a transient DB hiccup) in a chunk still gets a
 * real per-item reason instead of failing the whole chunk with none.
 * Returns { id, ok: true } or { id, ok: false, reason, questionId? }.
 */
async function approveOneRow(row, editorId) {
    const id = row.id;
    let questionId = row.promotedQuestionId || null;
    const finalData = toLiveQuestionData(row, {});

    if (!questionId) {
        if (!isBulkEligible(row)) return { id, ok: false, reason: 'invalid' };
        try {
            const question = await createLiveQuestion(finalData);
            questionId = question.id;
        } catch (err) {
            return { id, ok: false, reason: err.code === 'INVALID_TAXONOMY' ? 'invalid' : 'create-failed' };
        }
    }

    try {
        await prisma.$transaction([
            prisma.questionPendingReview.update({
                where: { id: row.id },
                data: { status: 'APPROVED', reviewedBy: editorId, reviewedAt: new Date(), promotedQuestionId: questionId },
            }),
            prisma.questionVersion.create({
                data: { reviewId: row.id, questionId, action: 'APPROVED', editor: editorId, snapshot: finalData },
            }),
        ]);
        return { id, ok: true };
    } catch (bookkeepErr) {
        logger.error('bulk approve bookkeeping failed (question created)', {
            reviewId: row.id, questionId, error: bookkeepErr.message,
        });
        // Best-effort, OUTSIDE the failed transaction: mark the row as
        // already-published so the NEXT retry detects it via
        // row.promotedQuestionId above instead of re-publishing. Skipped
        // when we already read a promotedQuestionId this run (nothing new
        // to persist). Swallow failure here — worst case the admin sees
        // this reason again and retries, still without duplicating.
        if (!row.promotedQuestionId) {
            try {
                await prisma.questionPendingReview.update({
                    where: { id: row.id },
                    data: { promotedQuestionId: questionId },
                });
            } catch (persistErr) {
                logger.error('bulk approve: best-effort promotedQuestionId persist failed', {
                    reviewId: row.id, questionId, error: persistErr.message,
                });
            }
        }
        return { id, ok: false, reason: 'published-pending-recordkeeping', questionId };
    }
}

/**
 * Bulk approve pending review rows — ONE request, with per-item outcomes so
 * a bad item never blocks the rest.
 *
 * Fast path: every publishable row's question.create + pending-review update
 * + audit-version create are collapsed into a SINGLE prisma.$transaction
 * call for the whole chunk, instead of the old ~2 sequential transaction
 * boundaries PER ROW (an un-batched createLiveQuestion call, then a separate
 * 2-statement transaction). Each transaction boundary is a full BEGIN/COMMIT
 * round-trip to Supabase — the dominant cost over a WAN connection, not the
 * statements themselves — so a 25-item chunk went from ~50 such boundaries
 * to exactly 1. That's the actual fix for "Accept All times out at 25 items":
 * the client's request timeout was being exceeded by transaction-boundary
 * latency accumulating across the chunk, not by any single slow query.
 *
 * ids are pre-generated with randomUUID() (Question.id is @default(uuid()),
 * so this is a supported override, not a schema change) specifically so the
 * question.create and its matching pending-review update + version create
 * can reference the SAME id inside ONE transaction array, built up-front,
 * before anything commits.
 *
 * Fallback: if the batched transaction throws (a genuinely bad row somehow
 * slipped through pre-validation, a constraint violation, a transient DB
 * error), every row in that batch is retried through approveOneRow — the
 * original sequential path — so per-item reasons and partial progress still
 * work exactly as before. The fast path is not atomicity theater: on success
 * it IS atomic per chunk (a partial-chunk failure can't leave a half-written
 * chunk), which actually removes the published-but-bookkeeping-failed
 * orphan state entirely for anything that takes the fast path — that state
 * can now only arise via the fallback, exactly as it always could.
 *
 * Retry-safe against partial failure the same way the fallback always was:
 * a row already carrying promotedQuestionId (from ANY prior partial run,
 * fast-path or fallback) skips straight to bookkeeping instead of
 * re-validating and re-publishing.
 * Returns { approved: [id], failed: [{ id, reason, questionId? }] }.
 */
async function approveBulk(ids, editorId) {
    const approved = [];
    const failed = [];
    const uniqueIds = [...new Set(ids)];
    const rows = await prisma.questionPendingReview.findMany({ where: { id: { in: uniqueIds } } });
    const byId = new Map(rows.map((r) => [r.id, r]));

    // Partition up front: rows that fail for reasons independent of HOW we
    // publish (not found / already reviewed / fails the content or taxonomy
    // gate) vs. rows this run will actually attempt to publish/bookkeep.
    const toPublish = []; // needs a NEW question created — { row, finalData, questionId }
    const toBookkeepOnly = []; // already published by a prior partial run — { row, finalData, questionId }
    for (const id of uniqueIds) {
        const row = byId.get(id);
        if (!row) { failed.push({ id, reason: 'not-found' }); continue; }
        if (row.status !== 'PENDING') { failed.push({ id, reason: 'already-reviewed' }); continue; }

        const finalData = toLiveQuestionData(row, {});
        if (row.promotedQuestionId) {
            toBookkeepOnly.push({ row, finalData, questionId: row.promotedQuestionId });
            continue;
        }
        // Same two gates createLiveQuestion enforces (content + taxonomy),
        // checked HERE so an invalid row is excluded from the batch instead
        // of throwing mid-transaction and failing every row alongside it.
        if (!isBulkEligible(row) || !SUBJECT_VARIANTS[normalizeSubject(finalData.subject)]) {
            failed.push({ id, reason: 'invalid' });
            continue;
        }
        toPublish.push({ row, finalData, questionId: randomUUID() });
    }

    const batchItems = [...toPublish, ...toBookkeepOnly];
    if (batchItems.length === 0) return { approved, failed };

    // resolveTopic is index-cached (topicResolver.js) — this warms the cache
    // once, not one DB round-trip per row.
    for (const item of toPublish) {
        item.topic = await resolveTopic(item.finalData.subject, item.finalData.subtopic);
    }

    const ops = [];
    for (const item of toPublish) {
        ops.push(prisma.question.create({ data: buildQuestionCreateData(item.finalData, item.topic, item.questionId) }));
    }
    for (const item of batchItems) {
        ops.push(prisma.questionPendingReview.update({
            where: { id: item.row.id },
            data: { status: 'APPROVED', reviewedBy: editorId, reviewedAt: new Date(), promotedQuestionId: item.questionId },
        }));
        ops.push(prisma.questionVersion.create({
            data: { reviewId: item.row.id, questionId: item.questionId, action: 'APPROVED', editor: editorId, snapshot: item.finalData },
        }));
    }

    try {
        await prisma.$transaction(ops);
        for (const item of batchItems) approved.push(item.row.id);
    } catch (batchErr) {
        logger.error('bulk approve: batched transaction failed, falling back to per-item', {
            count: batchItems.length, error: batchErr.message,
        });
        for (const item of batchItems) {
            const result = await approveOneRow(item.row, editorId);
            if (result.ok) approved.push(result.id);
            else failed.push({ id: result.id, reason: result.reason, questionId: result.questionId });
        }
    }

    return { approved, failed };
}

module.exports = {
    CONTENT_FIELDS, buildVersionSnapshot, toLiveQuestionData, buildQuestionCreateData,
    createLiveQuestion, isBulkEligible, approveOneRow, approveBulk,
};
