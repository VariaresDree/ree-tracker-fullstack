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
 *     relabelled, e.g. by scripts/linkQuestionTopics.js) is removed; those
 *     attempts now count under the new label's row.
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
const { bktSequence } = require('../src/engine/bkt');
const { paramsForTopic } = require('../src/config/bktParams');
const { plausibleTimeMs } = require('../src/config/telemetryBounds');
const { masteryBand } = require('@ree/shared');

function parseArgs(argv) {
    const out = { dryRun: false };
    for (const a of argv.slice(2)) if (a === '--dry-run') out.dryRun = true;
    return out;
}

// Pure: fold one user's chronological attempts into per-topic BKT mastery and
// counts. Each attempt carries its resolved topic name/subject (COALESCE of the
// question's Topic and the attempt's stored label), so re-tagging history is
// respected. Returns one row per topic.
function foldUserMastery(attempts) {
    const byTopic = new Map(); // topic -> { subject, topicId, observations, correct, totalTime, lastPracticedAt }
    for (const a of attempts) {
        const t = a.question?.topic;
        const topic = t?.name || a.subtopic || 'General';
        let entry = byTopic.get(topic);
        if (!entry) {
            entry = { subject: t?.subject || a.subject || 'General', topicId: a.question?.topicId ?? null, observations: [], correct: 0, totalTime: 0, lastPracticedAt: null };
            byTopic.set(topic, entry);
        }
        entry.observations.push(!!a.isCorrect);
        if (a.isCorrect) entry.correct += 1;
        // Same per-attempt rule as telemetryHelpers.aggregateTopicRollups.
        entry.totalTime += Math.floor(plausibleTimeMs(a.timeSpentMs) / 1000);
        // The clock mastery decay runs from: the latest answer in the topic.
        const at = a.answeredAt || a.createdAt;
        if (at && (!entry.lastPracticedAt || new Date(at) > entry.lastPracticedAt)) entry.lastPracticedAt = new Date(at);
    }
    const out = [];
    for (const [topic, { subject, topicId, observations, correct, totalTime, lastPracticedAt }] of byTopic) {
        const { pMastery, n } = bktSequence(observations, paramsForTopic(topic));
        out.push({ topic, subject, topicId, pMastery, masteryN: n, lastPracticedAt, attempts: observations.length, correct, totalTime });
    }
    return out;
}

const COUNT_FIELDS = ['attempts', 'correct', 'totalTime'];
const pickCounts = (r) => Object.fromEntries(COUNT_FIELDS.map((f) => [f, r[f]]));

/**
 * Pure: what to write for one user. `writes` has one entry per folded topic
 * (`id` null = create), with `countFix` when the stored counts differ from
 * history. `orphans` are stored rows whose topic has no attempts any more.
 */
function planUserRollups(existingRows, folded) {
    const byTopic = new Map((existingRows || []).map((r) => [r.topic, r]));
    const writes = folded.map((f) => {
        const row = byTopic.get(f.topic);
        const write = { ...f, id: row?.id ?? null };
        if (row && COUNT_FIELDS.some((k) => row[k] !== f[k])) {
            write.countFix = { from: pickCounts(row), to: pickCounts(f) };
        }
        return write;
    });
    const live = new Set(folded.map((f) => f.topic));
    const orphans = (existingRows || [])
        .filter((r) => !live.has(r.topic))
        .map((r) => ({ id: r.id, topic: r.topic, ...pickCounts(r) }));
    return { writes, orphans };
}

// Coarse distribution buckets for the report — the shared bands.
function bucketOf(pMastery) {
    return masteryBand(pMastery)?.key ?? 'novice';
}

async function readAndPlan(db, userId) {
    const attempts = await db.questionAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: {
            isCorrect: true,
            subject: true,
            subtopic: true,
            timeSpentMs: true,
            answeredAt: true,
            createdAt: true,
            question: { select: { topicId: true, topic: { select: { name: true, subject: true } } } },
        },
    });
    const existing = await db.userTopicPerformance.findMany({
        where: { userId },
        select: { id: true, topic: true, attempts: true, correct: true, totalTime: true },
    });
    return { attemptCount: attempts.length, plan: planUserRollups(existing, foldUserMastery(attempts)) };
}

async function writePlan(db, userId, plan) {
    for (const w of plan.writes) {
        await db.userTopicPerformance.upsert({
            where: { userId_topic: { userId, topic: w.topic } },
            update: {
                pMastery: w.pMastery, masteryN: w.masteryN,
                attempts: w.attempts, correct: w.correct, totalTime: w.totalTime,
                topicId: w.topicId ?? undefined, lastPracticedAt: w.lastPracticedAt ?? undefined,
            },
            create: {
                userId, subject: w.subject, topic: w.topic, topicId: w.topicId ?? null,
                attempts: w.attempts, correct: w.correct, totalTime: w.totalTime,
                pMastery: w.pMastery, masteryN: w.masteryN, lastPracticedAt: w.lastPracticedAt ?? null,
            },
        });
    }
    if (plan.orphans.length) {
        await db.userTopicPerformance.deleteMany({ where: { userId, id: { in: plan.orphans.map((o) => o.id) } } });
    }
}

const fmtCounts = (c) => `${c.attempts} attempts / ${c.correct} correct / ${c.totalTime}s`;

async function main() {
    const { dryRun } = parseArgs(process.argv);
    const t0 = Date.now();
    console.log(`[backfillMastery] start  dryRun=${dryRun}`);

    const users = await prisma.user.findMany({ select: { id: true } });
    const totals = { processed: 0, rowsWritten: 0, created: 0, countFixes: 0, orphans: 0, skippedNoAttempts: 0 };
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
            console.log(`  - [${uid}] "${o.topic}": no attempts under this label any more (${fmtCounts(o)}) — ${dryRun ? 'would remove' : 'removed'}`);
        }
    }

    if (dryRun) totals.rowsWritten = 0;
    console.log(`[backfillMastery] mastery distribution (topic rows): ${JSON.stringify(dist)}`);
    console.log(`[backfillMastery] done  processedUsers=${totals.processed}  rowsWritten=${totals.rowsWritten}  created=${totals.created}  countFixes=${totals.countFixes}  orphansRemoved=${dryRun ? 0 : totals.orphans}${dryRun ? ` (would remove ${totals.orphans})` : ''}  skippedNoAttempts=${totals.skippedNoAttempts}  totalUsers=${users.length}  ${Date.now() - t0}ms`);
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
