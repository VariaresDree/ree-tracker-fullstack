const { z } = require('zod');
const { storableTimeMs } = require('../config/telemetryBounds');

// Placement test. The session id names an ExamSession the service looks up
// OWNER-scoped (userId + mode), so a foreign id simply does not resolve.
const diagnosticStartSchema = z.object({
    restart: z.boolean().optional().default(false),
}).strip();

const diagnosticAnswerSchema = z.object({
    sessionId: z.string().min(1).max(64),
    questionId: z.string().min(1).max(200),
    userAnswer: z.string().max(500),
    confidenceLevel: z.enum(['LOW', 'MED', 'HIGH']).optional(),
    timeSpentMs: z.number().optional().default(0).transform(storableTimeMs),
}).strip();

const diagnosticFinishSchema = z.object({
    sessionId: z.string().min(1).max(64),
}).strip();

module.exports = { diagnosticStartSchema, diagnosticAnswerSchema, diagnosticFinishSchema };
