#!/usr/bin/env node
/*
 * One-time BKT mastery backfill (roadmap 3.5). UserTopicPerformance.pMastery is
 * updated online per attempt by telemetryService going forward, but existing
 * response history predates that. This replays each user's attempts
 * chronologically per (canonical) topic through BKT to seed pMastery/masteryN.
 *
 * Usage:
 *   node scripts/backfillMastery.js            # apply
 *   node scripts/backfillMastery.js --dry-run  # full report, no writes
 *
 * Idempotent: it always replays from pInit, so re-running yields the same
 * result. Per user it reconciles the rows with history (planUserBackfill):
 *   - refreshes the derived pMastery/masteryN/topicId/lastPracticedAt;
 *   - leaves the attempts/correct/totalTime counts to telemetry, their live
 *     owner, unless history proves them wrong — then corrects them and logs
 *     from -> to;
 *   - creates a missing row with the counts history implies;
 *   - deletes a row whose key no longer folds (e.g. a label link:topics
 *     relabelled) only when history proves its tally now counts under another
 *     key, and logs every such row and every orphan it declines to touch.
 * Each user is one transaction under the same user lock telemetry takes.
 * Re-run after anything that relabels questions (link:topics:apply).
 */
require('dotenv').config();
const prisma = require('../src/config/db');
const { bktSequence } = require('../src/engine/bkt');
const { paramsForTopic } = require('../src/config/bktParams');
const { masteryBand } = require('@ree/shared');
const { plausibleTimeMs } = require('../src/config/telemetryBounds');

function parseArgs(argv) {
    const out = { dryRun: false };
    for (const a of argv.slice(2)) if (a === '--dry-run') out.dryRun = true;
    return out;
}

// The UserTopicPerformance counters history can prove or disprove.
const COUNT_FIELDS = ['attempts', 'correct', 'totalTime'];
const countsOf = (r) => ({ attempts: r.attempts, correct: r.correct, totalTime: r.totalTime });

// The key an attempt folds under now: COALESCE of the question's Topic name and
// the label it was recorded under — the same COALESCE analytics and
// migrate:taxonomy's rebuild use.
const foldKeyOf = (a) => a.question?.topic?.name || a.subtopic || 'General';

// Add one attempt to a counter. Time is in seconds, floored per attempt within
// the live telemetry plausibility band — exactly as aggregateTopicRollups and
// migrate:taxonomy's rebuild query count it.
function tally(counts, a) {
    counts.attempts += 1;
    if (a.isCorrect) counts.correct += 1;
    counts.totalTime += Math.floor(plausibleTimeMs(a.timeSpentMs) / 1000);
}

// Pure: fold one user's chronological attempts into per-topic BKT mastery.
// Each attempt carries its resolved topic name/subject (COALESCE of the
// question's Topic and the attempt's stored label), so re-tagging history is
// respected. Returns one row per topic with the final P(mastery) and the
// attempts/correct/totalTime the history implies.
function foldUserMastery(attempts) {
    const byTopic = new Map(); // topic -> { subject, topicId, observations: [], counts }
    for (const a of attempts) {
        const t = a.question?.topic;
        const topic = foldKeyOf(a);
        let entry = byTopic.get(topic);
        if (!entry) {
            entry = { subject: t?.subject || a.subject || 'General', topicId: a.question?.topicId ?? null, observations: [], lastPracticedAt: null, attempts: 0, correct: 0, totalTime: 0 };
            byTopic.set(topic, entry);
        }
        entry.observations.push(!!a.isCorrect);
        tally(entry, a);
        // The clock mastery decay runs from: the latest answer in the topic.
        const at = a.answeredAt || a.createdAt;
        if (at && (!entry.lastPracticedAt || new Date(at) > entry.lastPracticedAt)) entry.lastPracticedAt = new Date(at);
    }
    const out = [];
    for (const [topic, entry] of byTopic) {
        const { pMastery, n } = bktSequence(entry.observations, paramsForTopic(topic));
        out.push({ topic, subject: entry.subject, topicId: entry.topicId, pMastery, masteryN: n, lastPracticedAt: entry.lastPracticedAt, ...countsOf(entry) });
    }
    return out;
}

