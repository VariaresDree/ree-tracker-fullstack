const { z } = require('zod');

const VALID_MODES = ['ACTIVE_REVIEW', 'BOARD_SIM', 'GAUNTLET', 'COMBAT', 'BATTLE', 'LEGACY'];

const telemetryBulkSchema = z.object({
    sessionId: z.string().optional().nullable(),
    mode: z.enum(VALID_MODES).optional().default('LEGACY'),
    targetSubject: z.string().optional(),
    attempts: z.array(z.object({
        questionId: z.string().uuid(),
        userAnswer: z.string().optional(),
        subject: z.string().optional().default('General'),
        subtopic: z.string().optional().default('General'),
        isCorrect: z.boolean().optional(),
        confidenceLevel: z.enum(['LOW', 'MED', 'HIGH']).optional().default('MED'),
        timeSpentMs: z.number().nonnegative().optional().default(0),
    })).min(1),
});

module.exports = { telemetryBulkSchema, VALID_MODES };
