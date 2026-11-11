// src/services/reviewBudget.js
//
// Today's question reviews for one learner: how many are due, how many were
// done today, and today's share under the daily cap (@ree/shared reviewShare).
// Read by the review summary, Today's loop and the reminder, so every number
// a learner sees agrees.
//
// "Done today" is a card started before today and answered today, in Manila:
// a miss today starts a card, which isn't a review.

'use strict';

const prisma = require('../config/db');
const { reviewShare, DAILY_REVIEW_CAP } = require('@ree/shared/srs');
const { manilaDueInstant } = require('../engine/srs');

/** @returns {Promise<{ dueTotal: number, doneToday: number, today: number, later: number, cap: number }>} */
async function reviewBudget(userId, now = new Date(), db = prisma) {
    const startOfToday = manilaDueInstant(now, 0);
    const [row] = await db.$queryRaw`
        SELECT COUNT(*) FILTER (WHERE c."nextReviewDate" <= ${now})::int AS "due",
               COUNT(*) FILTER (WHERE c."lastReviewed" >= ${startOfToday} AND c."createdAt" < ${startOfToday})::int AS "done"
        FROM "SRSCard" c
        JOIN "Question" q ON q."id" = c."questionId"
        WHERE c."userId" = ${userId} AND q."isFlagged" = false`;
    const dueTotal = Number(row?.due) || 0;
    const doneToday = Number(row?.done) || 0;
    return { dueTotal, doneToday, ...reviewShare({ due: dueTotal, doneToday }), cap: DAILY_REVIEW_CAP };
}

module.exports = { reviewBudget };
