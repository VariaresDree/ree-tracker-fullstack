// src/services/deepAnalyticsHelpers.js
// Pure helpers behind /api/analytics/deep/study-time and /score-progression,
// extracted so the Manila day-keying and score math are unit-testable.

// PASS thresholds mirror examRoutes' verdict computation (70% pass, 60% conditional).
function deriveVerdict(pct) {
    if (pct >= 70) return 'PASSED';
    if (pct >= 60) return 'CONDITIONAL PASS';
    return 'FAILED';
}

/**
 * Score History rows. Only real exam surfaces count (Board Sim / Gauntlet —
 * a 5-item Active Review batch isn't an "exam score"), and only gradeable
 * rows (totalQuestions > 0). ExamSession.score is a RAW CORRECT COUNT — the
 * old UI rendered it with a % suffix directly, which is the bug this fixes:
 * pct is computed here, server-side, once.
 * Sessions created by the telemetry upsert keep verdict 'IN_PROGRESS'
 * forever (only /exams/submit finalizes) — for those, derive the verdict
 * from pct instead of hiding the row or showing a stale state.
 */
const EXAM_MODES = new Set(['BOARD_SIM', 'GAUNTLET']);
function buildScoreProgression(examSessions) {
    return (examSessions || [])
        .filter((s) => EXAM_MODES.has(s.mode) && (s.totalQuestions || 0) > 0)
        .map((s) => {
            const pct = Math.round((s.score / s.totalQuestions) * 100);
            const stored = s.verdict;
            const verdict = stored && stored !== 'IN_PROGRESS' ? stored : deriveVerdict(pct);
            return {
                createdAt: s.createdAt,
                targetSubject: s.targetSubject,
                score: s.score,
                totalQuestions: s.totalQuestions,
                pct,
                verdict,
            };
        });
}

/**
 * Daily study-time aggregation, keyed by MANILA calendar date (the app's
 * canonical day — UTC keying put evening sessions on the wrong day, the same
 * drift class fixed in the activity calendar). Merges Active Review study
 * sessions with completed exam sessions so Board Simulator / Gauntlet time
 * actually shows up (the old version only counted StudySession rows).
 *
 * @param {Array<{createdAt, durationSecs}>} studySessions
 * @param {Array<{createdAt, timeTakenSecs, totalQuestions}>} examSessions
 * @param {(d: Date) => string} dateOf - instant → 'YYYY-MM-DD' (Manila)
 * @returns {Array<{date, totalSecs, sessions}>} ascending by date
 */
function aggregateDailyStudy(studySessions, examSessions, dateOf) {
    const dailyMap = new Map();
    const add = (createdAt, secs) => {
        if (!secs || secs <= 0) return;
        const day = dateOf(createdAt);
        const agg = dailyMap.get(day) || { totalSecs: 0, sessions: 0 };
        agg.totalSecs += secs;
        agg.sessions += 1;
        dailyMap.set(day, agg);
    };
    for (const s of studySessions || []) add(s.createdAt, s.durationSecs);
    // Only exam sessions that actually contain answered items — a stray
    // zero-question upsert isn't study time.
    for (const e of examSessions || []) {
        if ((e.totalQuestions || 0) > 0) add(e.createdAt, e.timeTakenSecs);
    }
    return [...dailyMap.entries()]
        .map(([date, agg]) => ({ date, ...agg }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = { buildScoreProgression, aggregateDailyStudy, deriveVerdict };
