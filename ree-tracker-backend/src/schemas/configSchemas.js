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

// Admin › Syllabus (PUT /api/admin/board-blueprint): every subject, always. Whether
// the topics exist and belong is blueprintError's check, against the live table.
const boardGroups = z.array(z.object({
    items: z.number().int().min(0).max(1000),
    topicIds: z.array(z.string().min(1).max(64)).min(1).max(100),
}).strict()).max(100);
const boardBlueprintSchema = z.object({ Mathematics: boardGroups, ESAS: boardGroups, EE: boardGroups }).strict();

module.exports = { featureFlagSchema, boardBlueprintSchema };
