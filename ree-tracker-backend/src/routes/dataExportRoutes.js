// GET /api/user/export: everything the server holds for the caller, for their backup
// file and so they can take it elsewhere. Read-only, and only ever their own rows: the
// id comes from the verified token. Left out: device tokens and idempotency records,
// which are plumbing, and the leaderboard, which is computed from the rest.
const express = require('express');
const rateLimit = require('express-rate-limit').default;
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// One name in the file for each table. Read one after another: on this server's small
// connection pool, two dozen at once would hold everyone else up.
const OWN_ROWS = {
    sessions: () => prisma.examSession,
    attempts: () => prisma.questionAttempt,
    bookmarks: () => prisma.bookmark,
    topicPerformance: () => prisma.userTopicPerformance,
    thetaHistory: () => prisma.thetaHistory,
    activityLog: () => prisma.activityLog,
    srsCards: () => prisma.sRSCard,
    studySessions: () => prisma.studySession,
    outsideScores: () => prisma.outsideScore,
    syllabus: () => prisma.syllabusProgress,
    cardReviews: () => prisma.cardReview,
    focusBlocks: () => prisma.focusBlock,
    mistakes: () => prisma.mistakeTag,
    notes: () => prisma.userNote,
    printedSets: () => prisma.printedSet,
    scannedSheets: () => prisma.scannedSheet,
    plannerTasks: () => prisma.plannerTask,
    abilities: () => prisma.userAbility,
    forecasts: () => prisma.forecastSnapshot,
    readiness: () => prisma.readinessSnapshot,
    flags: () => prisma.questionFlag,
    keyDates: () => prisma.keyDate,
    practiceSets: () => prisma.practiceSet,
    links: () => prisma.userLink,
    subtopics: () => prisma.userSubtopic,
    battles: () => prisma.battleParticipant,
    battleOutcomes: () => prisma.battleOutcome,
};

// Far more than a real learner has: a guard against one request sinking the server.
const MAX_ROWS_PER_TABLE = 500_000;

// It reads every table, so ten an hour is plenty for backups and keeps it from being
// a way to load the server.
const exportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user.id,
    message: { error: 'That’s a lot of exports. Try again in an hour.' },
});

const withoutOwner = ({ userId: _userId, ...row }) => row;
// Which admin closed a report is theirs, not the learner's: the note and the outcome stay.
const TIDY = { flags: ({ resolvedBy: _by, ...row }) => row };

router.get('/export', authMiddleware, exportLimiter, async (req, res) => {
    const userId = req.user.id;
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'No account found.' });
        const rows = {};
        for (const [name, table] of Object.entries(OWN_ROWS)) {
            rows[name] = (await table().findMany({ where: { userId }, take: MAX_ROWS_PER_TABLE })).map((row) => (TIDY[name] || ((x) => x))(withoutOwner(row)));
        }
        return res.status(200).json({ exportedAt: new Date().toISOString(), user, rows });
    } catch (error) {
        logger.error('Data export failed', { error: error.message, uid: userId });
        return res.status(500).json({ error: 'Couldn’t put your data together. Try again.' });
    }
});

module.exports = router;
module.exports.OWN_ROWS = OWN_ROWS;
