// src/services/masteryRollups.js
// Rebuilding UserTopicPerformance rows from attempt history: the BKT fold, the
// live-telemetry counting rule, and the proof a row's tally moved elsewhere
// before it may be removed. Shared by scripts/backfillMastery.js (every user,
// every topic) and services/topicRelabel.js (the rows a TOS rename merges), so
// a merge leaves exactly what the next backfill run would.
const { bktSequence } = require('../engine/bkt');
const { paramsForTopic } = require('../config/bktParams');
const { plausibleTimeMs } = require('../config/telemetryBounds');

// The QuestionAttempt fields the fold and the proof read (order by createdAt).
const HISTORY_SELECT = {
    isCorrect: true,
    subject: true,
    subtopic: true,
    timeSpentMs: true,
    answeredAt: true,
    createdAt: true,
    question: { select: { topicId: true, topic: { select: { name: true, subject: true } } } },
};

// The key an attempt counts under now: the question's Topic name, else the
// label the attempt was recorded under.
const foldKeyOf = (a) => a.question?.topic?.name || a.subtopic || 'General';
// Same per-attempt rule as telemetryHelpers.aggregateTopicRollups.
const secondsOf = (a) => Math.floor(plausibleTimeMs(a.timeSpentMs) / 1000);

// Pure: fold one user's chronological attempts into per-topic BKT mastery and
// counts. Each attempt carries its resolved topic name/subject (COALESCE of the
// question's Topic and the attempt's stored label), so re-tagging history is
// respected. Returns one row per topic.
function foldUserMastery(attempts) {
    const byTopic = new Map(); // topic -> { subject, topicId, observations, correct, totalTime, lastPracticedAt }
    for (const a of attempts) {
        const t = a.question?.topic;
        const topic = foldKeyOf(a);
        let entry = byTopic.get(topic);
        if (!entry) {
            entry = { subject: t?.subject || a.subject || 'General', topicId: a.question?.topicId ?? null, observations: [], correct: 0, totalTime: 0, lastPracticedAt: null };
            byTopic.set(topic, entry);
        }
        entry.observations.push(!!a.isCorrect);
        if (a.isCorrect) entry.correct += 1;
        entry.totalTime += secondsOf(a);
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

// Pure: tally history by the label each answer was RECORDED under
// (QuestionAttempt.subtopic, copied from the question at answer time). That is
// the key telemetry upserted the answer's row by, so it is the evidence for
// where a stored row's tally came from. `into` = the keys those answers count
// under now.
function tallyRecordedLabels(attempts) {
    const byLabel = new Map();
    for (const a of attempts || []) {
        const label = a.subtopic || 'General';
        let entry = byLabel.get(label);
        if (!entry) {
            entry = { attempts: 0, correct: 0, totalTime: 0, into: new Set() };
            byLabel.set(label, entry);
        }
        entry.attempts += 1;
        if (a.isCorrect) entry.correct += 1;
        entry.totalTime += secondsOf(a);
        entry.into.add(foldKeyOf(a));
    }
    return byLabel;
}

/**
 * Pure: what to write for one user. `writes` has one entry per folded topic
 * (`id` null = create), with `countFix` when the stored counts differ from
 * history.
 *
 * A stored row whose topic has no attempts any more is removed (`orphans`) only
 * when history proves where its tally went: answers were recorded under its
 * label, all of them now count under other keys (`into`), and together they
 * cover the row's attempts, correct and seconds. Any other such row is left as
 * is (`unproven`): `no-history` when nothing was recorded under it (e.g. its
 * questions were deleted and their attempts cascaded), `uncovered` when it
 * counts more than history recorded under it.
 */
function planUserRollups(existingRows, folded, attempts) {
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
    const labels = tallyRecordedLabels(attempts);
    const orphans = [];
    const unproven = [];
    for (const r of existingRows || []) {
        if (live.has(r.topic)) continue;
        const row = { id: r.id, topic: r.topic, ...pickCounts(r) };
        const recorded = labels.get(r.topic);
        if (!recorded) {
            unproven.push({ ...row, reason: 'no-history' });
        } else if (COUNT_FIELDS.some((k) => r[k] > recorded[k])) {
            unproven.push({ ...row, reason: 'uncovered', history: pickCounts(recorded) });
        } else {
            // The label isn't a live key, so none of its answers count under it.
            orphans.push({ ...row, into: [...recorded.into].sort() });
        }
    }
    return { writes, orphans, unproven };
}

// Apply a planUserRollups plan for one user: upsert every folded key, delete
// the proven orphans. Unproven rows are left alone.
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

module.exports = { HISTORY_SELECT, foldKeyOf, foldUserMastery, tallyRecordedLabels, planUserRollups, writePlan };
