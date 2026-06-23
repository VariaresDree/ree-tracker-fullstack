import { describe, it, expect, beforeEach } from 'vitest';

const idempotency = require('../src/middlewares/idempotency');

// Express-style request/response stub small enough to fit a unit test.
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

describe('idempotency middleware', () => {
    beforeEach(() => {
        // Each test starts with a clean cache.
        idempotency._store.clear();
    });

    it('passes through when no Idempotency-Key header is set', () => {
        const { req, res } = makeReqRes({});
        let called = false;
        idempotency()(req, res, () => { called = true; });
        expect(called).toBe(true);
    });

    it('caches the first response and replays it on the second call', async () => {
        const { req, res } = makeReqRes({ key: 'abc123', body: { x: 1 } });
        idempotency()(req, res, () => {
            res.status(200).json({ ok: true, count: 1 });
        });
        expect(res.body).toEqual({ ok: true, count: 1 });

        const second = makeReqRes({ key: 'abc123', body: { x: 1 } });
        let nextCalled = false;
        idempotency()(second.req, second.res, () => { nextCalled = true; });
        expect(nextCalled).toBe(false); // short-circuited
        expect(second.res.body).toEqual({ ok: true, count: 1 });
        expect(second.res.headers['Idempotency-Replay']).toBe('true');
    });

    it('scopes by userId so different users with the same key do not collide', () => {
        const first = makeReqRes({ key: 'k', userId: 'u1' });
        idempotency()(first.req, first.res, () => first.res.status(201).json({ who: 'u1' }));

        const second = makeReqRes({ key: 'k', userId: 'u2' });
        let nextCalled = false;
        idempotency()(second.req, second.res, () => { nextCalled = true; second.res.status(201).json({ who: 'u2' }); });
        expect(nextCalled).toBe(true);
        expect(second.res.body).toEqual({ who: 'u2' });
    });

    it('rejects oversized keys silently (passes through)', () => {
        const { req, res } = makeReqRes({ key: 'x'.repeat(201) });
        let called = false;
        idempotency()(req, res, () => { called = true; });
        expect(called).toBe(true);
    });
});
