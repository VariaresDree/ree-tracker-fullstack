const { getAuth } = require('firebase-admin/auth');
const prisma = require('../config/db');
const { recordAttempts } = require('../services/telemetryService');
const { recomputeRatings, tierFor } = require('../engine/elo');
const logger = require('../utils/logger');

// In-memory lobby state (participants, live scores).
// Hard cap prevents unbounded growth if a client spams join-battle with
// random IDs — old lobbies are evicted FIFO once we exceed the cap.
const MAX_LOBBIES = 500;
const battleLobbies = new Map();

function getLobby(battleId) {
    if (!battleLobbies.has(battleId)) {
        if (battleLobbies.size >= MAX_LOBBIES) {
            const oldest = battleLobbies.keys().next().value;
            battleLobbies.delete(oldest);
            logger.warn('lobby cache evicted', { evicted: oldest });
        }
        battleLobbies.set(battleId, { participants: new Map(), startedAt: null });
    }
    return battleLobbies.get(battleId);
}

function serializeParticipants(lobby) {
    return Array.from(lobby.participants.values());
}

function setupBattleSocket(io) {
    const battleNs = io.of('/battle');

    battleNs.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Authentication required'));

        try {
            const decoded = await getAuth().verifyIdToken(token);
            socket.userId = decoded.uid;
            socket.displayName = decoded.name || decoded.email?.split('@')[0] || 'Agent';
            next();
        } catch (err) {
            logger.warn('Socket auth failed', { error: err.message });
            next(new Error('Invalid token'));
        }
    });

    battleNs.on('connection', (socket) => {
        logger.info('Battle socket connected', { userId: socket.userId });

        socket.on('join-battle', async ({ battleId }) => {
            if (!battleId) return;

            try {
                const battle = await prisma.battle.findUnique({ where: { id: battleId } });
                if (!battle) {
                    return socket.emit('error', { message: 'Battle not found' });
                }

                socket.join(battleId);
                socket.battleId = battleId;

                const lobby = getLobby(battleId);
                lobby.participants.set(socket.userId, {
                    id: socket.userId,
                    displayName: socket.displayName,
                    score: 0,
                    itemsAnswered: 0,
                    connected: true,
                    isHost: battle.hostId === socket.userId,
                    finished: false
                });

                battleNs.to(battleId).emit('lobby-update', {
                    participants: serializeParticipants(lobby),
                    status: battle.status,
                    config: battle.config,
                    timeLimitSecs: battle.timeLimitSecs,
                    questionCount: Array.isArray(battle.questions) ? battle.questions.length : 0
                });

                logger.info('User joined battle', { userId: socket.userId, battleId });
            } catch (err) {
                logger.error('Join battle error', { error: err.message, battleId });
                socket.emit('error', { message: 'Failed to join battle' });
            }
        });

        socket.on('start-battle', async ({ battleId }) => {
            if (!battleId) return;

            try {
                const battle = await prisma.battle.findUnique({ where: { id: battleId } });
                if (!battle) return;
                if (battle.hostId !== socket.userId) {
                    return socket.emit('error', { message: 'Only the host can start the battle' });
                }

                await prisma.battle.update({
                    where: { id: battleId },
                    data: { status: 'IN_PROGRESS' }
                });

                const lobby = getLobby(battleId);
                lobby.startedAt = Date.now();

                battleNs.to(battleId).emit('battle-started', {
                    startedAt: lobby.startedAt,
                    timeLimitSecs: battle.timeLimitSecs
                });

                logger.info('Battle started', { battleId, host: socket.userId });
            } catch (err) {
                logger.error('Start battle error', { error: err.message, battleId });
            }
        });

        socket.on('battle-progress', ({ battleId, score, itemsAnswered }) => {
            if (!battleId) return;

            const lobby = getLobby(battleId);
            const participant = lobby.participants.get(socket.userId);
            if (participant) {
                participant.score = score;
                participant.itemsAnswered = itemsAnswered;

                socket.to(battleId).emit('opponent-progress', {
                    id: socket.userId,
                    displayName: participant.displayName,
                    score,
                    itemsAnswered
                });
            }
        });

        socket.on('battle-submit', async ({ battleId, score, total, timeTakenSecs, attempts }) => {
            if (!battleId) return;

            try {
                const lobby = getLobby(battleId);
                const participant = lobby.participants.get(socket.userId);
                if (participant) {
                    participant.score = score;
                    participant.itemsAnswered = total;
                    participant.finished = true;
                    participant.timeTakenSecs = timeTakenSecs;
                }

                // Persist per-question attempts so Combat Terminal / Battle
                // results show up in Dashboard + Profile analytics. Server
                // re-grades against Question.answer inside recordAttempts so
                // we don't trust the client's isCorrect flag.
                if (Array.isArray(attempts) && attempts.length > 0) {
                    // Cache for replay payload assembled at battle-complete.
                    if (participant) participant.attempts = attempts;
                    try {
                        await recordAttempts({
                            userId: socket.userId,
                            mode: 'BATTLE',
                            attempts,
                        });
                    } catch (telErr) {
                        logger.warn('battle-submit telemetry persist failed', {
                            battleId, userId: socket.userId, error: telErr.message,
                        });
                    }
                }

                battleNs.to(battleId).emit('participant-finished', {
                    id: socket.userId,
                    displayName: participant?.displayName,
                    score,
                    total,
                    timeTakenSecs
                });

                const allFinished = Array.from(lobby.participants.values()).every(p => p.finished);
                if (allFinished && lobby.participants.size > 0) {
                    await prisma.battle.update({
                        where: { id: battleId },
                        data: { status: 'COMPLETED' }
                    });

                    const ranked = serializeParticipants(lobby)
                        .sort((a, b) => b.score - a.score || a.timeTakenSecs - b.timeTakenSecs);

                    // Phase 6 — ELO + ranked tiers. Pull each participant's
                    // current rating, recompute, persist BattleOutcome rows,
                    // and decorate the broadcast with rating deltas.
                    const userIds = ranked.map((r) => r.id);
                    const users = await prisma.user.findMany({
                        where: { id: { in: userIds } },
                        select: { id: true, eloRating: true, tier: true },
                    });
                    const ratingMap = Object.fromEntries(
                        users.map((u) => [u.id, { rating: u.eloRating ?? 1200, tier: u.tier ?? 'BRONZE' }]),
                    );

                    const eloInput = ranked.map((r, i) => ({
                        userId: r.id,
                        rating: ratingMap[r.id]?.rating ?? 1200,
                        placement: i + 1,
                    }));
                    const eloDeltas = recomputeRatings(eloInput);
                    const deltaByUser = Object.fromEntries(eloDeltas.map((d) => [d.userId, d]));

                    // Persist outcomes + user updates atomically per participant.
                    await prisma.$transaction(
                        ranked.flatMap((r, i) => {
                            const d = deltaByUser[r.id];
                            const participant = lobby.participants.get(r.id);
                            return [
                                prisma.battleOutcome.upsert({
                                    where: { battleId_userId: { battleId, userId: r.id } },
                                    update: {},
                                    create: {
                                        battleId,
                                        userId: r.id,
                                        score: r.score ?? 0,
                                        total: r.itemsAnswered ?? 0,
                                        timeTakenSecs: r.timeTakenSecs ?? 0,
                                        placement: i + 1,
                                        eloBefore: d.ratingBefore,
                                        eloAfter: d.ratingAfter,
                                        eloDelta: d.delta,
                                        tierBefore: d.tierBefore,
                                        tierAfter: d.tierAfter,
                                        perQuestion: participant?.attempts ?? null,
                                    },
                                }),
                                prisma.user.update({
                                    where: { id: r.id },
                                    data: { eloRating: d.ratingAfter, tier: d.tierAfter },
                                }),
                            ];
                        }),
                    );

                    const results = ranked.map((r, i) => {
                        const d = deltaByUser[r.id];
                        return {
                            ...r,
                            placement: i + 1,
                            elo: { before: d.ratingBefore, after: d.ratingAfter, delta: d.delta },
                            tier: { before: d.tierBefore, after: d.tierAfter, promoted: d.tierBefore !== d.tierAfter },
                        };
                    });

                    battleNs.to(battleId).emit('battle-complete', { results });

                    setTimeout(() => battleLobbies.delete(battleId), 5 * 60 * 1000);

                    logger.info('Battle completed', { battleId, participants: results.length });
                }
            } catch (err) {
                logger.error('Battle submit error', { error: err.message, battleId });
            }
        });

        socket.on('disconnect', () => {
            const battleId = socket.battleId;
            if (battleId) {
                const lobby = getLobby(battleId);
                const participant = lobby.participants.get(socket.userId);
                if (participant) {
                    participant.connected = false;
                }

                battleNs.to(battleId).emit('lobby-update', {
                    participants: serializeParticipants(lobby)
                });
            }

            logger.info('Battle socket disconnected', { userId: socket.userId });
        });
    });
}

module.exports = { setupBattleSocket };
