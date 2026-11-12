// src/services/subtopicAutoTag.js
//
// Subtopic tagging in the background (Admin › Question bank › Subtopics ›
// In the background). The in-page tool only ran while an admin kept the page
// open, 50 questions an AI call, about 344 calls for the bank, and its unsure
// picks lived in the page: on 2026-11-12 no question of 17,185 was tagged, so
// studying by subtopic (#253) had never shown for anyone.
//
// Each hourly scheduled run (POST /api/cron/subtopic-tags, from the reminders
// workflow) asks the in-app AI about a few batches of questions nobody has
// asked about yet: sure picks with a listed name are saved at once, the rest
// are kept as SubtopicSuggestion rows for the admin to review. Off unless the
// `subtopic-autotag` switch is on. A few calls an hour, so the free AI
// providers' daily limits stay mostly for learners' own AI features.

'use strict';

const prisma = require('../config/db');
const { isFlagEnabled } = require('./featureFlags');
const { applyTags } = require('./subtopicTagging');
const { runTask, AiUnavailableError } = require('./ai/aiRouter');
const { TAG_BATCH, TAG_SYSTEM, buildTagPrompt, readTagReply, splitTags } = require('@ree/shared/subtopicTagPrompt');
const { parseModelJson } = require('@ree/shared/modelJson');
const logger = require('../utils/logger');

const FLAG = 'subtopic-autotag';
// AI calls per run: 3 an hour, 18 runs a day, about 2,700 questions a day.
const CALLS_PER_RUN = 3;
const REVIEW_PAGE = 50;

/**
 * The next batch nobody has asked about: one topic's untagged live questions
 * with no suggestion for their current topic, topics in syllabus order. null
 * when every question has been looked at.
 */
