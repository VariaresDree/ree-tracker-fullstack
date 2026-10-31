// src/utils/mathDelimiters.js
// Re-export shim — the implementation now lives in @ree/shared, shared with the
// API so a fix cannot land on one side only. Both layers of defence are kept
// deliberately (the server normalises at the write choke point, the client wraps
// again at render); what was wrong was having two IMPLEMENTATIONS of the rule.
export { withMathDelimiters, MATH_CONTROL_CHARS_RE } from '@ree/shared';

// remark-math only understands `$…$` and `$$…$$`, and treats `$$…$$` as display
// math only when the delimiters sit on their own lines. AI-written questions
// and solutions often use `\(…\)` and `\[…\]`, which markdown reads as escaped
// brackets and prints as raw source, and put `$$…$$` mid-line, which then
// renders as a cramped inline formula. Normalise both before parsing.
const toDisplay = (_, m) => `\n\n$$\n${m.trim()}\n$$\n\n`;
export function normalizeMathDelimiters(content) {
    let s = String(content);
    if (s.includes('\\[')) s = s.replace(/\\\[([\s\S]+?)\\\]/g, toDisplay);
    if (s.includes('\\(')) s = s.replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m.trim()}$`);
    if (s.includes('$$')) s = s.replace(/\$\$([\s\S]+?)\$\$/g, toDisplay);
    return s;
}

// KaTeX's fonts have no peso sign: "₱" inside math logs two warnings per
// render ("Unrecognized Unicode character", then "No character metrics") and
// prints in a fallback font. Inside $…$ it becomes the \peso macro
// (LatexRenderer's KaTeX options); outside math it is plain text and fine.
export const PESO_MACRO = String.raw`\mathrlap{\raisebox{0.3em}{\kern-0.1em\scriptsize =}}\mathrm{P}`;
export function pesoInMath(content) {
    const s = String(content);
    if (!s.includes('\u20B1')) return s;
    return s.replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g, (math) => math.replace(/\u20B1/g, String.raw`\peso{}`));
}
