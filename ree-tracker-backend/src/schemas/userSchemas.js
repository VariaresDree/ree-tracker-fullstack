const { z } = require('zod');

const profileUpdateSchema = z.object({
    displayName: z.string().trim().min(1).max(32),
});

// PUT /api/user/settings — partial update; at least one field required.
const settingsUpdateSchema = z.object({
    examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'examDate must be YYYY-MM-DD').nullable().optional(),
    dailyTarget: z.number().int().min(1).max(500).optional(),
}).refine(
    (d) => d.examDate !== undefined || d.dailyTarget !== undefined,
    { message: 'No valid settings provided.' },
);

module.exports = { profileUpdateSchema, settingsUpdateSchema };
