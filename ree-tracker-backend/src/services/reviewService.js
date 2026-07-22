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
 * approve path exactly: createLiveQuestion runs OUTSIDE the bookkeeping
 * transaction (same deliberate non-atomicity — a bookkeeping failure surfaces
 * as `created-bookkeeping-failed` instead of rolling back a published
 * question), and every approval writes the same QuestionVersion audit row
 * (who/when/what) as a one-by-one approve.
 * Returns { approved: [id], failed: [{ id, reason }] }.
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
        if (!isBulkEligible(row)) { failed.push({ id, reason: 'invalid' }); continue; }

        const finalData = toLiveQuestionData(row, {});
        let question;
        try {
            question = await createLiveQuestion(finalData);
        } catch (err) {
            failed.push({ id, reason: err.code === 'INVALID_TAXONOMY' ? 'invalid' : 'create-failed' });
            continue;
        }
        try {
            await prisma.$transaction([
                prisma.questionPendingReview.update({
                    where: { id: row.id },
                    data: { status: 'APPROVED', reviewedBy: editorId, reviewedAt: new Date(), promotedQuestionId: question.id },
                }),
                prisma.questionVersion.create({
                    data: { reviewId: row.id, questionId: question.id, action: 'APPROVED', editor: editorId, snapshot: finalData },
                }),
            ]);
            approved.push(id);
        } catch (bookkeepErr) {
            logger.error('bulk approve bookkeeping failed (question created)', {
                reviewId: row.id, questionId: question.id, error: bookkeepErr.message,
            });
            failed.push({ id, reason: 'created-bookkeeping-failed', questionId: question.id });
        }
    }
    return { approved, failed };
}

module.exports = { CONTENT_FIELDS, buildVersionSnapshot, toLiveQuestionData, createLiveQuestion, isBulkEligible, approveBulk };
