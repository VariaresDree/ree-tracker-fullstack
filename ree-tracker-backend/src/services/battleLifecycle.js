// src/services/battleLifecycle.js
//
// Everything that decides how a battle ends, apart from the socket handlers
// (sockets/battleSocket.js) that call it.
//
// Players and the answers the server had received used to live only in an
// in-memory lobby, and the battle completed only when every player in memory
// submitted or an in-memory timer fired on a lobby that still existed. A
// restart (Render's free plan sleeps), the idle-lobby clean-up after everyone
// disconnected, or an eviction lost the lobby, the timer then found nothing,
// and the battle stayed IN_PROGRESS for good: the remaining player's review
// said "This sitting isn't finished yet" forever, and the player who left had
// no way back in.
//
// Now each player has a BattleParticipant row holding their answers as they
// arrive, and a battle is settled from those rows once its time limit and the
// grace have passed, whichever comes first of:
//   • the deadline timer (re-armed whenever a lobby is rebuilt);
//   • the sweep (5 s after boot, then every minute);
//   • a read that needs it: the sitting review, GET /api/battles/:id,
//     /api/battles/me/active, a rejoin, or a late submit.
// All of them go through settleBattle, which runs once at a time per battle,
// and the completion itself is one database transaction that only the caller
// who flips IN_PROGRESS → COMPLETED gets to run: outcomes and Elo are written
// exactly once, whoever gets there first.

'use strict';

const prisma = require('../config/db');
// Called through the module objects (not destructured) so tests can patch them.
const telemetryService = require('./telemetryService');
const examHistory = require('./examHistory');
const { recomputeRatings } = require('../engine/elo');
const { buildAnswerKey, buildExplanationKey } = require('../utils/battleSanitizer');
const {
    mergeSubmitAttempts, computeElapsedSecs, rankParticipants, recount,
    battleTiming, answersToJson, answersFromJson, publicAnswers, fillBlanks,
} = require('../utils/battleLogic');
const logger = require('../utils/logger');
const { fallbackDisplayName } = require('@ree/shared');
const { retryInBackground } = require('./retryInBackground');

const MAX_LOBBIES = 500;
const LOBBY_RETAIN_AFTER_COMPLETE_MS = 5 * 60 * 1000;
const battleLobbies = new Map();

// The /battle namespace, set by setupBattleSocket. A settle started by an HTTP
// read or the sweep still tells anyone connected; without sockets (tests,
// scripts) it emits nowhere.
const NOOP_NS = { to: () => ({ emit() {} }) };
let battleNamespace = null;
function setBattleNamespace(ns) { battleNamespace = ns; }
const emitterFor = (ns) => ns || battleNamespace || NOOP_NS;

const sleep = (ms) => new Promise((resolve) => { const t = setTimeout(resolve, ms); t.unref?.(); });
const toMs = (t) => (t == null ? null : t instanceof Date ? t.getTime() : Number(t));

const BATTLE_SELECT = {
    id: true, hostId: true, status: true, config: true, questions: true,
    timeLimitSecs: true, startedAt: true, createdAt: true,
};

// ---------------------------------------------------------------------------
// Lobbies
// ---------------------------------------------------------------------------

// Evict ONE lobby when at capacity. Prefer a lobby that is safe to drop
// (completed or with no connected+unfinished players); only fall back to the
// least-recently-active if every lobby still has a live player. Dropping a
// live lobby no longer loses anything: it is rebuilt from the database.
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
            explanationKey: null,
            questionCount: 0,
            timeLimitSecs: null,
            hydrated: false,
            hydrating: null,
            lastActivity: Date.now(),
        });
    }
    const lobby = battleLobbies.get(battleId);
    lobby.lastActivity = Date.now();
    return lobby;
}

