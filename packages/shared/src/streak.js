// The study streak as it stands TODAY — the single read-side definition.
//
// User.globalStreak is only written when answers are recorded
// (telemetryService.recordAttempts): +1 on the first answer of a Manila day
// that follows a day with answers, otherwise reset to 1. Nothing ever lowered
// it on read, so an account that stopped on 2026-10-05 still showed
// "3-day streak" on 2026-10-08, until its next answer finally reset it to 1.
//
// A streak is alive while its last study day is today or yesterday (yesterday
// can still be extended today). Older than that, the run is already broken and
// reads 0. Every surface that DISPLAYS a streak (dashboard, leaderboard, the
// reminder push, the client's own optimistic copy) passes its stored value
// through here; the write path is untouched.
//
// "Last study day" means the last Manila day with ANSWERED questions — never
// User.lastActive, which GET /api/users/profile re-stamps on every app open.

'use strict';

const { todayManila } = require('./manilaDate');

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The calendar day before a YYYY-MM-DD day, or null for anything else.
 * Plain calendar arithmetic in UTC, so no zone or DST can shift it.
 */
function dayBefore(day) {
    if (typeof day !== 'string' || !DAY_RE.test(day)) return null;
    const [y, m, d] = day.split('-').map(Number);
    const prev = new Date(Date.UTC(y, m - 1, d - 1));
    return Number.isNaN(prev.getTime()) ? null : prev.toISOString().slice(0, 10);
}

/**
 * @param {number} globalStreak     the stored streak
 * @param {string|null} lastStudyDay  Manila YYYY-MM-DD of the last answered question
 *   (never derived from User.lastActive, which an app open re-stamps)
 * @param {string} [today]          Manila YYYY-MM-DD; defaults to now
 * @returns {number} the stored streak while it is still alive, else 0. No
 *   evidence of a study day (null, malformed) also reads 0.
 */
function effectiveStreak(globalStreak, lastStudyDay, today = todayManila()) {
    const streak = Number(globalStreak);
    if (!Number.isFinite(streak) || streak <= 0) return 0;
    if (typeof lastStudyDay !== 'string' || !DAY_RE.test(lastStudyDay)) return 0;
    const yesterday = dayBefore(today);
    if (!yesterday) return 0;
    // Same-shape ISO days compare correctly as strings.
    return lastStudyDay >= yesterday ? streak : 0;
}

/**
 * The longest run of consecutive Manila days with answers in a study calendar
 * ({ 'YYYY-MM-DD': count }). What milestones are judged by: a streak once
 * reached stays reached after the run breaks, and it comes from the days
 * actually studied, not from a stored counter.
 */
function longestStreak(calendar) {
    const days = Object.keys(calendar || {})
        .filter((d) => DAY_RE.test(d) && Number(calendar[d]) > 0)
        .sort();
    let best = 0;
    let run = 0;
    let prev = null;
    for (const d of days) {
        run = prev && dayBefore(d) === prev ? run + 1 : 1;
        if (run > best) best = run;
        prev = d;
    }
    return best;
}

module.exports = { effectiveStreak, longestStreak, dayBefore };
