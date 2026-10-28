// src/services/planCalendar.js
//
// The learner's own calendar, as the study plan reads it: which days are rest
// days (the rest weekdays, and rest key dates) and which hold a preboard or a
// coaching day. engine/plan.js stays pure; this does the reads.
//
// Key dates are self-reported: tests/displayOnlyTables.test.js allows only
// this file and the key-date route to read them, and only the planner route
// may require this file.

'use strict';

const prisma = require('../config/db');
const { keyDayMap, isRestDay, addDays } = require('@ree/shared');

/**
 * @param {string} userId
 * @param {string} today  YYYY-MM-DD (Manila)
 * @param {number} days   how many days the plan covers, from today
 * @returns {Promise<{ restDays: Set<string>, eventDays: Map<string, string>, restWeekdays: number[], keyDates: number }>}
 *   eventDays: YYYY-MM-DD → 'preboard' | 'coaching' (a preboard wins a day both cover)
 */
async function loadPlanCalendar(userId, today, days) {
    const last = addDays(today, Math.max(0, days - 1));
    const [user, entries] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { restWeekdays: true } }),
        prisma.keyDate.findMany({
            where: { userId, startsOn: { lte: last }, OR: [{ endsOn: { gte: today } }, { endsOn: null, startsOn: { gte: today } }] },
            select: { kind: true, startsOn: true, endsOn: true },
        }),
    ]);
    const restWeekdays = user?.restWeekdays || [];
    const dayMap = keyDayMap(entries, today, last);
    const restDays = new Set();
    const eventDays = new Map();
    for (let i = 0; i < days; i++) {
        const day = addDays(today, i);
        if (isRestDay(day, restWeekdays, dayMap)) restDays.add(day);
        const kinds = (dayMap.get(day) || []).map((e) => e.kind);
        if (kinds.includes('preboard')) eventDays.set(day, 'preboard');
        else if (kinds.includes('coaching')) eventDays.set(day, 'coaching');
    }
    return { restDays, eventDays, restWeekdays, keyDates: entries.filter((e) => e.kind !== 'rest').length };
}

module.exports = { loadPlanCalendar };
