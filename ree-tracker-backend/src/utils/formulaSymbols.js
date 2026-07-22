// src/utils/formulaSymbols.js
// Pragmatic LaTeX symbol extraction for the reference-card "variables must
// cover every symbol in the expression" gate. This is a heuristic, not a LaTeX
// parser: it strips known commands/operators/units and collects the remaining
// identifier tokens (latin letters with optional subscripts, plus greek-letter
// commands). Known mathematical constants (π, e, ∞) never require a variables
// entry, and the card's own `symbol` (the defined quantity) is excluded by the
// caller. When extraction finds nothing parseable the coverage check FAILS OPEN
// — the non-empty-variables requirement still applies separately.

// Constants/decoration that never need a variables entry.
const SYMBOL_STOPLIST = new Set(['pi', 'e', 'infty', 'deg', 'degree', 'd']);

const GREEK =
    'alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|rho|varrho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Sigma|Upsilon|Phi|Psi|Omega';

// Commands whose NAME is not a variable (structure, operators, functions).
const COMMAND_STRIP =
    /\\(frac|sqrt|left|right|cdot|times|div|pm|mp|sum|prod|int|oint|lim|log|ln|lg|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|sinh|cosh|tanh|exp|max|min|angle|overline|underline|vec|hat|bar|dot|ddot|tilde|approx|equiv|neq|leq|geq|to|infty|partial|nabla|quad|qquad|text|mathrm|mathbf|mathit|operatorname)\b/g;

/** Canonical comparison form: strip LaTeX plumbing, braces, subscripts, case. */
function normalizeSymbol(s) {
    return String(s || '')
        .replace(/\\/g, '')
        .replace(/[{}\s_$^]/g, '')
        .toLowerCase();
}

/**
 * Extract the variable-ish symbols from a LaTeX expression. Returns an array of
 * RAW tokens (e.g. ['X_c', 'f', 'C', '\\omega']) — compare via normalizeSymbol.
 */
function extractFormulaSymbols(latex) {
    if (typeof latex !== 'string' || latex.trim().length === 0) return [];
    let s = latex;
    s = s.replace(/\$+/g, ' ');
    // Drop \text{...}/\mathrm{...} CONTENT (units, labels) before command strip.
    s = s.replace(/\\(?:text|mathrm|operatorname)\s*\{[^}]*\}/g, ' ');
    const symbols = new Set();

    // Greek-letter commands are variables (π et al. filtered by the stoplist).
    const greekRe = new RegExp('\\\\(' + GREEK + ')\\b', 'g');
    let m;
    while ((m = greekRe.exec(s)) !== null) {
        if (!SYMBOL_STOPLIST.has(m[1].toLowerCase())) symbols.add('\\' + m[1]);
    }
    s = s.replace(greekRe, ' ');
    s = s.replace(COMMAND_STRIP, ' ');
    s = s.replace(/\\[a-zA-Z]+/g, ' '); // any remaining unknown commands

    // Latin identifiers: subscripted tokens stay whole (X_c, V_{LL}); bare
    // multi-letter runs split into single letters (V=IR → I, R — standard
    // implicit-multiplication convention).
    const identRe = /([A-Za-z]+)(_\{[^}]*\}|_[A-Za-z0-9]+)?/g;
    while ((m = identRe.exec(s)) !== null) {
        const [_, letters, subscript] = m;
        if (subscript) {
            symbols.add(letters + subscript);
        } else {
            for (const ch of letters) {
                if (!SYMBOL_STOPLIST.has(ch.toLowerCase())) symbols.add(ch);
            }
        }
    }
    return [...symbols];
}

/**
 * Does `variables` ([{symbol,...}]) cover every symbol in `formulaLatex`?
 * `ownSymbol` (the card's defined quantity, e.g. the X_c in X_c = …) is
 * exempt. Returns { ok, missing: [rawToken] }. Fails open on unparseable input.
 */
function checkVariableCoverage(formulaLatex, variables, ownSymbol) {
    const extracted = extractFormulaSymbols(formulaLatex);
    if (extracted.length === 0) return { ok: true, missing: [] };
    const declared = new Set(
        (Array.isArray(variables) ? variables : []).map((v) => normalizeSymbol(v?.symbol)).filter(Boolean),
    );
    const own = normalizeSymbol(ownSymbol);
    const missing = extracted.filter((raw) => {
        const norm = normalizeSymbol(raw);
        if (!norm || SYMBOL_STOPLIST.has(norm)) return false;
        if (own && norm === own) return false;
        return !declared.has(norm);
    });
    return { ok: missing.length === 0, missing };
}

module.exports = { extractFormulaSymbols, normalizeSymbol, checkVariableCoverage, SYMBOL_STOPLIST };
