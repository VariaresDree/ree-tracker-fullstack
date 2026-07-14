// Shared Gemini model tier list. Extracted from aiRoutes so the request-
// validation schema (schemas/aiSchemas) can allowlist against the same source
// of truth without importing the route module (circular import).
//
// Real, currently-shipping, free-tier Gemini IDs ordered from most capable to
// lightest. Override at runtime via MODEL_TIERS env (comma-separated) so new
// Google IDs can be added without a redeploy.
const DEFAULT_MODEL_TIERS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
];

const MODEL_TIERS = (process.env.MODEL_TIERS
    ? process.env.MODEL_TIERS.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_MODEL_TIERS);

module.exports = { DEFAULT_MODEL_TIERS, MODEL_TIERS };
