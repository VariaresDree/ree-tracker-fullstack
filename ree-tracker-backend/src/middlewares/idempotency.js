// Idempotency-Key middleware. Keyed on (userId, method, route, key); records the
// SUCCESS response status + body and replays it on a duplicate send. Used by the
// offline-sync queue, where a flaky network reliably produces double submissions
// of the same telemetry batch.
//
// DURABLE (Postgres), not in-process. The previous Map had four holes, each of
// which let a retry re-execute a handler with its full side effects:
//
//   1. It did not survive a restart. Render's free tier spins down when idle and
//      restarts on deploy, so a retry crossing either boundary re-ran the
//      handler. POST /api/exams/submit unconditionally creates an ExamSession,
//      so that produced a second, permanently 0/0 ghost row in exam history.
//   2. Size-cap eviction removed the OLDEST entry, which could be a live
//      IN_FLIGHT reservation — under key pressure the concurrency guard silently
//      disappeared and both duplicates ran.
//   3. The 30s in-flight TTL was shorter than the real runtime of
//      /api/review/approve-bulk, so the reservation expired mid-flight and the
//      handler could run concurrently with itself.
//   4. Nothing survived the 10-minute TTL, which is well inside the window an
//      offline client will retry in.
//
// THE UNIQUE INSERT IS THE LOCK. Two concurrent duplicates race to insert the
// same primary key; exactly one wins, and the loser reads the winner's row. That
// is a stronger guarantee than the Map's read-then-reserve, which had a TOCTOU
// gap by construction.
//
// Fails OPEN: if the idempotency store itself errors, the request proceeds
// rather than 500ing. A store outage means the database is unavailable, so the
// handler is going to fail on its own merits; blocking here would convert a
// degraded dependency into a hard outage.
//
// Mount AFTER authMiddleware (needs req.user.id) and AFTER validate() (so a
// malformed body never reserves a key).

'use strict';

const prisma = require('../config/db');
const logger = require('../utils/logger');

// How long a completed response stays replayable. Far longer than the old 10
// minutes now that it is durable — an offline client can retry hours later, and
// that is precisely the case the key exists to make safe.
const TTL_MS = 24 * 60 * 60 * 1000;

// How long a reservation may sit IN_FLIGHT before another request may take it
// over. Must exceed the slowest guarded handler; approve-bulk over a WAN is the
// benchmark. A crashed handler wedges the key for at most this long.
const INFLIGHT_TTL_MS = 5 * 60 * 1000;

// Expired rows are swept opportunistically rather than on a timer, so this
// module adds no background work to a process that may be spinning down.
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;
let lastSweepAt = 0;

/**
 * Default store, backed by Postgres. Injectable so the middleware can be tested
 * without a database — the in-memory test double implements the same
 * insert-or-lose contract.
 */
const prismaStore = {
    async claim(key, userId) {
        try {
            await prisma.idempotencyRecord.create({ data: { key, userId, status: 'IN_FLIGHT' } });
            return { claimed: true };
        } catch (err) {
            // P2002 = unique violation, i.e. we lost the race. Any other error is
            // a real store failure and propagates to the fail-open handler.
            if (err?.code !== 'P2002') throw err;

            const existing = await prisma.idempotencyRecord.findUnique({ where: { key } });
            if (!existing) return { claimed: true, raced: true }; // swept between insert and read

            if (existing.status === 'DONE') return { claimed: false, record: existing };

            // Stale reservation from a handler that died. Take it over — but do
            // it as a conditional update so that when several requests notice
            // the same stale row, exactly one wins.
            const staleBefore = new Date(Date.now() - INFLIGHT_TTL_MS);
            if (existing.updatedAt < staleBefore) {
                const { count } = await prisma.idempotencyRecord.updateMany({
                    where: { key, status: 'IN_FLIGHT', updatedAt: { lt: staleBefore } },
                    data: { userId },
                });
                if (count === 1) return { claimed: true };
            }
            return { claimed: false, record: existing };
        }
    },

    async complete(key, httpStatus, response) {
        await prisma.idempotencyRecord.update({
            where: { key },
            data: { status: 'DONE', httpStatus, response },
        });
    },

    async release(key) {
        await prisma.idempotencyRecord.deleteMany({ where: { key, status: 'IN_FLIGHT' } });
    },

    async sweep(before) {
        await prisma.idempotencyRecord.deleteMany({ where: { createdAt: { lt: before } } });
    },
};

/**
 * @param {object} [opts]
 * @param {object} [opts.store] — override the persistence layer (tests).
 */
function idempotency({ store = prismaStore } = {}) {
    return async (req, res, next) => {
        const key = req.headers['idempotency-key'];
        if (!key || typeof key !== 'string' || key.length > 200) return next();

        const recordKey = `${req.user?.id || 'anon'}|${req.method}|${req.originalUrl}|${key}`;

        let outcome;
        try {
            outcome = await store.claim(recordKey, req.user?.id || 'anon');
        } catch (err) {
            logger.warn('idempotency store unavailable; proceeding without replay protection', { error: err.message });
            return next();
        }

        if (!outcome.claimed) {
            const rec = outcome.record;
            if (rec.status === 'DONE' && Date.now() - new Date(rec.createdAt).getTime() < TTL_MS) {
                res.set('Idempotency-Replay', 'true');
                return res.status(rec.httpStatus || 200).json(rec.response);
            }
            // A concurrent identical request is still running. Telling the client
            // to retry is preferable to running the side effect a second time.
            return res.status(409).json({ error: 'Duplicate request already in progress.' });
        }

        // Opportunistic expiry, after the hot path has already been decided.
        if (Date.now() - lastSweepAt > SWEEP_INTERVAL_MS) {
            lastSweepAt = Date.now();
            store.sweep(new Date(Date.now() - TTL_MS)).catch((err) => {
                logger.warn('idempotency sweep failed', { error: err.message });
            });
        }

        // Capture res.json so the body is recorded without touching route code.
        let settled = false;
        const origJson = res.json.bind(res);
        res.json = (body) => {
            const status = res.statusCode || 200;
            settled = true;
            const persist = status < 300
                // Success only. Recording a 4xx/5xx would replay a stale
                // validation error (or a partial-write 500) for the whole TTL, so
                // a corrected retry with the same key kept getting the old failure.
                ? store.complete(recordKey, status, body)
                // Release, so a corrected retry can run.
                : store.release(recordKey);
            persist.catch((err) => logger.warn('idempotency persist failed', { error: err.message }));
            return origJson(body);
        };

        // Safety net: a response that finishes without res.json (res.end/send, or
        // an error path) must not leave the key reserved. Guarded so lightweight
        // test stubs without an EventEmitter still work.
        if (typeof res.on === 'function') {
            res.on('finish', () => {
                if (!settled) {
                    store.release(recordKey).catch(() => {});
                }
            });
        }

        next();
    };
}

module.exports = idempotency;
module.exports._prismaStore = prismaStore; // exposed for tests
module.exports.TTL_MS = TTL_MS;
module.exports.INFLIGHT_TTL_MS = INFLIGHT_TTL_MS;