// Public view of a participant. A whitelist: the answers, the per-question
// log and the finishing promise never leave the server.
const PUBLIC_FIELDS = ['id', 'displayName', 'score', 'itemsAnswered', 'connected', 'isHost', 'finished', 'timeTakenSecs'];
function serializeParticipants(lobby) {
    return Array.from(lobby.participants.values()).map((p) => {
        const out = {};
        for (const f of PUBLIC_FIELDS) if (p[f] !== undefined) out[f] = p[f];
        return out;
    });
}

/** Copy what the lobby needs from a battle row. */
function applyBattleRow(lobby, battle) {
    if (!lobby.answerKey && Array.isArray(battle.questions)) {
        lobby.answerKey = buildAnswerKey(battle.questions);
        lobby.explanationKey = buildExplanationKey(battle.questions);
        lobby.questionCount = battle.questions.length;
    }
    if (battle.timeLimitSecs != null) lobby.timeLimitSecs = battle.timeLimitSecs;
    // Restored too — without it every post-restart submit was timed at 0s and
    // the score-tie placement (which feeds Elo) became arbitrary. A battle row
    // from before startedAt was stored counts from its creation.
    if (!lobby.startedAt) {
        lobby.startedAt = toMs(battle.startedAt)
            ?? (battle.status === 'IN_PROGRESS' ? toMs(battle.createdAt) : null);
    }
}

/** When the lobby's battle ends (see battleLogic.battleTiming). */
function lobbyTiming(lobby, now = Date.now()) {
    if (!lobby) return null;
    return battleTiming({ startedAt: lobby.startedAt, timeLimitSecs: lobby.timeLimitSecs }, now);
}

// The answer key never leaves the server while the battle is live. Lazily
// refetched from the DB if the lobby was evicted or the process restarted.
async function ensureAnswerKey(lobby, battleId) {
    if (lobby.answerKey) return lobby.answerKey;
    const battle = await prisma.battle.findUnique({ where: { id: battleId }, select: BATTLE_SELECT });
    if (!battle || !Array.isArray(battle.questions)) return null;
    applyBattleRow(lobby, battle);
    return lobby.answerKey;
}

/** A player's per-question log, as stored on their BattleOutcome. */
const perQuestionOf = (answers) => Array.from(answers.values()).map((a) => ({
    questionId: a.questionId,
    isCorrect: a.isCorrect,
    timeMs: a.timeSpentMs,
}));

/** A lobby participant rebuilt from their BattleParticipant row. */
function participantFromRow(row, answerKey) {
    const answers = answersFromJson(row.answers, answerKey);
    const p = {
        id: row.userId,
        displayName: row.displayName || fallbackDisplayName(row.userId),
        score: 0,
        itemsAnswered: 0,
        connected: false,
        isHost: !!row.isHost,
        finished: row.finishedAt != null,
        timeTakenSecs: row.timeTakenSecs ?? undefined,
        answers,
    };
    recount(p);
    if (p.finished) {
        // The score recorded when they finished was graded against the
        // question bank; keep it rather than the live recount.
        if (row.score != null) p.score = row.score;
        p.attempts = perQuestionOf(answers);
    }
    return p;
}

/**
 * The lobby for a battle, rebuilt from the database the first time it is
 * needed in this process: the answer key, the timing, and every player's row
 * merged in (a player already in memory keeps their in-memory state, which
 * is newer). Arms the deadline when the battle is running. Concurrent callers
 * share one rebuild. Null when the battle doesn't exist.
 */
async function hydrateLobby(battleId, { battle: given } = {}) {
    const existing = battleLobbies.get(battleId);
    if (existing?.hydrated) { existing.lastActivity = Date.now(); return existing; }
    const lobby = getLobby(battleId);
    if (!lobby.hydrating) {
        lobby.hydrating = (async () => {
            const battle = given && Array.isArray(given.questions)
                ? given
                : await prisma.battle.findUnique({ where: { id: battleId }, select: BATTLE_SELECT });
            if (!battle) return false;
            applyBattleRow(lobby, battle);
            const rows = await prisma.battleParticipant.findMany({ where: { battleId } });
            for (const row of rows || []) {
                if (lobby.participants.has(row.userId)) continue;
                lobby.participants.set(row.userId, participantFromRow(row, lobby.answerKey));
            }
            lobby.hydrated = true;
            if (battle.status === 'IN_PROGRESS') armDeadline(null, battleId, lobby);
            return true;
        })().finally(() => { lobby.hydrating = null; });
    }
    const found = await lobby.hydrating;
    if (!found) {
        if (battleLobbies.get(battleId) === lobby && lobby.participants.size === 0) battleLobbies.delete(battleId);
        return null;
    }
    return lobby;
}

