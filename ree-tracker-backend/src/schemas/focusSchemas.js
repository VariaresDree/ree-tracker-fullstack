const { z } = require('zod');
const { FOCUS_SUBJECTS, FOCUS_MAX_MINUTES } = require('@ree/shared');

// How late a queued block may arrive, and how far ahead a device clock may run.
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

// POST /api/user/focus-blocks — one finished (or stopped-early) focus block.
const focusBlockSchema = z.object({
    clientId: z.string().min(8).max(64),
    subject: z.enum(FOCUS_SUBJECTS),
    minutes: z.number().int().min(1).max(FOCUS_MAX_MINUTES),
    startedAt: z.string().datetime({ offset: true }),
    endedAt: z.string().datetime({ offset: true }),
    completed: z.boolean(),
}).strip().superRefine((b, ctx) => {
    const start = Date.parse(b.startedAt);
    const end = Date.parse(b.endedAt);
    const now = Date.now();
    if (end < start) ctx.addIssue({ code: 'custom', path: ['endedAt'], message: 'A block ends after it starts.' });
    if (end > now + CLOCK_SKEW_MS) ctx.addIssue({ code: 'custom', path: ['endedAt'], message: 'That block ends in the future.' });
    if (end < now - MAX_AGE_MS) ctx.addIssue({ code: 'custom', path: ['endedAt'], message: 'That block is too old to record.' });
    // Paused time makes the span longer than the minutes, never shorter.
    if (b.minutes > Math.ceil((end - start) / 60000) + 1) {
        ctx.addIssue({ code: 'custom', path: ['minutes'], message: 'More minutes than the block lasted.' });
    }
});

// PATCH /api/user/focus-blocks/:id — fix what a logged block was for, or its
// minutes (no longer than the block lasted; checked against the stored row).
const focusBlockEditSchema = z.object({
    subject: z.enum(FOCUS_SUBJECTS).optional(),
    minutes: z.number().int().min(1).max(FOCUS_MAX_MINUTES).optional(),
}).strip().refine((b) => b.subject !== undefined || b.minutes !== undefined, { message: 'Nothing to change.' });

module.exports = { focusBlockSchema, focusBlockEditSchema };
