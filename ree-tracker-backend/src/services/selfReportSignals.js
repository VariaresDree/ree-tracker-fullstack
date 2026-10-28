// src/services/selfReportSignals.js
//
// What the learner has told the app about their own weak spots, for the study
// planner and nothing else. The CELE tracker's assessment log kept a "need to
// improve" column per preboard; outside scores carry the same as
// improveTopicIds. A topic flagged in the last FLAG_WINDOW_DAYS gets drilled
// sooner (engine/plan.js), the way open mistakes already raise a topic.
// The learner's own rating of a topic (the CELE "Meta topics": how sure, how
// much they dread it) is read here too; the engine decides what it's worth.
//
// Self-reported tables stay out of θ, the forecast, readiness and the
// rankings: tests/displayOnlyTables.test.js allows this file to read them and
// pins that only routes/plannerRoutes.js requires it.

'use strict';

const prisma = require('../config/db');
const { flaggedTopics } = require('@ree/shared');

const FLAG_WINDOW_DAYS = 45;

const daysBefore = (ymd, n) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d) - n * 86400000).toISOString().slice(0, 10);
};

/**
 * Topics flagged "to improve" on outside scores taken in the window, keyed by
 * lowercased topic name (the plan's practised topics can lack a topicId):
 * Map<name, { flags, flaggedBy }>, where flaggedBy is the newest entry's title.
 */
async function loadFlaggedTopics(userId, today) {
    const entries = await prisma.outsideScore.findMany({
        where: { userId, takenOn: { gte: daysBefore(today, FLAG_WINDOW_DAYS) }, improveTopicIds: { isEmpty: false } },
        select: { title: true, takenOn: true, improveTopicIds: true },
        orderBy: [{ takenOn: 'desc' }, { createdAt: 'desc' }],
    });
    const flagged = flaggedTopics(entries);
    if (flagged.length === 0) return new Map();
    const topics = await prisma.topic.findMany({
        where: { id: { in: flagged.map((f) => f.topicId) } },
        select: { id: true, name: true },
    });
    const nameOf = new Map(topics.map((t) => [t.id, t.name]));
    const out = new Map();
    for (const f of flagged) {
        const name = nameOf.get(f.topicId);
        if (!name) continue;
        // Entries are newest first, so the first that names the topic is its latest flag.
        const latest = entries.find((e) => e.improveTopicIds.includes(f.topicId));
        out.set(name.trim().toLowerCase(), { flags: f.count, flaggedBy: latest?.title || null });
    }
    return out;
}

/** A rating that asks for the topic sooner: sure 25% or less, or dread 3 ("Very") or more. */
const LOW_CONFIDENCE = 25;
const HIGH_DREAD = 3;

/**
 * Topics the learner rated low (not sure of, or dreaded), keyed by lowercased
 * topic name: Set<name>. Raw flags only; engine/plan.js applies them while
 * the topic is still below Proficient.
 */
async function loadSelfRatings(userId) {
    const rows = await prisma.syllabusProgress.findMany({
        where: { userId, OR: [{ confidence: { lte: LOW_CONFIDENCE } }, { dread: { gte: HIGH_DREAD } }] },
        select: { topic: { select: { name: true } } },
    });
    return new Set(rows.map((r) => r.topic?.name?.trim().toLowerCase()).filter(Boolean));
}

module.exports = { loadFlaggedTopics, loadSelfRatings, FLAG_WINDOW_DAYS };
