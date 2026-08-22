// src/config/telemetryBounds.js
// Re-export shim — the bounds now live in @ree/shared (src/thresholds.js).
//
// The client kept its own inline copy of the plausibility band (irtMath.js:90,
// bare literals 500 / 1_800_000) under a comment claiming it "matches the
// server's timeSpentMs bounds". Nothing verified that claim. One definition now.
const {
    TIME_MIN_MS,
    TIME_MAX_MS,
    TIME_STORE_MAX_MS,
    plausibleTimeMs,
    storableTimeMs,
} = require('@ree/shared');

module.exports = { TIME_MIN_MS, TIME_MAX_MS, TIME_STORE_MAX_MS, plausibleTimeMs, storableTimeMs };
