// src/utils/mathDelimiters.js
// Defensive math delimiters — backend counterpart to the frontend's
// ree-tracker/src/utils/mathDelimiters.js (same algorithm, kept as a separate
// implementation since the two apps don't share a bundler).
//
// remark-math (the client render pipeline) only parses an expression wrapped in
// $…$ or $$…$$. The AI reference-card generator is prompted to emit
// `formulaLatex` WITHOUT delimiters while `valueUnit` is asked for WITH them —
// and live data showed the model omits them in both cases regardless. The
// frontend's LatexRenderer/Flashcard already wrap defensively at RENDER time
// (belt), but every row written before that existed — and every row written by
// any future non-web client — still has bare LaTeX sitting in the database.
// Normalizing here, at the single write choke point (toCardData in
// referenceCardRoutes.js), stops the DB from accumulating both shapes going
// forward. It intentionally does NOT replace the render-time defense — this is
// belt AND suspenders, not belt instead of suspenders.

const MATH_CONTROL_CHARS_RE = /[\\^_{}]/;

/**
 * Wrap bare LaTeX in inline `$` delimiters so remark-math will parse it.
 *
 * Wraps only when the value carries no delimiter of its own, so already-correct
 * content and block math ($$…$$) pass through untouched. Leaves plain prose
 * alone (no LaTeX control sequences) so a spelled-out value isn't forced into
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

module.exports = { withMathDelimiters };