// Pure: tally history by the label each answer was RECORDED under
// (QuestionAttempt.subtopic, copied from the question at answer time). That is
// the key telemetry upserted the answer's UserTopicPerformance row by, so it is
// the evidence for where an existing row's tally came from. `into` = the fold
// keys those answers count under now.
function tallyRecordedLabels(attempts) {
    const byLabel = new Map();
    for (const a of attempts) {
        const label = a.subtopic || 'General';
        let entry = byLabel.get(label);
        if (!entry) {
            entry = { attempts: 0, correct: 0, totalTime: 0, into: new Set() };
            byLabel.set(label, entry);
        }
        tally(entry, a);
        entry.into.add(foldKeyOf(a));
    }
    return byLabel;
}

/**
 * Pure: reconcile one user's UserTopicPerformance rows with their history.
 *
 * - Fold key with no row → create it with the history's counts.
 * - Fold key with a row → refresh the derived mastery fields. The counters are
 *   telemetry's and stay as they are, unless they differ from what history
 *   implies; then they are corrected and the change is returned as
 *   `correction: { from, to }` for the log.
 * - Row whose key the fold no longer produces → `superseded` (delete) only when
 *   history proves where its tally went: answers were recorded under its label,
 *   every one of them now folds under another key, and together they cover
 *   the row's attempts, correct and seconds. Otherwise it is `unproven` and
 *   left alone: `no-history` (nothing was recorded under it) or `uncovered`
 *   (it counts more than history recorded under it).
 *
 * Nothing is summed into the surviving row: its counts come from the fold,
 * which already includes the superseded label's answers.
 *
 * @param {Array<{id, topic, attempts, correct, totalTime}>} existingRows
 * @param {Array} attempts - the user's attempts, chronological
 * @returns {{rows, creates, updates, superseded, unproven}}
 */
function planUserBackfill(existingRows, attempts) {
    const rows = foldUserMastery(attempts);
    const existingByTopic = new Map(existingRows.map((r) => [r.topic, r]));

    const creates = [];
    const updates = [];
    for (const r of rows) {
        const prev = existingByTopic.get(r.topic);
        if (!prev) {
            creates.push({
                subject: r.subject, topic: r.topic, topicId: r.topicId ?? null, ...countsOf(r),
                pMastery: r.pMastery, masteryN: r.masteryN, lastPracticedAt: r.lastPracticedAt ?? null,
            });
            continue;
        }
        const data = { pMastery: r.pMastery, masteryN: r.masteryN, topicId: r.topicId ?? undefined, lastPracticedAt: r.lastPracticedAt ?? undefined };
        let correction = null;
        if (COUNT_FIELDS.some((k) => prev[k] !== r[k])) {
            correction = { from: countsOf(prev), to: countsOf(r) };
            Object.assign(data, correction.to);
        }
        updates.push({ id: prev.id, topic: r.topic, data, correction });
    }

    const foldKeys = new Set(rows.map((r) => r.topic));
    const labels = tallyRecordedLabels(attempts);
    const superseded = [];
    const unproven = [];
    for (const prev of existingRows) {
        if (foldKeys.has(prev.topic)) continue;
        const counts = countsOf(prev);
        const recorded = labels.get(prev.topic);
        if (!recorded) {
            unproven.push({ id: prev.id, topic: prev.topic, counts, reason: 'no-history' });
        } else if (COUNT_FIELDS.some((k) => counts[k] > recorded[k])) {
            unproven.push({ id: prev.id, topic: prev.topic, counts, history: countsOf(recorded), reason: 'uncovered' });
        } else {
            // The label isn't a fold key, so none of its answers fold under it.
            superseded.push({ id: prev.id, topic: prev.topic, counts, into: [...recorded.into].sort() });
        }
    }

    return { rows, creates, updates, superseded, unproven };
}

const fmtCounts = (c) => `${c.attempts}/${c.correct}/${c.totalTime}s`;
const UNPROVEN_WHY = {
    'no-history': () => 'no answer was recorded under this label',
    uncovered: (u) => `history recorded only ${fmtCounts(u.history)} under this label`,
};

// Pure: one log line per count correction, superseded row and unproven row —
// every row the plan changes beyond the derived mastery fields, or declines to.
function describePlan(userId, plan) {
    return [
        ...plan.updates.filter((u) => u.correction).map((u) =>
            `user ${userId} "${u.topic}": counts ${fmtCounts(u.correction.from)} -> ${fmtCounts(u.correction.to)} (history)`),
        ...plan.superseded.map((s) =>
            `user ${userId} "${s.topic}" (${fmtCounts(s.counts)}): superseded by ${s.into.map((t) => `"${t}"`).join(', ')} -> delete`),
        ...plan.unproven.map((u) =>
            `user ${userId} "${u.topic}" (${fmtCounts(u.counts)}): not in the fold, left as is (${u.reason}: ${UNPROVEN_WHY[u.reason](u)})`),
    ];
}

