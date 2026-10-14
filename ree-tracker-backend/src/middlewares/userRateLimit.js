// src/middlewares/userRateLimit.js
//
// The request budget per signed-in learner. The global limiter in server.js
// runs before sign-in, so it can only count by address: a review-centre class
// on one Wi-Fi (one address behind NAT) shared a single 300-request budget,
// and one busy screen could spend it for everyone. This one counts by the
// verified account instead; authMiddleware calls it right after the token
// checks out, so it never sees a forged identity. The address limit stays as
// a flood guard for traffic that never signs in.

const { rateLimit } = require('express-rate-limit');

const WINDOW_MS = 15 * 60 * 1000;

/** RATE_LIMIT_USER_MAX overrides the per-learner budget (default 300 per 15 minutes). */
function userMax() {
    const n = Number(process.env.RATE_LIMIT_USER_MAX);
    return n > 0 ? n : 300;
}

/**
 * A limiter keyed on `req.user.id`. Mount it only after the token is
 * verified. Skipped under test by default, where suites send many requests
 * as one user.
 */
function createUserLimiter({ max = userMax(), windowMs = WINDOW_MS, skip = () => process.env.NODE_ENV === 'test' } = {}) {
    return rateLimit({
        windowMs,
        limit: max,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => `user:${req.user.id}`,
        skip,
        message: { error: 'Too many requests. Try again in a few minutes.' },
    });
}

/**
 * Count each request against the signed-in learner, once: a route that runs
 * the auth middleware twice (a router mounted behind it, then its own) is
 * still one request.
 */
function countOnce(limiter) {
    return (req, res, next) => {
        if (req.userLimitCounted) return next();
        req.userLimitCounted = true;
        return limiter(req, res, next);
    };
}

const limitUser = countOnce(createUserLimiter());

module.exports = { createUserLimiter, countOnce, limitUser, userMax };