/** Whether the user is a player in the battle (in memory or on record). */
async function isParticipant(battleId, userId) {
    if (battleLobbies.get(battleId)?.participants.has(userId)) return true;
    const row = await prisma.battleParticipant.findUnique({
        where: { battleId_userId: { battleId, userId } },
        select: { id: true },
    });
    return !!row;
}

/**
 * The lobby, rebuilt only for one of its players. An event for a lobby this
 * process doesn't hold (after a restart or the idle clean-up) used to be
 * dropped; a stranger's event must not create one.
 */
async function hydrateIfParticipant(battleId, userId) {
    const existing = battleLobbies.get(battleId);
    if (existing?.participants.has(userId)) return existing;
    if (existing?.hydrated) return existing;
    if (!(await isParticipant(battleId, userId))) return existing || null;
    return hydrateLobby(battleId);
}

// ---------------------------------------------------------------------------
// Saving answers as they arrive
// ---------------------------------------------------------------------------

// One writer per player: at most one write in flight, and it always writes the
// latest whole answer map, so a burst of answers costs one or two writes and
// an older map can never land after a newer one.
const writers = new Map();

async function writeAnswers(battleId, participant, answers) {
    const { count } = await prisma.battleParticipant.updateMany({
        where: { battleId, userId: participant.id, finishedAt: null },
        data: { answers },
    });
    if (count > 0) return;
    // No unfinished row: they have finished (nothing to do), or the row was
    // never made (the upsert at join failed) — make it now.
    const row = await prisma.battleParticipant.findUnique({
        where: { battleId_userId: { battleId, userId: participant.id } },
        select: { id: true },
    });
    if (row) return;
    try {
        await prisma.battleParticipant.create({
            data: {
                battleId,
                userId: participant.id,
                displayName: participant.displayName || fallbackDisplayName(participant.id),
                isHost: !!participant.isHost,
                answers,
            },
        });
    } catch (err) {
        if (err?.code !== 'P2002') throw err;
    }
}

function persistAnswers(battleId, participant) {
    const key = `${battleId}:${participant.id}`;
    let w = writers.get(key);
    if (!w) {
        w = { battleId, participant, running: null, dirty: false };
        writers.set(key, w);
    }
    w.participant = participant;
    w.dirty = true;
    if (!w.running) {
        w.running = (async () => {
            while (w.dirty) {
                w.dirty = false;
                try {
                    await writeAnswers(battleId, w.participant, answersToJson(w.participant.answers));
                } catch (err) {
                    // Kept dirty: the next answer, a flush or the finish writes it.
                    w.dirty = true;
                    logger.warn('battle answers save failed', { battleId, userId: participant.id, error: err.message });
                    break;
                }
            }
        })().finally(() => {
            w.running = null;
            if (!w.dirty && writers.get(key) === w) writers.delete(key);
        });
    }
    return w.running;
}

/**
 * Wait for answer writes still in flight (one battle, or all of them on
 * shutdown), retrying a failed one once. Bounded: never holds a settle or the
 * shutdown longer than `timeoutMs`.
 */
async function flushBattleWrites(battleId = null, { timeoutMs = 5000 } = {}) {
    const pending = [];
    for (const w of writers.values()) {
        if (battleId && w.battleId !== battleId) continue;
        if (w.running) pending.push(w.running.then(() => (w.dirty ? persistAnswers(w.battleId, w.participant) : null)));
        else if (w.dirty) pending.push(persistAnswers(w.battleId, w.participant));
    }
    if (pending.length === 0) return;
    await Promise.race([Promise.allSettled(pending), sleep(timeoutMs)]);
}

