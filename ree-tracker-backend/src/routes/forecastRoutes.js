const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { buildForecast } = require('../engine/forecast');

// GET /api/forecast — latest snapshot for the caller, or recompute on the fly.
// Recomputes (in-memory) when the cached snapshot predates the user's most
// recent activity, so the trajectory always reflects newly-answered questions
// instead of freezing on the first snapshot ever persisted.
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [user, latest] = await Promise.all([
            prisma.user.findUnique({ where: { id: req.user.id }, select: { lastActive: true } }),
            prisma.forecastSnapshot.findFirst({
                where: { userId: req.user.id },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const stale = latest && user?.lastActive && new Date(latest.createdAt) < new Date(user.lastActive);
        if (latest && !stale) return res.status(200).json({ snapshot: latest, fresh: false });

        const computed = await computeForUser(req.user.id);
        return res.status(200).json({ snapshot: computed, fresh: true });
    } catch (error) {
        logger.error('forecast GET failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Forecast unavailable.' });
    }
});

// POST /api/forecast/recompute — force-recompute and persist a new snapshot.
router.post('/recompute', authMiddleware, async (req, res) => {
    try {
        const snapshot = await computeForUser(req.user.id, { persist: true });
        return res.status(200).json({ snapshot });
    } catch (error) {
        logger.error('forecast recompute failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Forecast recompute failed.' });
    }
});

async function computeForUser(userId, opts = {}) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { thetaRating: true, standardError: true },
    });

    const abilities = await prisma.userAbility.findMany({ where: { userId } });
    const ability = {
        theta: user?.thetaRating ?? 0,
        se: user?.standardError ?? 1,
    };

    // Topic-level abilities come from UserTopicPerformance, which is genuinely
    // per-TOPIC.
    //
    // This used to read UserAbility first and label each row's `subject` as a
    // `topic`. UserAbility is per canonical SUBJECT — only Mathematics, ESAS and
    // EE exist — and since recordAttempts now always upserts those rows, the
    // `length === 0` fallback below was dead for every active user. The result:
    // "weak topics" and the entire recommendedActions prescription returned at
    // most three entries named "Mathematics", "ESAS" and "EE", which the client
    // then tried to route DRILL / SRS_REVIEW actions against by payload.topic.
    //
    // The subject-level posterior is still the right input for the OVERALL
    // forecast — that is `ability` above, which is unchanged.
    const tp = await prisma.userTopicPerformance.findMany({
        where: { userId, attempts: { gt: 0 } },
        take: 20,
        orderBy: { updatedAt: 'desc' },
    });
    let topicAbilities = tp.map((t) => ({
        topic: t.topic,
        // Crude derivation: log-odds of hit rate, bounded to a sane range.
        theta: hitRateToTheta(t.correct, t.attempts),
        se: t.attempts >= 8 ? 0.45 : 0.9,
    }));

    // Only if the learner has no per-topic history at all do we fall back to the
    // per-subject posterior, so a brand-new user still gets a coarse forecast.
    if (topicAbilities.length === 0) {
        topicAbilities = abilities.map((a) => ({ topic: a.subject, theta: a.theta, se: a.se }));
    }

    const payload = buildForecast({ ability, topicAbilities });

    if (opts.persist) {
        return prisma.forecastSnapshot.create({
            data: { userId, ...payload },
        });
    }
    return { id: 'in-memory', userId, createdAt: new Date(), ...payload };
}

function hitRateToTheta(correct, attempts) {
    if (!attempts) return 0;
    const rate = Math.max(0.02, Math.min(0.98, correct / attempts));
    return Math.log(rate / (1 - rate)); // log-odds
}

module.exports = router;
