// src/services/readinessSnapshots.js
//
// One readiness snapshot per learner per Manila day, so the index has a TREND.
// ReadinessSnapshot existed (with a history route) but nothing ever wrote it:
// the only writer was a client-called POST that no client called. The readiness
// route now records the day's latest value itself, after responding.

'use strict';

const prisma = require('../config/db');
const { manilaDateOf } = require('@ree/shared');

/** Pure: the readiness payload → ReadinessSnapshot columns. */
function snapshotFields(payload, theta) {
    const b = payload?.breakdown || {};
    return {
        score: Number(payload?.score) || 0,
        topicCoverage: Number(b.topicCoverage) || 0,
        accuracyRate: Number(b.accuracyRate) || 0,
        theta: Number.isFinite(theta) ? theta : 0,
        consistency: Number(b.consistency) || 0,
        blindSpotRatio: Number(b.blindSpotRatio) || 0,
    };
}

/**
 * Create today's snapshot, or update it if one exists (last value of the day
 * wins, like the θ history). Never throws — a trend point is not worth failing
 * a request over.
 */
async function recordDailySnapshot(userId, payload, theta, now = new Date()) {
    try {
        const latest = await prisma.readinessSnapshot.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, createdAt: true },
        });
        const data = snapshotFields(payload, theta);
        if (latest && manilaDateOf(latest.createdAt) === manilaDateOf(now)) {
            await prisma.readinessSnapshot.update({ where: { id: latest.id }, data });
        } else {
            await prisma.readinessSnapshot.create({ data: { userId, ...data } });
        }
        return true;
    } catch {
        return false;
    }
}

module.exports = { snapshotFields, recordDailySnapshot };