// ---------------------------------------------------------------------------
// Finishing a player
// ---------------------------------------------------------------------------

async function writeFinishedRow(battleId, participant, data) {
    const { count } = await prisma.battleParticipant.updateMany({
        where: { battleId, userId: participant.id, finishedAt: null },
        data,
    });
    if (count > 0) return;
    const row = await prisma.battleParticipant.findUnique({
        where: { battleId_userId: { battleId, userId: participant.id } },
        select: { id: true },
    });
    if (row) return; // already finished on record
    try {
        await prisma.battleParticipant.create({
            data: {
                battleId,
                userId: participant.id,
                displayName: participant.displayName || fallbackDisplayName(participant.id),
                isHost: !!participant.isHost,
                ...data,
            },
        });
    } catch (err) {
        if (err?.code !== 'P2002') throw err;
        await prisma.battleParticipant.updateMany({
            where: { battleId, userId: participant.id, finishedAt: null },
            data,
        });
    }
}

async function runFinish(battleId, lobby, participant, clientAttempts, { timedOut }) {
    const userId = participant.id;
    const answerKey = await ensureAnswerKey(lobby, battleId);
    if (!answerKey) return null;
    const now = Date.now();
    const timing = lobbyTiming(lobby, now);

    // Client-carried attempts fill only the questions the server never saw
    // live (a brief disconnect), graded against the server's key. Not once the
    // battle has closed: by then the server's record is final.
    if (!timedOut && !timing?.closed && clientAttempts?.length > 0) {
        mergeSubmitAttempts(participant, clientAttempts, answerKey);
    }
    const answeredAny = Array.from(participant.answers.values()).some((a) => a.userAnswer != null);
    // At the deadline, every unanswered item is a blank (wrong, as on the
    // board) for a player who answered anything. One who answered nothing is
    // placed last with 0 but gets no sitting: a battle they closed at once
    // shouldn't record twenty blanks against them.
    if (timedOut && answeredAny) fillBlanks(participant, answerKey);
    recount(participant);

    const finalAttempts = Array.from(participant.answers.values());
    const total = lobby.questionCount || Object.keys(answerKey).length;
    // Server-authoritative timing, clamped to the battle's time limit.
    const timeTakenSecs = computeElapsedSecs(lobby.startedAt, now, lobby.timeLimitSecs);

    // Persist per-question attempts so battle results feed the dashboard and
    // the sitting review. recordAttempts re-grades against Question.answer in
    // the DB — its `graded` output is the authoritative score source.
    let graded = null;
    if (finalAttempts.length > 0 && (answeredAny || !timedOut)) {
        // One ExamSession per player per battle, finalised once its attempts land.
        const battleSessionId = `${battleId}:${userId}`;
        const record = () => telemetryService.recordAttempts({
            userId,
            sessionId: battleSessionId,
            mode: 'BATTLE',
            // Deterministic per-attempt ids: a replayed submit, a second
            // settle, or the background retry below dedupes instead of
            // double-counting the battle.
            attempts: finalAttempts.map((a) => ({
                ...a,
                // A blank is marked so the review says "left blank", not "not recorded".
                blank: a.userAnswer == null,
                clientAttemptId: `${battleId}:${userId}:${a.questionId}`,
            })),
        });
        const persist = async () => {
            const recorded = await record();
            try {
                await examHistory.finalizeSession({ userId, sessionId: battleSessionId, meta: { kind: 'battle' } });
            } catch (finErr) {
                logger.warn('battle session finalise failed', { battleId, userId, error: finErr.message });
            }
            return recorded;
        };
        try {
            const result = await persist();
            graded = result?.graded || null;
        } catch (telErr) {
            logger.warn('battle telemetry persist failed; retrying in background', {
                battleId, userId, error: telErr.message,
            });
            retryInBackground(`battle ${battleId}/${userId} telemetry`, persist);
        }
    }

    const score = graded
        ? graded.filter((g) => g.isCorrect).length
        : finalAttempts.filter((a) => a.isCorrect).length;

    try {
        await writeFinishedRow(battleId, participant, {
            answers: answersToJson(participant.answers),
            finishedAt: new Date(now),
            score,
            timeTakenSecs,
        });
    } catch (err) {
        // The result stands in memory; if the process dies before completion,
        // the settle finishes them again from their saved answers (the
        // attempt ids dedupe).
        logger.warn('battle finish row write failed', { battleId, userId, error: err.message });
    }

    participant.score = score;
    participant.finished = true;
    participant.timeTakenSecs = timeTakenSecs;
    participant.attempts = perQuestionOf(participant.answers);

    return { participant, score, total, timeTakenSecs, finalAttempts };
}

