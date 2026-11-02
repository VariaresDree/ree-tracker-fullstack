// src/utils/mathIssues.js
//
// Math that won't show properly, found before a person or a learner meets it
// in red: KaTeX is asked to render each formula the way LatexRenderer would.
import katex from 'katex';
import { normalizeMathDelimiters, pesoInMath, PESO_MACRO } from './mathDelimiters';

const MATH = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
const SWALLOWED = /[\f\b]|[\t\r][a-zA-Z]/;

/** Readable problems with the math in `text`; an empty list means it is fine. */
export function mathIssues(text) {
  if (typeof text !== 'string' || !text) return [];
  if (SWALLOWED.test(text)) return ['Damaged LaTeX: a command lost its backslash'];
  const issues = [];
  for (const match of pesoInMath(normalizeMathDelimiters(text)).matchAll(MATH)) {
    const formula = (match[1] ?? match[2]).trim();
    try {
      katex.renderToString(formula, { throwOnError: true, strict: 'ignore', macros: { '\\peso': PESO_MACRO } });
    } catch {
      issues.push(`Math that won't render: ${formula.slice(0, 40)}`);
    }
  }
  return issues;
}
