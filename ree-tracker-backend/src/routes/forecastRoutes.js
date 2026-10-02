const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { buildForecast, MODEL_VERSION } = require('../engine/forecast');
const { PRIOR_SE } = require('../engine/irt');
const { effectiveMastery } = require('../services/masteryView');
const { getTccBySubject } = require('../services/referenceFormCache');
const { getSyllabusWeights } = require('../services/questionPool');
const { normalizeSubject, TIME_MIN_MS, TIME_MAX_MS } = require('@ree/shared');
const forecastCache = require('../services/forecastCache');

// GET /api/forecast — latest snapshot for the caller, or recompute on the fly.
// Recomputes (in-memory) when the cached snapshot predates the user's most
// recent activity, so the trajectory always reflects newly-answered questions
// instead of freezing on the first snapshot ever persisted.
router.get('/', authMiddleware, async (req, res) => {
    try {
        // The staleness test below is true for essentially any active learner,
        // so this route used to recompute on almost every call — and then threw
        // the result away. Cache first (services/forecastCache.js).
        const cached = forecastCache.get(req.user.id);
        if (cached) return res.status(200).json(cached);

        const [user, latest] = await Promise.all([
            prisma.user.findUnique({ where: { id: req.user.id }, select: { lastActive: true } }),
            prisma.forecastSnapshot.findFirst({
                where: { userId: req.user.id },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        // A snapshot from an older model is stale whatever its age: a v1 row
        // carries no per-subject projection and a θ-cutoff pass probability.
        const stale = latest && (
            latest.modelVersion !== MODEL_VERSION
            || (user?.lastActive && new Date(latest.createdAt) < new Date(user.lastActive))
        );
        if (latest && !stale) {
            const body = { snapshot: latest, fresh: false };
            forecastCache.set(req.user.id, body);
            return res.status(200).json(body);
        }

        const computed = await computeForUser(req.user.id);
        const body = { snapshot: computed, fresh: true };
        forecastCache.set(req.user.id, body);
        return res.status(200).json(body);
    } catch (error) {
        logger.error('forecast GET failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Forecast unavailable.' });
    }
});

// POST /api/forecast/recompute — force-recompute and persist a new snapshot.
router.post('/recompute', authMiddleware, async (req, res) => {
    try {
        const snapshot = await computeForUser(req.user.id, { persist: true });
        // An explicit recompute must not leave the GET serving the old value.
        forecastCache.invalidate(req.user.id);
        return res.status(200).json({ snapshot });
    } catch (error) {
        logger.error('forecast recompute failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Forecast recompute failed.' });
    }
});

async function computeForUser(userId, opts = {}) {
    const now = new Date();
    const [user, abilityRows, topicRows, signalRows, srsDue, weights, tccBySubject] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { thetaRating: true, standardError: true } }),
        prisma.userAbility.findMany({ where: { userId } }),
        // EVERY topic with history — v1 took the 20 most recently touched, so an
        // old weak topic could never be recommended again.
        prisma.userTopicPerformance.findMany({
            where: { userId, attempts: { gt: 0 } },
            select: { topic: true, subject: true, topicId: true, attempts: true, correct: true, pMastery: true, masteryN: true, lastPracticedAt: true },
        }),
        // Per-topic blind spots (confidently wrong) and median answer time, by
        // the same canonical topic name the rollups use.
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
        prisma.sRSCard.count({ where: { userId, nextReviewDate: { lte: now }, question: { isFlagged: false } } }),
        getSyllabusWeights(),
        getTccBySubject(),
    ]);

    const subjectAbilities = {};
    for (const a of abilityRows || []) {
        subjectAbilities[normalizeSubject(a.subject)] = { theta: a.theta, se: a.se };
    }

    const signalsByTopic = new Map((signalRows || []).map((r) => [normTopic(r.topic), r]));
    const topicSignals = (topicRows || []).map((t) => {
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

    const payload = buildForecast({
        ability: { theta: user?.thetaRating ?? 0, se: user?.standardError ?? PRIOR_SE },
        subjectAbilities,
        tccBySubject,
        weights,
        topicSignals,
        srsDue,
        priorSe: PRIOR_SE,
    });

    if (opts.persist) {
        return prisma.forecastSnapshot.create({ data: { userId, ...payload } });
    }
    return { id: 'in-memory', userId, createdAt: now, ...payload };
}

const normTopic = (s) => String(s || '').trim().toLowerCase();

module.exports = router;
