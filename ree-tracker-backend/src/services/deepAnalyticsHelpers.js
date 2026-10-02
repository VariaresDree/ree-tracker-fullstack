// src/services/deepAnalyticsHelpers.js
// Pure helpers behind /api/analytics/deep/study-time and /score-progression,
// extracted so the Manila day-keying and score math are unit-testable.

// The verdict rule lives in @ree/shared, shared with the client. This file used
// to carry its own copy banding at >= 60 while examRoutes banded at >= 50, and
// the comment claimed the two "mirror" each other. They did not: the same exam
// rendered FAILED on the results screen and CONDITIONAL PASS in history.
//
// A persisted ExamSession row carries only the aggregate score/totalQuestions,
// and the telemetry upsert leaves its verdict 'IN_PROGRESS' forever. For those
// rows the route now groups the session's own attempts by subject and passes the
// per-subject percentages in, so the verdict is the full PRC rule — weighted
// general average AND the subject floor. Deriving from the raw pct alone (the
// old fallback, still used when no attempts are found) called a 70% sitting
// with Mathematics at 40% PASSED here while the results screen said
// CONDITIONAL PASS.
const { deriveVerdict, gradeBoardExam, normalizeSubject } = require('@ree/shared');

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

/** Sessions whose verdict must be re-derived (never finalised). */
function needsDerivedVerdict(s) {
    return EXAM_MODES.has(s.mode) && (s.totalQuestions || 0) > 0 && (!s.verdict || s.verdict === 'IN_PROGRESS');
}

/**
 * Fold raw `{ sessionId, subject, total, correct }` rows into
 * `{ [sessionId]: { [canonicalSubject]: pct } }`, merging historical subject
 * spellings ('Math' and 'Mathematics' are one subject).
 */
function subjectScoresBySession(rows) {
    const counts = {};
    for (const r of rows || []) {
        if (!r?.sessionId) continue;
        const subject = normalizeSubject(r.subject);
        const bySubject = (counts[r.sessionId] ||= {});
        const agg = (bySubject[subject] ||= { total: 0, correct: 0 });
        agg.total += Number(r.total) || 0;
        agg.correct += Number(r.correct) || 0;
    }
    const out = {};
    for (const [sessionId, bySubject] of Object.entries(counts)) {
        out[sessionId] = {};
        for (const [subject, { total, correct }] of Object.entries(bySubject)) {
            if (total > 0) out[sessionId][subject] = Math.round((correct / total) * 100);
        }
    }
    return out;
}

function buildScoreProgression(examSessions, subjectScores = {}) {
    return (examSessions || [])
        .filter((s) => EXAM_MODES.has(s.mode) && (s.totalQuestions || 0) > 0)
        .map((s) => {
            const pct = Math.round((s.score / s.totalQuestions) * 100);
            const stored = s.verdict;
            const subjects = subjectScores[s.id];
            const graded = subjects && Object.keys(subjects).length > 0 ? gradeBoardExam(subjects) : null;
            let verdict;
            if (stored && stored !== 'IN_PROGRESS') verdict = stored;
            else verdict = graded ? graded.verdict : deriveVerdict(pct);
            return {
                createdAt: s.createdAt,
                targetSubject: s.targetSubject,
                score: s.score,
                totalQuestions: s.totalQuestions,
                pct,
                generalAverage: graded ? graded.generalAverage : null,
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

module.exports = {
    needsDerivedVerdict,
    subjectScoresBySession,
    buildScoreProgression,
    aggregateDailyStudy,
    deriveVerdict,
};
