// src/utils/mathDelimiters.js
// Re-export shim — the implementation now lives in @ree/shared, shared with the
// API so a fix cannot land on one side only. Both layers of defence are kept
// deliberately (the server normalises at the write choke point, the client wraps
// again at render); what was wrong was having two IMPLEMENTATIONS of the rule.
export { withMathDelimiters, MATH_CONTROL_CHARS_RE } from '@ree/shared';
