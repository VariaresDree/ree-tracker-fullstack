const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const idempotency = require('../middlewares/idempotency');
const { validate } = require('../middlewares/validate');
const { battleCreateSchema } = require('../schemas/battleSchemas');
const { sanitizeBattleQuestions } = require('../utils/battleSanitizer');
const { battleTiming, publicAnswers } = require('../utils/battleLogic');
const battleLifecycle = require('../services/battleLifecycle');
// Called through the module objects (not destructured) so tests can patch them.
const battleCreate = require('../services/battleCreate');
const pushService = require('../services/pushService');
const { lockedQuestionIds } = require('../services/answerGate');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { fallbackDisplayName } = require('@ree/shared');

// How long a read waits for a due battle to finish before answering anyway.
const SETTLE_WAIT_MS = 8000;

// A rematch re-checks the old battle's settings with the create rules (minus
// the id, which the server mints).
const rematchSettingsSchema = battleCreateSchema.omit({ battleId: true });

// Create a battle from a pool SPEC (services/battleCreate). Always uses the
// authenticated user as host — never trust a body field for the FK.
router.post('/', authMiddleware, validate(battleCreateSchema), idempotency(), async (req, res) => {
    try {
        const { battleId, config, timeLimitSecs } = req.body;

        const battle = await battleCreate.createBattle({ hostId: req.user.id, battleId, config, timeLimitSecs });
        if (!battle) {
            return res.status(422).json({ error: 'Question pool unavailable for that configuration.' });
        }

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

const HISTORY_DEFAULT = 20;
const HISTORY_MAX = 100;

// GET /api/battles/me/history?limit=20&before=<ISO time> — the caller's
// finished battles, newest first: the format, their place and score, the
// rating change, who they played (under the names they played as) and the
// battle's rematch if there is one. `before` is the previous page's
// `nextBefore` (a result's time), null when there's nothing older.
// `answered` is how many items the caller answered: the app offers Review
// only when there's something to review. Owner-scoped.
router.get('/me/history', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || HISTORY_DEFAULT, 1), HISTORY_MAX);
        const before = req.query.before ? new Date(String(req.query.before)) : null;
        if (before && Number.isNaN(before.getTime())) {
            return res.status(400).json({ error: 'before must be a date.' });
        }

        const rows = await prisma.battleOutcome.findMany({
            where: { userId: req.user.id, ...(before ? { createdAt: { lt: before } } : {}) },
            select: {
                battleId: true, createdAt: true, score: true, total: true, placement: true, eloDelta: true, tierAfter: true,
                battle: {
                    select: {
                        config: true,
                        timeLimitSecs: true,
                        rematch: { select: { id: true, status: true } },
                        outcomes: {
                            select: { userId: true, placement: true, score: true, user: { select: { displayName: true } } },
                            orderBy: { placement: 'asc' },
                        },
                        participants: { select: { userId: true, displayName: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
        });
        const page = rows.slice(0, limit);

        // Only the caller's own answers, to count them.
        const mine = page.length === 0 ? [] : await prisma.battleParticipant.findMany({
            where: { userId: req.user.id, battleId: { in: page.map((r) => r.battleId) } },
            select: { battleId: true, answers: true },
        });
        const answeredIn = new Map(mine.map((r) => [r.battleId, Object.keys(publicAnswers(r.answers)).length]));

        const items = page.map((r) => {
            const nameOf = new Map((r.battle?.participants || []).map((p) => [p.userId, p.displayName]));
            const outcomes = r.battle?.outcomes || [];
            return {
                battleId: r.battleId,
                createdAt: r.createdAt,
                config: r.battle?.config ?? null,
                timeLimitSecs: r.battle?.timeLimitSecs ?? null,
                score: r.score,
                total: r.total,
                placement: r.placement,
                players: outcomes.length,
                eloDelta: r.eloDelta,
                tierAfter: r.tierAfter,
                answered: answeredIn.get(r.battleId) ?? 0,
                opponents: outcomes
                    .filter((o) => o.userId !== req.user.id)
                    .map((o) => ({
                        userId: o.userId,
                        displayName: nameOf.get(o.userId) || o.user?.displayName || fallbackDisplayName(o.userId),
                        placement: o.placement,
                        score: o.score,
                    })),
                rematch: r.battle?.rematch ? { battleId: r.battle.rematch.id, status: r.battle.rematch.status } : null,
            };
        });
        // A result's time is when its battle completed, so two of one
        // player's results never share one in practice.
        const nextBefore = rows.length > limit ? new Date(page[page.length - 1].createdAt).toISOString() : null;
        return res.status(200).json({ items, nextBefore });
    } catch (error) {
        logger.error('battle history failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to load battle history.' });
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

/**
 * Whether `{ battleId, userId }` played in the battle: their player row (for
 * the name they played under), or failing that a result. Null otherwise.
 */
async function playedIn(key) {
    const row = await prisma.battleParticipant.findUnique({ where: { battleId_userId: key }, select: { displayName: true } });
    if (row) return row;
    const outcome = await prisma.battleOutcome.findUnique({ where: { battleId_userId: key }, select: { id: true } });
    return outcome ? { displayName: null } : null;
}

const questionIdsOf = (questions) => (Array.isArray(questions) ? questions : [])
    .map((q) => (q && typeof q === 'object' ? q.id : q))
    .filter(Boolean);

// GET /api/battles/:battleId/replay — a completed battle as its players saw
// it: the podium (placement, score, time, rating change), its rematch if one
// was started, and, per question, what each player picked, whether it was
// right and how long they took. For
// the battle's own players only; anyone else gets a 404, as for a battle that
// doesn't exist. It used to serve any battle to any signed-in user, with every
// player's name, photo and per-question results.
//
// No answer key: the sitting review (which checks the same things) carries
// the caller's own key. A question that is also in a battle the caller is
// still playing has no picks, so the others' answers can't give its key away.
router.get('/:battleId/replay', authMiddleware, async (req, res) => {
    try {
        const { battleId } = req.params;
        if (!(await playedIn({ battleId, userId: req.user.id }))) {
            return res.status(404).json({ error: 'No completed battle by that id.' });
        }
        const [battle, outcomes, rows] = await Promise.all([
            prisma.battle.findUnique({
                where: { id: battleId },
                select: {
                    id: true, status: true, config: true, timeLimitSecs: true, createdAt: true, questions: true,
                    rematch: { select: { id: true, status: true } },
                },
            }),
            prisma.battleOutcome.findMany({
                where: { battleId },
                select: {
                    userId: true, score: true, total: true, timeTakenSecs: true, placement: true, eloDelta: true, perQuestion: true,
                    user: { select: { displayName: true } },
                },
                orderBy: { placement: 'asc' },
            }),
            prisma.battleParticipant.findMany({
                where: { battleId },
                select: { userId: true, displayName: true, answers: true },
            }),
        ]);
        if (!battle || battle.status !== 'COMPLETED' || outcomes.length === 0) {
            return res.status(404).json({ error: 'No completed battle by that id.' });
        }

        const rowOf = new Map(rows.map((r) => [r.userId, r]));
        const players = outcomes.map((o) => ({
            userId: o.userId,
            displayName: rowOf.get(o.userId)?.displayName || o.user?.displayName || fallbackDisplayName(o.userId),
            placement: o.placement,
            score: o.score,
            total: o.total,
            timeTakenSecs: o.timeTakenSecs,
            eloDelta: o.eloDelta,
        }));

        const questionOrder = questionIdsOf(battle.questions);
        const locked = await lockedQuestionIds(req.user.id, questionOrder);
        // Correctness and time from the result (graded at completion); the
        // option picked from the player's saved answers.
        const graded = new Map(outcomes.map((o) => [
            o.userId,
            new Map((Array.isArray(o.perQuestion) ? o.perQuestion : []).map((q) => [q.questionId, q])),
        ]));
        const picks = {};
        for (const questionId of questionOrder) {
            if (locked.has(questionId)) continue;
            picks[questionId] = outcomes.map(({ userId }) => {
                const saved = rowOf.get(userId)?.answers?.[questionId];
                const result = graded.get(userId).get(questionId);
                const answer = typeof saved?.userAnswer === 'string' ? saved.userAnswer : null;
                return {
                    userId,
                    answer,
                    isCorrect: answer != null && !!result?.isCorrect,
                    timeMs: Number.isFinite(result?.timeMs) ? result.timeMs : Number.isFinite(saved?.timeSpentMs) ? saved.timeSpentMs : 0,
                };
            });
        }

        return res.status(200).json({
            battle: {
                id: battle.id, config: battle.config, timeLimitSecs: battle.timeLimitSecs, createdAt: battle.createdAt, questionOrder,
                rematch: battle.rematch ? { battleId: battle.rematch.id, status: battle.rematch.status } : null,
            },
            players,
            picks,
        });
    } catch (error) {
        logger.error('battle replay failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to load replay.' });
    }
});

// POST /api/battles/:battleId/rematch — the same settings again: a new lobby
// hosted by the caller, with fresh questions, linked to this battle. Only a
// player may ask (404 otherwise) and only once it is over (409). A battle has
// one rematch: asking again, or a second player asking at the same moment,
// gets the one already made (200, created: false), unless it has started
// without the caller (409: it takes no new players). The players still on the
// results screen are told over the old battle's room, and the others by a
// push when push is on.
router.post('/:battleId/rematch', authMiddleware, async (req, res) => {
    try {
        const { battleId } = req.params;
        const me = await playedIn({ battleId, userId: req.user.id });
        if (!me) return res.status(404).json({ error: 'No battle by that id.' });

        const battle = await prisma.battle.findUnique({
            where: { id: battleId },
            select: { id: true, status: true, config: true, timeLimitSecs: true, questions: true, rematch: { select: { id: true, status: true } } },
        });
        if (!battle) return res.status(404).json({ error: 'No battle by that id.' });
        if (battle.status !== 'COMPLETED') {
            return res.status(409).json({ error: 'This battle isn’t over yet.' });
        }
        if (battle.rematch) {
            // Started without the caller: it takes no new players, so going
            // there would only end on "no longer accepting new players".
            if (battle.rematch.status !== 'WAITING' && !(await playedIn({ battleId: battle.rematch.id, userId: req.user.id }))) {
                return res.status(409).json({ error: 'That rematch has already started.', battleId: battle.rematch.id });
            }
            return res.status(200).json({ battleId: battle.rematch.id, created: false });
        }

        const settings = rematchSettingsSchema.safeParse({ config: battle.config, timeLimitSecs: battle.timeLimitSecs });
        if (!settings.success) {
            return res.status(422).json({ error: 'This battle’s settings can’t be used again. Host a new battle instead.' });
        }

        const readBackRematch = () => prisma.battle.findUnique({ where: { rematchOfId: battle.id }, select: { id: true } });
        let created = null;
        for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
            try {
                created = await battleCreate.createBattle({
                    hostId: req.user.id,
                    battleId: await battleCreate.mintBattleId(),
                    config: settings.data.config,
                    timeLimitSecs: settings.data.timeLimitSecs,
                    rematchOfId: battle.id,
                    avoidIds: questionIdsOf(battle.questions),
                });
                if (!created) return res.status(422).json({ error: 'Question pool unavailable for that configuration.' });
            } catch (err) {
                if (err?.code !== 'P2002') throw err;
                // Someone else's rematch landed first: theirs is the rematch.
                // Otherwise the new id was taken in the meantime: mint another.
                const winner = await readBackRematch();
                if (winner) return res.status(200).json({ battleId: winner.id, created: false });
            }
        }
        if (!created) throw new Error('No free battle id for the rematch.');

        const by = { userId: req.user.id, displayName: me.displayName || req.user.name || fallbackDisplayName(req.user.id) };
        battleLifecycle.notifyRoom(battle.id, 'rematch-ready', { battleId: created.id, by });
        notifyOthersByPush(battle.id, by, created.id);

        return res.status(201).json({ battleId: created.id, created: true });
    } catch (error) {
        logger.error('battle rematch failed', { error: error.message });
        return res.status(500).json({ error: 'Couldn’t start a rematch.' });
    }
});

/** Best effort, not awaited: the other players hear of a rematch on their phones. */
function notifyOthersByPush(oldBattleId, by, newBattleId) {
    prisma.battleOutcome.findMany({ where: { battleId: oldBattleId }, select: { userId: true } })
        .then((rows) => Promise.all((rows || [])
            .filter((r) => r.userId !== by.userId)
            .map((r) => pushService.sendToUser(r.userId, {
                title: 'Rematch?',
                body: `${by.displayName} started a rematch. Join from the battle room.`,
                data: { route: `/battle/${newBattleId}` },
            }))))
        .catch((err) => logger.warn('rematch push failed', { battleId: oldBattleId, error: err.message }));
}

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

module.exports = router;