/**
 * Grade, record and close one participant's battle. Used by `battle-submit`
 * (with the attempts the client carries) and by the settle (`timedOut`, with
 * none: a player who left is scored on the answers the server received).
 *
 * Runs once per player: the promise is kept on the participant before any
 * await, so a second submit, a settle and a late answer all see it. Null when
 * the player is unknown, already finished, or the answer key is gone.
 */
function finishParticipant(battleId, lobby, userId, clientAttempts = [], opts = {}) {
    const participant = lobby.participants.get(userId);
    if (!participant || participant.finished) return Promise.resolve(null);
    if (participant.finishPromise) return participant.finishPromise;
    participant.finishPromise = runFinish(battleId, lobby, participant, clientAttempts, { timedOut: !!opts.timedOut })
        .then((r) => { if (!r) participant.finishPromise = null; return r; },
            (err) => { participant.finishPromise = null; throw err; });
    return participant.finishPromise;
}

/** A finished participant's result, as finishParticipant returns it. */
function resultOf(lobby, participant) {
    return {
        participant,
        score: participant.score,
        total: lobby.questionCount || Object.keys(lobby.answerKey || {}).length,
        timeTakenSecs: participant.timeTakenSecs,
        finalAttempts: Array.from(participant.answers.values()),
    };
}

// ---------------------------------------------------------------------------
// Completing a battle
// ---------------------------------------------------------------------------

const tierOf = (d) => ({ before: d.tierBefore, after: d.tierAfter, promoted: d.tierBefore !== d.tierAfter });

/**
 * Outcomes, Elo and the answer-key reveal, once every participant is
 * finished. One transaction: it claims the battle (IN_PROGRESS → COMPLETED),
 * writes the outcomes and applies the Elo deltas, so a crash part-way leaves
 * the battle IN_PROGRESS for the next settle instead of COMPLETED without
 * outcomes, and of two callers racing only the one whose claim succeeds does
 * anything. Emits only after the commit. Returns whether this call completed it.
 */
