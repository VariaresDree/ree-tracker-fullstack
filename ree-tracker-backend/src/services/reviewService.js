// src/services/reviewService.js
// AI content review loop (roadmap 3.6). Pure helpers for the pending-review →
// live-question promotion path, plus the ONE create function both manual
// creation (questionRoutes POST) and review approval share — so topic
// resolution and field defaults can never diverge between the two paths.
const prisma = require('../config/db');
const { resolveTopic } = require('./topicResolver');

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

module.exports = { CONTENT_FIELDS, buildVersionSnapshot, toLiveQuestionData, createLiveQuestion };
