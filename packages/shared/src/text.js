// Question/reference-card text normalisation — the single definition.
//
// Two rules that had client and server copies, fixable only twice:
//
// 1. withMathDelimiters. The two implementations were semantically identical but
//    textually separate, applied at different layers (server at the write choke
//    point, client at render). Keeping both layers is deliberate belt-and-
//    suspenders; keeping two IMPLEMENTATIONS meant a fix could land on one side
//    only, with no test or check to catch it.
//
// 2. sanitizeOptions / stripChoicePrefix. The cores were identical, but the
//    exported wrappers had drifted: the client guarded against a null input
//    (`if (!q || typeof q !== 'object') return q`) and the backend copy did not
//    — on the copy that is MORE exposed to hostile input, and where it runs
//    inside a Zod .transform(), i.e. outside any route try/catch. A null at that
//    node would throw synchronously in the validate() middleware and surface as
//    an opaque 500 instead of a 400. The guard is kept here.
//
//    The API surfaces had also diverged: the client exported
//    sanitizeGeneratedQuestion/sanitizeGeneratedBatch, the server exported
//    sanitizeQuestionShape. Same concept, two names, two shapes — so a fix could
//    not be ported mechanically. Both names are exported here, with the server's
//    as an alias, so neither side has to change its call sites to adopt this.

'use strict';

// ── Math delimiters ─────────────────────────────────────────────────────────

const MATH_CONTROL_CHARS_RE = /[\\^_{}]/;

/**
 * Wrap bare LaTeX in inline `$` delimiters so remark-math will parse it.
 *
 * Wraps only when the value carries no delimiter of its own, so already-correct
 * content and block math ($$…$$) pass through untouched. Leaves plain prose
 * alone (no LaTeX control sequences) so a spelled-out value is not forced into
 * math italics on render.
 *
 * @param {unknown} value raw field value (may be null/undefined/non-string)
 * @returns {unknown} delimiter-safe string, or the input unchanged
 */
function withMathDelimiters(value) {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return value;
    if (trimmed.includes('$')) return value;
    if (!MATH_CONTROL_CHARS_RE.test(trimmed)) return value;
    return `$${trimmed}$`;
}

/**
 * True when a field leaves inline math open: an odd count of unescaped single
 * `$` once `$$` pairs are set aside. Everything after the stray `$` then
 * renders as LaTeX (a hand edit that typed `AB'$$` for `AB'$` did this).
 */
function hasUnbalancedMath(value) {
    if (typeof value !== 'string') return false;
    const singles = value.replace(/\\\$/g, '').replace(/\$\$/g, '').match(/\$/g);
    return !!singles && singles.length % 2 === 1;
}

// ── Choice-prefix stripping ─────────────────────────────────────────────────

// Multiple-choice options sometimes arrive with a baked-in enumerator label
// ("A.", "b)", "(C)", "D:") — usually from the AI generator. QuestionCard renders
// its own A/B/C/D label, so a baked-in prefix shows up twice ("A. A. …").
//
// A bare hyphen is deliberately NOT treated as a separator: that would mangle
// legitimate text like "A - B path" and, worse, break the exact-string match the
// grader relies on (isCorrect = option === answer).
const CHOICE_PREFIX = /^\s*[([]?\s*[A-Da-d]\s*[)\].:]\s+/;

function stripChoicePrefix(value) {
    if (typeof value !== 'string') return value;
    const stripped = value.replace(CHOICE_PREFIX, '').trim();
    // Never let sanitisation empty out a value — fall back to the trimmed original.
    return stripped.length > 0 ? stripped : value.trim();
}

function sanitizeOptions(options) {
    return Array.isArray(options) ? options.map(stripChoicePrefix) : options;
}

// ── Matching a key to its option ────────────────────────────────────────────

// Grading compares the key with the chosen option's text exactly, so a key
// that differs from its option only in form can never be marked right. The
// live bank had four: the option was "$1 - k^3$" and the key "1 - k^3"
// (models drop the math delimiters), or the key lost the option's closing
// "$" or full stop. These are the differences that never change meaning:
// a choice label, `$` delimiters, spacing, a closing full stop. Letter case
// is not one of them: "10 MA" and "10 mA" are different currents.
const keyForm = (s) => stripChoicePrefix(s)
    .replace(/\$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.$/, '')
    .trim();

/**
 * The option `answer` names: the option itself when it matches exactly, else
 * the one option equal to it up to form (keyForm). Null when none matches, or
 * when two options do (the question has duplicate choices, and picking one
 * would be a guess).
 */
function matchOption(answer, options) {
    if (typeof answer !== 'string' || !Array.isArray(options)) return null;
    if (options.includes(answer)) return answer;
    const want = keyForm(answer);
    if (!want) return null;
    const hits = options.filter((o) => typeof o === 'string' && keyForm(o) === want);
    return hits.length === 1 ? hits[0] : null;
}

/**
 * Clean a generated question: strip prefixes from every option AND from the
 * answer, preserving the "answer exactly equals one option" invariant (a key
 * that matches an option only up to form takes that option's text).
 */
function sanitizeGeneratedQuestion(q) {
    // The guard the backend copy was missing. It runs inside a Zod .transform(),
    // outside any route try/catch, so throwing here becomes a 500, not a 400.
    if (!q || typeof q !== 'object') return q;
    const options = q.options !== undefined ? sanitizeOptions(q.options) : undefined;
    let answer = q.answer !== undefined ? stripChoicePrefix(q.answer) : undefined;
    if (typeof answer === 'string' && Array.isArray(options)) answer = matchOption(answer, options) ?? answer;
    return {
        ...q,
        ...(options !== undefined ? { options } : {}),
        ...(answer !== undefined ? { answer } : {}),
    };
}

function sanitizeGeneratedBatch(items) {
    return Array.isArray(items) ? items.map(sanitizeGeneratedQuestion) : items;
}

module.exports = {
    withMathDelimiters,
    hasUnbalancedMath,
    MATH_CONTROL_CHARS_RE,
    CHOICE_PREFIX,
    stripChoicePrefix,
    sanitizeOptions,
    matchOption,
    sanitizeGeneratedQuestion,
    sanitizeGeneratedBatch,
    // Backend's historical name for sanitizeGeneratedQuestion.
    sanitizeQuestionShape: sanitizeGeneratedQuestion,
};