// Coarse distribution buckets for the dry-run report — the shared bands.
function bucketOf(pMastery) {
    return masteryBand(pMastery)?.key ?? 'novice';
}

// The user lock below blocks that user's telemetry until commit, so the budget
// is bounded; the reads and writes cross the public internet, so it isn't
// Prisma's same-host default either (cf. telemetryService TX_OPTS).
const TX_OPTS = { maxWait: 10_000, timeout: 30_000 };

const ATTEMPT_SELECT = {
    isCorrect: true,
    subject: true,
    subtopic: true,
    timeSpentMs: true,
    answeredAt: true,
    createdAt: true,
    question: { select: { topicId: true, topic: { select: { name: true, subject: true } } } },
};

async function readAndPlan(db, userId) {
    const existing = await db.userTopicPerformance.findMany({
        where: { userId },
        select: { id: true, topic: true, attempts: true, correct: true, totalTime: true },
    });
    const attempts = await db.questionAttempt.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, select: ATTEMPT_SELECT });
    return { attemptCount: attempts.length, plan: planUserBackfill(existing, attempts) };
}

// update/delete by id from the locked snapshot: a row that vanished since
// (e.g. a /purge) throws, rolling the whole user back instead of guessing.
async function applyPlan(db, userId, plan) {
    for (const u of plan.updates) await db.userTopicPerformance.update({ where: { id: u.id }, data: u.data });
    for (const c of plan.creates) await db.userTopicPerformance.create({ data: { userId, ...c } });
    for (const s of plan.superseded) await db.userTopicPerformance.delete({ where: { id: s.id } });
}

async function main() {
    const { dryRun } = parseArgs(process.argv);
    const t0 = Date.now();
    console.log(`[backfillMastery] start  dryRun=${dryRun}`);

    const users = await prisma.user.findMany({ select: { id: true } });
    const totals = { processedUsers: 0, updated: 0, created: 0, countsCorrected: 0, supersededDeleted: 0, unprovenLeft: 0, failedUsers: 0, skippedNoAttempts: 0 };
    const dist = { mastered: 0, proficient: 0, developing: 0, novice: 0 };

    for (const u of users) {
        let outcome;
        try {
            outcome = dryRun
                ? await readAndPlan(prisma, u.id)
                : await prisma.$transaction(async (db) => {
                    // The lock telemetry takes first (telemetryService runChunk):
                    // no batch can land between this snapshot and these writes,
                    // so a correction can never overwrite a newer live count.
                    await db.$queryRaw`SELECT 1 FROM "User" WHERE "id" = ${u.id} FOR UPDATE`;
                    const res = await readAndPlan(db, u.id);
                    if (res.attemptCount > 0) await applyPlan(db, u.id, res.plan);
                    return res;
                }, TX_OPTS);
        } catch (err) {
            totals.failedUsers += 1;
            console.error(`[backfillMastery] user ${u.id}: rolled back, nothing written for this user (${err.message})`);
            continue;
        }
        if (outcome.attemptCount === 0) { totals.skippedNoAttempts += 1; continue; }

        const { plan } = outcome;
        totals.processedUsers += 1;
        totals.updated += plan.updates.length;
        totals.created += plan.creates.length;
        totals.countsCorrected += plan.updates.filter((x) => x.correction).length;
        totals.supersededDeleted += plan.superseded.length;
        totals.unprovenLeft += plan.unproven.length;
        for (const r of plan.rows) dist[bucketOf(r.pMastery)] += 1;
        for (const line of describePlan(u.id, plan)) console.log(`[backfillMastery]${dryRun ? ' (dry run)' : ''} ${line}`);
    }

    if (totals.failedUsers > 0) process.exitCode = 1;
    console.log(`[backfillMastery] mastery distribution (topic rows): ${JSON.stringify(dist)}`);
    console.log(`[backfillMastery] done${dryRun ? ' (dry run, nothing written)' : ''}  ${Object.entries(totals).map(([k, v]) => `${k}=${v}`).join('  ')}  totalUsers=${users.length}  ${Date.now() - t0}ms`);
}

// Exported for unit tests; only auto-run when invoked directly.
module.exports = { foldUserMastery, planUserBackfill, describePlan, bucketOf };

if (require.main === module) {
    main()
        .catch((err) => {
            console.error('[backfillMastery] failed', err);
            process.exit(1);
        })
        .finally(() => prisma.$disconnect());
}
