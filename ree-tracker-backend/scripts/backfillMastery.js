#!/usr/bin/env node
/*
 * One-time BKT mastery backfill (roadmap 3.5). UserTopicPerformance.pMastery is
 * updated online per attempt by telemetryService going forward, but existing
 * response history predates that. This replays each user's attempts
 * chronologically per (canonical) topic through BKT to seed pMastery/masteryN.
 *
 * Usage:
 *   node scripts/backfillMastery.js            # apply
 *   node scripts/backfillMastery.js --dry-run  # per-subject distribution, no writes
 *
 * Idempotent: it always replays from pInit, so re-running yields the same
 * result. Touches only the derived pMastery/masteryN fields — never the
 * attempts/correct/totalTime counts (telemetry owns those). Run once post-deploy
 * after `npx prisma db push`.
 */
require('dotenv').config();
const prisma = require('../src/config/db');
const { bktSequence } = require('../src/engine/bkt');
const { paramsForTopic } = require('../src/config/bktParams');

function parseArgs(argv) {
    const out = { dryRun: false };
    for (const a of argv.slice(2)) if (a === '--dry-run') out.dryRun = true;
    return out;
}

// Pure: fold one user's chronological attempts into per-topic BKT mastery.
// Each attempt carries its resolved topic name/subject (COALESCE of the
// question's Topic and the attempt's stored label), so re-tagging history is
// respected. Returns one row per topic with the final P(mastery).
function foldUserMastery(attempts) {
    const byTopic = new Map(); // topic -> { subject, topicId, observations: [] }
    for (const a of attempts) {
        const t = a.question?.topic;
        const topic = t?.name || a.subtopic || 'General';
        let entry = byTopic.get(topic);
        if (!entry) {
            entry = { subject: t?.subject || a.subject || 'General', topicId: a.question?.topicId ?? null, observations: [] };
            byTopic.set(topic, entry);
        }
        entry.observations.push(!!a.isCorrect);
    }
    const out = [];
    for (const [topic, { subject, topicId, observations }] of byTopic) {
        const { pMastery, n } = bktSequence(observations, paramsForTopic(topic));
        out.push({ topic, subject, topicId, pMastery, masteryN: n });
    }
    return out;
}

// Coarse distribution buckets for the dry-run report.
function bucketOf(pMastery) {
    if (pMastery >= 0.85) return 'mastered';
    if (pMastery >= 0.65) return 'proficient';
    if (pMastery >= 0.45) return 'developing';
    return 'novice';
}

async function main() {
    const { dryRun } = parseArgs(process.argv);
    const t0 = Date.now();
    console.log(`[backfillMastery] start  dryRun=${dryRun}`);

    const users = await prisma.user.findMany({ select: { id: true } });
    let processed = 0;
    let rowsWritten = 0;
    let skippedNoAttempts = 0;
    const dist = { mastered: 0, proficient: 0, developing: 0, novice: 0 };

    for (const u of users) {
        const attempts = await prisma.questionAttempt.findMany({
            where: { userId: u.id },
            orderBy: { createdAt: 'asc' },
            select: {
                isCorrect: true,
                subject: true,
                subtopic: true,
                question: { select: { topicId: true, topic: { select: { name: true, subject: true } } } },
            },
        });
        if (attempts.length === 0) { skippedNoAttempts += 1; continue; }

        const topicRows = foldUserMastery(attempts);
        processed += 1;

        for (const r of topicRows) {
            dist[bucketOf(r.pMastery)] += 1;
            if (dryRun) continue;
            // Update the derived fields only; create the row if it's somehow
            // missing (telemetry/migration normally created it already).
            await prisma.userTopicPerformance.upsert({
                where: { userId_topic: { userId: u.id, topic: r.topic } },
                update: { pMastery: r.pMastery, masteryN: r.masteryN, topicId: r.topicId ?? undefined },
                create: {
                    userId: u.id, subject: r.subject, topic: r.topic, topicId: r.topicId ?? null,
                    attempts: r.masteryN, correct: 0, totalTime: 0,
                    pMastery: r.pMastery, masteryN: r.masteryN,
                },
            });
            rowsWritten += 1;
        }
    }

    console.log(`[backfillMastery] mastery distribution (topic rows): ${JSON.stringify(dist)}`);
    console.log(`[backfillMastery] done  processedUsers=${processed}  rowsWritten=${rowsWritten}  skippedNoAttempts=${skippedNoAttempts}  totalUsers=${users.length}  ${Date.now() - t0}ms`);
}

// Exported for unit tests; only auto-run when invoked directly.
module.exports = { foldUserMastery, bucketOf };

if (require.main === module) {
    main()
        .catch((err) => {
            console.error('[backfillMastery] failed', err);
            process.exit(1);
        })
        .finally(() => prisma.$disconnect());
}
