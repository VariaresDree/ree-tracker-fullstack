// A topic's table of contents (Progress › Syllabus): the subtopics Admin keeps
// as a suggested list, and each learner's own changes laid over them.
//
// The learner's list is computed, not copied. A learner who changes nothing
// follows the suggested list, later Admin edits included. A rename, switching a
// row off, or moving it overrides that row only, and their own subtopics join
// the list. If Admin retires a subtopic it leaves the list, unless this learner
// already ticked it, so a tick is never lost.
//
// Self-reported and display only: questions aren't tagged by subtopic, so
// answers can't tick these, and nothing reads them but the checklist.

'use strict';

const { isIsoDay } = require('./manilaDate');

const SUBTOPIC_LIMITS = Object.freeze({
    name: 120,
    // A learner's own subtopics. Overrides of suggested ones are bounded by the list.
    ownPerUser: 600,
    // One request: a topic's whole list, for Mark all and reordering.
    bulk: 100,
});

const normSubtopicKey = (name) => String(name || '').trim().toLowerCase();

/** Field errors for one learner's row, as { field: message }; empty when valid. */
function userSubtopicErrors(entry) {
    const e = entry || {};
    const errors = {};
    const name = typeof e.name === 'string' ? e.name.trim() : '';
    if (!e.subtopicId && !name) errors.name = 'Name the subtopic.';
    else if (name.length > SUBTOPIC_LIMITS.name) errors.name = `Keep it under ${SUBTOPIC_LIMITS.name} characters.`;
    if (!e.topicId) errors.topicId = 'That topic isn’t in the syllabus.';
    if (e.doneOn != null && e.doneOn !== '' && !isIsoDay(e.doneOn)) errors.doneOn = 'Pick the date you finished it.';
    if (e.sortOrder != null && !(Number.isInteger(e.sortOrder) && e.sortOrder >= 0 && e.sortOrder < 100000)) errors.sortOrder = 'A whole number.';
    return errors;
}

/**
 * One topic's list as this learner sees it, in order.
 *
 * @param {Array<{ id, name, sortOrder?, active? }>} premade this topic's suggested subtopics
 * @param {Array<{ id, subtopicId?, name?, hidden?, done?, doneOn?, sortOrder?, createdAt? }>} mine this learner's rows for the topic
 * @returns {Array<{ id, subtopicId, name, suggestedName, own, renamed, off, done, doneOn, sortOrder }>}
 */
function mergeSubtopics(premade, mine) {
    const rows = mine || [];
    const byId = new Map(rows.map((m) => [m.id, m]));
    const out = [];
    for (const p of premade || []) {
        const m = byId.get(p.id);
        if (p.active === false && !m?.done) continue;
        out.push({
            id: p.id,
            subtopicId: p.id,
            name: m?.name || p.name,
            suggestedName: p.name,
            own: false,
            renamed: !!m?.name && m.name !== p.name,
            off: !!m?.hidden,
            done: !!m?.done,
            doneOn: m?.doneOn ?? null,
            order: m?.sortOrder ?? p.sortOrder ?? 0,
            at: '',
        });
    }
    for (const m of rows) {
        if (m.subtopicId || !m.name) continue;
        out.push({
            id: m.id,
            subtopicId: null,
            name: m.name,
            suggestedName: null,
            own: true,
            renamed: false,
            off: !!m.hidden,
            done: !!m.done,
            doneOn: m.doneOn ?? null,
            // Own rows follow the list until the learner moves them.
            order: m.sortOrder ?? Number.MAX_SAFE_INTEGER,
            at: m.createdAt || '',
        });
    }
    return out
        .sort((a, b) => (a.order - b.order) || String(a.at).localeCompare(String(b.at)))
        .map(({ order, at: _at, ...row }, i) => ({ ...row, sortOrder: order === Number.MAX_SAFE_INTEGER ? i : order }));
}

/** How far along a merged list is; switched-off rows don't count. */
function subtopicProgress(rows) {
    const on = (rows || []).filter((r) => !r.off);
    return { done: on.filter((r) => r.done).length, total: on.length };
}

module.exports = { SUBTOPIC_LIMITS, normSubtopicKey, userSubtopicErrors, mergeSubtopics, subtopicProgress };
