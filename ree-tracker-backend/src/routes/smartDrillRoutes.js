const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { normalizeSubject, SMART_DRILL_MAX_ITEMS, WEAK_TOPIC_ACCURACY } = require('@ree/shared');
const { rankWeakTopics } = require('../engine/forecast');
const { selectDrillItems, splitAcrossTopics, weakestSubtopic, SUBTOPIC_SHARE } = require('../engine/drill');
const { effectiveMastery } = require('../services/masteryView');
const { getSyllabusWeights } = require('../services/questionPool');

// GET /api/smart-drill — a targeted, adaptive drill.
//
//   ?topicId=…        drill this taxonomy topic
//   ?topic=…&subject= drill a topic by name (legacy labels without a Topic row)
//   (neither)         drill the weakest topics: decayed BKT mastery × syllabus
//                     weight, the same ranking as the forecast's prescription
//   ?mode=blind-spot  lead with the questions answered CONFIDENTLY WRONG
//   ?limit=           items (default 10, max 50)
//
// Within each topic, about half the items come from the learner's weakest
// tagged subtopic there (below WEAK_TOPIC_ACCURACY after 3+ answers), the rest
// adaptively from the whole topic (2026-11-15; tags had covered too little of
// the bank to lean on before the hourly run saved its unsure picks).
//
// The old version ranked subtopics by raw accuracy on the legacy `subtopic`
// string, did not exclude flagged questions from its first query, and stripped
// `answer` from every item — the client grades practice locally, so every drill
// MCQ was marked wrong and flashcards revealed a blank.

const DAY_MS = 24 * 60 * 60 * 1000;
const CANDIDATES_PER_TOPIC = 300;

const topicMatch = (t) => {
    const or = [];
    if (t.topicId) or.push({ topicId: t.topicId });
    if (t.topic) or.push({ subtopic: t.topic });
    return or;
};

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// The learner's answers in these topics, by tagged subtopic, with its name.
// Counted in Postgres, so only a row per subtopic leaves the database. A failure
// here only loses the lean, never the drill.
async function subtopicRecord(userId, topicIds) {
    if (topicIds.length === 0) return [];
    try {
        return await prisma.$queryRaw`
            SELECT q."topicId" AS "topicId", q."subtopicId" AS "subtopicId", s."name" AS "name",
                   COUNT(*)::int AS "answered", (COUNT(*) FILTER (WHERE a."isCorrect"))::int AS "correct"
            FROM "QuestionAttempt" a
            JOIN "Question" q ON q."id" = a."questionId"
            JOIN "SyllabusSubtopic" s ON s."id" = q."subtopicId" AND s."active"
            WHERE a."userId" = ${userId} AND q."topicId" = ANY(${topicIds}::text[])
            GROUP BY q."topicId", q."subtopicId", s."name"`;
    } catch (error) {
        logger.warn('Smart drill subtopic record failed', { error: error.message });
        return [];
    }
}

async function resolveTargets(req, userId, utpRows) {
    const { topicId, topic, subject } = req.query;
    if (typeof topicId === 'string' && topicId) {
        const row = await prisma.topic.findUnique({ where: { id: topicId }, select: { id: true, name: true, subject: true } });
        return row ? [{ topicId: row.id, topic: row.name, subject: normalizeSubject(row.subject) }] : [];
    }
    if (typeof topic === 'string' && topic.trim()) {
        const own = utpRows.find((r) => r.topic.trim().toLowerCase() === topic.trim().toLowerCase());
        return [{
            topicId: own?.topicId ?? null,
            topic: topic.trim().slice(0, 160),
            subject: normalizeSubject(subject || own?.subject),
        }];
    }
    const weights = await getSyllabusWeights();
    const now = new Date();
    const ranked = rankWeakTopics(utpRows.map((r) => ({
        topic: r.topic,
        subject: normalizeSubject(r.subject),
        topicId: r.topicId ?? null,
        masteryEffective: effectiveMastery(r, now).masteryEffective ?? (r.attempts > 0 ? r.correct / r.attempts : null),
        masteryN: r.masteryN,
        attempts: r.attempts,
    })), weights);
    return ranked.slice(0, 3);
}

