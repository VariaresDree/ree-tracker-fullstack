// src/config/telemetryBounds.js
// Plausibility bounds for per-question timing. The live DB accumulated
// corrupted timeSpentMs rows (0ms "instant" answers and ~1000x-inflated
// values from an old client bug) — time-based analytics exclude anything
// outside these bounds instead of destructively rewriting history.
const TIME_MIN_MS = 500;           // faster than 0.5s isn't a real read+answer
const TIME_MAX_MS = 30 * 60 * 1000; // longer than 30min per question is a stall

// Hard STORAGE ceiling, distinct from the analytics plausibility band above.
//
// QuestionAttempt.timeSpentMs is a Postgres int4 (max 2_147_483_647). An
// unbounded client value had two failure modes, both of which cost real data:
//   - 5e9 overflows int4, so createMany throws and the ENTIRE batch (up to 500
//     attempts) rolls back on one malformed field;
//   - >=1e21 stringifies exponentially, so parseInt("1e+21") === 1 and the
//     value is silently stored as 1ms.
// Clamping at ingest makes both unreachable. 1 hour matches the bound the
// battle path has always enforced (battleSchemas.js), so the three write
// surfaces now agree.
const TIME_STORE_MAX_MS = 60 * 60 * 1000;

// Clamp-for-aggregation: returns the value if plausible, else 0 (excluded
// from sums/averages by callers that treat 0 as "no timing data").
function plausibleTimeMs(ms) {
    const n = Number(ms) || 0;
    return n >= TIME_MIN_MS && n <= TIME_MAX_MS ? n : 0;
}

// Clamp-for-storage: always returns a finite, non-negative integer that fits
// int4. Unlike plausibleTimeMs this never zeroes a merely-implausible value —
// an over-long answer is still real data worth keeping, just capped.
function storableTimeMs(ms) {
    const n = Math.floor(Number(ms));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(n, TIME_STORE_MAX_MS);
}

module.exports = { TIME_MIN_MS, TIME_MAX_MS, TIME_STORE_MAX_MS, plausibleTimeMs, storableTimeMs };
