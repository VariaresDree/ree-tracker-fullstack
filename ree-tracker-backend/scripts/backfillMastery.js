#!/usr/bin/env node
/*
 * BKT mastery backfill (roadmap 3.5) — rebuilds each user's
 * UserTopicPerformance rows from their attempt history.
 *
 * Usage:
 *   node scripts/backfillMastery.js            # apply
 *   node scripts/backfillMastery.js --dry-run  # report only, no writes
 *
 * Per user, per (canonical) topic — the topic name via the question's Topic,
 * else the attempt's stored label, as analytics attribute it:
 *   - pMastery/masteryN: the attempts replayed chronologically through BKT;
 *   - attempts/correct/totalTime: counted from the same history by the rule
 *     live telemetry uses (time = floor(ms/1000) per attempt, only inside the
 *     plausibility band), so a row telemetry kept correctly is unchanged. A row
 *     that drifted — e.g. the pre-#102 bug that counted an in-batch duplicate
 *     twice — is corrected, and every correction is reported;
 *   - a row whose label no longer has any attempts (its questions were
 *     relabelled, e.g. by scripts/linkQuestionTopics.js) is removed only when
 *     history proves those attempts now count under another row: answers were
 *     recorded under its label and cover its whole tally. Any other such row
 *     is left as is and reported (planUserRollups).
 * A new key is created with its real counts. (It used to be created with
 * correct: 0 and the old label's row was left behind — after the 2026-10-03
 * relabel one learner had masteryN 5 against 3 attempts plus an orphan row.)
 *
 * Each user's rows are rebuilt in one transaction under the same
 * `SELECT … FOR UPDATE` lock on the user that telemetryService takes per write,
 * so a learner answering mid-run can't interleave with the rebuild.
 *
 * Idempotent: a re-run over consistent rows changes nothing.
 */
require('dotenv').config();
const prisma = require('../src/config/db');
const { HISTORY_SELECT, foldUserMastery, planUserRollups, writePlan } = require('../src/services/masteryRollups');
const { masteryBand } = require('@ree/shared');

function parseArgs(argv) {
    const out = { dryRun: false };
    for (const a of argv.slice(2)) if (a === '--dry-run') out.dryRun = true;
    return out;
}

// Coarse distribution buckets for the report — the shared bands.
function bucketOf(pMastery) {
    return masteryBand(pMastery)?.key ?? 'novice';
}

async function readAndPlan(db, userId) {
    const attempts = await db.questionAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: HISTORY_SELECT,
    });
    const existing = await db.userTopicPerformance.findMany({
        where: { userId },
        select: { id: true, topic: true, attempts: true, correct: true, totalTime: true },
    });
    return { attemptCount: attempts.length, plan: planUserRollups(existing, foldUserMastery(attempts), attempts) };
}

const fmtCounts = (c) => `${c.attempts} attempts / ${c.correct} correct / ${c.totalTime}s`;
const UNPROVEN_WHY = {
    'no-history': () => 'no answer in history was recorded under it',
    uncovered: (u) => `history recorded only ${fmtCounts(u.history)} under it`,
};

async function main() {
    const { dryRun } = parseArgs(process.argv);
    const t0 = Date.now();
    console.log(`[backfillMastery] start  dryRun=${dryRun}`);

    const users = await prisma.user.findMany({ select: { id: true } });
    const totals = { processed: 0, rowsWritten: 0, created: 0, countFixes: 0, orphans: 0, unproven: 0, skippedNoAttempts: 0 };
    const dist = { mastered: 0, proficient: 0, developing: 0, novice: 0 };

    for (const u of users) {
        const { attemptCount, plan } = dryRun
            ? await readAndPlan(prisma, u.id)
            : await prisma.$transaction(async (tx) => {
                // The lock telemetryService takes per write: no answer from
                // this learner can land between the read and the rewrite.
                await tx.$queryRaw`SELECT 1 FROM "User" WHERE "id" = ${u.id} FOR UPDATE`;
                const result = await readAndPlan(tx, u.id);
                await writePlan(tx, u.id, result.plan);
                return result;
            }, { timeout: 120_000, maxWait: 15_000 });

        if (attemptCount === 0) totals.skippedNoAttempts += 1;
        else totals.processed += 1;

        const uid = u.id.slice(0, 6);
        for (const w of plan.writes) {
            dist[bucketOf(w.pMastery)] += 1;
            totals.rowsWritten += 1;
            if (w.id === null) {
                totals.created += 1;
                console.log(`  + [${uid}] "${w.topic}": new row, ${fmtCounts(w)}`);
            } else if (w.countFix) {
                totals.countFixes += 1;
                console.log(`  ~ [${uid}] "${w.topic}": counts ${fmtCounts(w.countFix.from)} -> ${fmtCounts(w.countFix.to)} (from history)`);
            }
        }
        for (const o of plan.orphans) {
            totals.orphans += 1;
            console.log(`  - [${uid}] "${o.topic}": no attempts under this label any more (${fmtCounts(o)}); its answers now count under ${o.into.map((t) => `"${t}"`).join(', ')} — ${dryRun ? 'would remove' : 'removed'}`);
        }
        for (const o of plan.unproven) {
            totals.unproven += 1;
            console.log(`  ? [${uid}] "${o.topic}": no attempts under this label any more (${fmtCounts(o)}), but ${UNPROVEN_WHY[o.reason](o)} — left as is (${o.reason})`);
        }
    }

    if (dryRun) totals.rowsWritten = 0;
    console.log(`[backfillMastery] mastery distribution (topic rows): ${JSON.stringify(dist)}`);
    console.log(`[backfillMastery] done  processedUsers=${totals.processed}  rowsWritten=${totals.rowsWritten}  created=${totals.created}  countFixes=${totals.countFixes}  orphansRemoved=${dryRun ? 0 : totals.orphans}${dryRun ? ` (would remove ${totals.orphans})` : ''}  orphansLeft=${totals.unproven}  skippedNoAttempts=${totals.skippedNoAttempts}  totalUsers=${users.length}  ${Date.now() - t0}ms`);
}

// Exported for unit tests; only auto-run when invoked directly.
module.exports = { foldUserMastery, planUserRollups, bucketOf };

if (require.main === module) {
    main()
        .catch((err) => {
            console.error('[backfillMastery] failed', err);
            process.exitCode = 1;
        })
        .finally(() => prisma.closeDb());
}
