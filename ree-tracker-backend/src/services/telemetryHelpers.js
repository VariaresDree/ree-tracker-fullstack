// src/services/telemetryHelpers.js
// Pure helpers extracted from recordAttempts so the dedupe/rollup/mapping
// logic is unit-testable without a database.
const { plausibleTimeMs } = require('../config/telemetryBounds');
const { normalizeSubject } = require('../utils/subject');

/**
 * Map a raw client attempt batch onto QuestionAttempt rows using the master
 * questions (qMap by id). Server data is canonical throughout: grading uses
 * the master answer when a userAnswer was sent, and subject/subtopic come
 * from the master question FIRST (Phase 3.3) — a stale offline client may
 * still send a pre-taxonomy label, and trusting it would split the topic's
 * telemetry across two keys. Attempts whose questionId has no master row are
 * dropped (the caller reports them as `skipped`).
 *
 * @returns {{ mapped: Array, gradeDiscrepancies: Array }}
 */
function mapAttemptRows(attempts, qMap, { userId, sessionId = null, mode = 'LEGACY' } = {}) {
    const gradeDiscrepancies = [];
    const mapped = (attempts || [])
        .filter((a) => a.questionId && qMap[a.questionId])
        .map((a) => {
            const m = qMap[a.questionId];
            const serverGraded = a.userAnswer != null;
            const isCorrect = serverGraded ? m.answer === a.userAnswer : !!a.isCorrect;
            // Discrepancy signal: the client sent both a userAnswer (which we
            // re-grade) AND its own isCorrect, and they disagree → the client's
            // (offline) answer key has drifted from the master. The SERVER score
            // is canonical; we just log the drift so it's visible, not silent.
            if (serverGraded && typeof a.isCorrect === 'boolean' && a.isCorrect !== isCorrect) {
                gradeDiscrepancies.push({ questionId: a.questionId, client: a.isCorrect, server: isCorrect, offline: !!a.offline });
            }
            return {
                userId,
                questionId: a.questionId,
                subject: normalizeSubject(m.subject || a.subject || 'General'),
                subtopic: m.subtopic || a.subtopic || 'General',
                isCorrect,
                confidenceLevel: String(a.confidenceLevel || 'LOW').toUpperCase(),
                timeSpentMs: parseInt(a.timeSpentMs) || 0,
                clientAttemptId: a.clientAttemptId || null,
                offline: !!a.offline,
                sessionId,
                mode,
                _difficulty: m.difficulty || 0.0,
                // 3PL item params for the theta estimator (stripped before the
                // QuestionAttempt write). irtB falls back to legacy difficulty;
                // a/c to sane 3PL defaults for uncalibrated items.
                _a: m.irtA,
                _b: m.irtB,
                _c: m.irtC,
            };
        });
    return { mapped, gradeDiscrepancies };
}

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

// Subjects that get a per-subject UserAbility row (Phase 3.4). 'General' and
// stray labels are excluded — they'd dilute the forecast with junk rows.
const ABILITY_SUBJECTS = new Set(['Mathematics', 'ESAS', 'EE']);

/**
 * Mapped attempt row → the {item, correct} pair shape the 3PL estimator
 * consumes, with the same fallbacks the global theta path has always used.
 */
function toEstimatorPair(m) {
    return {
        item: { a: m._a ?? 1, b: m._b ?? m._difficulty ?? 0, c: m._c ?? 0.2 },
        correct: !!m.isCorrect,
    };
}

/**
 * Group a mapped batch into per-subject estimator pairs (canonical subjects
 * only) for the UserAbility incremental updates.
 * @returns {Object<string, Array>} subject -> pairs
 */
function groupPairsBySubject(mapped) {
    const bySubject = {};
    for (const m of mapped || []) {
        if (!ABILITY_SUBJECTS.has(m.subject)) continue;
        (bySubject[m.subject] ||= []).push(toEstimatorPair(m));
    }
    return bySubject;
}

module.exports = { mapAttemptRows, partitionNewAttempts, aggregateTopicRollups, toEstimatorPair, groupPairsBySubject, ABILITY_SUBJECTS };
