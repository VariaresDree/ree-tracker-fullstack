// src/services/questionReplace.js
//
// Corrected copies of live questions, written by another AI and reviewed by an
// admin (Admin › Fix questions with another AI). Always in place: deleting a
// question would cascade away its attempts, bookmarks, cards and mistakes.
//
// A past answer is stored as option text, so a reworded option moves its answers
// with it, by slot. A corrected key regrades them. What stays as it was, on
// purpose: recorded mock scores and battle results. Theta isn't touched here:
// see scripts/recomputeTheta.js.
const { Prisma } = require('@prisma/client');
const { hasUnbalancedMath, questionContentHash, replacePlan } = require('@ree/shared');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { allOpenBattleQuestionIds } = require('./answerGate');
const { buildVersionSnapshot } = require('./reviewService');
const { HISTORY_SELECT, writePlan } = require('./masteryRollups');
const { planRollupMerge } = require('./topicRelabel');
const { TX_OPTS } = require('./questionImport');
const { getSubjectFilter } = require('../utils/subject');
const dashboardCache = require('./dashboardCache');
const readinessCache = require('./readinessCache');
const forecastCache = require('./forecastCache');

const EXTERNAL_FIX = 'EXTERNAL_FIX';

/** A page to check, most-answered first, with the progress over the same filter. */
async function questionsForChecking({ subject, subtopic, search, unchecked = false, limit = 25, offset = 0 }) {
    const where = { isFlagged: false };
    const subjFilter = getSubjectFilter(subject);
    if (subjFilter) where.subject = subjFilter;
    if (subtopic && subtopic !== 'All') where.subtopic = subtopic.trim();
    if (search) where.OR = [{ id: search }, { text: { contains: search, mode: 'insensitive' } }];

    const [total, checked, rows] = await Promise.all([
        prisma.question.count({ where }),
        prisma.question.count({ where: { ...where, qualityCheckedAt: { not: null } } }),
        prisma.question.findMany({
            where: unchecked ? { ...where, qualityCheckedAt: null } : where,
            orderBy: [{ attempts: { _count: 'desc' } }, { createdAt: 'asc' }, { id: 'asc' }],
            skip: offset,
            take: Math.min(limit, 25),
            select: {
                id: true, subject: true, subtopic: true, type: true, difficulty: true, text: true, options: true, answer: true,
                fixedExplanation: true, qualityCheckedAt: true, _count: { select: { attempts: true } },
            },
        }),
    ]);
    const items = rows.map(({ _count, ...q }) => ({ ...q, answeredCount: _count.attempts, hash: questionContentHash(q) }));
    return { items, total, checked };
}

/** The live rows behind a pasted reply, with what a key change would touch. */
async function replacePreview(ids) {
    const [rows, open, counts] = await Promise.all([
        prisma.question.findMany({
            where: { id: { in: ids } },
            select: { id: true, subject: true, subtopic: true, type: true, difficulty: true, text: true, options: true, answer: true, fixedExplanation: true },
        }),
        allOpenBattleQuestionIds(),
        prisma.questionAttempt.groupBy({ by: ['questionId', 'selectedAnswer'], where: { questionId: { in: ids } }, _count: { _all: true } }),
    ]);
    return rows.map((q) => {
        const mine = counts.filter((c) => c.questionId === q.id);
        const unrecorded = mine.filter((c) => c.selectedAnswer === null).reduce((n, c) => n + c._count._all, 0);
        const recorded = mine.filter((c) => c.selectedAnswer !== null).reduce((n, c) => n + c._count._all, 0);
        return { ...q, hash: questionContentHash(q), recorded, unrecorded, inBattle: open.has(q.id) };
    });
}

/** Why an item can't be applied, or null. */
function refusalFor(row, item, plan, open) {
    if (!row) return 'not-found';
    if (open.has(row.id)) return 'in-battle';
    if (plan.refusal) return plan.refusal;
    if (plan.keyChanged && !item.confirmKeyChange) return 'needs-key-confirmation';
    if (!String(item.fixedExplanation ?? '').trim()) return 'missing-explanation';
    if ([item.text, ...item.options, item.fixedExplanation].some(hasUnbalancedMath)) return 'unbalanced-math';
    return null;
}

// One statement, so options that swap text can't chain (old A -> old B -> ...).
function remapStatement(id, oldOptions, newOptions) {
    const moved = oldOptions.map((o, i) => [o, newOptions[i]]).filter(([o, n]) => o !== n);
    if (moved.length === 0) return null;
    const cases = Prisma.join(moved.map(([o, n]) => Prisma.sql`WHEN ${o} THEN ${n}`), ' ');
    const olds = Prisma.join(moved.map(([o]) => o));
    return prisma.$executeRaw`UPDATE "QuestionAttempt" SET "selectedAnswer" = CASE "selectedAnswer" ${cases} END WHERE "questionId" = ${id} AND "selectedAnswer" IN (${olds})`;
}

const regradeStatements = (id, options, key) => [
    prisma.questionAttempt.updateMany({ where: { questionId: id, selectedAnswer: { in: options } }, data: { isCorrect: false } }),
    prisma.questionAttempt.updateMany({ where: { questionId: id, selectedAnswer: key }, data: { isCorrect: true } }),
];

