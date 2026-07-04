// src/services/telemetryHelpers.js
// Pure helpers extracted from recordAttempts so the dedupe/rollup math is
// unit-testable without a database.
const { plausibleTimeMs } = require('../config/telemetryBounds');

/**
 * Split a mapped attempt batch into rows that are genuinely new vs rows the
 * server has already recorded (matched by clientAttemptId). Attempts WITHOUT
 * a clientAttemptId can't be deduped and are always treated as new — that
 * preserves legacy-client behavior.
 *
 * @param {Set<string>} existingIdSet - clientAttemptIds already in the DB for this user
 * @param {Array<{clientAttemptId?: string}>} mapped
 * @returns {{ newOnly: Array, duplicates: Array }}
 */
function partitionNewAttempts(existingIdSet, mapped) {
    const newOnly = [];
    const duplicates = [];
    for (const m of mapped) {
        if (m.clientAttemptId && existingIdSet.has(m.clientAttemptId)) {
            duplicates.push(m);
        } else {
            newOnly.push(m);
        }
    }
    return { newOnly, duplicates };
}

/**
 * Aggregate a batch of attempts into per-topic rollups for the
 * UserTopicPerformance upserts that feed the forecast/prescription engine.
 * Times are clamped to plausibility bounds and stored in SECONDS (matching
 * the UserTopicPerformance.totalTime column).
 *
 * @param {Array<{subject, subtopic, isCorrect, timeSpentMs}>} attempts
 * @returns {Array<{subject, topic, attempts, correct, totalTimeSecs}>}
 */
function aggregateTopicRollups(attempts) {
    const byTopic = new Map();
    for (const a of attempts) {
        const topic = a.subtopic || 'General';
        let agg = byTopic.get(topic);
        if (!agg) {
            agg = { subject: a.subject || 'General', topic, attempts: 0, correct: 0, totalTimeSecs: 0 };
            byTopic.set(topic, agg);
        }
        agg.attempts += 1;
        if (a.isCorrect) agg.correct += 1;
        agg.totalTimeSecs += Math.floor(plausibleTimeMs(a.timeSpentMs) / 1000);
    }
    return Array.from(byTopic.values());
}

module.exports = { partitionNewAttempts, aggregateTopicRollups };
