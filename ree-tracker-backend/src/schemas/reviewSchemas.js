// src/schemas/reviewSchemas.js
// Validation for the AI review loop (roadmap 3.6). Edits and approve-with-edits
// reuse the question update shape — partial fields with the same choice-label
// sanitization ("A."/"b)" prefixes stripped) so the exact-match grading
// invariant holds on promoted questions too.
const { z } = require('zod');
const { questionUpdateSchema } = require('./questionSchemas');

// PUT /api/review/:id — edit a pending item in place.
const reviewEditSchema = questionUpdateSchema;

// PUT /api/review/:id/approve — optional inline edits ride along ({} is valid).
const reviewApproveSchema = questionUpdateSchema;

// PUT /api/review/:id/reject — soft reject with an optional reason.
const reviewRejectSchema = z.object({
    reviewNote: z.string().max(2000).optional(),
});

// POST /api/review/approve-bulk and /api/questions/explanations/approve-bulk —
// one batched request, bounded so a runaway payload can't lock the DB loop.
const bulkIdsSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(200),
});

module.exports = { reviewEditSchema, reviewApproveSchema, reviewRejectSchema, bulkIdsSchema };
