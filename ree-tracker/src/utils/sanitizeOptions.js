// src/utils/sanitizeOptions.js
// Multiple-choice options sometimes arrive with a baked-in enumerator label
// ("A.", "b)", "(C)", "D:") — usually from the AI generator. The quiz UI
// (QuestionCard) renders its own A/B/C/D label, so a baked-in prefix shows up
// twice ("A. A. …"). These helpers strip a SINGLE leading label so the option
// text — and the matching answer string — stays clean.
//
// We deliberately do NOT treat a bare hyphen as a separator: that would risk
// mangling legitimate answer text like "A - B path" and, worse, break the
// exact-string match the grader relies on (isCorrect = option === answer).

export const CHOICE_PREFIX = /^\s*[([]?\s*[A-Da-d]\s*[)\].:]\s+/;

export const stripChoicePrefix = (value) => {
    if (typeof value !== 'string') return value;
    const stripped = value.replace(CHOICE_PREFIX, '').trim();
    // Never let sanitisation empty out a value — fall back to the trimmed original.
    return stripped.length > 0 ? stripped : value.trim();
};

export const sanitizeOptions = (options) =>
    Array.isArray(options) ? options.map(stripChoicePrefix) : options;

// Cleans a generated question: strips prefixes from every option AND from the
// answer, preserving the "answer exactly equals one option" invariant.
export const sanitizeGeneratedQuestion = (q) => {
    if (!q || typeof q !== 'object') return q;
    return {
        ...q,
        ...(q.options !== undefined ? { options: sanitizeOptions(q.options) } : {}),
        ...(q.answer !== undefined ? { answer: stripChoicePrefix(q.answer) } : {}),
    };
};

export const sanitizeGeneratedBatch = (items) =>
    Array.isArray(items) ? items.map(sanitizeGeneratedQuestion) : items;