async function completeBattle(ns, battleId, lobby) {
    // A finish still in flight (a submit racing the settle) lands first, so
    // its score is in the ranking.
    await Promise.allSettled(Array.from(lobby.participants.values()).map((p) => p.finishPromise).filter(Boolean));

    const answerKey = lobby.answerKey || {};
    const total = lobby.questionCount || Object.keys(answerKey).length;
    const ranked = rankParticipants(serializeParticipants(lobby).map((p) => ({
        ...p,
        score: p.score ?? 0,
        timeTakenSecs: p.timeTakenSecs ?? lobby.timeLimitSecs ?? 0,
    })));

    const committed = await prisma.$transaction(async (tx) => {
        const { count } = await tx.battle.updateMany({
            where: { id: battleId, status: 'IN_PROGRESS' },
            data: { status: 'COMPLETED' },
        });
        if (count !== 1) return null;
        if (ranked.length === 0) return { kept: [], deltaByUser: {} };

        const users = await tx.user.findMany({
            where: { id: { in: ranked.map((r) => r.id) } },
            select: { id: true, eloRating: true, tier: true },
        });
        // A player who deleted their account mid-battle has no row to rate.
        const ratingOf = new Map((users || []).map((u) => [u.id, u.eloRating ?? 1200]));
        const kept = ranked.filter((r) => ratingOf.has(r.id));
        const deltas = recomputeRatings(kept.map((r, i) => ({ userId: r.id, rating: ratingOf.get(r.id), placement: i + 1 })));
        const deltaByUser = Object.fromEntries(deltas.map((d) => [d.userId, d]));

        for (const [i, r] of kept.entries()) {
            const d = deltaByUser[r.id];
            await tx.battleOutcome.upsert({
                where: { battleId_userId: { battleId, userId: r.id } },
                update: {},
                create: {
                    battleId,
                    userId: r.id,
                    score: r.score,
                    total,
                    timeTakenSecs: r.timeTakenSecs,
                    placement: i + 1,
                    eloBefore: d.ratingBefore,
                    eloAfter: d.ratingAfter,
                    eloDelta: d.delta,
                    tierBefore: d.tierBefore,
                    tierAfter: d.tierAfter,
                    // [] rather than null: a nullable Json column takes
                    // Prisma.DbNull, not null, and a throw here would roll the
                    // whole completion back on every retry.
                    perQuestion: lobby.participants.get(r.id)?.attempts ?? [],
                },
            });
        }
        // Users updated in id order, so two battles completing at once with
        // the same players lock their rows in the same order. The delta is an
        // atomic increment, so neither battle's change is lost.
        for (const r of [...kept].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
            const d = deltaByUser[r.id];
            await tx.user.update({
                where: { id: r.id },
                data: { eloRating: { increment: d.delta }, tier: d.tierAfter },
            });
        }
        return { kept, deltaByUser };
    }, { maxWait: 5000, timeout: 20000 });

    if (!committed) return false;
    if (lobby.deadlineTimer) { clearTimeout(lobby.deadlineTimer); lobby.deadlineTimer = null; }

    const results = committed.kept.map((r, i) => {
        const d = committed.deltaByUser[r.id];
        return {
            ...r,
            total,
            placement: i + 1,
            elo: { before: d.ratingBefore, after: d.ratingAfter, delta: d.delta },
            tier: tierOf(d),
        };
    });

    // Reveal the answer key (and offline explanations) only now — everyone is
    // finished, so the review screen can grade, annotate, and show solutions.
    emitterFor(ns).to(battleId).emit('battle-complete', {
        results,
        answerKey,
        explanationKey: lobby.explanationKey || {},
    });

    setTimeout(() => {
        if (battleLobbies.get(battleId) === lobby) battleLobbies.delete(battleId);
    }, LOBBY_RETAIN_AFTER_COMPLETE_MS).unref?.();

    logger.info('Battle completed', { battleId, participants: results.length });
    return true;
}

// ---------------------------------------------------------------------------
// Settling a battle whose time is up
// ---------------------------------------------------------------------------

const settling = new Map();

async function runSettle(battleId, { ns } = {}) {
    const battle = await prisma.battle.findUnique({ where: { id: battleId }, select: BATTLE_SELECT });
    if (!battle) return 'not-found';
    if (battle.status !== 'IN_PROGRESS') return 'not-in-progress';

    const lobby = await hydrateLobby(battleId, { battle });
    if (!lobby) return 'not-found';
    const timing = lobbyTiming(lobby);
    if (!timing?.closed) return 'not-due';

    await flushBattleWrites(battleId);

    const emitter = emitterFor(ns);
    for (const p of Array.from(lobby.participants.values())) {
        if (p.finished) continue;
        // A submit already finishing them: wait for it instead.
        if (p.finishPromise) { await p.finishPromise.catch(() => null); continue; }
        const done = await finishParticipant(battleId, lobby, p.id, [], { timedOut: true });
        if (!done) continue;
        emitter.to(battleId).emit('participant-finished', {
            id: p.id,
            displayName: p.displayName,
            score: done.score,
            total: done.total,
            timeTakenSecs: done.timeTakenSecs,
            timedOut: true,
        });
    }
    const completed = await completeBattle(emitter, battleId, lobby);
    if (completed) logger.info('Battle settled after its deadline', { battleId });
    return completed ? 'completed' : 'lost-race';
}

