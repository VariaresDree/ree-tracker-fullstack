// src/services/deepAnalyticsHelpers.js
// Pure helpers behind /api/analytics/deep/study-time and /weekly-accuracy, and
// the per-session subject scores mock history and the Gauntlet grade from:
// extracted so the Manila day-keying and the folding are unit-testable.
const { normalizeSubject } = require('@ree/shared');

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

/**
 * Answers per Manila week and subject, with the subject spellings folded
 * ("Math" and "Mathematics" are one row), oldest week first.
 *
 * @param {Array<{week: string, subject: string, answered: number, correct: number}>} rows
 * @param {(s: string) => string} normalize  the canonical subject name
 */
function foldWeeklyAccuracy(rows, normalize) {
    const out = new Map();
    for (const r of rows || []) {
        if (!r?.week) continue;
        const subject = normalize(r.subject);
        const key = `${r.week}|${subject}`;
        const row = out.get(key) || { week: r.week, subject, answered: 0, correct: 0 };
        row.answered += Number(r.answered) || 0;
        row.correct += Number(r.correct) || 0;
        out.set(key, row);
    }
    return [...out.values()].sort((a, b) => a.week.localeCompare(b.week) || a.subject.localeCompare(b.subject));
}

module.exports = {
    foldWeeklyAccuracy,
    subjectScoresBySession,
    aggregateDailyStudy,
};
