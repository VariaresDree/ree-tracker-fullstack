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
    return true;
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

module.exports = { gradeAnswer, applyAnswer, mergeSubmitAttempts, computeElapsedSecs, rankParticipants };
