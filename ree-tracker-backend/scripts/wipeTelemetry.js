#!/usr/bin/env node
/*
 * Telemetry-only reset — clears all recorded study activity while KEEPING
 * every account, the question bank, and reference/materials content intact.
 *
 * Run once, after the Manila date-bucketing fix (see utils/manilaDate.js) is
 * live in production: any answer recorded before that fix could be bucketed
 * to the wrong calendar day, so wiping first and then deploying would let a
 * fresh batch of misdated rows accumulate in the gap. Running it AFTER
 * deploy means the first attempts on the clean slate are correctly dated
 * from minute one.
 *
 * Deletes: QuestionAttempt, ActivityLog, ThetaHistory, UserTopicPerformance,
 * UserAbility, ExamSession, StudySession, LeaderboardEntry, ForecastSnapshot,
 * ReadinessSnapshot, BattleOutcome, Battle, SRSCard, Bookmark.
 * (BattleOutcome before Battle — it has onDelete:Cascade on battleId, but
 * deleting explicitly in FK order rather than relying on cascade.)
 *
 * Resets on every surviving User row: thetaRating -> 0.0, standardError ->
 * 0.5, globalStreak -> 0, lastActive -> now() (matches schema.prisma's
 * column defaults; lastActive can't be null so it's stamped to the reset
 * moment instead).
 *
 * Preserves: User (all accounts + roles), Question, QuestionPendingReview,
 * QuestionVersion, Topic, Material, Folder, ReferenceCard/Source/Version,
 * SyllabusWeight, SystemConfig, FeatureFlag. No Firebase Auth calls at all.
 *
 * Usage:
 *   node scripts/wipeTelemetry.js --confirm=WIPE
 *   node scripts/wipeTelemetry.js --dry-run       # report counts only
 */
require('dotenv').config();

const args = process.argv.slice(2).reduce((acc, a) => {
    const [k, v] = a.split('=');
    acc[k.replace(/^--/, '')] = v === undefined ? true : v;
    return acc;
}, {});

const dryRun = !!args['dry-run'];

if (!dryRun && args.confirm !== 'WIPE') {
    console.error('\nRefusing to run without --confirm=WIPE (or --dry-run to preview).\n');
    console.error('Example: node scripts/wipeTelemetry.js --confirm=WIPE\n');
    process.exit(2);
}

async function countdown(secs) {
    for (let i = secs; i > 0; i--) {
        process.stdout.write(`\rStarting telemetry wipe in ${i}s... (Ctrl-C to abort) `);
        await new Promise((r) => setTimeout(r, 1000));
    }
    process.stdout.write('\n');
}

async function main() {
    const prisma = require('../src/config/db');

    if (dryRun) {
        console.log('[DRY RUN] counting rows that WOULD be deleted...\n');
        const counts = {
            questionAttempts: await prisma.questionAttempt.count(),
            activityLogs: await prisma.activityLog.count(),
            thetaHistories: await prisma.thetaHistory.count(),
            topicPerformances: await prisma.userTopicPerformance.count(),
            userAbilities: await prisma.userAbility.count(),
            examSessions: await prisma.examSession.count(),
            studySessions: await prisma.studySession.count(),
            leaderboardEntries: await prisma.leaderboardEntry.count(),
            forecastSnapshots: await prisma.forecastSnapshot.count(),
            readinessSnapshots: await prisma.readinessSnapshot.count(),
            battleOutcomes: await prisma.battleOutcome.count(),
            battles: await prisma.battle.count(),
            srsCards: await prisma.sRSCard.count(), // Prisma's client accessor for `model SRSCard` (not smart-cased)
            bookmarks: await prisma.bookmark.count(),
        };
        const userCount = await prisma.user.count();
        console.log(counts);
        console.log(`\n${userCount} User row(s) would be KEPT (theta/streak reset, not deleted).`);
        await prisma.$disconnect();
        return;
    }

    await countdown(5);

    console.log('\n[DB] wiping telemetry tables (accounts preserved)...');
    const counts = await prisma.$transaction(async (tx) => {
        const battleOutcomes = await tx.battleOutcome.deleteMany({});
        const battles = await tx.battle.deleteMany({});
        const questionAttempts = await tx.questionAttempt.deleteMany({});
        const activityLogs = await tx.activityLog.deleteMany({});
        const thetaHistories = await tx.thetaHistory.deleteMany({});
        const topicPerformances = await tx.userTopicPerformance.deleteMany({});
        const userAbilities = await tx.userAbility.deleteMany({});
        const examSessions = await tx.examSession.deleteMany({});
        const studySessions = await tx.studySession.deleteMany({});
        const leaderboardEntries = await tx.leaderboardEntry.deleteMany({});
        const forecastSnapshots = await tx.forecastSnapshot.deleteMany({});
        const readinessSnapshots = await tx.readinessSnapshot.deleteMany({});
        const srsCards = await tx.sRSCard.deleteMany({}); // Prisma's client accessor for `model SRSCard`
        const bookmarks = await tx.bookmark.deleteMany({});

        const usersReset = await tx.user.updateMany({
            data: { thetaRating: 0.0, standardError: 0.5, globalStreak: 0, lastActive: new Date() },
        });

        return {
            battleOutcomes: battleOutcomes.count, battles: battles.count,
            questionAttempts: questionAttempts.count, activityLogs: activityLogs.count,
            thetaHistories: thetaHistories.count, topicPerformances: topicPerformances.count,
            userAbilities: userAbilities.count, examSessions: examSessions.count,
            studySessions: studySessions.count, leaderboardEntries: leaderboardEntries.count,
            forecastSnapshots: forecastSnapshots.count, readinessSnapshots: readinessSnapshots.count,
            srsCards: srsCards.count, bookmarks: bookmarks.count,
            usersReset: usersReset.count,
        };
    });
    console.log('[DB] deleted/reset:', counts);

    await prisma.$disconnect();
    console.log('\n✅ Telemetry wipe complete. Accounts, question bank, and reference/materials content preserved.\n');
}

main().catch((err) => {
    console.error('\n[ERROR] Wipe failed:', err);
    process.exit(1);
});
