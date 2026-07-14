const { z } = require('zod');

// POST /api/srs/review — SM-2 scheduling write. The scheduling numerics feed
// date math (`interval` → nextReviewDate.setDate(getDate() + interval)) and the
// card's Float/Int columns, so they must be finite + bounded: an `interval` of
// "soon" previously produced an Invalid Date (→ 500 / corrupt schedule), and a
// string easeFactor/repetitions rejected at the DB with a 500. coerce keeps the
// route tolerant of numeric strings while rejecting non-numeric garbage.
// Bounds are deliberately LOOSE — the goal is to reject non-finite/garbage
// (NaN, Infinity, strings), not to cap legitimate SM-2 growth: easeFactor rises
// ~0.1 per perfect review and interval grows geometrically, so a well-remembered
// card legitimately exceeds a tight cap. Only the SM-2 quality grade (0..5) and
// the easeFactor floor (1.3) are true domain limits.
const srsReviewSchema = z.object({
    questionId: z.string().min(1),
    quality: z.coerce.number().int().min(0).max(5),
    easeFactor: z.coerce.number().min(1.3).max(10).optional(),
    interval: z.coerce.number().int().min(0).max(36500).optional(),
    repetitions: z.coerce.number().int().min(0).max(100000).optional(),
}).strip();

module.exports = { srsReviewSchema };
