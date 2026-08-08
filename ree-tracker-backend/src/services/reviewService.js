// src/services/reviewService.js
// AI content review loop (roadmap 3.6). Pure helpers for the pending-review →
// live-question promotion path, plus the ONE create function both manual
// creation (questionRoutes POST) and review approval share — so topic
// resolution and field defaults can never diverge between the two paths.
const prisma = require('../config/db');
const logger = require('../utils/logger');
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
 * Create a LIVE question — the single shared path for manual creation and
 * review-approval promotion. Resolves the taxonomy FK (Phase 3.3) and applies
 * the same defaults the manual POST has always used.
 */
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
    return prisma.question.create({
        data: {
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
        },
    });
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
 * Bulk approve pending review rows — ONE request, batched server-side, with
 * per-item outcomes so a bad item never blocks the rest. Mirrors the single
 * approve path: createLiveQuestion runs OUTSIDE the bookkeeping transaction
 * (same deliberate non-atomicity), and every approval writes the same
 * QuestionVersion audit row (who/when/what) as a one-by-one approve.
 *
 * Retry-safe against partial failure: if a prior run published the question
 * (createLiveQuestion succeeded) but the bookkeeping transaction then failed,
 * the row is left PENDING with no promotedQuestionId — so a naive retry would
 * call createLiveQuestion AGAIN and publish a duplicate. To prevent that:
 *   1. On a bookkeeping failure, best-effort persist promotedQuestionId onto
 *      the row in its own write, OUTSIDE the failed transaction.
 *   2. On the next run, a row that already carries promotedQuestionId skips
 *      createLiveQuestion entirely and only retries the bookkeeping against
 *      that existing question id.
 * A row stuck in this state is reported as `published-pending-recordkeeping`,
 * not a generic failure — the question IS live; only the queue bookkeeping
 * needs a retry.
 * Returns { approved: [id], failed: [{ id, reason, questionId? }] }.
 */
async function approveBulk(ids, editorId) {
    const approved = [];
    const failed = [];
    const uniqueIds = [...new Set(ids)];
    const rows = await prisma.questionPendingReview.findMany({ where: { id: { in: uniqueIds } } });
    const byId = new Map(rows.map((r) => [r.id, r]));

    for (const id of uniqueIds) {
        const row = byId.get(id);
        if (!row) { failed.push({ id, reason: 'not-found' }); continue; }
        if (row.status !== 'PENDING') { failed.push({ id, reason: 'already-reviewed' }); continue; }

        // Already published by a prior partial run — skip straight to
        // bookkeeping instead of re-validating (isBulkEligible re-checks
        // CONTENT, not publication state) and re-publishing.
        let questionId = row.promotedQuestionId || null;
        const finalData = toLiveQuestionData(row, {});

        if (!questionId) {
            if (!isBulkEligible(row)) { failed.push({ id, reason: 'invalid' }); continue; }
            try {
                const question = await createLiveQuestion(finalData);
                questionId = question.id;
            } catch (err) {
                failed.push({ id, reason: err.code === 'INVALID_TAXONOMY' ? 'invalid' : 'create-failed' });
                continue;
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
            approved.push(id);
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
            failed.push({ id, reason: 'published-pending-recordkeeping', questionId });
        }
    }
    return { approved, failed };
}

module.exports = { CONTENT_FIELDS, buildVersionSnapshot, toLiveQuestionData, createLiveQuestion, isBulkEligible, approveBulk };
