const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const { recordAttempts } = require('../services/telemetryService');
const logger = require('../utils/logger');

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { battleId, config, questions, timeLimitSecs } = req.body;

        if (!battleId || !questions || !timeLimitSecs) {
            return res.status(400).json({ error: 'battleId, questions, and timeLimitSecs are required.' });
        }

        // Always use the authenticated user as host — never trust a body field
        // for the FK. (The old code accepted a body `hostId` which the frontend
        // was passing as a Firebase user object, blowing up Prisma's String
        // type check and producing a silent 500.)
        const battle = await prisma.battle.create({
            data: {
                id: battleId,
                hostId: req.user.id,
                config: config || {},
                questions: questions,
                timeLimitSecs: parseInt(timeLimitSecs)
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

router.get('/:battleId', authMiddleware, async (req, res) => {
    try {
        const battle = await prisma.battle.findUnique({
            where: { id: req.params.battleId }
        });

        if (!battle) return res.status(404).json({ error: 'Battle not found.' });

        res.status(200).json({ success: true, battle });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch battle.' });
    }
});

router.post('/:battleId/submit', authMiddleware, async (req, res) => {
    try {
        const { score, total, timeTakenSecs, attempts } = req.body;

        const battle = await prisma.battle.findUnique({
            where: { id: req.params.battleId }
        });
        if (!battle) return res.status(404).json({ error: 'Battle not found.' });

        await prisma.battle.update({
            where: { id: req.params.battleId },
            data: { status: 'COMPLETED' }
        });

        // If the client sends per-question attempts, persist them so Combat Terminal
        // results contribute to dashboard/profile analytics. The score/total fields
        // remain authoritative for the lobby view.
        let telemetry = null;
        if (Array.isArray(attempts) && attempts.length > 0) {
            try {
                telemetry = await recordAttempts({
                    userId: req.user.id,
                    mode: req.body.mode || 'COMBAT',
                    attempts,
                });
            } catch (telErr) {
                logger.warn('battle telemetry persist failed', { error: telErr.message });
            }
        }

        res.status(200).json({ success: true, score, total, timeTakenSecs, telemetry });
    } catch (error) {
        logger.error('battle submit error', { error: error.message });
        res.status(500).json({ error: 'Failed to submit battle score.' });
    }
});

router.put('/:battleId/progress', authMiddleware, async (req, res) => {
    try {
        const { liveScore, itemsAnswered } = req.body;

        const battle = await prisma.battle.findUnique({
            where: { id: req.params.battleId }
        });
        if (!battle) return res.status(404).json({ error: 'Battle not found.' });

        res.status(200).json({ success: true, liveScore, itemsAnswered });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update progress.' });
    }
});

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
