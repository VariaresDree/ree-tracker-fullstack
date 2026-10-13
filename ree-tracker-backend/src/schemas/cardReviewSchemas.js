const { z } = require('zod');
const { CARD_RATINGS } = require('@ree/shared');

// POST /api/user/card-reviews/:cardId — one rating of a formula card after
// flipping it. `reviewId` is minted per rating on the device, so a replay (a
// retry, the offline queue) is recognised and changes nothing. `reviewedAt`
// is when it was rated (a rating queued offline is scheduled from then).
const cardRatingSchema = z.object({
    rating: z.enum(CARD_RATINGS),
    reviewId: z.string().min(8).max(64),
    reviewedAt: z.string().datetime({ offset: true }).optional(),
}).strip();

module.exports = { cardRatingSchema };