/** A learner's topic mastery from their attempts, after a regrade, under telemetry's lock. */
async function rebuildMastery(userId, labels) {
    await prisma.$transaction(async (db) => {
        await db.$queryRaw`SELECT 1 FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
        const rows = await db.userTopicPerformance.findMany({
            where: { userId, topic: { in: labels } },
            select: { id: true, topic: true, attempts: true, correct: true, totalTime: true },
        });
        const attempts = await db.questionAttempt.findMany({
            where: { userId, OR: [{ subtopic: { in: labels } }, { question: { is: { topic: { is: { name: { in: labels } } } } } }] },
            orderBy: { createdAt: 'asc' },
            select: HISTORY_SELECT,
        });
        await writePlan(db, userId, planRollupMerge(rows, attempts, labels));
    }, TX_OPTS);
}

/**
 * { applied: [{ id, hash, unchanged?, keyChanged?, regraded?, unrecorded? }],
 *   skipped: [{ id, reason }] }. Every write for the chunk in one transaction.
 */
async function replaceQuestions(items, editor) {
    const ids = [...new Set(items.map((i) => i.id))];
    const [rows, open] = await Promise.all([
        prisma.question.findMany({ where: { id: { in: ids } } }),
        allOpenBattleQuestionIds(),
    ]);
    const byId = new Map(rows.map((r) => [r.id, r]));

    const skipped = [];
    const changed = [];
    const unchanged = [];
    for (const item of items) {
        const row = byId.get(item.id);
        const plan = row ? replacePlan(row, item) : null;
        const reason = refusalFor(row, item, plan, open);
        if (reason) skipped.push({ id: item.id, reason });
        else if (plan.unchanged) unchanged.push(row);
        else changed.push({ row, item, plan });
    }

    const now = new Date();
    const ops = [];
    if (changed.length) {
        ops.push(prisma.questionVersion.createMany({
            data: changed.map(({ row }) => ({ questionId: row.id, action: EXTERNAL_FIX, editor, snapshot: buildVersionSnapshot(row) })),
        }));
    }
    for (const { row, item, plan } of changed) {
        ops.push(prisma.question.update({
            where: { id: row.id },
            data: { text: item.text, options: item.options, answer: item.answer, fixedExplanation: item.fixedExplanation, explanationStatus: 'APPROVED', qualityCheckedAt: now },
        }));
        if (plan.optionsChanged) {
            const remap = remapStatement(row.id, row.options, item.options);
            if (remap) ops.push(remap);
        }
        if (plan.keyChanged) ops.push(...regradeStatements(row.id, item.options, item.answer));
    }
    if (unchanged.length) {
        ops.push(prisma.question.updateMany({ where: { id: { in: unchanged.map((r) => r.id) } }, data: { qualityCheckedAt: now } }));
    }
    if (ops.length) await prisma.$transaction(ops, TX_OPTS);

    const keyFixes = changed.filter((c) => c.plan.keyChanged);
    const counts = keyFixes.length
        ? await prisma.questionAttempt.groupBy({ by: ['questionId', 'userId', 'selectedAnswer'], where: { questionId: { in: keyFixes.map((c) => c.row.id) } }, _count: { _all: true } })
        : [];
    const countFor = (id, recorded) => counts
        .filter((c) => c.questionId === id && (c.selectedAnswer !== null) === recorded)
        .reduce((n, c) => n + c._count._all, 0);

    const labelsByUser = new Map();
    for (const c of counts.filter((r) => r.selectedAnswer !== null)) {
        const row = byId.get(c.questionId);
        const labels = labelsByUser.get(c.userId) || new Set();
        labels.add(row.subtopic);
        labelsByUser.set(c.userId, labels);
    }
    // The answers are right by now. A rollup that can't be rebuilt is logged, and
    // the next answer or a backfill puts it right; it shouldn't report a failure.
    for (const [userId, labels] of labelsByUser) {
        await rebuildMastery(userId, [...labels]).catch((err) => logger.error('mastery rebuild after a key fix failed', { userId, error: err.message }));
        dashboardCache.invalidate(userId);
        readinessCache.invalidate(userId);
        forecastCache.invalidate(userId);
    }

    return {
        applied: [
            ...changed.map(({ row, item, plan }) => ({
                id: row.id,
                hash: questionContentHash(item),
                ...(plan.keyChanged ? { keyChanged: true, regraded: countFor(row.id, true), unrecorded: countFor(row.id, false) } : {}),
            })),
            ...unchanged.map((row) => ({ id: row.id, hash: questionContentHash(row), unchanged: true })),
        ],
        skipped,
    };
}

/**
 * An answer in an option's old wording, from an offline outbox, an offline pack
 * or an open mock: put in the current wording by its slot, or a correct answer
 * would be graded wrong after a fix that only changed formatting. `qMap` holds
 * each question's `options`. Answers that match need no lookup; grading isn't
 * failed over a lookup that doesn't work.
 */
async function translateStaleAnswers(answers, qMap) {
    const isStale = (a) => {
        const options = qMap[a?.questionId]?.options;
        return typeof a?.userAnswer === 'string' && a.userAnswer && Array.isArray(options) && !options.includes(a.userAnswer);
    };
    const stale = (answers || []).filter(isStale);
    if (stale.length === 0) return answers;
    try {
        const versions = await prisma.questionVersion.findMany({
            where: { questionId: { in: [...new Set(stale.map((a) => a.questionId))] }, action: EXTERNAL_FIX },
            select: { questionId: true, snapshot: true },
        });
        return answers.map((a) => {
            if (!isStale(a)) return a;
            for (const v of versions) {
                const slot = v.questionId === a.questionId && Array.isArray(v.snapshot?.options) ? v.snapshot.options.indexOf(a.userAnswer) : -1;
                const current = slot >= 0 ? qMap[a.questionId].options[slot] : undefined;
                if (current !== undefined) return { ...a, userAnswer: current };
            }
            return a;
        });
    } catch (err) {
        logger.error('stale answer lookup failed', { error: err.message });
        return answers;
    }
}

module.exports = { questionsForChecking, replacePreview, replaceQuestions, translateStaleAnswers };
