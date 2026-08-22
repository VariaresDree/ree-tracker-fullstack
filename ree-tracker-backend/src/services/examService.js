// src/services/examService.js
//
// Board-exam grading and diagnostics, extracted from examRoutes.
//
// This logic sat inline in a ~110-line route handler, which is precisely why it
// was uncovered — and why the verdict thresholds here drifted from the client's
// for long enough to ship: the server banded CONDITIONAL PASS at >= 50 while the
// client rendered FAILED below 60, so every score in [50, 60) showed one result
// on the results screen and a different one in exam history, and counted as a
// pass in the pass-rate KPI. Nothing could have caught that, because neither
// side's rule was reachable from a test.
//
// The verdict rule itself now lives in @ree/shared (one definition, used by both
// packages). What lives here is the exam-specific work around it: grading
// against the master answer key, rolling up per-subject performance so the PRC
// subject floor can be applied, and deriving the post-exam diagnostics.
//
// Everything below is pure. The route supplies the master questions.

'use strict';

const { deriveVerdict, VERDICT, normalizeSubject, TIME_SINK_MS, storableTimeMs } = require('@ree/shared');

/** Colour token per verdict, so the mapping is stated once. */
const VERDICT_COLORS = Object.freeze({
    [VERDICT.PASSED]: 'text-reeGreen',
    [VERDICT.CONDITIONAL]: 'text-reeAmber',
    [VERDICT.FAILED]: 'text-reeRed',
});

function verdictColor(verdict) {
    return VERDICT_COLORS[verdict] || VERDICT_COLORS[VERDICT.FAILED];
}

/**
 * Grade submitted attempts against the master answer key.
 *
 * The client's own `isCorrect` is never read — grading is server-authoritative,
 * which is the invariant the whole telemetry pipeline depends on. An attempt
 * whose questionId is not in the master map is graded FALSE rather than skipped,
 * so a stale offline pack cannot inflate a score by referencing questions that
 * no longer exist.
 *
 * @param {Array} attempts       submitted attempts
 * @param {Object} qMap          questionId -> master question row
 * @param {string} userId
 * @returns {{correctCount:number, parsedAttempts:Array, subjectPerformance:Object}}
 */
function gradeAttempts(attempts, qMap, userId) {
    let correctCount = 0;
    const parsedAttempts = [];
    const subjectPerformance = {};

    for (const attempt of attempts || []) {
        if (!attempt?.questionId) continue;

        const masterQ = qMap[attempt.questionId];
        const isCorrect = masterQ ? masterQ.answer === attempt.userAnswer : false;
        if (isCorrect) correctCount += 1;

        const subject = masterQ?.subject || attempt.subject || 'General';
        if (!subjectPerformance[subject]) subjectPerformance[subject] = { correct: 0, total: 0 };
        subjectPerformance[subject].total += 1;
        if (isCorrect) subjectPerformance[subject].correct += 1;

        parsedAttempts.push({
            userId,
            questionId: attempt.questionId,
            subject,
            subtopic: masterQ?.subtopic || attempt.subtopic || 'General',
            isCorrect,
            // Forwarded so recordAttempts re-grades against the master key (single
            // source of truth) and marks the row server-graded — otherwise the
            // theta estimator, which consumes server-graded rows only, would drop
            // every board-sim attempt.
            userAnswer: attempt.userAnswer,
            confidenceLevel: attempt.confidence || attempt.confidenceLevel || 'LOW',
            timeSpentMs: storableTimeMs((attempt.timeSpentSecs || 0) * 1000),
            clientAttemptId: attempt.clientAttemptId,
            questionDifficulty: masterQ?.difficulty || 0.0,
        });
    }

    return { correctCount, parsedAttempts, subjectPerformance };
}

/**
 * Per-subject percentages for the PRC subject floor.
 *
 * Subjects the exam never asked about are simply absent — NOT present with a
 * zero — because an unrated subject must not fail a candidate. `deriveVerdict`
 * relies on that distinction.
 */
function toSubjectScores(subjectPerformance) {
    const out = {};
    for (const [subject, agg] of Object.entries(subjectPerformance || {})) {
        if (!agg?.total) continue;
        out[normalizeSubject(subject)] = Math.round((agg.correct / agg.total) * 100);
    }
    return out;
}

/** Whole-percent score, guarding the zero-item case. */
function scorePercentage(correctCount, total) {
    if (!total) return 0;
    return Math.round((correctCount / total) * 100);
}

/**
 * Post-exam diagnostics.
 *
 * `idxByQid` is built once so this is O(n) rather than the O(n^2) it would be
 * with a findIndex per attempt.
 */
function buildDiagnostics({ attempts, parsedAttempts, correctCount, timeTakenSecs, subjectPerformance }) {
    const idxByQid = new Map((attempts || []).map((at, i) => [at.questionId, i]));

    const total = parsedAttempts.length;
    const score = scorePercentage(correctCount, total);
    const subjectScores = toSubjectScores(subjectPerformance);
    const verdict = deriveVerdict(score, subjectScores);

    return {
        overallScore: score,
        correctCount,
        totalCount: total,
        verdict,
        verdictColor: verdictColor(verdict),
        timeTaken: timeTakenSecs,
        subjTracker: subjectPerformance,
        subjectScores,
        // A single answer taking longer than the shared threshold.
        timeSinks: parsedAttempts
            .filter((a) => a.timeSpentMs > TIME_SINK_MS)
            .map((a) => ({ idx: idxByQid.get(a.questionId), time: Math.floor(a.timeSpentMs / 1000) })),
        // Confidently wrong — the most actionable diagnostic in the set.
        blindSpots: parsedAttempts
            .filter((a) => a.confidenceLevel === 'HIGH' && !a.isCorrect)
            .map((a) => idxByQid.get(a.questionId)),
    };
}

module.exports = {
    VERDICT_COLORS,
    verdictColor,
    gradeAttempts,
    toSubjectScores,
    scorePercentage,
    buildDiagnostics,
};
