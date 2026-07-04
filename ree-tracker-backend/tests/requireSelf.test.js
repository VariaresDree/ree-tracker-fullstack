import { describe, it, expect } from 'vitest';

const { requireSelf } = require('../src/middlewares/requireSelf');

function run(mw, { userId, params }) {
    const req = { user: userId ? { id: userId } : undefined, params };
    const res = {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
    };
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    return { res, nextCalled };
}

describe('requireSelf', () => {
    it('calls next() when the param matches the authenticated user', () => {
        const { nextCalled } = run(requireSelf('uid'), { userId: 'u1', params: { uid: 'u1' } });
        expect(nextCalled).toBe(true);
    });

    it('returns 403 when requesting another user\'s data (IDOR)', () => {
        const { res, nextCalled } = run(requireSelf('uid'), { userId: 'u1', params: { uid: 'u2' } });
        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(403);
    });

    it('returns 403 when auth context is missing entirely', () => {
        const { res, nextCalled } = run(requireSelf('uid'), { userId: null, params: { uid: 'u1' } });
        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(403);
    });
});
