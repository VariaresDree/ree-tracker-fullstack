// src/utils/sanitizeOptions.js
// Server-side mirror of the frontend src/utils/sanitizeOptions.js. Strips a
// single leading answer-choice label ("A.", "b)", "(C)", "D:") from option and
// answer text so the quiz UI's own A/B/C/D labels don't render twice. This is
// the authoritative safety net: it runs on every POST (via the Zod transform)
// and PUT, covering AI, vision, and manual ingestion paths alike.
//
// Bare hyphens are intentionally NOT treated as separators — that would risk
// mangling legitimate answers like "A - B path" and break exact-match grading.

const CHOICE_PREFIX = /^\s*[([]?\s*[A-Da-d]\s*[)\].:]\s+/;

const stripChoicePrefix = (value) => {
    if (typeof value !== 'string') return value;
    const stripped = value.replace(CHOICE_PREFIX, '').trim();
    return stripped.length > 0 ? stripped : value.trim();
};

const sanitizeOptions = (options) =>
    Array.isArray(options) ? options.map(stripChoicePrefix) : options;

// Returns a shallow copy of a question-like object with options/answer cleaned.
// Only touches keys that are present, so it is safe for partial (update) payloads.
const sanitizeQuestionShape = (q) => ({
    ...q,
    ...(q.options !== undefined ? { options: sanitizeOptions(q.options) } : {}),
    ...(q.answer !== undefined ? { answer: stripChoicePrefix(q.answer) } : {}),
});

module.exports = { CHOICE_PREFIX, stripChoicePrefix, sanitizeOptions, sanitizeQuestionShape };
