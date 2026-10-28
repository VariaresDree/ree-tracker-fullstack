// Sets to finish and personal links — the CELE tracker's "Progress check" and
// "Useful links" sheets, for the REE board.
//
// A practice set is one paper the learner means to get through: a past board
// by date, a review center's "Set 7", a refresher sheet. They tick it off, and
// a done set can point at the outside score it was logged as. A link is a
// resource of their own: a Drive folder, a video, a flashcard deck, a Google
// Form quiz, filed by subject and pinned when it's a favourite.
//
// Self-reported and display only: neither reaches θ, readiness, the forecast,
// the rankings or the study plan. The rules live here because the client
// checks a change before it goes into the offline queue.

'use strict';

const { isIsoDay } = require('./manilaDate');

const SET_SUBJECTS = ['Mathematics', 'ESAS', 'EE', 'ALL'];
const SET_STATUSES = ['todo', 'done'];

const PRACTICE_SET_LIMITS = Object.freeze({
    collection: 60,
    title: 80,
    perUser: 600,
    // One template adds at most this many sets.
    bulk: 40,
});

const USER_LINK_LIMITS = Object.freeze({
    title: 80,
    url: 2048,
    note: 500,
    topicId: 64,
    perUser: 300,
});

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const text = (v) => (typeof v === 'string' ? v.trim() : '');

/** Field errors for a practice set, as { field: message }; empty when valid. */
function practiceSetErrors(entry) {
    const e = entry || {};
    const errors = {};
    const collection = text(e.collection);
    if (!collection) errors.collection = 'Name the group, like "Past boards".';
    else if (collection.length > PRACTICE_SET_LIMITS.collection) errors.collection = `Keep it under ${PRACTICE_SET_LIMITS.collection} characters.`;
    const title = text(e.title);
    if (!title) errors.title = 'Name the set, like "Set 7".';
    else if (title.length > PRACTICE_SET_LIMITS.title) errors.title = `Keep it under ${PRACTICE_SET_LIMITS.title} characters.`;
    if (!SET_SUBJECTS.includes(e.subject)) errors.subject = 'Pick a subject.';
    if (!SET_STATUSES.includes(e.status)) errors.status = 'Pick to do or done.';
    if (e.doneOn != null && e.doneOn !== '' && !isIsoDay(e.doneOn)) errors.doneOn = 'Pick the date you finished it.';
    if (e.sortOrder != null && !(Number.isInteger(e.sortOrder) && e.sortOrder >= 0 && e.sortOrder < 100000)) errors.sortOrder = 'A whole number.';
    return errors;
}

/**
 * Numbered sets for a template: "Set 1" … "Set 20" in one collection.
 * @returns {Array<{collection, title, subject, status, sortOrder}>} at most PRACTICE_SET_LIMITS.bulk
 */
function numberedSets({ collection, from = 1, to, subject = 'ALL', prefix = 'Set' }) {
    const first = Math.max(1, Math.floor(Number(from) || 1));
    const last = Math.min(Math.floor(Number(to) || 0), first + PRACTICE_SET_LIMITS.bulk - 1);
    const out = [];
    for (let n = first; n <= last; n++) {
        out.push({ collection: text(collection), title: `${text(prefix) || 'Set'} ${n}`, subject, status: 'todo', sortOrder: n });
    }
    return out;
}

/**
 * Past board papers for a template: one per chosen month in each year, newest
 * first ("September 2025", "April 2025", …). The months are the learner's:
 * board months have moved over the years, so none are assumed.
 * @param {{ collection?: string, fromYear: number, toYear: number, months: number[], subject?: string }} input
 *   months: 1-12
 */
function pastBoardSets({ collection = 'Past boards', fromYear, toYear, months = [], subject = 'ALL' }) {
    const lo = Math.min(Number(fromYear), Number(toYear));
    const hi = Math.max(Number(fromYear), Number(toYear));
    const ms = [...new Set(months.map(Number).filter((m) => Number.isInteger(m) && m >= 1 && m <= 12))].sort((a, b) => b - a);
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || ms.length === 0) return [];
    const out = [];
    for (let y = hi; y >= lo && out.length < PRACTICE_SET_LIMITS.bulk; y--) {
        for (const m of ms) {
            if (out.length >= PRACTICE_SET_LIMITS.bulk) break;
            out.push({ collection: text(collection), title: `${MONTHS[m - 1]} ${y}`, subject, status: 'todo', sortOrder: (hi - y) * 12 + (12 - m) });
        }
    }
    return out;
}

/** Each collection's sets and how many are done, in first-seen order: [{ collection, sets, done }]. */
function setCollections(sets) {
    const byName = new Map();
    for (const s of sets || []) {
        if (!byName.has(s.collection)) byName.set(s.collection, []);
        byName.get(s.collection).push(s);
    }
    return [...byName.entries()].map(([collection, list]) => ({
        collection,
        sets: list.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.title).localeCompare(String(b.title))),
        done: list.filter((s) => s.status === 'done').length,
    }));
}

/** A link's address, if it is a web address (http or https); else null. */
function linkUrl(value) {
    const raw = text(value);
    if (!raw || raw.length > USER_LINK_LIMITS.url) return null;
    try {
        const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch {
        return null;
    }
}

/** Field errors for a link, as { field: message }; empty when valid. */
function userLinkErrors(entry) {
    const e = entry || {};
    const errors = {};
    const title = text(e.title);
    if (!title) errors.title = 'Give it a name.';
    else if (title.length > USER_LINK_LIMITS.title) errors.title = `Keep it under ${USER_LINK_LIMITS.title} characters.`;
    if (!linkUrl(e.url)) errors.url = 'Paste a web address (http or https).';
    if (!SET_SUBJECTS.includes(e.subject)) errors.subject = 'Pick a subject.';
    if (e.topicId != null && e.topicId !== '' && (typeof e.topicId !== 'string' || e.topicId.length > USER_LINK_LIMITS.topicId)) errors.topicId = 'Pick a topic from the list.';
    if (text(e.note).length > USER_LINK_LIMITS.note) errors.note = `Keep notes under ${USER_LINK_LIMITS.note} characters.`;
    return errors;
}

/** What a link points at, from its host: 'quiz' | 'drive' | 'video' | 'flashcards' | 'link'. */
function linkKind(value) {
    const href = linkUrl(value);
    if (!href) return 'link';
    const { hostname, pathname } = new URL(href);
    const host = hostname.replace(/^www\./, '');
    if (host === 'forms.gle' || (host === 'docs.google.com' && pathname.startsWith('/forms'))) return 'quiz';
    if (host === 'drive.google.com' || host === 'docs.google.com') return 'drive';
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') return 'video';
    if (host === 'quizlet.com' || host === 'flashcards.world' || host === 'ankiweb.net' || host.endsWith('.quizlet.com')) return 'flashcards';
    return 'link';
}

module.exports = {
    SET_SUBJECTS,
    SET_STATUSES,
    PRACTICE_SET_LIMITS,
    USER_LINK_LIMITS,
    practiceSetErrors,
    numberedSets,
    pastBoardSets,
    setCollections,
    userLinkErrors,
    linkUrl,
    linkKind,
};
