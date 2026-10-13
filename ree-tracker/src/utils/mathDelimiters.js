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
