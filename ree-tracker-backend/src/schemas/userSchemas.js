const { z } = require('zod');
const { DISPLAY_NAME_MAX } = require('@ree/shared');

const profileUpdateSchema = z.object({
    displayName: z.string().trim().min(1).max(DISPLAY_NAME_MAX),
});

// PUT /api/user/settings — partial update; at least one field required.
const settingsUpdateSchema = z.object({
    examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'examDate must be YYYY-MM-DD').nullable().optional(),
    dailyTarget: z.number().int().min(1).max(500).optional(),
}).refine(
    (d) => d.examDate !== undefined || d.dailyTarget !== undefined,
    { message: 'No valid settings provided.' },
);

// POST/DELETE /api/user/device-token — FCM registration tokens are opaque
// strings (~150-300 chars today); bound generously but firmly.
const deviceTokenSchema = z.object({
    token: z.string().trim().min(20).max(4096),
    platform: z.enum(['android', 'ios', 'web']).optional().default('android'),
});

// PUT /api/user/draw-prefs: both fields, always. A topic is its name, because
// that's what a question carries; a renamed topic's count just stops applying.
const ownCounts = z.record(z.string().min(1).max(160), z.number().int().min(0).max(1000))
    .refine((o) => Object.keys(o).length <= 100, 'Too many topics.');
const drawPrefsSchema = z.object({
    drawMode: z.enum(['even', 'board', 'own']),
    ownCounts: z.object({ Mathematics: ownCounts.optional(), ESAS: ownCounts.optional(), EE: ownCounts.optional() }).strict(),
}).strict();

module.exports = { drawPrefsSchema, profileUpdateSchema, settingsUpdateSchema, deviceTokenSchema };
