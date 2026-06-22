const { getAuth } = require('firebase-admin/auth');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// In-memory lobby state (participants, live scores)
const battleLobbies = new Map();

function getLobby(battleId) {
    if (!battleLobbies.has(battleId)) {
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

        socket.on('battle-submit', async ({ battleId, score, total, timeTakenSecs }) => {
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

                    const results = serializeParticipants(lobby)
                        .sort((a, b) => b.score - a.score || a.timeTakenSecs - b.timeTakenSecs);

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
