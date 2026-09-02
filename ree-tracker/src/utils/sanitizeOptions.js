// src/utils/sanitizeOptions.js
// Re-export shim — the implementation now lives in @ree/shared (src/text.js),
// shared with the API. The two copies had drifted in their exported wrappers:
// this side guarded against a null input and the backend side did not, on the
// copy that runs inside a Zod transform outside any try/catch.
export {
    CHOICE_PREFIX,
    stripChoicePrefix,
    sanitizeOptions,
    sanitizeGeneratedQuestion,
    sanitizeGeneratedBatch,
} from '@ree/shared';
