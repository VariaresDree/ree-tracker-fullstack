// src/services/telemetryService.js
// Shared telemetry-writing helper used by /api/analytics/telemetry-bulk,
// /api/exams/grade, and /api/battles/:id/submit so every answered question
// from anywhere in the app lands in QuestionAttempt + ActivityLog and updates
// the user's IRT theta + lastActive.
const { Prisma } = require('@prisma/client');
const { randomUUID } = require('crypto');
const prisma = require('../config/db');
// Single canonical ability estimator: the 3PL Bayesian MLE (engine/irt.updateTheta),
// replacing the old Rasch gradient step (utils/irtMath.calculateUpdatedTheta). This
// puts User.thetaRating + standardError on the same scale the CAT prior and the
// forecast already assume, and populates the (previously never-written) standardError.
const { updateTheta } = require('../engine/irt');
const { bktSequence } = require('../engine/bkt');
const { paramsForTopic } = require('../config/bktParams');
const { mapAttemptRows, partitionNewAttempts, aggregateTopicRollups, toEstimatorPair, groupPairsBySubject, orderedObservationsByTopic } = require('./telemetryHelpers');
const { resolveTopic } = require('./topicResolver');
const dashboardCache = require('./dashboardCache');
const readinessCache = require('./readinessCache');
const logger = require('../utils/logger');

// Canonical subject naming lives in one place now (utils/subject); kept aliased
// as canonicalSubject for this module's internal uses and its export.
const { normalizeSubject: canonicalSubject } = require('../utils/subject');

// Manila calendar-day helpers — single source of truth in utils/manilaDate.js
// (also used by the raw-SQL bucketing in analyticsRoutes.js, which needs a
// different, two-step expression than these JS-side ones do — see that file
// for why).
const { todayManila, yesterdayManila, manilaDateOf } = require('../utils/manilaDate');

/**
 * Reduce per-day buckets so they sum to `total`, trimming the most recent days
 * first. Used when createMany's skipDuplicates race means fewer rows landed
 * than we intended to write: the ActivityLog ledger must never claim more
 * activity than the QuestionAttempt table actually holds. Mutates in place.
 *
 * Exact attribution of WHICH rows lost the race isn't recoverable from
 * createMany's count alone, so this keeps the total honest (the property the
 * tally depends on) and accepts imprecision in the day split of a rare race.
 */
function trimBucketsTo(buckets, total) {
    let excess = [...buckets.values()].reduce((s, n) => s + n, 0) - total;
    if (excess <= 0) return buckets;
    for (const day of [...buckets.keys()].sort().reverse()) {
        if (excess <= 0) break;
        const take = Math.min(buckets.get(day), excess);
        buckets.set(day, buckets.get(day) - take);
        excess -= take;
    }
    return buckets;
}

/**
 * How many attempts are written per transaction. An offline outbox flush can
 * carry up to 500 attempts (telemetrySchemas cap); writing them in ONE
 * interactive transaction meant ~45 sequential round-trips (one ActivityLog
 * upsert per Manila day + one UserTopicPerformance update per topic), which on
 * a Render->Supabase RTT blew Prisma's transaction budget. The whole batch then
 * rolled back, the endpoint 500'd, and the client retried the same oversized
 * batch forever. Chunking bounds the work per transaction so a large flush
 * makes forward progress instead of failing as a unit.
 */
const ATTEMPT_CHUNK_SIZE = 100;

// Interactive-transaction budget. Prisma's defaults (maxWait 2s / timeout 5s)
// are tuned for same-host Postgres; this service talks to Supabase over the
// public internet, so a chunk of 100 attempts legitimately needs longer than 5s
// under load. Explicit values make the budget a decision rather than a default.
const TX_OPTS = { maxWait: 5_000, timeout: 20_000 };

function chunkRows(rows, size) {
    const out = [];
    for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
    return out;
}

