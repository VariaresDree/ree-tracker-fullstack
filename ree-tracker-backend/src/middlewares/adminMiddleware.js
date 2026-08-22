// Admin gate. Runs *after* authMiddleware — assumes req.user is set.
//
// This used to be a SECOND, independent implementation of the same rule as
// middlewares/roleMiddleware.js: same check, different cache behaviour, and a
// Map that grew unbounded for the process lifetime. It is now a thin alias so
// there is exactly one admin gate to reason about (and to fix).
const { requireAdmin } = require('./roleMiddleware');

module.exports = requireAdmin;
