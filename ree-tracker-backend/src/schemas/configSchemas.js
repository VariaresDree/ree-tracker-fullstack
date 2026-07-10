// src/schemas/configSchemas.js
const { z } = require('zod');

// Feature-flag upsert body (PUT /api/config/flags/:key). `payload` is an
// arbitrary JSON blob for flag-specific config (rollout %, variant name, …) —
// size-capped by express.json body limits; structure is up to the consumer.
const featureFlagSchema = z.object({
    enabled: z.boolean(),
    payload: z.union([z.record(z.string(), z.any()), z.array(z.any()), z.string(), z.number(), z.boolean()]).nullable().optional(),
    description: z.string().max(500).nullable().optional(),
});

module.exports = { featureFlagSchema };
