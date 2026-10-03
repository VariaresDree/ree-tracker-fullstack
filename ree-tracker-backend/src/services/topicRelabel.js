// src/services/topicRelabel.js
// Carrying a TOS respelling (PUT /api/config/tos renames a Topic in place, e.g.
// "electric circuits 2" -> "Electric Circuits 2") onto the per-learner rollups.
//
// Live telemetry keys UserTopicPerformance by the master question's subtopic,
// and backfill:mastery keys it by the question's Topic name. Every live
// question stores subtopic = Topic.name, so the two agree, until a rename
// changes Topic.name alone. Telemetry then keeps writing the old spelling while
// backfill folds history under the new one and deletes the old row as a proven
// orphan, every run, so the forecast and heatmap see one topic split in two.
//
// The route relabels the questions; this plans the rollup rows. A learner with
// a row under the old spelling only has it renamed in place, every field kept.
// A learner who already has a row under the new spelling has the two merged
// from attempt history by the backfill's own rules (services/masteryRollups),
// so the merge is what the next backfill run would leave. QuestionAttempt.subtopic
// is never rewritten: it is the label each answer was recorded under, and the
// proof that lets the merge remove the old row.
const { Prisma } = require('@prisma/client');
const logger = require('../utils/logger');
const { HISTORY_SELECT, foldUserMastery, planUserRollups, writePlan } = require('./masteryRollups');

/**
 * Pure: which stored rows each rename moves, and how.
 *
 * @param {Array<{from, to}>} renames
 * @param {Array<{id, userId, topic}>} rows - UserTopicPerformance rows under any from/to label
 * @returns {{inPlace: Array<{id, userId, from, to}>, merges: Array<{userId, labels: string[]}>}}
 */
function planRollupRenames(renames, rows) {
    const toByFrom = new Map((renames || []).map((r) => [r.from, r.to]));
    const held = new Set((rows || []).map((r) => `${r.userId}\u0000${r.topic}`));
    const inPlace = [];
    const labelsByUser = new Map();
    for (const r of rows || []) {
        const to = toByFrom.get(r.topic);
        if (to === undefined) continue;
        if (!held.has(`${r.userId}\u0000${to}`)) {
            inPlace.push({ id: r.id, userId: r.userId, from: r.topic, to });
            continue;
        }
        if (!labelsByUser.has(r.userId)) labelsByUser.set(r.userId, []);
        labelsByUser.get(r.userId).push(r.topic, to);
    }
    const merges = [...labelsByUser].map(([userId, labels]) => ({ userId, labels }));
    return { inPlace, merges };
}

/**
 * Pure: merge one learner's rows under `labels` from their attempt history.
 * planUserRollups restricted to those labels: each label answers now count
 * under is written with its history counts and replayed mastery, and a row
 * left with no answers is removed only when history proves its whole tally now
 * counts elsewhere (`orphans`); otherwise it is kept and reported (`unproven`).
 *
 * @param {Array<{id, topic, attempts, correct, totalTime}>} rows - the learner's rows
 * @param {Array} attempts - the learner's attempts, chronological, read after the
 *   Topic rename (so question.topic.name is the new spelling)
 * @param {string[]} labels
 */
function planRollupMerge(rows, attempts, labels) {
    const keys = new Set(labels);
    const folded = foldUserMastery(attempts || []).filter((f) => keys.has(f.topic));
    return planUserRollups((rows || []).filter((r) => keys.has(r.topic)), folded, attempts);
}

/**
 * Inside the TOS sync transaction, AFTER the Topic rows are renamed (the merge
 * folds history by question.topic.name): relabel each renamed topic's
 * questions, then move or merge the rollup rows keyed by the old spelling.
 * A merging learner is locked first with telemetry's own per-user lock, so no
 * answer lands between the history read and the rewrite.
 *
 * @param {object} db - the transaction client
 * @param {Array<{topicId, from, to}>} renames - from diffTaxonomySync
 * @returns {Promise<{questions, rollupsRenamed, rollupsMerged, rollupsKept, userIds: string[]}>}
 */
async function relabelRenamedTopics(db, renames) {
    const summary = { questions: 0, rollupsRenamed: 0, rollupsMerged: 0, rollupsKept: 0, userIds: [] };
    if (!renames || renames.length === 0) return summary;

    for (const r of renames) {
        const { count } = await db.question.updateMany({ where: { topicId: r.topicId }, data: { subtopic: r.to } });
        summary.questions += count;
    }

    const labels = [...new Set(renames.flatMap((r) => [r.from, r.to]))];
    const rows = await db.userTopicPerformance.findMany({
        where: { topic: { in: labels } },
        select: { id: true, userId: true, topic: true },
    });
    const { inPlace, merges } = planRollupRenames(renames, rows);
    const mergeUserIds = merges.map((m) => m.userId).sort();
    if (mergeUserIds.length) {
        await db.$queryRaw`SELECT 1 FROM "User" WHERE "id" IN (${Prisma.join(mergeUserIds)}) ORDER BY "id" FOR UPDATE`;
    }

    const idsByTo = new Map();
    for (const r of inPlace) {
        if (!idsByTo.has(r.to)) idsByTo.set(r.to, []);
        idsByTo.get(r.to).push(r.id);
    }
    for (const [to, ids] of idsByTo) {
        const { count } = await db.userTopicPerformance.updateMany({ where: { id: { in: ids } }, data: { topic: to } });
        summary.rollupsRenamed += count;
    }

    if (mergeUserIds.length) {
        const mergeLabels = [...new Set(merges.flatMap((m) => m.labels))];
        const attempts = await db.questionAttempt.findMany({
            where: {
                userId: { in: mergeUserIds },
                OR: [
                    { subtopic: { in: mergeLabels } },
                    { question: { is: { topic: { is: { name: { in: mergeLabels } } } } } },
                ],
            },
            orderBy: { createdAt: 'asc' },
            select: { userId: true, ...HISTORY_SELECT },
        });
        const mergeRows = await db.userTopicPerformance.findMany({
            where: { userId: { in: mergeUserIds }, topic: { in: mergeLabels } },
            select: { id: true, userId: true, topic: true, attempts: true, correct: true, totalTime: true },
        });
        for (const { userId, labels: userLabels } of merges) {
            const plan = planRollupMerge(
                mergeRows.filter((r) => r.userId === userId),
                attempts.filter((a) => a.userId === userId),
                userLabels,
            );
            await writePlan(db, userId, plan);
            summary.rollupsMerged += plan.orphans.length;
            summary.rollupsKept += plan.unproven.length;
            if (plan.unproven.length) {
                // Same rule as backfill:mastery — never delete a tally history
                // can't account for. Left under the old spelling, and reported.
                logger.warn('TOS rename left a rollup row history does not cover', {
                    userId, rows: plan.unproven.map(({ id, topic, reason }) => ({ id, topic, reason })),
                });
            }
        }
    }

    summary.userIds = [...new Set([...inPlace.map((r) => r.userId), ...mergeUserIds])];
    return summary;
}

module.exports = { planRollupRenames, planRollupMerge, relabelRenamedTopics };
