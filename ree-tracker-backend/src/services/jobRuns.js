// src/services/jobRuns.js
//
// The scheduled jobs' record (Admin › App health › Scheduled jobs). Things had
// gone quietly wrong with nothing to show it: the push switch was never on, so
// no reminder was ever sent; GitHub ran the "hourly" job about every 8 hours.
// Each POST /api/cron/* run now leaves a row with what it did, and App health
// says when a job is late or failing.

'use strict';

const prisma = require('../config/db');

const KEEP_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// What each job is expected to do (docs/ops/scheduled-jobs.sql). `hoursUtc`:
// the UTC hours it runs in; it is late when it hasn't run for two hours inside them.
const JOBS = Object.freeze({
    reminders: { every: HOUR_MS, hoursUtc: null },
    'subtopic-tags': { every: HOUR_MS, hoursUtc: [22, 23, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
});

/** Records one run. Never throws: the record is a nicety, the job's work is what matters. */
async function recordJobRun(job, startedAt, { ok, summary = null, error = null }) {
    try {
        const now = new Date();
        await prisma.jobRun.create({
            data: { job, startedAt, durationMs: Math.max(0, now - startedAt), ok, summary, error: error ? String(error).slice(0, 500) : null },
        });
        // Pruned here so nothing else has to.
        await prisma.jobRun.deleteMany({ where: { job, startedAt: { lt: new Date(now - KEEP_DAYS * DAY_MS) } } });
    } catch { /* see above */ }
}

/** Runs `fn`, records how it went, and returns its result (or rethrows). */
async function withJobRun(job, fn, okOf = () => true) {
    const startedAt = new Date();
    try {
        const out = await fn();
        await recordJobRun(job, startedAt, { ok: okOf(out), summary: out ?? null });
        return out;
    } catch (error) {
        await recordJobRun(job, startedAt, { ok: false, error: error.message });
        throw error;
    }
}

/** Pure: whether a job that last ran at `lastAt` is overdue at `now`. */
function isLate(job, lastAt, now = new Date()) {
    const spec = JOBS[job];
    if (!spec) return false;
    if (spec.hoursUtc && !spec.hoursUtc.includes(now.getUTCHours())) return false;
    return !lastAt || now - new Date(lastAt) > 2 * spec.every;
}

/** Each job's last run, last good run and the past day's count, for App health. */
async function jobHealth(now = new Date()) {
    const since = new Date(now - DAY_MS);
    return Promise.all(Object.keys(JOBS).map(async (job) => {
        const [last, lastOk, runs, failed] = await Promise.all([
            prisma.jobRun.findFirst({ where: { job }, orderBy: { startedAt: 'desc' } }),
            prisma.jobRun.findFirst({ where: { job, ok: true }, orderBy: { startedAt: 'desc' }, select: { startedAt: true } }),
            prisma.jobRun.count({ where: { job, startedAt: { gte: since } } }),
            prisma.jobRun.count({ where: { job, ok: false, startedAt: { gte: since } } }),
        ]);
        return {
            job,
            last: last && { startedAt: last.startedAt, durationMs: last.durationMs, ok: last.ok, summary: last.summary, error: last.error },
            lastOkAt: lastOk?.startedAt ?? null,
            runs24h: runs,
            failed24h: failed,
            late: isLate(job, last?.startedAt, now),
        };
    }));
}

module.exports = { JOBS, recordJobRun, withJobRun, isLate, jobHealth };
