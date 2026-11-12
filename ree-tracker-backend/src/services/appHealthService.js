// src/services/appHealthService.js
//
// What Admin › App health reads: which app versions people are on, and which
// errors the app and this server have hit. One row per distinct error, with a
// count, so a crash that hits everyone is one line. No user id is stored with
// an error, and addresses are removed from its text.
const crypto = require('crypto');
const prisma = require('../config/db');
const { jobHealth } = require('./jobRuns');

const DAY_MS = 24 * 60 * 60 * 1000;
const VERSION_WINDOW_DAYS = 7;
const KEEP_DAYS = 60;
const MAX_MESSAGE = 500;
const MAX_STACK = 4000;

const stripEmails = (text) => String(text).replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]');

// Numbers and ids vary between occurrences of the same error ("Question abc123
// not found"), and chunk names change every deploy, so neither may split a row.
const fingerprintOf = (source, message) => crypto
    .createHash('sha1')
    .update(`${source}|${message.replace(/\b[0-9a-f]{8,}\b/gi, '#').replace(/\d+/g, '#')}`)
    .digest('hex');

// Never throws and never logs: the server's own errors arrive through here, so
// logging a failed write would feed the failure back in.
async function recordErrors(items, source) {
    await Promise.allSettled(items.map((item) => {
        const message = stripEmails(item.message).slice(0, MAX_MESSAGE);
        const fields = {
            message,
            stack: item.stack ? stripEmails(item.stack).slice(0, MAX_STACK) : null,
            route: item.route || null,
            version: item.version || null,
            lastSeenAt: new Date(),
        };
        const count = item.count || 1;
        return prisma.appError.upsert({
            where: { fingerprint: fingerprintOf(source, message) },
            create: { ...fields, fingerprint: fingerprintOf(source, message), source, count },
            update: { ...fields, count: { increment: count } },
        });
    }));
}

function recordVersion(userId, version) {
    const lastSeenAt = new Date();
    return prisma.appVersionSeen.upsert({
        where: { userId_version: { userId, version } },
        create: { userId, version, lastSeenAt },
        update: { lastSeenAt },
    });
}

async function healthSummary(now = new Date()) {
    const expired = new Date(now.getTime() - KEEP_DAYS * DAY_MS);
    // Pruned here so no cron is needed: nothing reads these rows but this.
    await Promise.all([
        prisma.appError.deleteMany({ where: { lastSeenAt: { lt: expired } } }),
        prisma.appVersionSeen.deleteMany({ where: { lastSeenAt: { lt: expired } } }),
    ]);
    const [versions, errors, jobs] = await Promise.all([
        prisma.appVersionSeen.groupBy({
            by: ['version'],
            where: { lastSeenAt: { gte: new Date(now.getTime() - VERSION_WINDOW_DAYS * DAY_MS) } },
            _count: { _all: true },
            _max: { lastSeenAt: true },
            orderBy: { _max: { lastSeenAt: 'desc' } },
        }),
        prisma.appError.findMany({ orderBy: { lastSeenAt: 'desc' }, take: 50 }),
        // The scheduled jobs' record; App health still loads if it can't be read.
        jobHealth(now).catch(() => []),
    ]);
    return {
        versions: versions.map((v) => ({ version: v.version, people: v._count._all, lastSeenAt: v._max.lastSeenAt })),
        errors,
        jobs,
    };
}

const dismissError = (id) => prisma.appError.deleteMany({ where: { id } });

module.exports = { recordErrors, recordVersion, healthSummary, dismissError, fingerprintOf, stripEmails, MAX_MESSAGE, MAX_STACK };
