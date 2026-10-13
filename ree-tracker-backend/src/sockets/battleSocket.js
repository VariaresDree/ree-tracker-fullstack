const { getAuth } = require('firebase-admin/auth');
const prisma = require('../config/db');
const authMiddleware = require('../middlewares/authMiddleware');
// Pure scoring rules live in utils/battleLogic (Phase 4.1) so they're
// verifiable under simulated latency without a socket — see
// tests/battleLatency.test.js. How a battle is rebuilt, saved, finished and
// completed lives in services/battleLifecycle; handlers here stay thin callers.
const { applyAnswer, absentAtStart, battleTiming } = require('../utils/battleLogic');
const lifecycle = require('../services/battleLifecycle');
const { battleAnswerSchema, battleSubmitSchema } = require('../schemas/battleSchemas');
const logger = require('../utils/logger');
const { fallbackDisplayName } = require('@ree/shared');

const { battleLobbies, serializeParticipants } = lifecycle;
const MAX_PARTICIPANTS = 32;         // per-lobby cap — a join flood can't balloon one lobby
const LOBBY_GC_GRACE_MS = 60 * 1000; // drop an abandoned lobby this long after the last player leaves
// How long a join waits for a due battle to settle before answering anyway.
const JOIN_SETTLE_WAIT_MS = 8000;

// Per-socket event rate limiter (fixed window). The /battle namespace sits
// behind no HTTP rate-limit, so without this an authed client can flood
// battle-answer/join-battle. Transparent to well-behaved clients.
const RATE_LIMIT = { windowMs: 10 * 1000, max: 150 };
function rateLimited(socket) {
    const now = Date.now();
    const b = socket._rl || (socket._rl = { count: 0, resetAt: now + RATE_LIMIT.windowMs });
    if (now > b.resetAt) { b.count = 0; b.resetAt = now + RATE_LIMIT.windowMs; }
    b.count += 1;
    return b.count > RATE_LIMIT.max;
}

/** The server's clock for the exam room's timer, while a battle runs. */
function timingPayload(lobby, now = Date.now()) {
    const t = lifecycle.lobbyTiming(lobby, now);
    return t ? { serverNow: now, startedAt: t.startedAt, endsAt: t.endsAt, closesAt: t.closesAt } : null;
}

const questionCountOf = (battle) => (Array.isArray(battle.questions) ? battle.questions.length : 0);

/**
 * A completed battle, for one socket: its own result (which also clears a
 * submit it was still waiting to send) and everyone's results with the key.
 */
async function replayCompletion(socket, battleId, battle = null) {
    const done = await lifecycle.completionFor(battleId, socket.userId);
    if (!done) return false;
    if (battle) {
        socket.emit('lobby-update', {
            participants: done.payload.results,
            status: 'COMPLETED',
            config: battle.config,
            timeLimitSecs: battle.timeLimitSecs,
            questionCount: questionCountOf(battle),
        });
    }
    if (done.graded) socket.emit('battle-graded', done.graded);
    socket.emit('battle-complete', done.payload);
    return true;
}

