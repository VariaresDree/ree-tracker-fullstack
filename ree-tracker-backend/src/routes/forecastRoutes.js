const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { buildForecast, MODEL_VERSION } = require('../engine/forecast');
const { PRIOR_SE } = require('../engine/irt');
const { loadTopicSignals } = require('../services/topicSignals');
const { getTccBySubject } = require('../services/referenceFormCache');
const { getSyllabusWeights } = require('../services/questionPool');
const { normalizeSubject } = require('@ree/shared');
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
    const [user, abilityRows, topicSignals, srsDue, weights, tccBySubject] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { thetaRating: true, standardError: true } }),
        prisma.userAbility.findMany({ where: { userId } }),
        // Every topic with history, with decayed mastery, confident misses and
        // median time (services/topicSignals — shared with the analytics
        // registry of blind spots and time sinks).
        loadTopicSignals(userId, now),
        prisma.sRSCard.count({ where: { userId, nextReviewDate: { lte: now }, question: { isFlagged: false } } }),
        getSyllabusWeights(),
        getTccBySubject(),
    ]);

    const subjectAbilities = {};
    for (const a of abilityRows || []) {
        subjectAbilities[normalizeSubject(a.subject)] = { theta: a.theta, se: a.se };
    }

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

module.exports = router;
