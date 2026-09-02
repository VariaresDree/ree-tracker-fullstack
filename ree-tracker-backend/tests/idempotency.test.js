import { describe, it, expect, beforeEach } from 'vitest';

const idempotency = require('../src/middlewares/idempotency');

// In-memory double for the Postgres store. It implements the SAME
// insert-or-lose contract the real one gets from a unique primary key, so these
// tests exercise the middleware's decision logic without a database.
function makeStore() {
    const rows = new Map(); // key -> { key, userId, status, httpStatus, response, createdAt, updatedAt }
    return {
        rows,
        failNext: false,
        async claim(key, userId) {
            if (this.failNext) { this.failNext = false; throw new Error('store down'); }
            const existing = rows.get(key);
            if (!existing) {
                const now = new Date();
                rows.set(key, { key, userId, status: 'IN_FLIGHT', createdAt: now, updatedAt: now });
                return { claimed: true };
            }
            if (existing.status === 'DONE') return { claimed: false, record: existing };
            const staleBefore = new Date(Date.now() - idempotency.INFLIGHT_TTL_MS);
            if (existing.updatedAt < staleBefore) {
                existing.updatedAt = new Date();
                existing.userId = userId;
                return { claimed: true };
            }
            return { claimed: false, record: existing };
        },
        async complete(key, httpStatus, response) {
            const row = rows.get(key);
            if (row) Object.assign(row, { status: 'DONE', httpStatus, response, updatedAt: new Date() });
        },
        async release(key) {
            const row = rows.get(key);
            if (row && row.status === 'IN_FLIGHT') rows.delete(key);
        },
        async sweep() {},
    };
}

function makeReqRes({ key, body, userId = 'u1', url = '/api/x', method = 'POST' }) {
    const req = {
        headers: key ? { 'idempotency-key': key } : {},
        user: { id: userId },
        originalUrl: url,
        method,
        body,
    };
    const res = {
        statusCode: 200,
        headers: {},
        body: null,
        set(name, value) { this.headers[name] = value; },
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
    };
    return { req, res };
}

let store;
let mw;
beforeEach(() => {
    store = makeStore();
    mw = idempotency({ store });
});

describe('idempotency middleware', () => {
    it('passes through when no Idempotency-Key header is set', async () => {
        const { req, res } = makeReqRes({});
        let called = false;
        await mw(req, res, () => { called = true; });
        expect(called).toBe(true);
    });

    it('records the first response and replays it on the second call', async () => {
        const first = makeReqRes({ key: 'abc123', body: { x: 1 } });
        await mw(first.req, first.res, () => { first.res.status(200).json({ ok: true, count: 1 }); });
        expect(first.res.body).toEqual({ ok: true, count: 1 });

        const second = makeReqRes({ key: 'abc123', body: { x: 1 } });
        let nextCalled = false;
        await mw(second.req, second.res, () => { nextCalled = true; });
        expect(nextCalled).toBe(false); // short-circuited — the handler never ran twice
        expect(second.res.body).toEqual({ ok: true, count: 1 });
        expect(second.res.headers['Idempotency-Replay']).toBe('true');
    });

    it('scopes the key by user, so two users with the same key do not collide', async () => {
        const a = makeReqRes({ key: 'same', userId: 'u1' });
        await mw(a.req, a.res, () => { a.res.status(200).json({ owner: 'u1' }); });

        const b = makeReqRes({ key: 'same', userId: 'u2' });
        let ran = false;
        await mw(b.req, b.res, () => { ran = true; b.res.status(200).json({ owner: 'u2' }); });
        expect(ran).toBe(true);
        expect(b.res.body).toEqual({ owner: 'u2' });
    });

    it('scopes the key by route', async () => {
        const a = makeReqRes({ key: 'same', url: '/api/one' });
        await mw(a.req, a.res, () => { a.res.status(200).json({ from: 'one' }); });

        const b = makeReqRes({ key: 'same', url: '/api/two' });
        let ran = false;
        await mw(b.req, b.res, () => { ran = true; b.res.status(200).json({ from: 'two' }); });
        expect(ran).toBe(true);
    });

    it('does NOT record a failure response, so a corrected retry can run', async () => {
        const first = makeReqRes({ key: 'bad', body: {} });
        await mw(first.req, first.res, () => { first.res.status(400).json({ error: 'nope' }); });

        const second = makeReqRes({ key: 'bad', body: {} });
        let ran = false;
        await mw(second.req, second.res, () => { ran = true; second.res.status(200).json({ ok: true }); });
        // Caching the 400 would have replayed a stale validation error for the
        // whole TTL, so a fixed retry with the same key kept getting the failure.
        expect(ran).toBe(true);
        expect(second.res.body).toEqual({ ok: true });
    });

    it('409s a duplicate that arrives while the first is still in flight', async () => {
        const first = makeReqRes({ key: 'slow' });
        await mw(first.req, first.res, () => { /* handler still running — never responds */ });

        const second = makeReqRes({ key: 'slow' });
        let ran = false;
        await mw(second.req, second.res, () => { ran = true; });
        expect(ran).toBe(false);
        expect(second.res.statusCode).toBe(409);
    });

    it('lets a later request take over a reservation left by a crashed handler', async () => {
        const first = makeReqRes({ key: 'crashed' });
        await mw(first.req, first.res, () => { /* dies without responding */ });

        // Age the reservation past the in-flight ceiling.
        const row = store.rows.get('u1|POST|/api/x|crashed');
        row.updatedAt = new Date(Date.now() - idempotency.INFLIGHT_TTL_MS - 1000);

        const second = makeReqRes({ key: 'crashed' });
        let ran = false;
        await mw(second.req, second.res, () => { ran = true; second.res.status(200).json({ ok: true }); });
        // Otherwise a crashed handler would wedge the key permanently now that
        // the store outlives the process.
        expect(ran).toBe(true);
    });

    it('survives a process restart: a DONE record still replays', async () => {
        const first = makeReqRes({ key: 'durable' });
        await mw(first.req, first.res, () => { first.res.status(201).json({ id: 'session-1' }); });

        // Simulate a cold start — a NEW middleware instance, same durable store.
        // The old in-process Map lost everything here, so the retry re-executed
        // the handler and created a second ExamSession.
        const rebooted = idempotency({ store });
        const second = makeReqRes({ key: 'durable' });
        let ran = false;
        await rebooted(second.req, second.res, () => { ran = true; });
        expect(ran).toBe(false);
        expect(second.res.statusCode).toBe(201);
        expect(second.res.body).toEqual({ id: 'session-1' });
    });

    it('fails OPEN when the store is unavailable', async () => {
        store.failNext = true;
        const { req, res } = makeReqRes({ key: 'store-down' });
        let ran = false;
        await mw(req, res, () => { ran = true; });
        // A store outage means the database is down and the handler will fail on
        // its own merits; blocking here would turn a degraded dependency into a
        // hard outage.
        expect(ran).toBe(true);
    });

    it('releases the key when a response finishes without res.json', async () => {
        const listeners = {};
        const { req, res } = makeReqRes({ key: 'ended' });
        res.on = (evt, fn) => { listeners[evt] = fn; };

        await mw(req, res, () => { /* handler uses res.end() */ });
        listeners.finish();
        await new Promise((r) => setImmediate(r));

        const second = makeReqRes({ key: 'ended' });
        let ran = false;
        await mw(second.req, second.res, () => { ran = true; });
        expect(ran).toBe(true);
    });
});
