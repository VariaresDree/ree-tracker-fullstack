const { getAuth } = require('firebase-admin/auth');
const prisma = require('../config/db');
const { recordAttempts } = require('../services/telemetryService');
const { recomputeRatings } = require('../engine/elo');
const { buildAnswerKey, buildExplanationKey } = require('../utils/battleSanitizer');
const { battleAnswerSchema, battleSubmitSchema } = require('../schemas/battleSchemas');
const logger = require('../utils/logger');

// In-memory lobby state (participants, live scores, answer keys).
const MAX_LOBBIES = 500;
const MAX_PARTICIPANTS = 32;         // per-lobby cap — a join flood can't balloon one lobby
const LOBBY_GC_GRACE_MS = 60 * 1000; // drop an abandoned lobby this long after the last player leaves
const battleLobbies = new Map();

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

// Evict ONE lobby when at capacity. Prefer a lobby that is safe to drop
// (completed or with no connected+unfinished players); only fall back to the
// least-recently-active if every lobby still has a live player — never blindly
// FIFO-evict a live battle (which wiped its in-memory scores).
function evictOneLobby() {
    let lruKey = null;
    let lruAt = Infinity;
    for (const [id, lobby] of battleLobbies) {
        const hasLivePlayer = Array.from(lobby.participants.values())
            .some((p) => p.connected && !p.finished);
        if (!hasLivePlayer) {
            battleLobbies.delete(id);
            logger.warn('lobby cache evicted (idle)', { evicted: id });
            return;
        }
        const at = lobby.lastActivity ?? 0;
        if (at < lruAt) { lruAt = at; lruKey = id; }
    }
    if (lruKey) {
        battleLobbies.delete(lruKey);
        logger.warn('lobby cache evicted (LRU fallback — live battle)', { evicted: lruKey });
    }
}

function getLobby(battleId) {
    if (!battleLobbies.has(battleId)) {
        if (battleLobbies.size >= MAX_LOBBIES) evictOneLobby();
        battleLobbies.set(battleId, {
            participants: new Map(),
            startedAt: null,
            answerKey: null,
            questionCount: 0,
            timeLimitSecs: null,
            lastActivity: Date.now(),
        });
    }
    const lobby = battleLobbies.get(battleId);
    lobby.lastActivity = Date.now();
    return lobby;
}

// Public view of a participant — strips the server-side answers Map.
function serializeParticipants(lobby) {
    return Array.from(lobby.participants.values()).map(({ answers, attempts, ...pub }) => pub);
}

// The answer key never leaves the server while the battle is live. Built on
// first join; lazily refetched from the DB if the lobby was FIFO-evicted or
// the process restarted mid-battle.
async function ensureAnswerKey(lobby, battleId) {
    if (lobby.answerKey) return lobby.answerKey;
    const battle = await prisma.battle.findUnique({
        where: { id: battleId },
        select: { questions: true, timeLimitSecs: true },
    });
    if (!battle || !Array.isArray(battle.questions)) return null;
    lobby.answerKey = buildAnswerKey(battle.questions);
    lobby.explanationKey = buildExplanationKey(battle.questions);
    lobby.questionCount = battle.questions.length;
    lobby.timeLimitSecs = battle.timeLimitSecs;
    return lobby.answerKey;
}

