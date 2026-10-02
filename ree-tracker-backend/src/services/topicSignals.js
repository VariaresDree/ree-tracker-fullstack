// src/services/topicSignals.js
//
// Per-topic evidence beyond accuracy: effective (decayed) BKT mastery, how
// often the learner was CONFIDENTLY wrong, and the median answer time. Read by
// the forecast's weak-topic ranking and by the analytics registry of blind
// spots and time sinks — one query shape for both, keyed by the same canonical
// topic name the rollups use.

'use strict';

const prisma = require('../config/db');
const {
    normalizeSubject, TIME_MIN_MS, TIME_MAX_MS, TIME_SINK_MS, BLIND_SPOT_MIN_ATTEMPTS,
} = require('@ree/shared');
const { effectiveMastery } = require('./masteryView');

// A topic is a blind spot when confident misses are both frequent in absolute
// terms (the shared minimum) and a real share of its answers.
const BLIND_SPOT_MIN_RATE = 0.2;

const normTopic = (s) => String(s || '').trim().toLowerCase();

/** Pure: UTP rows + per-topic signal rows → one merged row per topic. */
function mergeTopicSignals(topicRows, signalRows, now = new Date()) {
    const signalsByTopic = new Map((signalRows || []).map((r) => [normTopic(r.topic), r]));
    return (topicRows || []).map((t) => {
        const sig = signalsByTopic.get(normTopic(t.topic)) || {};
        const view = effectiveMastery(t, now);
        return {
            topic: t.topic,
            subject: normalizeSubject(t.subject),
            topicId: t.topicId ?? null,
            // A topic with history but no BKT estimate yet: its hit rate stands in.
            masteryEffective: view.masteryEffective ?? (t.attempts > 0 ? t.correct / t.attempts : null),
            masteryN: view.masteryN,
            attempts: t.attempts,
            confidentMisses: Number(sig.confidentMisses) || 0,
            medianMs: sig.medianMs == null ? null : Number(sig.medianMs),
        };
    });
}

async function loadTopicSignals(userId, now = new Date()) {
    const [topicRows, signalRows] = await Promise.all([
        prisma.userTopicPerformance.findMany({
            where: { userId, attempts: { gt: 0 } },
            select: { topic: true, subject: true, topicId: true, attempts: true, correct: true, pMastery: true, masteryN: true, lastPracticedAt: true },
        }),
        prisma.$queryRaw`
            SELECT COALESCE(t."name", qa."subtopic") AS "topic",
                   COUNT(*) FILTER (WHERE qa."confidenceLevel" = 'HIGH' AND qa."isCorrect" = false)::int AS "confidentMisses",
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY qa."timeSpentMs")
                       FILTER (WHERE qa."timeSpentMs" BETWEEN ${TIME_MIN_MS} AND ${TIME_MAX_MS}) AS "medianMs"
            FROM "QuestionAttempt" qa
            JOIN "Question" q ON q."id" = qa."questionId"
            LEFT JOIN "Topic" t ON t."id" = q."topicId"
            WHERE qa."userId" = ${userId}
            GROUP BY 1`,
    ]);
    return mergeTopicSignals(topicRows, signalRows, now);
}

/** Pure: merged topic rows (+ recent confident misses) → the registry payload. */
function buildWeakSignals(topics, recentMisses = []) {
    const blindSpots = (topics || [])
        .map((t) => ({ ...t, rate: t.attempts > 0 ? t.confidentMisses / t.attempts : 0 }))
        .filter((t) => t.confidentMisses >= BLIND_SPOT_MIN_ATTEMPTS && t.rate >= BLIND_SPOT_MIN_RATE)
        .sort((a, b) => b.confidentMisses - a.confidentMisses || b.rate - a.rate)
        .map(({ topic, subject, topicId, confidentMisses, attempts, rate }) => ({
            topic, subject, topicId, confidentMisses, attempts, rate: Math.round(rate * 100) / 100,
        }));
    const timeSinks = (topics || [])
        .filter((t) => t.medianMs != null && t.medianMs > TIME_SINK_MS)
        .sort((a, b) => b.medianMs - a.medianMs)
        .map(({ topic, subject, topicId, medianMs, attempts }) => ({
            topic, subject, topicId, attempts, medianSecs: Math.round(medianMs / 1000),
        }));
    return { blindSpots, timeSinks, recentConfidentMisses: recentMisses };
}

async function loadWeakSignals(userId) {
    const [topics, misses] = await Promise.all([
        loadTopicSignals(userId),
        prisma.questionAttempt.findMany({
            where: { userId, confidenceLevel: 'HIGH', isCorrect: false, question: { isFlagged: false } },
            orderBy: { createdAt: 'desc' },
            distinct: ['questionId'],
            take: 10,
            select: { questionId: true, createdAt: true, question: { select: { text: true, subject: true, subtopic: true } } },
        }),
    ]);
    return buildWeakSignals(topics, misses.map((m) => ({
        questionId: m.questionId,
        answeredAt: m.createdAt,
        subject: normalizeSubject(m.question?.subject),
        subtopic: m.question?.subtopic || null,
        text: String(m.question?.text || '').slice(0, 220),
    })));
}

module.exports = { mergeTopicSignals, loadTopicSignals, buildWeakSignals, loadWeakSignals, BLIND_SPOT_MIN_RATE };