router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), SMART_DRILL_MAX_ITEMS);
        const blindSpotMode = req.query.mode === 'blind-spot';

        const [user, abilityRows, utpRows, recent] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId }, select: { thetaRating: true } }),
            prisma.userAbility.findMany({ where: { userId } }),
            prisma.userTopicPerformance.findMany({
                where: { userId, attempts: { gt: 0 } },
                select: { topic: true, subject: true, topicId: true, attempts: true, correct: true, pMastery: true, masteryN: true, lastPracticedAt: true },
            }),
            // Seen in the last day: re-serving an item whose answer was just
            // revealed measures memory of the reveal, not the topic.
            prisma.questionAttempt.findMany({
                where: { userId, createdAt: { gte: new Date(Date.now() - DAY_MS) } },
                select: { questionId: true },
                distinct: ['questionId'],
            }),
        ]);

        const targets = await resolveTargets(req, userId, utpRows);
        if (targets.length === 0) return res.status(200).json({ items: [], weakAreas: [], mode: blindSpotMode ? 'blind-spot' : 'adaptive' });

        const thetaBySubject = Object.fromEntries((abilityRows || []).map((a) => [normalizeSubject(a.subject), a.theta]));
        const globalTheta = user?.thetaRating ?? 0;
        const exclude = new Set(recent.map((r) => r.questionId));
        const counts = splitAcrossTopics(limit, targets.length);
        const record = await subtopicRecord(userId, targets.map((t) => t.topicId).filter(Boolean));
        targets.forEach((t) => {
            t.weakSubtopic = t.topicId ? weakestSubtopic(record.filter((r) => r.topicId === t.topicId), WEAK_TOPIC_ACCURACY) : null;
        });

        const perTopic = await Promise.all(targets.map(async (t, i) => {
            const want = counts[i];
            const match = topicMatch(t);
            const chosen = [];
            if (blindSpotMode) {
                const blind = await prisma.questionAttempt.findMany({
                    where: { userId, confidenceLevel: 'HIGH', isCorrect: false, question: { isFlagged: false, OR: match } },
                    select: { questionId: true },
                    distinct: ['questionId'],
                    orderBy: { createdAt: 'desc' },
                    take: want * 2,
                });
                for (const { questionId } of blind) {
                    if (chosen.length >= want) break;
                    if (!exclude.has(questionId)) { chosen.push(questionId); exclude.add(questionId); }
                }
            }
            // About half of what's left from the weakest subtopic; the topic fills the rest.
            const pick = async (where, n) => {
                const candidates = await prisma.question.findMany({
                    where: { isFlagged: false, ...where },
                    select: { id: true, irtA: true, irtB: true, irtC: true, difficulty: true },
                    take: CANDIDATES_PER_TOPIC,
                });
                for (const id of selectDrillItems({ candidates, theta: thetaBySubject[t.subject] ?? globalTheta, limit: n, exclude })) {
                    chosen.push(id); exclude.add(id);
                }
            };
            if (t.weakSubtopic && chosen.length < want) {
                await pick({ topicId: t.topicId, subtopicId: t.weakSubtopic.subtopicId }, Math.round((want - chosen.length) * SUBTOPIC_SHARE));
            }
            if (chosen.length < want) await pick({ OR: match }, want - chosen.length);
            return chosen;
        }));

        const ids = perTopic.flat();
        const items = ids.length
            ? await prisma.question.findMany({ where: { id: { in: ids }, isFlagged: false } })
            : [];

        res.status(200).json({
            items: shuffle(items),
            weakAreas: targets.map((t) => ({
                topic: t.topic,
                subject: t.subject,
                topicId: t.topicId ?? null,
                masteryEffective: t.masteryEffective ?? null,
                subtopic: t.weakSubtopic
                    ? { id: t.weakSubtopic.subtopicId, name: t.weakSubtopic.name, answered: t.weakSubtopic.answered, correct: t.weakSubtopic.correct }
                    : null,
            })),
            mode: blindSpotMode ? 'blind-spot' : 'adaptive',
        });
    } catch (error) {
        logger.error('Smart drill error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to generate smart drill.' });
    }
});

module.exports = router;