/**
 * Finish everyone who hasn't submitted (on the answers the server received)
 * and complete the battle, once its time limit and the grace have passed.
 * One settle per battle at a time: every caller shares it. Resolves to
 * 'completed' | 'lost-race' (completed by someone else) | 'not-in-progress' |
 * 'not-due' | 'not-found'.
 */
function settleBattle(battleId, opts = {}) {
    const running = settling.get(battleId);
    if (running) return running;
    const p = runSettle(battleId, opts).finally(() => settling.delete(battleId));
    settling.set(battleId, p);
    return p;
}

/** Settle only if the battle row says its time is up (saves a read otherwise). */
function settleBattleIfDue(battle, opts = {}, now = Date.now()) {
    if (!battle || battle.status !== 'IN_PROGRESS') return Promise.resolve('not-in-progress');
    if (!battleTiming(battle, now)?.closed) return Promise.resolve('not-due');
    return settleBattle(battle.id, opts);
}

/**
 * A settle that a request waits on for at most `ms`. It carries on in the
 * background if it takes longer; the caller then answers from the clock.
 */
function settleWithin(battleId, ms, opts = {}) {
    const run = settleBattle(battleId, opts).catch((err) => {
        logger.error('battle settle failed', { battleId, error: err.message });
        return 'error';
    });
    return Promise.race([run, sleep(ms).then(() => 'timeout')]);
}

/** The deadline timer's callback. */
async function finishAtDeadline(ns, battleId) {
    const result = await settleBattle(battleId, { ns });
    if (result === 'not-due') {
        // Fired a moment early (timer rounding): arm it again.
        const lobby = battleLobbies.get(battleId);
        if (lobby) { lobby.deadlineTimer = null; armDeadline(ns, battleId, lobby); }
    }
    return result;
}

/**
 * Arm (once per lobby) the timer that settles the battle at its deadline.
 * A lobby that is dropped keeps its timer, and the settle rebuilds what it
 * needs from the database.
 */
