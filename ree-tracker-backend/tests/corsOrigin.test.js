import { describe, it, expect } from 'vitest';

const { makeOriginCheck } = require('../src/utils/corsOrigin');

const ALLOWED = ['https://app.example.com', 'http://localhost:5173'];

function check(fn, origin) {
    let result = null;
    fn(origin, (err, allow) => { result = { err, allow }; });
    return result;
}

describe('makeOriginCheck', () => {
    it('always allows requests with no Origin header (curl, health checks)', () => {
        const strict = makeOriginCheck(ALLOWED, { strict: true });
        expect(check(strict, undefined).allow).toBe(true);
        expect(check(strict, '').allow).toBe(true);
    });

    it('allows whitelisted origins in strict mode', () => {
        const strict = makeOriginCheck(ALLOWED, { strict: true });
        expect(check(strict, 'https://app.example.com').allow).toBe(true);
        expect(check(strict, 'http://localhost:5173').allow).toBe(true);
    });

    it('REJECTS unknown origins in strict mode (the old code allowed everything)', () => {
        const strict = makeOriginCheck(ALLOWED, { strict: true });
        expect(check(strict, 'https://evil.example').allow).toBe(false);
        expect(check(strict, 'https://evil.example').err).toBe(null);
    });

    it('allows unknown origins only in permissive (dev) mode', () => {
        const dev = makeOriginCheck(ALLOWED, { strict: false });
        expect(check(dev, 'https://evil.example').allow).toBe(true);
    });
});
