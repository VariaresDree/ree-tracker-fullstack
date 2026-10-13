const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const idempotency = require('../middlewares/idempotency');
const { validate } = require('../middlewares/validate');
const { battleCreateSchema } = require('../schemas/battleSchemas');
const { samplePool, sampleBlendedPool } = require('../services/questionPool');
const { sanitizeBattleQuestions } = require('../utils/battleSanitizer');
const { battleTiming } = require('../utils/battleLogic');
const battleLifecycle = require('../services/battleLifecycle');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// How long a read waits for a due battle to finish before answering anyway.
const SETTLE_WAIT_MS = 8000;

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

// GET /api/battles/me/active — the running battles the caller is in, for
// "Return to battle". Owner-scoped. A player who closed the app mid-battle had
// no way back: nothing remembered the battle, on this device or any other.
// Battles whose time is up are finished in the background and left out (they
// show under results once completed). Declared before /:battleId, which would
// otherwise take "me" as an id.
router.get('/me/active', authMiddleware, async (req, res) => {
    try {
        const rows = await prisma.battleParticipant.findMany({
            where: { userId: req.user.id, battle: { status: 'IN_PROGRESS' } },
            select: {
                battleId: true,
                finishedAt: true,
                battle: { select: { id: true, status: true, config: true, timeLimitSecs: true, startedAt: true, createdAt: true } },
            },
            orderBy: { joinedAt: 'desc' },
            take: 10,
        });
        const now = Date.now();
        const items = [];
        for (const row of rows) {
            const timing = battleTiming(row.battle, now);
            if (!timing) continue;
            if (timing.closed) {
                battleLifecycle.settleBattle(row.battleId).catch((err) => {
                    logger.error('battle settle (active list) failed', { battleId: row.battleId, error: err.message });
                });
                continue;
            }
            const live = battleLifecycle.battleLobbies.get(row.battleId)?.participants.get(req.user.id);
            items.push({
                battleId: row.battleId,
                config: row.battle.config,
                timeLimitSecs: row.battle.timeLimitSecs,
                endsAt: timing.endsAt,
                closesAt: timing.closesAt,
                remainingMs: timing.remainingMs,
                finished: !!(row.finishedAt || live?.finished || live?.finishPromise),
            });
        }
        return res.status(200).json({ items, serverNow: now });
    } catch (error) {
        logger.error('active battles failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to load your battles.' });
    }
});

// Battle payloads are sanitized: no answer keys, explanations, or IRT params
// leave the server while a battle is live. The key is revealed via the
// socket's battle-complete broadcast for the post-battle review screen.
//
// While it runs, it also carries the server's clock (`timing`) and, for a
// player, their own saved answers (`me`: the options picked, never whether
// they were right), so a player who comes back resumes where they were with
// the time actually left. A battle whose time is up is finished first.
router.get('/:battleId', authMiddleware, async (req, res) => {
    try {
        const where = { id: req.params.battleId };
        let battle = await prisma.battle.findUnique({ where });

        if (!battle) return res.status(404).json({ error: 'Battle not found.' });

        if (battle.status === 'IN_PROGRESS' && battleTiming(battle)?.closed) {
            await battleLifecycle.settleWithin(battle.id, SETTLE_WAIT_MS);
            battle = (await prisma.battle.findUnique({ where })) || battle;
        }

        const out = { ...battle, questions: sanitizeBattleQuestions(battle.questions) };
        if (battle.status === 'IN_PROGRESS') {
            const now = Date.now();
            const timing = battleTiming(battle, now);
            out.timing = timing
                ? { serverNow: now, startedAt: timing.startedAt, endsAt: timing.endsAt, closesAt: timing.closesAt, remainingMs: timing.remainingMs }
                : null;
            out.me = await battleLifecycle.participantSnapshot(battle.id, req.user.id);
        }

        res.status(200).json({ success: true, battle: out });
    } catch (error) {
        logger.error('battle fetch failed', { error: error.message });
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
