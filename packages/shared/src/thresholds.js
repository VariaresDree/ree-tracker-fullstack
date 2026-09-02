// Analytics thresholds — the single definition.
//
// Each of these was a bare numeric literal repeated across files, and two of
// them disagreed between client and server while feeding the SAME UI:
//
//   "weak topic"      client accuracy < 0.6   (battleGrades.js:57,
//                                              useSimulatorEngine.js:493)
//                     server  accuracy < 0.4  (readinessRoutes.js:101, as
//                                              "blind spot")
//     -> the Prescription / weak-areas panel mixes both populations.
//
//   "time sink"       > 180000 ms, written out in three places
//                     (examRoutes.js:226, battleGrades.js:60,
//                      useSimulatorEngine.js:495)
//
//   plausible timing  client 500..1_800_000 inline literals (irtMath.js:90)
//                     server TIME_MIN_MS / TIME_MAX_MS in config
//                     -> the client comment claimed it "matches the server's
//                        bounds"; nothing verified that.
//
// WEAK_TOPIC_ACCURACY and BLIND_SPOT_ACCURACY are kept as two DISTINCT concepts
// rather than collapsed to one number: "needs work" and "actively misleading
// you" are genuinely different bands. What was wrong was having them unnamed and
// unnamed-ly inconsistent.

'use strict';

/** Accuracy below this marks a topic as weak (needs practice). */
const WEAK_TOPIC_ACCURACY = 0.6;

/**
 * Accuracy below this, with at least BLIND_SPOT_MIN_ATTEMPTS attempts, marks a
 * blind spot: a topic the learner is confidently getting wrong.
 */
const BLIND_SPOT_ACCURACY = 0.4;
const BLIND_SPOT_MIN_ATTEMPTS = 3;

/** A single answer taking longer than this is flagged as a time sink. */
const TIME_SINK_MS = 180_000;

/**
 * Plausibility band for per-question timing, used to EXCLUDE junk from time
 * aggregates. Faster than 0.5s is not a real read-and-answer; longer than 30min
 * is a stall, not think-time.
 */
const TIME_MIN_MS = 500;
const TIME_MAX_MS = 30 * 60 * 1000;

/**
 * Hard STORAGE ceiling, distinct from the plausibility band above.
 *
 * QuestionAttempt.timeSpentMs is a Postgres int4 (max 2_147_483_647). Unbounded
 * client values had two failure modes: 5e9 overflowed int4, so createMany threw
 * and an entire 500-attempt batch rolled back on one malformed field; and values
 * >= 1e21 stringify exponentially, so parseInt("1e+21") returned 1 and the value
 * was silently stored as 1ms.
 */
const TIME_STORE_MAX_MS = 60 * 60 * 1000;

/** Returns the value if plausible for aggregation, else 0 ("no timing data"). */
function plausibleTimeMs(ms) {
    const n = Number(ms) || 0;
    return n >= TIME_MIN_MS && n <= TIME_MAX_MS ? n : 0;
}

/**
 * Clamp for storage. Always a finite, non-negative integer that fits int4.
 * Unlike plausibleTimeMs this never zeroes a merely-implausible value — an
 * over-long answer is still real data worth keeping, just capped.
 */
function storableTimeMs(ms) {
    const n = Math.floor(Number(ms));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(n, TIME_STORE_MAX_MS);
}

module.exports = {
    WEAK_TOPIC_ACCURACY,
    BLIND_SPOT_ACCURACY,
    BLIND_SPOT_MIN_ATTEMPTS,
    TIME_SINK_MS,
    TIME_MIN_MS,
    TIME_MAX_MS,
    TIME_STORE_MAX_MS,
    plausibleTimeMs,
    storableTimeMs,
};
