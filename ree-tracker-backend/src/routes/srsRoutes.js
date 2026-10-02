const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { getSubjectFilter, normalizeSubject } = require('../utils/subject');
const { manilaDueInstant } = require('../engine/srs');

// The spaced-review queue. Cards are SCHEDULED by the telemetry transaction
// (services/telemetryService → engine/srs) from every answer the learner gives;
// these routes only read them.
//
// There used to be a POST /review that stored whatever easeFactor/interval the
// client computed, plus a GET /stats — both served a client hook nothing
// imported, so no card was ever written and /due was always empty. Removed.

// GET /api/srs/due — questions whose review has come due, oldest-due first.
// Returned in the same shape as the question bank (answer and explanation
// included): practice sessions grade on the client, and a question delivered
// without its answer is marked wrong whatever the learner picks.
router.get('/due', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
        const subjFilter = getSubjectFilter(req.query.subject);

        const cards = await prisma.sRSCard.findMany({
            where: {
                userId: req.user.id,
                nextReviewDate: { lte: new Date() },
                question: { isFlagged: false, ...(subjFilter ? { subject: subjFilter } : {}) },
            },
            include: { question: true },
            orderBy: { nextReviewDate: 'asc' },
            take: limit,
        });

        res.status(200).json({
            items: cards.map((c) => ({
                ...c.question,
                srs: { dueAt: c.nextReviewDate, interval: c.interval, repetitions: c.repetitions },
            })),
        });
    } catch (error) {
        logger.error('SRS due fetch error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to fetch due cards.' });
    }
});

/** Pure: grouped `{subject, due, overdue, total, nextDueAt}` rows → the summary payload. */
function foldSummaryRows(rows) {
    const out = { due: 0, overdue: 0, total: 0, bySubject: {}, nextDueAt: null };
    for (const r of rows || []) {
        const due = Number(r.due) || 0;
        out.due += due;
        out.overdue += Number(r.overdue) || 0;
        out.total += Number(r.total) || 0;
        if (due > 0) {
            const subject = normalizeSubject(r.subject);
            out.bySubject[subject] = (out.bySubject[subject] || 0) + due;
        }
        if (r.nextDueAt) {
            const next = new Date(r.nextDueAt);
            if (!out.nextDueAt || next < out.nextDueAt) out.nextDueAt = next;
        }
    }
    return out;
}

// GET /api/srs/summary — counts for the dashboard's Today panel. "Overdue" is
// anything that was already due before today began in Manila.
router.get('/summary', authMiddleware, async (req, res) => {
    try {
        const now = new Date();
        const startOfToday = manilaDueInstant(now, 0);
        const rows = await prisma.$queryRaw`
            SELECT q."subject",
                   COUNT(*) FILTER (WHERE c."nextReviewDate" <= ${now})::int        AS "due",
                   COUNT(*) FILTER (WHERE c."nextReviewDate" < ${startOfToday})::int AS "overdue",
                   COUNT(*)::int                                                     AS "total",
                   MIN(c."nextReviewDate") FILTER (WHERE c."nextReviewDate" > ${now}) AS "nextDueAt"
            FROM "SRSCard" c
            JOIN "Question" q ON q."id" = c."questionId"
            WHERE c."userId" = ${req.user.id} AND q."isFlagged" = false
            GROUP BY q."subject"`;
        res.status(200).json(foldSummaryRows(rows));
    } catch (error) {
        logger.error('SRS summary error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to fetch the review summary.' });
    }
});

module.exports = router;
module.exports.foldSummaryRows = foldSummaryRows;
