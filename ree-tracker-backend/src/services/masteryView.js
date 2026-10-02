// src/services/masteryView.js
//
// The mastery a learner SHOULD see for a topic today: the stored BKT estimate,
// decayed for the time since the topic was last practised (engine/bkt
// decayedMastery). Shared by the dashboard payload and the forecast's
// weak-topic ranking so both read the same number.

'use strict';

const { decayedMastery } = require('../engine/bkt');

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @param {{pMastery:number|null, masteryN?:number, lastPracticedAt?:Date|string|null}} row
 * @param {Date} [now]
 * @returns {{mastery:number|null, masteryEffective:number|null, masteryN:number, daysSincePractice:number|null}}
 */
function effectiveMastery(row, now = new Date()) {
    const last = row?.lastPracticedAt ? new Date(row.lastPracticedAt) : null;
    const daysSincePractice = last && !Number.isNaN(last.getTime())
        ? Math.max(0, (now.getTime() - last.getTime()) / DAY_MS)
        : null;
    const mastery = row?.pMastery ?? null;
    return {
        mastery,
        masteryEffective: decayedMastery(mastery, daysSincePractice, row?.masteryN ?? 0),
        masteryN: row?.masteryN ?? 0,
        daysSincePractice: daysSincePractice === null ? null : Math.floor(daysSincePractice),
    };
}

module.exports = { effectiveMastery };
