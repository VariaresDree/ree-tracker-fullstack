// src/utils/mathDelimiters.js
// Re-export shim — the implementation now lives in @ree/shared (src/text.js),
// shared with the client so a fix cannot land on one side only.
//
// Both layers of defence are kept deliberately: the server normalises at the
// write choke point (toCardData in referenceCardRoutes.js) and the client wraps
// again at render. What was wrong was having two IMPLEMENTATIONS of the rule,
// with no test or check that would catch a one-sided fix.
const { withMathDelimiters, MATH_CONTROL_CHARS_RE } = require('@ree/shared');

module.exports = { withMathDelimiters, MATH_CONTROL_CHARS_RE };