/**
 * Record a batch of answered questions for a user.
 *
 * The attempt rows, the ActivityLog ledger, the topic rollups, the BKT fold,
 * theta and the streak all commit as ONE transaction per chunk, under a
 * `SELECT ... FOR UPDATE` row lock on the user. Splitting them across two
 * transactions (the previous design) produced two defects: concurrent first
 * batches of a Manila day each decided "this is the first activity today"
 * before either had committed its ActivityLog row and both incremented the
 * streak; and a failure between the two transactions committed the attempts
 * but lost the ability update permanently, because the retry saw every row as
 * a duplicate and took the pure-replay path.
 *
 * If a non-null `sessionId` is provided but no matching ExamSession row exists
 * (the common case — frontend mints a UUID per session), the ExamSession is
 * upserted FIRST so the QuestionAttempt FK is satisfied.
 *
 * @param {object} opts
 * @param {string} opts.userId
 * @param {Array<{questionId, userAnswer?, isCorrect?, confidenceLevel?, timeSpentMs?, subject?, subtopic?}>} opts.attempts
 * @param {string} [opts.sessionId] — optional ExamSession id; auto-created if needed
 * @param {string} [opts.mode] — quiz mode tag (ACTIVE_REVIEW | BOARD_SIM | GAUNTLET | COMBAT | BATTLE)
 * @param {string} [opts.targetSubject] — subject the session is targeting (for the auto-created ExamSession)
 * @returns {Promise<{ written: number, updatedTheta: number, sessionId: string|null }>}
 */
