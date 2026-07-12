const { z } = require('zod');
const { MODEL_TIERS } = require('../config/aiModels');

// POST /api/ai/generate was the one AI route with no validate(): the body was
// destructured raw and a client-supplied `model` overrode the server tier list,
// letting any authed user target arbitrary Gemini models and send unbounded
// payloads (cost/quota abuse on the shared key). Legit clients (geminiApi.js)
// never send `model` at all — it's pure attack surface — so we allowlist it to
// the same MODEL_TIERS the route falls back to, and bound `contents`.
//
// `contents` is either a prompt string (callAI) or a [prompt, ...imageParts]
// array (vision ingestion). `config` is a small options bag (temperature, …) —
// left unconstrained in shape but present-optional. Overall body size is still
// capped by the express json limit.
const ALLOWED_MODELS = new Set(MODEL_TIERS);

const aiGenerateSchema = z.object({
    model: z.string().refine((m) => ALLOWED_MODELS.has(m), 'Unsupported model').optional(),
    contents: z.union([
        z.string().min(1).max(600_000),
        z.array(z.any()).min(1).max(50),
    ]),
    config: z.record(z.string(), z.any()).optional(),
}).strip();

module.exports = { aiGenerateSchema };
