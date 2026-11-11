// src/services/subtopicTagging.js
//
// Tagging live questions with a subtopic inside their topic (Admin › Question
// bank › Tag subtopics). An AI or an admin picks the subtopic; this checks the
// pick belongs to the question's own topic and saves it. Nothing a learner sees
// reads the tag yet: drawing and counting by subtopic come after the bank is
// tagged.
const prisma = require('../config/db');
const { getSubjectFilter } = require('../utils/subject');

const PAGE_MAX = 50;

/** Each active topic with subtopics, and how many of its live questions are tagged. */
async function taggingOverview({ subject } = {}) {
    const subjFilter = getSubjectFilter(subject);
    const topics = await prisma.topic.findMany({
        where: { active: true, ...(subjFilter ? { subject: subjFilter } : {}), subtopics: { some: { active: true } } },
        select: { id: true, subject: true, name: true, _count: { select: { subtopics: { where: { active: true } } } } },
        orderBy: [{ subject: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    const ids = topics.map((t) => t.id);
    if (!ids.length) return { topics: [] };
    const where = { isFlagged: false, topicId: { in: ids } };
    const [all, tagged] = await Promise.all([
        prisma.question.groupBy({ by: ['topicId'], where, _count: { _all: true } }),
        prisma.question.groupBy({ by: ['topicId'], where: { ...where, subtopicId: { not: null } }, _count: { _all: true } }),
    ]);
    const countOf = (rows) => new Map(rows.map((r) => [r.topicId, r._count._all]));
    const totals = countOf(all);
    const taggedBy = countOf(tagged);
    return {
        topics: topics.map((t) => ({
            id: t.id, subject: t.subject, name: t.name, subtopics: t._count.subtopics,
            total: totals.get(t.id) || 0, tagged: taggedBy.get(t.id) || 0,
        })),
    };
}

/** A page of one topic's live questions, its active subtopics, and the topic's progress. */
async function questionsForTagging({ topicId, untagged = true, limit = PAGE_MAX, offset = 0 }) {
    const topic = await prisma.topic.findUnique({
        where: { id: topicId },
        select: {
            id: true, subject: true, name: true,
            subtopics: { where: { active: true }, select: { id: true, name: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
        },
    });
    if (!topic) return null;
    const where = { isFlagged: false, topicId };
    const take = Math.min(Math.max(1, limit), PAGE_MAX);
    const [total, tagged, items] = await Promise.all([
        prisma.question.count({ where }),
        prisma.question.count({ where: { ...where, subtopicId: { not: null } } }),
        prisma.question.findMany({
            where: untagged ? { ...where, subtopicId: null } : where,
            // A stable order, so a resumed run picks up where it stopped.
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            select: { id: true, text: true, options: true, subtopicId: true },
            take,
            skip: Math.max(0, offset),
        }),
    ]);
    const { subtopics, ...rest } = topic;
    return { topic: rest, subtopics, items, total, tagged };
}

/**
 * Saves [{ id, subtopicId }] (null untags). A subtopic must be active and in the
 * question's own topic; anything else is refused by id, and the rest still saves.
 */
async function applyTags(items) {
    const ids = [...new Set(items.map((i) => i.id))];
    const subIds = [...new Set(items.map((i) => i.subtopicId).filter(Boolean))];
    const [questions, subs] = await Promise.all([
        prisma.question.findMany({ where: { id: { in: ids } }, select: { id: true, topicId: true } }),
        subIds.length
            ? prisma.syllabusSubtopic.findMany({ where: { id: { in: subIds } }, select: { id: true, topicId: true, active: true } })
            : [],
    ]);
    const topicOf = new Map(questions.map((q) => [q.id, q.topicId]));
    const subOf = new Map(subs.map((s) => [s.id, s]));

    const refused = [];
    const groups = new Map(); // subtopicId|null → { topicId, ids }
    for (const { id, subtopicId } of items) {
        if (!topicOf.has(id)) { refused.push({ id, reason: 'not-found' }); continue; }
        const topicId = topicOf.get(id);
        if (subtopicId) {
            const sub = subOf.get(subtopicId);
            if (!sub || !sub.active) { refused.push({ id, reason: 'no-such-subtopic' }); continue; }
            if (sub.topicId !== topicId) { refused.push({ id, reason: 'other-topic' }); continue; }
        }
        const key = subtopicId || null;
        if (!groups.has(key)) groups.set(key, { topicId: subtopicId ? topicId : undefined, ids: [] });
        groups.get(key).ids.push(id);
    }

    const ops = [...groups].map(([subtopicId, g]) => prisma.question.updateMany({
        // topicId in the WHERE too: a question moved to another topic since the
        // check above keeps its (cleared) tag rather than take this one.
        where: { id: { in: g.ids }, ...(g.topicId ? { topicId: g.topicId } : {}) },
        data: { subtopicId },
    }));
    const results = ops.length ? await prisma.$transaction(ops) : [];
    return { saved: results.reduce((n, r) => n + r.count, 0), refused };
}

/** Untags every question in a topic: the undo for a run that went wrong. */
async function clearTags({ topicId }) {
    const { count } = await prisma.question.updateMany({ where: { topicId, subtopicId: { not: null } }, data: { subtopicId: null } });
    return { cleared: count };
}

module.exports = { PAGE_MAX, taggingOverview, questionsForTagging, applyTags, clearTags };