async function recordAttempts({ userId, attempts, sessionId = null, mode = 'LEGACY', targetSubject = null }) {
    if (!Array.isArray(attempts) || attempts.length === 0) {
        return { written: 0, updatedTheta: null, sessionId: null, graded: [] };
    }

    const questionIds = attempts.map((a) => a.questionId).filter(Boolean);
    const masterQuestions = questionIds.length
        ? await prisma.question.findMany({
            where: { id: { in: questionIds } },
            select: { id: true, answer: true, difficulty: true, subject: true, subtopic: true, irtA: true, irtB: true, irtC: true },
        })
        : [];
    const qMap = Object.create(null);
    for (const q of masterQuestions) qMap[q.id] = q;

    // Mapping is a pure helper (telemetryHelpers.mapAttemptRows) so the
    // server-canonical naming/grading rules are unit-testable: master-question
    // subject/subtopic win over the client's copy (Phase 3.3 — a stale offline
    // pack may still send a pre-taxonomy label), and grading discrepancies are
    // surfaced, not silent.
    const { mapped, gradeDiscrepancies } = mapAttemptRows(attempts, qMap, { userId, sessionId, mode });

    if (gradeDiscrepancies.length > 0) {
        logger.warn('telemetry grading discrepancy (server score is canonical)', {
            userId, mode, count: gradeDiscrepancies.length, samples: gradeDiscrepancies.slice(0, 10),
        });
    }

    // `skipped` makes silent drops observable: attempts whose questionId
    // isn't in the Question table (e.g. unsaved AI-generated items) used to
    // vanish without a trace, undercounting sessions.
    const skipped = attempts.length - mapped.length;

    if (mapped.length === 0) {
        return { written: 0, received: attempts.length, skipped, deduped: 0, updatedTheta: null, sessionId: null, graded: [] };
    }

    const today = todayManila();

    // Resolve taxonomy FKs BEFORE opening any transaction. resolveTopic reads a
    // TTL-cached index, but a cache miss issues prisma.topic.findMany on the
    // MODULE-level client — a second pool checkout. Doing that from inside an
    // interactive transaction (which already holds a connection) deadlocks the
    // pool once concurrent writers reach its size: every transaction ends up
    // waiting for a connection only a transaction can release. Resolution reads
    // slow-moving reference data, so hoisting it costs nothing in correctness
    // and removes the cycle entirely.
    const topicIdByKey = new Map();
    for (const r of aggregateTopicRollups(mapped)) {
        const key = `${r.subject}\u0000${r.topic}`;
        if (topicIdByKey.has(key)) continue;
        topicIdByKey.set(key, (await resolveTopic(r.subject, r.topic))?.id ?? null);
    }

    let resolvedSessionId = sessionId;
    let writtenCount = 0;
    let dedupedCount = 0;
    let updatedTheta = null;
    let updatedSe = null;
    let sawAnyWrite = false;

    /**
     * Write one chunk. Ordering is load-bearing: the `SELECT ... FOR UPDATE` on
     * User is taken FIRST, before the ActivityLog read that decides
     * `isFirstActivityToday`, so a concurrent writer observes this one's
     * committed ActivityLog row instead of racing it.
     */
    const runChunk = async (db, rows) => {
        // 1. Serialize same-user writers.
        const [user] = await db.$queryRaw`SELECT "thetaRating", "standardError", "globalStreak" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;

        // 2. Hard dedupe: rows whose clientAttemptId this user already recorded
        //    are replays (retry after a timeout the server actually completed,
        //    app-reopen re-flush, etc.) — grade them, but write NOTHING.
        const claimedIds = rows.map((m) => m.clientAttemptId).filter(Boolean);
        const existing = claimedIds.length
            ? await db.questionAttempt.findMany({
                where: { userId, clientAttemptId: { in: claimedIds } },
                select: { clientAttemptId: true },
            })
            : [];
        const partition = partitionNewAttempts(new Set(existing.map((e) => e.clientAttemptId)), rows);
        const newOnly = partition.newOnly;
        dedupedCount += partition.duplicates.length;

        if (newOnly.length === 0) return; // pure replay — nothing to write

        sawAnyWrite = true;

        // 3. ExamSession shell, so the QuestionAttempt FK is satisfied.
        //    Increments are computed from the NEW rows only — a replayed batch
        //    used to re-increment these counters, which is how a 10-item
        //    session showed 20/30+ answered.
        if (sessionId) {
            const batchCorrect = newOnly.filter((m) => m.isCorrect).length;
            const batchTimeSecs = Math.floor(newOnly.reduce((s, m) => s + (m.timeSpentMs || 0), 0) / 1000);
            const batchTarget = canonicalSubject(targetSubject || newOnly[0]?.subject || 'General');
            // Deliberately NOT wrapped in try/catch: inside an interactive
            // transaction a failed statement has already aborted the
            // transaction in Postgres, so swallowing the error and returning
            // sessionId=null produced "current transaction is aborted" on the
            // very next statement. The chunk failed either way — letting it
            // propagate surfaces the real cause instead of a generic 500.
            await db.examSession.upsert({
                // Compound (id, userId) — NOT id alone. Keyed on id, a
                // client-supplied sessionId that matched ANOTHER user's row took
                // the UPDATE branch and incremented their score, question count
                // and time, while the attempts written below were parented to
                // their session via the FK. sessionId arrives straight from the
                // request body, so this was a cross-tenant write.
                //
                // With the compound key a foreign id simply misses and takes the
                // CREATE branch, which fails on the primary key rather than
                // silently corrupting someone else's exam history.
                where: { id_userId: { id: sessionId, userId } },
                update: {
                    score: { increment: batchCorrect },
                    totalQuestions: { increment: newOnly.length },
                    timeTakenSecs: { increment: batchTimeSecs },
                },
                create: {
                    id: sessionId,
                    userId,
                    mode,
                    targetSubject: batchTarget,
                    score: batchCorrect,
                    totalQuestions: newOnly.length,
                    timeTakenSecs: batchTimeSecs,
                    verdict: 'IN_PROGRESS',
                },
            });
            resolvedSessionId = sessionId;
        } else {
            resolvedSessionId = null;
        }

        const attemptsData = newOnly.map(({ _difficulty, _a, _b, _c, _serverGraded, sessionId: _s, ...rest }) => ({
            ...rest,
            sessionId: resolvedSessionId,
        }));
        // skipDuplicates backstops the race where two identical batches pass
        // the pre-select simultaneously — the (userId, clientAttemptId) unique
        // index turns the loser's insert into a no-op.
        //
        // `count` is how many rows were ACTUALLY inserted, which can be fewer
        // than newOnly.length when that race fires. The ActivityLog increments
        // below MUST use it: incrementing by the intended count instead was how
        // the streak ledger drifted permanently above the real attempt count.
        const { count: insertedCount } = await db.questionAttempt.createMany({
            data: attemptsData,
            skipDuplicates: true,
        });
        writtenCount += insertedCount;

        // 4. Bucket the inserted rows by the Manila day they were ANSWERED, not
        //    the day they synced — an offline batch can legitimately span days.
        const buckets = new Map();
        for (const row of attemptsData) {
            const day = manilaDateOf(row.answeredAt || new Date());
            buckets.set(day, (buckets.get(day) || 0) + 1);
        }
        if (insertedCount < attemptsData.length) {
            trimBucketsTo(buckets, insertedCount);
        }

        // Decided INSIDE the user lock — see the ordering note above.
        const existingToday = await db.activityLog.findUnique({
            where: { userId_date: { userId, date: today } },
            select: { userId: true },
        });
        // `> 0`, not mere key presence: a day trimmed to zero by the
        // skipDuplicates race writes no ActivityLog row, so treating the key as
        // activity let a batch advance the streak while recording nothing for
        // today — and the next batch would then see "first activity" again.
        const isFirstActivityToday = !existingToday && (buckets.get(today) || 0) > 0;

        for (const [day, count] of buckets) {
            if (count <= 0) continue;
            await db.activityLog.upsert({
                where: { userId_date: { userId, date: day } },
                update: { count: { increment: count } },
                create: { userId, date: day, count },
            });
        }

        // 5. Per-topic rollups feed the forecast/prescription engine. Batched
        //    into ONE upsert statement instead of a serial await-loop.
        const rollups = aggregateTopicRollups(newOnly);
        if (rollups.length > 0) {
            const now = new Date();
            const withTopicIds = rollups.map((r) => ({
                ...r,
                topicId: topicIdByKey.get(`${r.subject}\u0000${r.topic}`) ?? null,
            }));
            const valueRows = withTopicIds.map((r) => Prisma.sql`(${randomUUID()}, ${userId}, ${r.subject}, ${r.topic}, ${r.topicId}, ${r.attempts}, ${r.correct}, ${r.totalTimeSecs}, ${now})`);
            await db.$executeRaw`
                INSERT INTO "UserTopicPerformance" ("id", "userId", "subject", "topic", "topicId", "attempts", "correct", "totalTime", "updatedAt")
                VALUES ${Prisma.join(valueRows)}
                ON CONFLICT ("userId", "topic") DO UPDATE SET
                    "attempts"  = "UserTopicPerformance"."attempts"  + EXCLUDED."attempts",
                    "correct"   = "UserTopicPerformance"."correct"   + EXCLUDED."correct",
                    "totalTime" = "UserTopicPerformance"."totalTime" + EXCLUDED."totalTime",
                    "topicId"   = COALESCE(EXCLUDED."topicId", "UserTopicPerformance"."topicId"),
                    "updatedAt" = EXCLUDED."updatedAt"
            `;

            // BKT mastery fold (Phase 3.5). Sequential — can't be an additive
            // SQL upsert like the counts, so it's a small read->fold->write per
            // topic. Now under the same user lock, so two concurrent batches
            // touching one topic can no longer both seed from the same stored
            // pMastery and lose one batch's observations while both increment
            // masteryN.
            const obsByTopic = orderedObservationsByTopic(newOnly);
            const topicNames = [...obsByTopic.keys()];
            const existingMastery = await db.userTopicPerformance.findMany({
                where: { userId, topic: { in: topicNames } },
                select: { topic: true, pMastery: true, masteryN: true },
            });
            const masteryByTopic = new Map(existingMastery.map((r) => [r.topic, r]));
            for (const [topic, { observations }] of obsByTopic) {
                const prev = masteryByTopic.get(topic);
                const params = paramsForTopic(topic);
                const seed = prev && prev.pMastery != null ? prev.pMastery : params.pInit;
                const { pMastery } = bktSequence(observations, params, seed);
                // subject/topicId already persisted by the rollup upsert above.
                await db.userTopicPerformance.update({
                    where: { userId_topic: { userId, topic } },
                    data: { pMastery, masteryN: { increment: observations.length } },
                });
            }
        }

        // 6. Ability + streak, under the lock taken in step 1.
        //    3PL estimator input: each SERVER-GRADED attempt's item params (with
        //    fallbacks for uncalibrated items) + correctness. updateTheta folds
        //    these onto the prior posterior (theta, se) — a proper Bayesian
        //    update, not a fixed gradient step. Self-graded rows (flashcard
        //    ratings, or any attempt without a server-gradable userAnswer) are
        //    excluded here: they still count toward streak/activity/mastery
        //    above, but must never move ranked ability or the leaderboard,
        //    which is exactly the integrity invariant the mapping comment
        //    promises. A flashcard-only batch leaves theta unchanged. Because
        //    the update is Bayesian, folding a large batch in chunks converges
        //    to the same posterior as folding it whole.
        const gradedForTheta = newOnly.filter((m) => m._serverGraded);
        const pairs = gradedForTheta.map(toEstimatorPair);
        const prior = { theta: user?.thetaRating ?? 0.0, se: user?.standardError ?? 0.5 };
        const est = pairs.length ? updateTheta(prior, pairs) : prior;
        updatedTheta = est.theta;
        updatedSe = est.se;

        // Global Active Streak — advances at most once per Manila day. On the
        // first answered question of a new day we increment if yesterday also
        // had activity, otherwise the run is broken and we reset to 1. Later
        // batches the same day leave the streak untouched (but self-heal to >=1
        // for legacy rows that were stuck at 0 despite activity today).
        let newStreak;
        if (isFirstActivityToday) {
            const hadYesterday = await db.activityLog.findUnique({
                where: { userId_date: { userId, date: yesterdayManila() } },
                select: { userId: true },
            });
            newStreak = hadYesterday ? (user?.globalStreak ?? 0) + 1 : 1;
        } else {
            newStreak = Math.max(user?.globalStreak ?? 0, 1);
        }

        await db.user.update({
            where: { id: userId },
            data: { thetaRating: updatedTheta, standardError: updatedSe, lastActive: new Date(), globalStreak: newStreak },
        });

        // theta-history — one point per Manila day, updated in place within the
        // day so the Readiness Velocity chart gets clean daily samples and the
        // table stays bounded (one row/day instead of one/batch).
        const lastTheta = await db.thetaHistory.findFirst({
            where: { userId },
            orderBy: { recordedAt: 'desc' },
            select: { id: true, recordedAt: true },
        });
        if (lastTheta && manilaDateOf(lastTheta.recordedAt) === today) {
            await db.thetaHistory.update({ where: { id: lastTheta.id }, data: { theta: updatedTheta } });
        } else {
            await db.thetaHistory.create({ data: { userId, theta: updatedTheta } });
        }

        // Per-subject ability (Phase 3.4): the same 3PL estimator, sliced by
        // canonical subject, so the forecast's UserAbility rows stay fresh
        // between nightly recalibrations (which rewrite them batch-consistently).
        // First-ever row for a subject seeds from the global posterior.
        const bySubject = groupPairsBySubject(gradedForTheta);
        for (const [subject, subjectPairs] of Object.entries(bySubject)) {
            const existingAbility = await db.userAbility.findUnique({
                where: { userId_subject: { userId, subject } },
                select: { theta: true, se: true },
            });
            const subjectPrior = existingAbility
                ? { theta: existingAbility.theta, se: existingAbility.se }
                : { theta: user?.thetaRating ?? 0, se: user?.standardError ?? 1.0 };
            const subjectEst = updateTheta(subjectPrior, subjectPairs);
            await db.userAbility.upsert({
                where: { userId_subject: { userId, subject } },
                update: { theta: subjectEst.theta, se: subjectEst.se },
                create: { userId, subject, theta: subjectEst.theta, se: subjectEst.se },
            });
        }
    };

    for (const rows of chunkRows(mapped, ATTEMPT_CHUNK_SIZE)) {
        await prisma.$transaction(async (db) => { await runChunk(db, rows); }, TX_OPTS);
    }

    // One choke point for cache freshness: every write surface funnels through
    // recordAttempts (telemetry-bulk, exams/grade, exams/submit, battle-submit),
    // so neither the dashboard NOR the readiness score serves a stale payload
    // after ANY kind of session. readinessCache was never busted here, so
    // /api/readiness lagged the dashboard by up to 60s post-session.
    dashboardCache.invalidate(userId);
    readinessCache.invalidate(userId);

    // Pure replay across every chunk: grade from the master answers but leave
    // every aggregate untouched, and report the user's CURRENT theta so clients
    // don't clobber their local value with null.
    if (!sawAnyWrite) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { thetaRating: true } });
        return {
            written: 0,
            received: attempts.length,
            skipped,
            deduped: dedupedCount,
            updatedTheta: user?.thetaRating ?? null,
            sessionId: resolvedSessionId,
            graded: mapped.map((m) => ({ questionId: m.questionId, isCorrect: m.isCorrect })),
        };
    }

    return {
        written: writtenCount,
        received: attempts.length,
        skipped,
        deduped: dedupedCount,
        updatedTheta,
        sessionId: resolvedSessionId,
        // Server-side grading verdicts (from Question.answer) for the FULL
        // batch — replayed battle submits still need their score.
        graded: mapped.map((m) => ({ questionId: m.questionId, isCorrect: m.isCorrect })),
    };
}

module.exports = { recordAttempts, canonicalSubject, todayManila, manilaDateOf, trimBucketsTo };
