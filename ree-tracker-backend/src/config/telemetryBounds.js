// src/config/telemetryBounds.js
// Plausibility bounds for per-question timing. The live DB accumulated
// corrupted timeSpentMs rows (0ms "instant" answers and ~1000x-inflated
// values from an old client bug) — time-based analytics exclude anything
// outside these bounds instead of destructively rewriting history.
const TIME_MIN_MS = 500;           // faster than 0.5s isn't a real read+answer
const TIME_MAX_MS = 30 * 60 * 1000; // longer than 30min per question is a stall

// Clamp-for-aggregation: returns the value if plausible, else 0 (excluded
// from sums/averages by callers that treat 0 as "no timing data").
function plausibleTimeMs(ms) {
    const n = Number(ms) || 0;
    return n >= TIME_MIN_MS && n <= TIME_MAX_MS ? n : 0;
}

module.exports = { TIME_MIN_MS, TIME_MAX_MS, plausibleTimeMs };