async function nextBatch(limit = TAG_BATCH) {
    const [first] = await prisma.$queryRaw`
        SELECT q."topicId"
        FROM "Question" q
        JOIN "Topic" t ON t."id" = q."topicId" AND t."active" = true
        WHERE q."isFlagged" = false AND q."subtopicId" IS NULL
          AND EXISTS (SELECT 1 FROM "SyllabusSubtopic" s WHERE s."topicId" = q."topicId" AND s."active" = true)
          AND NOT EXISTS (SELECT 1 FROM "SubtopicSuggestion" g WHERE g."questionId" = q."id" AND g."topicId" = q."topicId")
        ORDER BY t."subject", t."sortOrder", t."name"
        LIMIT 1`;
    if (!first) return null;
    const topicId = first.topicId;
    const [topic, items] = await Promise.all([
        prisma.topic.findUnique({
            where: { id: topicId },
            select: {
                id: true, subject: true, name: true,
                subtopics: { where: { active: true }, select: { id: true, name: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
            },
        }),
        prisma.$queryRaw`
            SELECT q."id", q."text", q."options"
            FROM "Question" q
            WHERE q."topicId" = ${topicId} AND q."isFlagged" = false AND q."subtopicId" IS NULL
              AND NOT EXISTS (SELECT 1 FROM "SubtopicSuggestion" g WHERE g."questionId" = q."id" AND g."topicId" = q."topicId")
            ORDER BY q."createdAt", q."id"
            LIMIT ${limit}`,
    ]);
    if (!topic || !items.length) return null;
    const { subtopics, ...rest } = topic;
    return { topic: rest, subtopics, items };
}

/**
 * Keeps the AI's unsure picks for one topic's questions: [{ id, subtopicId,
 * guess }]. A question asked again (it moved topic) replaces its old row.
 */
async function recordSuggestions(topicId, rows) {
    if (!rows.length) return 0;
    const ids = [...new Set(rows.map((r) => r.id))];
    // Only questions still in that topic: a pick for a moved one would be stale.
    const live = new Set((await prisma.question.findMany({ where: { id: { in: ids }, topicId }, select: { id: true } })).map((q) => q.id));
    const data = rows.filter((r) => live.has(r.id)).map((r) => ({
        questionId: r.id, topicId, subtopicId: r.subtopicId || null, guess: r.guess ? String(r.guess).slice(0, 160) : null,
    }));
    if (!data.length) return 0;
    await prisma.$transaction([
        prisma.subtopicSuggestion.deleteMany({ where: { questionId: { in: data.map((d) => d.questionId) } } }),
        prisma.subtopicSuggestion.createMany({ data }),
    ]);
    return data.length;
}

/** One batch: ask, save the sure picks, keep the rest for review. */
async function tagBatch(batch, { run = runTask } = {}) {
    const res = await run({
        task: 'classify',
        contents: buildTagPrompt({ subject: batch.topic.subject, topic: batch.topic.name, subtopics: batch.subtopics, items: batch.items }),
        system: TAG_SYSTEM,
        json: true,
        temperature: 0,
    }, { logger });
    const parsed = parseModelJson(res.text);
    // Nothing is recorded, so the same batch is asked again next run.
    if (!parsed.ok) throw new Error(`The AI's reply wasn't JSON (${parsed.message}).`);
    const read = readTagReply(parsed.value, batch.items, batch.subtopics);
    const { apply, review } = splitTags(read);
    let saved = 0;
    if (apply.length) {
        const res2 = await applyTags(apply);
        saved = res2.saved;
        const refused = new Set(res2.refused.map((r) => r.id));
        review.push(...read.filter((r) => refused.has(r.id)));
    }
    const queued = await recordSuggestions(batch.topic.id, review);
    return { saved, queued };
}

let running = false;

/**
 * One scheduled run: up to CALLS_PER_RUN batches. Stops at the first AI
 * failure (the providers are busy or out of quota; the next run tries again).
 * Never throws.
 */
async function runAutoTag({ calls = CALLS_PER_RUN, run = runTask } = {}) {
    if (running) return { skipped: 'running' };
    if (!(await isFlagEnabled(FLAG).catch(() => false))) return { skipped: 'off' };
    running = true;
    const out = { batches: 0, saved: 0, queued: 0, done: false };
    try {
        for (let i = 0; i < calls; i++) {
            const batch = await nextBatch();
            if (!batch) { out.done = true; break; }
            const { saved, queued } = await tagBatch(batch, { run });
            out.batches += 1;
            out.saved += saved;
            out.queued += queued;
        }
    } catch (error) {
        out.stopped = error instanceof AiUnavailableError ? error.reason || 'unavailable' : 'error';
        logger.warn('Subtopic auto-tag run stopped', { error: error.message, ...out });
    } finally {
        running = false;
    }
    logger.info('Subtopic auto-tag run', out);
    return out;
}

/** The switch, and how far the bank has got. */
async function autoTagStatus() {
    const [enabled, [counts]] = await Promise.all([
        isFlagEnabled(FLAG).catch(() => false),
        prisma.$queryRaw`
            SELECT COUNT(*)::int AS "total",
                   COUNT(*) FILTER (WHERE q."subtopicId" IS NOT NULL)::int AS "tagged",
                   COUNT(*) FILTER (WHERE q."subtopicId" IS NULL AND g."resolvedAt" IS NULL AND g."topicId" = q."topicId")::int AS "toReview",
                   COUNT(*) FILTER (WHERE q."subtopicId" IS NULL AND (g."questionId" IS NULL OR g."topicId" <> q."topicId"))::int AS "notAsked"
            FROM "Question" q
            JOIN "Topic" t ON t."id" = q."topicId" AND t."active" = true
            LEFT JOIN "SubtopicSuggestion" g ON g."questionId" = q."id"
            WHERE q."isFlagged" = false
              AND EXISTS (SELECT 1 FROM "SyllabusSubtopic" s WHERE s."topicId" = q."topicId" AND s."active" = true)`,
    ]);
    return { enabled, running, callsPerRun: CALLS_PER_RUN, batch: TAG_BATCH, ...counts };
}

/**
 * The open suggestions, oldest first: each question with the AI's pick and its
 * topic's subtopics to choose from. Questions tagged or moved since drop out.
 */
async function openSuggestions({ limit = REVIEW_PAGE } = {}) {
    const rows = await prisma.subtopicSuggestion.findMany({
        where: { resolvedAt: null, question: { subtopicId: null, isFlagged: false } },
        orderBy: [{ createdAt: 'asc' }, { questionId: 'asc' }],
        take: Math.min(Math.max(1, limit), REVIEW_PAGE) * 2,
        select: {
            questionId: true, topicId: true, subtopicId: true, guess: true,
            question: { select: { text: true, topicId: true } },
        },
    });
    const items = rows.filter((r) => r.question.topicId === r.topicId).slice(0, limit);
    const topicIds = [...new Set(items.map((r) => r.topicId))];
    const topics = topicIds.length
        ? await prisma.topic.findMany({
            where: { id: { in: topicIds } },
            select: { id: true, subject: true, name: true, subtopics: { where: { active: true }, select: { id: true, name: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
        })
        : [];
    return {
        items: items.map((r) => ({ id: r.questionId, topicId: r.topicId, subtopicId: r.subtopicId, guess: r.guess, text: r.question.text })),
        topics,
    };
}

/**
 * The admin's answers to open suggestions: a subtopicId tags the question
 * (applyTags checks it), null skips it. Either way the suggestion is closed,
 * so neither the list nor the background run brings it back.
 */
async function resolveSuggestions(items) {
    const toTag = items.filter((i) => i.subtopicId);
    const { saved, refused } = toTag.length ? await applyTags(toTag) : { saved: 0, refused: [] };
    const bad = new Set(refused.map((r) => r.id));
    const closed = items.filter((i) => !bad.has(i.id)).map((i) => i.id);
    if (closed.length) {
        await prisma.subtopicSuggestion.updateMany({ where: { questionId: { in: closed }, resolvedAt: null }, data: { resolvedAt: new Date() } });
    }
    return { saved, skipped: items.length - toTag.length, refused };
}

module.exports = {
    FLAG, CALLS_PER_RUN, nextBatch, recordSuggestions, tagBatch, runAutoTag, autoTagStatus, openSuggestions, resolveSuggestions,
};