function setupBattleSocket(io) {
    const battleNs = io.of('/battle');
    lifecycle.setBattleNamespace(battleNs);

    battleNs.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Authentication required'));

        let decoded;
        try {
            decoded = await getAuth().verifyIdToken(token);
            socket.userId = decoded.uid;
            socket.displayName = decoded.name || decoded.email?.split('@')[0] || fallbackDisplayName(decoded.uid);
        } catch (err) {
            logger.warn('Socket auth failed', { error: err.message });
            return next(new Error('Invalid token'));
        }
        // The battle's rows reference User. Someone whose first request ever
        // is a socket join (the HTTP middleware makes the row) would otherwise
        // fail every write. It logs and swallows its own errors.
        await authMiddleware.ensureUserExists(decoded);
        next();
    });

    battleNs.on('connection', (socket) => {
        logger.info('Battle socket connected', { userId: socket.userId });

        socket.on('join-battle', async ({ battleId } = {}) => {
            if (!battleId || typeof battleId !== 'string') return;
            if (rateLimited(socket)) return;

            try {
                let battle = await prisma.battle.findUnique({ where: { id: battleId } });
                if (!battle) {
                    return socket.emit('error', { message: 'Battle not found' });
                }

                // Its time is up but nothing has finished it (a restart, the
                // idle clean-up): finish it now, so a player coming back gets
                // the results rather than an exam room with no time left.
                if (battle.status === 'IN_PROGRESS' && battleTiming(battle)?.closed) {
                    await lifecycle.settleWithin(battleId, JOIN_SETTLE_WAIT_MS, { ns: battleNs });
                    battle = (await prisma.battle.findUnique({ where: { id: battleId } })) || battle;
                }

                // Authorization, before any lobby exists: a new player may only
                // join while the battle is gathering (WAITING). Once it has
                // started or completed, only a player may (re)connect. A refused
                // join used to leave an empty lobby behind, which a pending
                // deadline could then "complete" with nobody in it.
                if (battle.status !== 'WAITING' && !(await lifecycle.isParticipant(battleId, socket.userId))) {
                    return socket.emit('error', { message: 'This battle is no longer accepting new players.' });
                }

                if (battle.status === 'COMPLETED') {
                    // In the room all the same, so a results screen opened
                    // (or reloaded) after the end still hears a rematch being
                    // started. No lobby and no socket.battleId: there is no
                    // one to tell when it leaves.
                    socket.join(battleId);
                    // To this socket only: the others already have it.
                    if (!(await replayCompletion(socket, battleId, battle))) {
                        socket.emit('error', { message: 'Battle not found' });
                    }
                    return;
                }

                const lobby = await lifecycle.hydrateLobby(battleId, { battle });
                if (!lobby) return socket.emit('error', { message: 'Battle not found' });
                const existing = lobby.participants.get(socket.userId);
                if (!existing && lobby.participants.size >= MAX_PARTICIPANTS) {
                    return socket.emit('error', { message: 'This battle is full.' });
                }

                socket.join(battleId);
                socket.battleId = battleId;

                if (existing) {
                    // A reconnect or a rejoin keeps the answers and score.
                    existing.connected = true;
                } else {
                    lobby.participants.set(socket.userId, {
                        id: socket.userId,
                        displayName: socket.displayName,
                        score: 0,
                        itemsAnswered: 0,
                        connected: true,
                        isHost: battle.hostId === socket.userId,
                        finished: false,
                        answers: new Map(),
                    });
                }

                if (battle.status === 'WAITING') {
                    try {
                        await prisma.battleParticipant.upsert({
                            where: { battleId_userId: { battleId, userId: socket.userId } },
                            update: { displayName: socket.displayName },
                            create: {
                                battleId,
                                userId: socket.userId,
                                displayName: socket.displayName,
                                isHost: battle.hostId === socket.userId,
                            },
                        });
                    } catch (err) {
                        // Not fatal: the first saved answer makes the row.
                        logger.warn('battle participant row upsert failed', { battleId, userId: socket.userId, error: err.message });
                    }
                }

                if (battle.status === 'IN_PROGRESS') lifecycle.armDeadline(battleNs, battleId, lobby);

                battleNs.to(battleId).emit('lobby-update', {
                    participants: serializeParticipants(lobby),
                    status: battle.status,
                    config: battle.config,
                    timeLimitSecs: battle.timeLimitSecs,
                    questionCount: questionCountOf(battle),
                    timing: battle.status === 'IN_PROGRESS' ? timingPayload(lobby) : null,
                });

                logger.info('User joined battle', { userId: socket.userId, battleId });
            } catch (err) {
                logger.error('Join battle error', { error: err.message, battleId });
                socket.emit('error', { message: 'Failed to join battle' });
            }
        });

        socket.on('start-battle', async ({ battleId } = {}) => {
            if (!battleId || typeof battleId !== 'string') return;
            // Was unthrottled: a flood of start-battle for a battle the caller
            // hosts issued two DB round-trips per emit with no limiter and no
            // HTTP rate limit on the namespace.
            if (rateLimited(socket)) return;

            try {
                const battle = await prisma.battle.findUnique({ where: { id: battleId } });
                if (!battle) return;
                if (battle.hostId !== socket.userId) {
                    return socket.emit('error', { message: 'Only the host can start the battle' });
                }
                // A second start is a no-op. It used to reset startedAt (moving
                // everyone's deadline) and could reopen a completed battle,
                // applying its Elo twice.
                if (battle.status !== 'WAITING') return;

                const lobby = await lifecycle.hydrateLobby(battleId, { battle });
                if (!lobby) return;
                // Whoever isn't connected now is out: they can't answer, and
                // they used to be waited for until the end of time.
                const absent = absentAtStart(lobby.participants);
                const startedAt = Date.now();

                // One claim: only the start that flips WAITING → IN_PROGRESS goes on.
                const claimed = await prisma.$transaction(async (tx) => {
                    const { count } = await tx.battle.updateMany({
                        where: { id: battleId, hostId: socket.userId, status: 'WAITING' },
                        // startedAt is persisted so a restart or eviction
                        // mid-battle keeps everyone's deadline.
                        data: { status: 'IN_PROGRESS', startedAt: new Date(startedAt) },
                    });
                    if (count !== 1) return false;
                    if (absent.length > 0) {
                        await tx.battleParticipant.deleteMany({ where: { battleId, userId: { in: absent } } });
                    }
                    return true;
                });
                if (!claimed) return;

                for (const id of absent) lobby.participants.delete(id);
                lobby.startedAt = startedAt;
                lobby.timeLimitSecs = battle.timeLimitSecs;
                // Every player has a row from here on (a join's upsert may
                // have failed), so the battle can finish without this process.
                for (const p of lobby.participants.values()) lifecycle.persistAnswers(battleId, p);

                const timing = timingPayload(lobby);
                battleNs.to(battleId).emit('battle-started', {
                    startedAt,
                    timeLimitSecs: battle.timeLimitSecs,
                    ...timing,
                });
                battleNs.to(battleId).emit('lobby-update', {
                    participants: serializeParticipants(lobby),
                    status: 'IN_PROGRESS',
                    timing,
                });
                lifecycle.armDeadline(battleNs, battleId, lobby);

                logger.info('Battle started', { battleId, host: socket.userId });
            } catch (err) {
                logger.error('Start battle error', { error: err.message, battleId });
            }
        });

        // Live per-question answer, graded server-side against the lobby's
        // answer key, and saved so it survives a restart or the player leaving.
        socket.on('battle-answer', async (payload) => {
            if (rateLimited(socket)) return;
            const parsed = battleAnswerSchema.safeParse(payload || {});
            if (!parsed.success) return; // silently drop malformed payloads
            const { battleId, questionId, userAnswer, confidenceLevel, timeSpentMs } = parsed.data;

            try {
                // Never create a lobby for an arbitrary id (a client could flood
                // the cache and evict live battles): rebuild one only for a
                // player of that battle — an answer can arrive before the
                // rejoin after a restart.
                const lobby = battleLobbies.get(battleId) || await lifecycle.hydrateIfParticipant(battleId, socket.userId);
                if (!lobby) return;
                lobby.lastActivity = Date.now();
                const participant = lobby.participants.get(socket.userId);
                // Not once they have finished, or while finishing.
                if (!participant || participant.finished || participant.finishPromise) return;
                // Not before the start, and not after the deadline.
                if (!lobby.startedAt) return;
                if (lifecycle.lobbyTiming(lobby)?.closed) return;

                const answerKey = await lifecycle.ensureAnswerKey(lobby, battleId);
                if (!answerKey) return;

                // Upsert-by-questionId, graded server-side (utils/battleLogic).
                const applied = applyAnswer(
                    participant,
                    { questionId, userAnswer, confidenceLevel, timeSpentMs },
                    answerKey,
                );
                if (!applied) return;
                lifecycle.persistAnswers(battleId, participant);

                socket.to(battleId).emit('opponent-progress', {
                    id: socket.userId,
                    displayName: participant.displayName,
                    score: participant.score,
                    itemsAnswered: participant.itemsAnswered
                });
            } catch (err) {
                logger.warn('battle-answer failed', { error: err.message, battleId });
            }
        });

        // A player's final submit. Always answered with `battle-graded` (or an
        // error): the client keeps resending an unacknowledged submit, and a
        // silent return left it on "Reconnecting…" for good.
        socket.on('battle-submit', async (payload) => {
            if (rateLimited(socket)) return;

            const parsed = battleSubmitSchema.safeParse(payload || {});
            if (!parsed.success) return;
            const { battleId, attempts: clientAttempts } = parsed.data;

            try {
                const battle = await prisma.battle.findUnique({
                    where: { id: battleId },
                    select: { id: true, status: true, startedAt: true, timeLimitSecs: true, createdAt: true },
                });
                if (!battle) return socket.emit('error', { message: 'Battle not found' });
                // A participant who joined while the battle was WAITING could
                // submit before start-battle was ever emitted.
                if (battle.status === 'WAITING') {
                    return socket.emit('error', { message: 'Battle is not in progress' });
                }
                if (battle.status === 'COMPLETED') {
                    if (!(await replayCompletion(socket, battleId))) socket.emit('error', { message: 'Battle not found' });
                    return;
                }

                const lobby = battleLobbies.get(battleId) || await lifecycle.hydrateIfParticipant(battleId, socket.userId);
                const participant = lobby?.participants.get(socket.userId);
                if (!participant) return socket.emit('error', { message: 'You are not in this battle.' });
                lobby.lastActivity = Date.now();

                // After the deadline the server's record is final: finish the
                // battle, then send this player the result.
                if (lifecycle.lobbyTiming(lobby)?.closed || battleTiming(battle)?.closed) {
                    await lifecycle.settleBattle(battleId, { ns: battleNs });
                    if (!(await replayCompletion(socket, battleId))) {
                        socket.emit('error', { message: 'Results are still being worked out. Try again in a moment.' });
                    }
                    return;
                }

                // A second submit (a resend after a reconnect) gets the same
                // ack and is not announced again.
                const wasDone = participant.finished || !!participant.finishPromise;
                const done = participant.finished
                    ? lifecycle.resultOf(lobby, participant)
                    : await lifecycle.finishParticipant(battleId, lobby, socket.userId, clientAttempts);
                if (!done) return socket.emit('error', { message: 'Battle not found' });
                const { score, total, timeTakenSecs, finalAttempts } = done;

                // Ack the submitter with their authoritative result. No answer
                // key yet — opponents may still be mid-battle.
                socket.emit('battle-graded', {
                    score,
                    total,
                    timeTakenSecs,
                    perQuestion: finalAttempts.map((a) => ({ questionId: a.questionId, isCorrect: a.isCorrect })),
                });

                if (!wasDone) {
                    battleNs.to(battleId).emit('participant-finished', {
                        id: socket.userId,
                        displayName: participant.displayName,
                        score,
                        total,
                        timeTakenSecs
                    });
                }

                const allFinished = Array.from(lobby.participants.values()).every((p) => p.finished);
                if (allFinished && lobby.participants.size > 0) {
                    await lifecycle.completeBattle(battleNs, battleId, lobby);
                }
            } catch (err) {
                logger.error('Battle submit error', { error: err.message, battleId });
                socket.emit('error', { message: "Couldn't submit. It will be sent again when you reconnect." });
            }
        });

        socket.on('disconnect', () => {
            const battleId = socket.battleId;
            if (battleId) {
                const lobby = battleLobbies.get(battleId); // don't re-create on disconnect
                if (lobby) {
                    const participant = lobby.participants.get(socket.userId);
                    if (participant) {
                        participant.connected = false;
                    }

                    battleNs.to(battleId).emit('lobby-update', {
                        participants: serializeParticipants(lobby)
                    });

                    // GC an abandoned lobby: if every participant is now
                    // disconnected or finished, schedule deletion after a grace
                    // period. A reconnect within the window bumps lastActivity
                    // and cancels the delete. Dropping it loses nothing: answers
                    // are saved, the deadline timer stays armed, and the lobby
                    // is rebuilt from the database when anyone needs it.
                    const anyLive = Array.from(lobby.participants.values()).some((p) => p.connected && !p.finished);
                    if (!anyLive) {
                        const scheduledAt = Date.now();
                        setTimeout(() => {
                            const cur = battleLobbies.get(battleId);
                            if (!cur) return;
                            const stillIdle = Array.from(cur.participants.values()).every((p) => !p.connected || p.finished);
                            if (stillIdle && (cur.lastActivity ?? 0) <= scheduledAt) {
                                battleLobbies.delete(battleId);
                                logger.info('lobby GC (abandoned)', { battleId });
                            }
                        }, LOBBY_GC_GRACE_MS).unref?.();
                    }
                }
            }

            logger.info('Battle socket disconnected', { userId: socket.userId });
        });
    });
}

module.exports = {
    setupBattleSocket,
    // Test seams for the deadline path (tests/battleDeadline.test.js).
    __test: { battleLobbies, finishAtDeadline: lifecycle.finishAtDeadline, armDeadline: lifecycle.armDeadline },
};
