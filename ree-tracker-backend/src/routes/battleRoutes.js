const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const idempotency = require('../middlewares/idempotency');
const { validate } = require('../middlewares/validate');
const { battleCreateSchema } = require('../schemas/battleSchemas');
const { samplePool, sampleBlendedPool } = require('../services/questionPool');
const { sanitizeBattleQuestions } = require('../utils/battleSanitizer');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// Create a battle from a pool SPEC. The server samples the questions itself —
// clients never supply the pool (they'd need answer keys to build one, which
// is exactly the cheating vector this closes). Always uses the authenticated
// user as host — never trust a body field for the FK.
router.post('/', authMiddleware, validate(battleCreateSchema), idempotency(), async (req, res) => {
    try {
        const { battleId, config, timeLimitSecs } = req.body;

        const pool = config.mode === 'blended'
            ? await sampleBlendedPool(100)
            : await samplePool({ subject: config.subject, subtopic: config.subtopic, limit: config.count });

        if (pool.length === 0) {
            return res.status(422).json({ error: 'Question pool unavailable for that configuration.' });
        }

        const battle = await prisma.battle.create({
            data: {
                id: battleId,
                hostId: req.user.id,
                config: { ...config, count: pool.length },
                questions: pool,
                timeLimitSecs,
            }
        });

        res.status(201).json({ success: true, battleId: battle.id });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Battle ID already exists.' });
        }
        logger.error('Battle create error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to create battle.' });
    }
});

// Battle payloads are sanitized: no answer keys, explanations, or IRT params
// leave the server while a battle is live. The key is revealed via the
// socket's battle-complete broadcast for the post-battle review screen.
router.get('/:battleId', authMiddleware, async (req, res) => {
    try {
        const battle = await prisma.battle.findUnique({
            where: { id: req.params.battleId }
        });

        if (!battle) return res.status(404).json({ error: 'Battle not found.' });

        res.status(200).json({
            success: true,
            battle: { ...battle, questions: sanitizeBattleQuestions(battle.questions) },
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch battle.' });
    }
});

// NOTE: the old REST POST /:battleId/submit and PUT /:battleId/progress
// endpoints are gone. They trusted client-supplied scores and had no real
// callers — the socket namespace (battle-answer / battle-submit) is the
// only submission path, and it grades server-side.

// GET /api/battles/:battleId/replay — full per-question deltas for a
// completed battle. Sorted by placement so the UI can render the podium
// + rating swing in order. Returns 404 if no outcomes have been
// recorded yet (battle still WAITING or ACTIVE).
router.get('/:battleId/replay', authMiddleware, async (req, res) => {
    try {
        const outcomes = await prisma.battleOutcome.findMany({
            where: { battleId: req.params.battleId },
            include: { user: { select: { id: true, displayName: true, photoURL: true } } },
            orderBy: { placement: 'asc' },
        });
        if (outcomes.length === 0) return res.status(404).json({ error: 'No completed battle by that id.' });
        const battle = await prisma.battle.findUnique({
            where: { id: req.params.battleId },
            select: { id: true, hostId: true, config: true, timeLimitSecs: true, createdAt: true },
        });
        return res.status(200).json({ battle, outcomes });
    } catch (error) {
        logger.error('battle replay failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to load replay.' });
    }
});

// GET /api/battles/:battleId/spectate — lightweight read-only snapshot
// for spectator overlays. Same payload the lobby socket would broadcast
// minus the participant attempt log. Polled (or upgraded to socket later).
router.get('/:battleId/spectate', authMiddleware, async (req, res) => {
    try {
        const battle = await prisma.battle.findUnique({
            where: { id: req.params.battleId },
            select: { id: true, status: true, config: true, timeLimitSecs: true, hostId: true },
        });
        if (!battle) return res.status(404).json({ error: 'Battle not found.' });
        // When already complete, return the same payload as /replay-minus-attempts.
        if (battle.status === 'COMPLETED') {
            const outcomes = await prisma.battleOutcome.findMany({
                where: { battleId: battle.id },
                select: {
                    userId: true, score: true, total: true, placement: true,
                    eloDelta: true, tierBefore: true, tierAfter: true,
                    user: { select: { displayName: true, photoURL: true } },
                },
                orderBy: { placement: 'asc' },
            });
            return res.status(200).json({ battle, outcomes, mode: 'POST' });
        }
        // Active lobbies — return battle metadata only; live participant
        // state lives in the socket lobby cache. The frontend spectator
        // mode connects a read-only socket for that.
        return res.status(200).json({ battle, mode: 'LIVE' });
    } catch (error) {
        logger.error('battle spectate failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to load spectator view.' });
    }
});

// GET /api/battles/me/history — most recent BattleOutcomes for the caller.
router.get('/me/history', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const items = await prisma.battleOutcome.findMany({
            where: { userId: req.user.id },
            include: { battle: { select: { config: true } } },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return res.status(200).json({ items });
    } catch (error) {
        logger.error('battle history failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to load battle history.' });
    }
});

module.exports = router;
