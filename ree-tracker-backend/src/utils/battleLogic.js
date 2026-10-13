// src/utils/battleLogic.js
// Pure battle-scoring decision logic, extracted from sockets/battleSocket.js
// (Phase 4.1) so the server-authoritative rules are verifiable under simulated
// network latency (tests/battleLatency.test.js) without a socket or a DB.
//
// Invariants these functions enforce, regardless of event arrival order:
//   • grading only ever uses the SERVER's answer key — a client's own
//     isCorrect flag is never read;
//   • answers upsert by questionId (a re-answer replaces, never double-counts);
//   • nothing mutates a participant after they are `finished`;
//   • submit-time client-carried attempts only FILL GAPS the server never saw
//     live (brief disconnects), and are re-graded on arrival;
//   • elapsed time comes from the server clock, clamped to the battle limit.

'use strict';

/** Server-side grading: correct iff the answer matches the server's key. */
function gradeAnswer(answerKey, questionId, userAnswer) {
    return userAnswer != null && answerKey[questionId] === userAnswer;
}

/**
 * Apply one live `battle-answer` to a participant. Upsert-by-questionId:
 * changing an answer replaces the old one. Ignored (returns false) when the
 * participant is missing/finished or the question isn't in this battle.
 *
 * @param {object} participant lobby participant ({answers: Map, score, itemsAnswered, finished})
 * @param {{questionId, userAnswer, confidenceLevel?, timeSpentMs?}} payload
 * @param {Object<string,string>} answerKey
 * @returns {boolean} whether the answer was applied
 */
function applyAnswer(participant, payload, answerKey) {
    if (!participant || participant.finished) return false;
    const { questionId, userAnswer, confidenceLevel, timeSpentMs } = payload || {};
    if (!answerKey || !(questionId in answerKey)) return false;
    // The same answer again (a client re-sending what it restored after a
    // rejoin) changes nothing: keep the time first recorded and skip the write.
    const prev = participant.answers.get(questionId);
    if (prev && prev.userAnswer === userAnswer && prev.confidenceLevel === confidenceLevel) return false;

    participant.answers.set(questionId, {
        questionId,
        userAnswer,
        isCorrect: gradeAnswer(answerKey, questionId, userAnswer),
        confidenceLevel,
        timeSpentMs,
    });
    recount(participant);
    return true;
}

/** itemsAnswered (answers actually given, not blanks) and the live score. */
function recount(participant) {
    let answered = 0;
    let score = 0;
    for (const a of participant.answers.values()) {
        if (a.userAnswer != null) answered += 1;
        if (a.isCorrect) score += 1;
    }
    participant.itemsAnswered = answered;
    participant.score = score;
}

/**
 * Merge client-carried attempts at submit time — ONLY for questions the
 * server never saw live (covers brief disconnects). Each is graded right here
 * against the server's key; the client's own isCorrect flags are never read.
 *
 * @returns {number} how many attempts were merged
 */
function mergeSubmitAttempts(participant, clientAttempts, answerKey) {
    let merged = 0;
    for (const a of clientAttempts || []) {
        if (!(a.questionId in answerKey) || participant.answers.has(a.questionId)) continue;
        participant.answers.set(a.questionId, {
            questionId: a.questionId,
            userAnswer: a.userAnswer,
            isCorrect: gradeAnswer(answerKey, a.questionId, a.userAnswer),
            confidenceLevel: a.confidenceLevel,
            timeSpentMs: a.timeSpentMs,
        });
        merged += 1;
    }
    return merged;
}

/**
 * Server-authoritative elapsed seconds: never trust a client-supplied
 * duration. Clamped to [0, timeLimitSecs].
 */
function computeElapsedSecs(startedAt, now, timeLimitSecs) {
    const elapsed = startedAt ? Math.floor((now - startedAt) / 1000) : 0;
    const limit = timeLimitSecs ?? elapsed;
    return Math.max(0, Math.min(elapsed, limit));
}

/**
 * Final placement: score desc, ties broken by faster time. Pure — does not
 * mutate the input.
 */
function rankParticipants(participants) {
    return [...(participants || [])]
        .sort((a, b) => b.score - a.score || a.timeTakenSecs - b.timeTakenSecs);
}

// How long after the time limit the server waits before finishing a battle
// itself: covers a submit already in flight and a slow phone's clock.
const DEADLINE_GRACE_MS = 30 * 1000;

/**
 * Milliseconds from `now` until the server should finish the battle on its
 * own: the time limit plus the grace, counted from the start. A battle used to
 * finish only once EVERY participant submitted, so one player who dropped out
 * (closed the tab, lost signal) left everyone else on "waiting" for good.
 * Null when the battle hasn't started or has no limit.
 */
