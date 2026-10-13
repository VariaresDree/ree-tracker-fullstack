const { z } = require('zod');
const { TASK_IDS } = require('../config/aiModels');

// POST /api/ai/generate. The server picks the model from the task's chain
// (config/aiModels); a client-supplied `model` used to override the tier list
// and let any signed-in user target arbitrary models on the shared key. It is
// no longer read, and `.strip()` drops it.
//
// `contents` is a prompt string, or [prompt, ...imageParts] for image
// extraction. `system` is an optional system prompt. `config` is the old
// options bag; only temperature and maxOutputTokens are honoured, bounded.
const aiGenerateSchema = z.object({
    task: z.enum(TASK_IDS).optional(),
    contents: z.union([
        z.string().min(1).max(600_000),
        z.array(z.any()).min(1).max(50),
    ]),
    system: z.string().max(20_000).optional(),
    json: z.boolean().optional(),
    config: z.object({
        temperature: z.number().min(0).max(2).optional(),
        maxOutputTokens: z.number().int().min(16).max(16_000).optional(),
    }).passthrough().optional(),
}).strip();

module.exports = { aiGenerateSchema };
