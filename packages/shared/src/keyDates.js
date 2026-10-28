// Key dates and rest days — the CELE tracker's "Important events" list and
// the REST / PRE-BOARDS / FINAL COACHING cells of its refresher calendar, for
// the REE board.
//
// A key date is something on the learner's own calendar: a review center's
// preboard, final coaching, a PRC filing deadline, a rest day, or anything
// personal. Rest weekdays are the days of the week the learner doesn't study.
// The study plan works around both (engine/plan.js): no task on a rest day,
// a preboard counts as that stretch's timed sitting, coaching days are light.
//
// Self-reported and display only, apart from shaping the plan's calendar:
// none of it reaches θ, readiness, the forecast or the rankings.
//
// The rules live here because the client checks an entry before it goes into
// the offline queue; a rule only the server knew could reject it hours later.

'use strict';

const { isIsoDay } = require('./manilaDate');

/** The kinds, in the order the form offers them. */
const KEY_DATE_KINDS = ['preboard', 'coaching', 'deadline', 'rest', 'personal'];

const KEY_DATE_SUBJECTS = ['Mathematics', 'ESAS', 'EE', 'ALL'];

const KEY_DATE_LIMITS = Object.freeze({
    title: 80,
    note: 500,
    // A key date spans at most a month (a coaching week, a refresher block).
    spanDays: 31,
    topics: 12,
    topicId: 64,
    perUser: 400,
});

/** How the review is done: on one's own, or with a review center (step 2b). */
const REVIEW_MODES = ['self', 'center'];

const DAY_MS = 86400000;
const toUtc = (ymd) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
};
const toYmd = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Whole days from `a` to `b` (YYYY-MM-DD); negative when b is earlier. */
function daysBetween(a, b) {
    return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

/** `ymd` moved by `n` days. */
function addDays(ymd, n) {
    return toYmd(toUtc(ymd) + n * DAY_MS);
}

/** Day of the week of a calendar date, 0 = Sunday … 6 = Saturday, read from the date itself (no time zone). */
function weekdayOf(ymd) {
    return new Date(toUtc(ymd)).getUTCDay();
}

const text = (v) => (typeof v === 'string' ? v.trim() : '');

/** Field errors for a key date, as { field: message }; empty when valid. */
function keyDateErrors(entry) {
    const e = entry || {};
    const errors = {};
    if (!KEY_DATE_KINDS.includes(e.kind)) errors.kind = 'Pick what kind of date it is.';
    const title = text(e.title);
    if (!title) errors.title = 'Give it a name, like "RC Preboard 2".';
    else if (title.length > KEY_DATE_LIMITS.title) errors.title = `Keep it under ${KEY_DATE_LIMITS.title} characters.`;

    if (!isIsoDay(e.startsOn)) errors.startsOn = 'Pick the date.';
    if (e.endsOn != null && e.endsOn !== '') {
        if (!isIsoDay(e.endsOn)) errors.endsOn = 'Pick the last day, or leave it empty.';
        else if (isIsoDay(e.startsOn) && e.endsOn < e.startsOn) errors.endsOn = 'The last day can’t be before the first.';
        else if (isIsoDay(e.startsOn) && daysBetween(e.startsOn, e.endsOn) >= KEY_DATE_LIMITS.spanDays) {
            errors.endsOn = `Keep it to ${KEY_DATE_LIMITS.spanDays} days or fewer.`;
        }
    }
    if (e.subject != null && e.subject !== '' && !KEY_DATE_SUBJECTS.includes(e.subject)) errors.subject = 'Pick a subject, or none.';
    if (e.topicIds != null) {
        const ids = e.topicIds;
        if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string' || !id || id.length > KEY_DATE_LIMITS.topicId)) {
            errors.topicIds = 'Pick topics from the list.';
        } else if (new Set(ids).size > KEY_DATE_LIMITS.topics) {
            errors.topicIds = `Pick up to ${KEY_DATE_LIMITS.topics} topics.`;
        }
    }
    if (text(e.note).length > KEY_DATE_LIMITS.note) errors.note = `Keep notes under ${KEY_DATE_LIMITS.note} characters.`;
    return errors;
}

/** Field errors for the plan preferences ({ restWeekdays, reviewMode }). */
function planPrefsErrors(prefs) {
    const p = prefs || {};
    const errors = {};
    const days = p.restWeekdays;
    if (!Array.isArray(days) || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6) || new Set(days).size !== days.length) {
        errors.restWeekdays = 'Pick days of the week.';
    } else if (days.length > 6) {
        errors.restWeekdays = 'Leave at least one day a week to study.';
    }
    if (!REVIEW_MODES.includes(p.reviewMode)) errors.reviewMode = 'Pick how you’re reviewing.';
    return errors;
}

/**
 * Every day from `from` to `to` (inclusive) that a key date covers, as
 * Map<YYYY-MM-DD, entry[]>; a span is expanded day by day.
 */
function keyDayMap(entries, from, to) {
    const map = new Map();
    for (const e of entries || []) {
        if (!isIsoDay(e?.startsOn)) continue;
        const last = isIsoDay(e.endsOn) && e.endsOn >= e.startsOn ? e.endsOn : e.startsOn;
        let day = e.startsOn < from ? from : e.startsOn;
        const end = last > to ? to : last;
        for (let guard = 0; day <= end && guard <= KEY_DATE_LIMITS.spanDays; guard++) {
            if (!map.has(day)) map.set(day, []);
            map.get(day).push(e);
            day = addDays(day, 1);
        }
    }
    return map;
}

/**
 * The next key date still to come or under way (not a rest day):
 * { entry, inDays } with inDays 0 while it is on. Null when there is none.
 */
function nextKeyDate(entries, today) {
    let best = null;
    for (const e of entries || []) {
        if (!e || e.kind === 'rest' || !isIsoDay(e.startsOn)) continue;
        const last = isIsoDay(e.endsOn) && e.endsOn >= e.startsOn ? e.endsOn : e.startsOn;
        if (last < today) continue;
        const inDays = Math.max(0, daysBetween(today, e.startsOn));
        if (!best || inDays < best.inDays || (inDays === best.inDays && e.startsOn < best.entry.startsOn)) best = { entry: e, inDays };
    }
    return best;
}

/** Is `ymd` a rest day: one of the rest weekdays, or covered by a rest key date in `dayMap`? */
function isRestDay(ymd, restWeekdays, dayMap) {
    if ((restWeekdays || []).includes(weekdayOf(ymd))) return true;
    return (dayMap?.get(ymd) || []).some((e) => e.kind === 'rest');
}

module.exports = {
    KEY_DATE_KINDS,
    KEY_DATE_SUBJECTS,
    KEY_DATE_LIMITS,
    REVIEW_MODES,
    keyDateErrors,
    planPrefsErrors,
    keyDayMap,
    nextKeyDate,
    isRestDay,
    weekdayOf,
    addDays,
    daysBetween,
};
