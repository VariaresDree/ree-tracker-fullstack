// src/services/forecastSnapshots.js
//
// One forecast snapshot per learner per Manila day, so pass chance has a TREND
// (Progress › Overview › Your journey). A snapshot was saved only when the
// learner pressed Recompute: on 2026-11-14 one account of 13 had any history.
// The forecast route now records the day's latest value itself, after
// responding, the way readiness does (services/readinessSnapshots.js).

'use strict';

const prisma = require('../config/db');
const { manilaDateOf } = require('@ree/shared');

/**
 * Create today's snapshot, or replace it if `latest` is today's (the day's last
 * value wins). Never throws: a trend point is not worth failing a request over.
 *
 * @param {string} userId
 * @param {object} computed  computeForUser's in-memory result
 * @param {{id: string, createdAt: Date}|null} latest  the newest stored snapshot
 */
async function recordDailyForecast(userId, computed, latest, now = new Date()) {
    try {
        // eslint-disable-next-line no-unused-vars
        const { id, userId: _owner, createdAt, ...data } = computed;
        if (latest && manilaDateOf(latest.createdAt) === manilaDateOf(now)) {
            await prisma.forecastSnapshot.update({ where: { id: latest.id }, data: { ...data, createdAt: now } });
        } else {
            await prisma.forecastSnapshot.create({ data: { userId, ...data } });
        }
        return true;
    } catch {
        return false;
    }
}

/**
 * Pure: snapshots oldest first → one point per Manila day, the day's last
 * (Recompute can leave several in a day).
 * @returns {Array<{day: string, passProbability: number}>}
 */
function dailyPassChance(rows) {
    const byDay = new Map();
    for (const r of rows || []) {
        const p = Number(r?.passProbability);
        if (Number.isFinite(p)) byDay.set(manilaDateOf(r.createdAt), p);
    }
    return [...byDay].map(([day, passProbability]) => ({ day, passProbability }));
}

module.exports = { recordDailyForecast, dailyPassChance };
