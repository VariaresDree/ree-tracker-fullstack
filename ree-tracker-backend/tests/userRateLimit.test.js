import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';

// The request budget per signed-in learner (middlewares/userRateLimit.js).
// The global limiter counts by address, before sign-in, so a class on one
// Wi-Fi used to share one budget; this one counts each verified account.

const { createUserLimiter, countOnce } = require('../src/middlewares/userRateLimit');

/** An app whose "auth" trusts a header, then counts the request (twice over, as a route behind two auth layers would). */
function makeApp(limiter) {
    const app = express();
    const limit = countOnce(limiter);
    const fakeAuth = (req, res, next) => {
        req.user = { id: req.headers['x-user'] };
        return limit(req, res, next);
    };
    app.get('/thing', fakeAuth, fakeAuth, (req, res) => res.json({ ok: true }));
    return app;
}

describe('the per-learner request budget', () => {
    it('gives each learner their own budget, whatever address they share', async () => {
        const app = makeApp(createUserLimiter({ max: 2, skip: () => false }));
        const as = (uid) => request(app).get('/thing').set('x-user', uid);
        expect((await as('ana')).status).toBe(200);
        expect((await as('ana')).status).toBe(200);
        const over = await as('ana');
        expect(over.status).toBe(429);
        expect(over.body).toEqual({ error: 'Too many requests. Try again in a few minutes.' });
        // Same address, another learner: untouched.
        expect((await as('ben')).status).toBe(200);
    });

    it('counts a request once, even behind two auth layers', async () => {
        const app = makeApp(createUserLimiter({ max: 3, skip: () => false }));
        for (let i = 0; i < 3; i += 1) expect((await request(app).get('/thing').set('x-user', 'cy')).status).toBe(200);
        expect((await request(app).get('/thing').set('x-user', 'cy')).status).toBe(429);
    });

    it('is off under test by default, where suites send many requests as one user', async () => {
        const app = makeApp(createUserLimiter({ max: 1 }));
        for (let i = 0; i < 3; i += 1) expect((await request(app).get('/thing').set('x-user', 'dee')).status).toBe(200);
    });
});
