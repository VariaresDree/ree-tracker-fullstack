const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { buildForecast } = require('../engine/forecast');

// GET /api/forecast — latest snapshot for the caller, or recompute on the fly.
router.get('/', authMiddleware, async (req, res) => {
    try {
        const latest = await prisma.forecastSnapshot.findFirst({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
        });

        if (latest) return res.status(200).json({ snapshot: latest, fresh: false });

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

    // Topic-level abilities — fall back to UserTopicPerformance rollups when
    // UserAbility hasn't been populated yet.
    let topicAbilities = abilities.map((a) => ({ topic: a.subject, theta: a.theta, se: a.se }));
    if (topicAbilities.length === 0) {
        const tp = await prisma.userTopicPerformance.findMany({
            where: { userId },
            take: 20,
            orderBy: { updatedAt: 'desc' },
        });
        topicAbilities = tp.map((t) => ({
            topic: t.topic,
            // Crude derivation: log-odds of hit rate, bounded to a sane range.
            theta: hitRateToTheta(t.correct, t.attempts),
            se: t.attempts >= 8 ? 0.45 : 0.9,
        }));
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
