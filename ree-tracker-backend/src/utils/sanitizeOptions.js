// src/utils/sanitizeOptions.js
// Re-export shim — the implementation now lives in @ree/shared (src/text.js).
//
// The shared version carries the null guard THIS copy had dropped. It is wired
// as a Zod .transform() (questionSchemas.js:53, :78), so it runs inside
// validate() and OUTSIDE any route try/catch — a throw there surfaces as an
// opaque 500 instead of a 400. The client twin kept the guard; the copy more
// exposed to hostile input did not.
const {
    CHOICE_PREFIX,
    stripChoicePrefix,
    sanitizeOptions,
    sanitizeQuestionShape,
} = require('@ree/shared');

module.exports = { CHOICE_PREFIX, stripChoicePrefix, sanitizeOptions, sanitizeQuestionShape };
