// src/utils/corsOrigin.js
// Builds the `origin` callback for the cors middleware. Extracted so the
// allow/deny logic is unit-testable without booting Express.
//
// strict mode (FRONTEND_URL set): unknown origins get cb(null, false) —
// the request still executes but receives no CORS headers, so browsers
// block the response. No thrown error, so no 500 noise in logs.
// non-strict (dev, FRONTEND_URL unset): everything is allowed.
const makeOriginCheck = (allowedOrigins, { strict } = { strict: false }) => (origin, cb) => {
    // Non-browser clients (curl, health checks, same-origin) send no Origin.
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, !strict);
};

module.exports = { makeOriginCheck };
