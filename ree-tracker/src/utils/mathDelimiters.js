// src/utils/mathDelimiters.js
// Defensive math delimiters for the LaTeX render path.
//
// remark-math only recognizes an expression when it is wrapped in `$…$` (inline)
// or `$$…$$` (block). Several producers hand us BARE LaTeX with no delimiters —
// notably the AI reference-card generator, which is prompted to emit
// `formulaLatex` as `X_c = \frac{1}{2\pi f C}` (no `$`). Passing that straight to
// LatexRenderer renders the SOURCE as literal text on screen, which in an exam
// app reads as a wrong formula.
//
// Lives in utils/ rather than alongside LatexRenderer so the component file only
// exports components (react-refresh/only-export-components).

/**
 * Wrap bare LaTeX in inline `$` delimiters so remark-math will parse it.
 *
 * Wraps only when the value carries no delimiter of its own, so already-correct
 * content (`$8.854\times10^{-12}$ F/m`) and block math (`$$…$$`) pass through
 * untouched. Prefer this over hand-rolling the check per call site — the bug
 * class it prevents is "someone forgot", so the default has to be the safe one.
 *
 * @param {unknown} value raw field value (may be null/undefined/non-string)
 * @returns {unknown} delimiter-safe string, or the input unchanged
 */
export const withMathDelimiters = (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return value;
    // Already carries a delimiter — respect the author's intent verbatim.
    if (trimmed.includes('$')) return value;
    // No control sequences, sub/superscripts or braces → this is prose (e.g. a
    // spelled-out unit like "meters"); wrapping would force it into math italics.
    if (!/[\\^_{}]/.test(trimmed)) return value;
    return `$${trimmed}$`;
};