function armDeadline(ns, battleId, lobby, now = Date.now()) {
    if (lobby.deadlineTimer) return;
    const timing = lobbyTiming(lobby, now);
    if (!timing) return;
    lobby.deadlineTimer = setTimeout(() => {
        lobby.deadlineTimer = null;
        finishAtDeadline(ns, battleId).catch((err) => {
            logger.error('Battle deadline settle failed', { battleId, error: err.message });
        });
    }, Math.max(0, timing.closesAt - now));
    lobby.deadlineTimer.unref?.();
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * A completed battle's `battle-complete` payload, rebuilt from its outcomes
 * (for a player who comes back after it ended), and the given player's own
 * `battle-graded` ack. Null when it isn't completed.
 */
async function completionFor(battleId, userId = null) {
    const battle = await prisma.battle.findUnique({ where: { id: battleId }, select: { status: true, questions: true } });
    if (!battle || battle.status !== 'COMPLETED') return null;
    const [outcomes, rows] = await Promise.all([
        prisma.battleOutcome.findMany({
            where: { battleId },
            orderBy: { placement: 'asc' },
            include: { user: { select: { displayName: true } } },
        }),
        prisma.battleParticipant.findMany({ where: { battleId }, select: { userId: true, displayName: true } }),
    ]);
    const nameOf = new Map((rows || []).map((r) => [r.userId, r.displayName]));
    const results = (outcomes || []).map((o) => ({
        id: o.userId,
        displayName: nameOf.get(o.userId) || o.user?.displayName || fallbackDisplayName(o.userId),
        score: o.score,
        total: o.total,
        timeTakenSecs: o.timeTakenSecs,
        finished: true,
        placement: o.placement,
        elo: { before: o.eloBefore, after: o.eloAfter, delta: o.eloDelta },
        tier: tierOf(o),
    }));
    const mine = userId ? (outcomes || []).find((o) => o.userId === userId) : null;
    return {
        payload: {
            results,
            answerKey: buildAnswerKey(battle.questions),
            explanationKey: buildExplanationKey(battle.questions),
        },
        graded: mine ? {
            score: mine.score,
            total: mine.total,
            timeTakenSecs: mine.timeTakenSecs,
            perQuestion: Array.isArray(mine.perQuestion)
                ? mine.perQuestion.map((q) => ({ questionId: q.questionId, isCorrect: !!q.isCorrect }))
                : [],
        } : null,
    };
}

/**
 * A player's own state for resuming: the options they picked (never whether
 * they were right) and whether they have finished. The in-memory lobby is
 * newer than the row when this process holds it. Null for a non-player.
 */
async function participantSnapshot(battleId, userId) {
    const live = battleLobbies.get(battleId)?.participants.get(userId);
    if (live) {
        return {
            answers: publicAnswers(live.answers),
            finished: !!(live.finished || live.finishPromise),
            itemsAnswered: live.itemsAnswered ?? 0,
        };
    }
    const row = await prisma.battleParticipant.findUnique({
        where: { battleId_userId: { battleId, userId } },
        select: { answers: true, finishedAt: true },
    });
    if (!row) return null;
    const answers = publicAnswers(row.answers);
    return { answers, finished: row.finishedAt != null, itemsAnswered: Object.keys(answers).length };
}

// ---------------------------------------------------------------------------
// The sweep
// ---------------------------------------------------------------------------

let sweeping = false;
let sweepTimer = null;
let firstSweepTimer = null;

/**
 * Settle every running battle whose time is up. Catches the ones no timer,
 * read or rejoin reaches (a restart with nobody coming back). One at a time,
 * and never two sweeps at once. Returns how many it completed.
 */
async function sweepDueBattles(now = Date.now()) {
    if (sweeping) return 0;
    sweeping = true;
    try {
        const running = await prisma.battle.findMany({
            where: { status: 'IN_PROGRESS' },
            select: { id: true, status: true, startedAt: true, timeLimitSecs: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
            take: 100,
        });
        let completed = 0;
        for (const b of running || []) {
            const result = await settleBattleIfDue(b, {}, now).catch((err) => {
                logger.error('battle sweep settle failed', { battleId: b.id, error: err.message });
                return 'error';
            });
            if (result === 'completed') completed += 1;
        }
        if (completed) logger.info('battle sweep completed battles', { completed });
        return completed;
    } finally {
        sweeping = false;
    }
}

function startBattleSweeper({ firstDelayMs = 5000, intervalMs = 60 * 1000 } = {}) {
    if (sweepTimer) return;
    const run = () => sweepDueBattles().catch((err) => logger.error('battle sweep failed', { error: err.message }));
    firstSweepTimer = setTimeout(() => { firstSweepTimer = null; run(); }, firstDelayMs);
    firstSweepTimer.unref?.();
    sweepTimer = setInterval(run, intervalMs);
    sweepTimer.unref?.();
}

function stopBattleSweeper() {
    if (firstSweepTimer) { clearTimeout(firstSweepTimer); firstSweepTimer = null; }
    if (sweepTimer) { clearInterval(sweepTimer); sweepTimer = null; }
}

module.exports = {
    battleLobbies,
    setBattleNamespace,
    getLobby,
    hydrateLobby,
    hydrateIfParticipant,
    isParticipant,
    serializeParticipants,
    ensureAnswerKey,
    lobbyTiming,
    persistAnswers,
    flushBattleWrites,
    finishParticipant,
    resultOf,
    completeBattle,
    settleBattle,
    settleBattleIfDue,
    settleWithin,
    finishAtDeadline,
    armDeadline,
    completionFor,
    participantSnapshot,
    sweepDueBattles,
    startBattleSweeper,
    stopBattleSweeper,
};
