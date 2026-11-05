// A token that has simply expired is routine: Firebase tokens last an hour and
// the client retries once with a fresh one. Only error-level lines reach Admin ›
// App health, so expiry has to stay out of them, and a real failure has to stay in.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// See questionRoutes.authz.test.js for why the patch comes before the requires.
const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const logger = require('../src/utils/logger');
const authMiddleware = require('../src/middlewares/authMiddleware');

const failedRequest = async (error) => {
    verifyIdToken.mockRejectedValue(error);
    const res = { status: vi.fn(() => res), json: vi.fn(() => res) };
    const next = vi.fn();
    await authMiddleware({ headers: { authorization: 'Bearer stale' }, originalUrl: '/api/analytics/telemetry-bulk?x=1' }, res, next);
    return { res, next };
};

describe('authMiddleware, when a token is refused', () => {
    let warn;
    let error;
    beforeEach(() => {
        warn = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
        error = vi.spyOn(logger, 'error').mockImplementation(() => logger);
    });
    afterEach(() => vi.restoreAllMocks());

    it('treats an expired token as routine: a 401 and a warning, not an error', async () => {
        const { res, next } = await failedRequest(Object.assign(new Error('Firebase ID token has expired.'), { code: 'auth/id-token-expired' }));

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).not.toHaveBeenCalled();
    });

    it('still reports any other failure as an error, with the page App health reads', async () => {
        const { res } = await failedRequest(Object.assign(new Error('Decoding Firebase ID token failed.'), { code: 'auth/argument-error' }));

        expect(res.status).toHaveBeenCalledWith(401);
        expect(warn).not.toHaveBeenCalled();
        expect(error).toHaveBeenCalledWith('Auth verification failed', {
            path: '/api/analytics/telemetry-bulk?x=1',
            error: 'Decoding Firebase ID token failed.',
        });
    });
});