function deadlineDelayMs(startedAt, timeLimitSecs, now, graceMs = DEADLINE_GRACE_MS) {
    if (!startedAt || !Number.isFinite(timeLimitSecs) || timeLimitSecs <= 0) return null;
    return Math.max(0, startedAt + timeLimitSecs * 1000 + graceMs - now);
}

/**
 * The ids of lobby participants who are not connected when the host starts.
 * They are dropped from the battle: they can't answer, and they used to be
 * counted, so the battle waited for their submit forever.
 */
function absentAtStart(participants) {
    return Array.from(participants.values()).filter((p) => !p.connected).map((p) => p.id);
}

const toMs = (t) => (t == null ? null : t instanceof Date ? t.getTime() : Number(t));

/**
 * When a battle ends, from the battle row and the server clock:
 *   endsAt   — start + time limit (what the exam room's timer counts to);
 *   closesAt — endsAt + the grace, when the server finishes it itself;
 *   remainingMs — time left on the exam room's timer (never negative);
 *   closed   — the grace has passed: nobody can answer, and it must finish.
 * A battle row from before startedAt was stored falls back to createdAt, so
 * a stuck old battle still gets a deadline. Null when it hasn't started (and
 * has no fallback) or has no time limit.
 */
function battleTiming({ startedAt, timeLimitSecs, createdAt } = {}, now = Date.now(), graceMs = DEADLINE_GRACE_MS) {
    const start = toMs(startedAt) ?? toMs(createdAt);
    if (!start || !Number.isFinite(timeLimitSecs) || timeLimitSecs <= 0) return null;
    const endsAt = start + timeLimitSecs * 1000;
    const closesAt = endsAt + graceMs;
    return { startedAt: start, endsAt, closesAt, remainingMs: Math.max(0, endsAt - now), closed: now >= closesAt };
}

/**
 * The answers Map as stored on the BattleParticipant row. Correctness is
 * left out on purpose: it is regraded against the battle's key on the way
 * back (answersFromJson), so a stored row can never vouch for itself.
 */
function answersToJson(answers) {
    const out = {};
    for (const [questionId, a] of answers || []) {
        out[questionId] = {
            userAnswer: a.userAnswer ?? null,
            confidenceLevel: a.confidenceLevel ?? 'MED',
            timeSpentMs: Number.isFinite(a.timeSpentMs) ? a.timeSpentMs : 0,
        };
    }
    return out;
}

/**
 * A stored answers object back into the lobby's Map, each one graded against
 * the server's key. Question ids not in this battle are dropped.
 */
function answersFromJson(json, answerKey) {
    const answers = new Map();
    if (!json || typeof json !== 'object' || !answerKey) return answers;
    for (const [questionId, a] of Object.entries(json)) {
        if (!(questionId in answerKey) || !a || typeof a !== 'object') continue;
        const userAnswer = typeof a.userAnswer === 'string' ? a.userAnswer : null;
        answers.set(questionId, {
            questionId,
            userAnswer,
            isCorrect: gradeAnswer(answerKey, questionId, userAnswer),
            confidenceLevel: ['LOW', 'MED', 'HIGH'].includes(a.confidenceLevel) ? a.confidenceLevel : 'MED',
            timeSpentMs: Number.isFinite(a.timeSpentMs) ? a.timeSpentMs : 0,
        });
    }
    return answers;
}

/**
 * A player's own answers for the client restoring them after a rejoin: the
 * option picked and the confidence, never whether it was right (the key stays
 * on the server until the battle completes). Blanks are left out.
 */
function publicAnswers(answers) {
    const entries = answers instanceof Map ? Array.from(answers.entries()) : Object.entries(answers || {});
    const out = {};
    for (const [questionId, a] of entries) {
        if (!a || a.userAnswer == null) continue;
        out[questionId] = { userAnswer: a.userAnswer, confidenceLevel: a.confidenceLevel ?? 'MED' };
    }
    return out;
}

/**
 * Record every unanswered item as blank (wrong, like the board exam) for a
 * player finished at the deadline. Returns how many were filled.
 */
function fillBlanks(participant, answerKey) {
    let filled = 0;
    for (const questionId of Object.keys(answerKey || {})) {
        if (participant.answers.has(questionId)) continue;
        participant.answers.set(questionId, {
            questionId, userAnswer: null, isCorrect: false, confidenceLevel: 'MED', timeSpentMs: 0,
        });
        filled += 1;
    }
    if (filled) recount(participant);
    return filled;
}

module.exports = {
    gradeAnswer, applyAnswer, recount, mergeSubmitAttempts, computeElapsedSecs, rankParticipants,
    DEADLINE_GRACE_MS, deadlineDelayMs, absentAtStart,
    battleTiming, answersToJson, answersFromJson, publicAnswers, fillBlanks,
};