function gradeAnswer(answerKey, questionId, userAnswer) {
    return userAnswer != null && answerKey[questionId] === userAnswer;
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

        socket.on('join-battle', async ({ battleId } = {}) => {
            if (!battleId) return;
            if (rateLimited(socket)) return;

            try {
                const battle = await prisma.battle.findUnique({ where: { id: battleId } });
                if (!battle) {
                    return socket.emit('error', { message: 'Battle not found' });
                }

                const lobby = getLobby(battleId);
                const alreadyIn = lobby.participants.has(socket.userId);

                // Authorization: a new player may only join while the battle is
                // still gathering (WAITING). Once it has started or completed,
                // only an existing participant may (re)connect. This stops anyone
                // who guesses the 6-char invite code from injecting themselves
                // into a live/finished battle and skewing everyone's Elo at
                // finalize. (A full invited-allowlist with host approval is a
                // follow-up — it needs a schema field + client UX.)
                if (!alreadyIn && battle.status && battle.status !== 'WAITING') {
                    return socket.emit('error', { message: 'This battle is no longer accepting new players.' });
                }
                if (!alreadyIn && lobby.participants.size >= MAX_PARTICIPANTS) {
                    return socket.emit('error', { message: 'This battle is full.' });
                }

                socket.join(battleId);
                socket.battleId = battleId;

                if (!lobby.answerKey && Array.isArray(battle.questions)) {
                    lobby.answerKey = buildAnswerKey(battle.questions);
                    lobby.explanationKey = buildExplanationKey(battle.questions);
                    lobby.questionCount = battle.questions.length;
                    lobby.timeLimitSecs = battle.timeLimitSecs;
                }

                // Merge into any existing entry so a reconnect doesn't wipe the
                // participant's live score/answers.
                const existing = lobby.participants.get(socket.userId);
                lobby.participants.set(socket.userId, {
                    id: socket.userId,
                    displayName: socket.displayName,
                    score: existing?.score ?? 0,
                    itemsAnswered: existing?.itemsAnswered ?? 0,
                    connected: true,
                    isHost: battle.hostId === socket.userId,
                    finished: existing?.finished ?? false,
                    timeTakenSecs: existing?.timeTakenSecs,
                    answers: existing?.answers ?? new Map(),
                    attempts: existing?.attempts,
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

        socket.on('start-battle', async ({ battleId } = {}) => {
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

        // Live per-question answer, graded server-side against the lobby's
        // answer key. Replaces the old client-trusted `battle-progress` event.
        socket.on('battle-answer', async (payload) => {
            if (rateLimited(socket)) return;
            const parsed = battleAnswerSchema.safeParse(payload || {});
            if (!parsed.success) return; // silently drop malformed payloads
            const { battleId, questionId, userAnswer, confidenceLevel, timeSpentMs } = parsed.data;

            try {
                // Look up an EXISTING lobby — never getLobby-create here. Creating
                // on an arbitrary 6-char id let a client flood empty lobbies into
                // the cache and evict live battles under the cap.
                const lobby = battleLobbies.get(battleId);
                if (!lobby) return;
                lobby.lastActivity = Date.now();
                const participant = lobby.participants.get(socket.userId);
                if (!participant || participant.finished) return;

                const answerKey = await ensureAnswerKey(lobby, battleId);
                if (!answerKey || !(questionId in answerKey)) return;

                // Upsert-by-questionId: changing an answer replaces the old one.
                participant.answers.set(questionId, {
                    questionId,
                    userAnswer,
                    isCorrect: gradeAnswer(answerKey, questionId, userAnswer),
                    confidenceLevel,
                    timeSpentMs,
                });
                participant.itemsAnswered = participant.answers.size;
                let liveScore = 0;
                for (const a of participant.answers.values()) if (a.isCorrect) liveScore++;
                participant.score = liveScore;

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

        socket.on('battle-submit', async (payload) => {
            const parsed = battleSubmitSchema.safeParse(payload || {});
            if (!parsed.success) return;
            const { battleId, attempts: clientAttempts } = parsed.data;

            try {
                const lobby = getLobby(battleId);
                const participant = lobby.participants.get(socket.userId);
                if (!participant || participant.finished) return; // double-submit guard

                const answerKey = await ensureAnswerKey(lobby, battleId);
                if (!answerKey) {
                    return socket.emit('error', { message: 'Battle not found' });
                }

                // Merge client-carried attempts only for questions the server
                // never saw live (covers brief disconnects). They are graded
                // right here against the server's key — the client's own
                // isCorrect flags are never read.
                for (const a of clientAttempts) {
                    if (!(a.questionId in answerKey) || participant.answers.has(a.questionId)) continue;
                    participant.answers.set(a.questionId, {
                        questionId: a.questionId,
                        userAnswer: a.userAnswer,
                        isCorrect: gradeAnswer(answerKey, a.questionId, a.userAnswer),
                        confidenceLevel: a.confidenceLevel,
                        timeSpentMs: a.timeSpentMs,
                    });
                }

                const finalAttempts = Array.from(participant.answers.values());
                const total = lobby.questionCount || Object.keys(answerKey).length;

                // Server-authoritative timing: never trust a client-supplied
                // duration. Clamped to the battle's time limit.
                const elapsedSecs = lobby.startedAt
                    ? Math.floor((Date.now() - lobby.startedAt) / 1000)
                    : 0;
                const limit = lobby.timeLimitSecs ?? elapsedSecs;
                const timeTakenSecs = Math.max(0, Math.min(elapsedSecs, limit));

                // Persist per-question attempts so battle results feed the
                // dashboard/profile analytics. recordAttempts re-grades against
                // Question.answer in the DB — its `graded` output is the
                // authoritative score source.
                let graded = null;
                if (finalAttempts.length > 0) {
                    try {
                        const result = await recordAttempts({
                            userId: socket.userId,
                            mode: 'BATTLE',
                            // Deterministic per-attempt ids: a replayed
                            // battle-submit (reconnect, double emit) dedupes
                            // instead of double-counting the whole battle.
                            attempts: finalAttempts.map((a) => ({
                                ...a,
                                clientAttemptId: `${battleId}:${socket.userId}:${a.questionId}`,
                            })),
                        });
                        graded = result.graded || null;
                    } catch (telErr) {
                        logger.warn('battle-submit telemetry persist failed', {
                            battleId, userId: socket.userId, error: telErr.message,
                        });
                    }
                }

                const score = graded
                    ? graded.filter((g) => g.isCorrect).length
                    : finalAttempts.filter((a) => a.isCorrect).length;

                participant.score = score;
                participant.itemsAnswered = finalAttempts.length;
                participant.finished = true;
                participant.timeTakenSecs = timeTakenSecs;
                participant.attempts = finalAttempts.map((a) => ({
                    questionId: a.questionId,
                    isCorrect: a.isCorrect,
                    timeMs: a.timeSpentMs,
                }));

                // Ack the submitter with their authoritative result. No answer
                // key yet — opponents may still be mid-battle.
                socket.emit('battle-graded', {
                    score,
                    total,
                    timeTakenSecs,
                    perQuestion: finalAttempts.map((a) => ({ questionId: a.questionId, isCorrect: a.isCorrect })),
                });

                battleNs.to(battleId).emit('participant-finished', {
                    id: socket.userId,
                    displayName: participant.displayName,
                    score,
                    total,
                    timeTakenSecs
                });

                const allFinished = Array.from(lobby.participants.values()).every(p => p.finished);
                if (allFinished && lobby.participants.size > 0) {
                    // Atomic finalize guard: two simultaneous submitters can
                    // both observe allFinished — only the one whose updateMany
                    // flips the status runs Elo/outcome persistence.
                    const { count } = await prisma.battle.updateMany({
                        where: { id: battleId, status: { not: 'COMPLETED' } },
                        data: { status: 'COMPLETED' },
                    });
                    if (count !== 1) return;

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
                            const p = lobby.participants.get(r.id);
                            return [
                                prisma.battleOutcome.upsert({
                                    where: { battleId_userId: { battleId, userId: r.id } },
                                    update: {},
                                    create: {
                                        battleId,
                                        userId: r.id,
                                        score: r.score ?? 0,
                                        total,
                                        timeTakenSecs: r.timeTakenSecs ?? 0,
                                        placement: i + 1,
                                        eloBefore: d.ratingBefore,
                                        eloAfter: d.ratingAfter,
                                        eloDelta: d.delta,
                                        tierBefore: d.tierBefore,
                                        tierAfter: d.tierAfter,
                                        perQuestion: p?.attempts ?? null,
                                    },
                                }),
                                prisma.user.update({
                                    where: { id: r.id },
                                    // Apply the DELTA as an atomic increment rather than
                                    // writing an absolute value read outside the txn — so
                                    // if the same user finalizes two battles concurrently,
                                    // neither delta is lost (the absolute eloBefore/After
                                    // stored on BattleOutcome is best-effort display).
                                    data: { eloRating: { increment: d.delta }, tier: d.tierAfter },
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

                    // Reveal the answer key (and offline explanations) only
                    // now — everyone is finished, so the post-battle review
                    // screen can grade, annotate, and show solutions locally.
                    battleNs.to(battleId).emit('battle-complete', {
                        results,
                        answerKey,
                        explanationKey: lobby.explanationKey || {},
                    });

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
                    // (via getLobby) and cancels the delete. Without this,
                    // never-started/abandoned lobbies leaked until FIFO pressure.
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
                        }, LOBBY_GC_GRACE_MS);
                    }
                }
            }

            logger.info('Battle socket disconnected', { userId: socket.userId });
        });
    });
}

module.exports = { setupBattleSocket };
