// src/utils/questionChecks.js
//
// Mechanical checks on an AI-written question, shown as warnings in the admin
// preview before anything is saved. They catch what a model gets wrong in
// form (a key that matches no option, duplicate choices, a missing
// explanation); whether the physics is right is the answer check's job, and
// the reviewer's.

import { hasUnbalancedMath as unbalancedDollars } from '@ree/shared';
import { explanationSections, structureExplanation } from '@ree/shared/explanation';
import { mathIssues } from './mathIssues';

const BANNED_OPTION = /\b(all|none) of the above\b|\bboth [a-d] and [a-d]\b/i;

// The AI thinking aloud: it changed its mind partway, so the options, the key
// and the working may no longer agree. (A real Gemini reply ended "Let's adjust
// option choices" with a key of 1106 rpm and a worked answer of 1161 rpm.)
const SELF_CORRECTION = /\b(let'?s (adjust|select|re-?\w+|recalculate|try again|fix)|recalculating|re-?evaluating|adjusting options|correct option:|on second thought)\b/i;

export const numbersIn = (text) => (String(text ?? '')
  .replace(/\\[a-zA-Z]+/g, ' ')
  .replace(/\\[,;:! ]/g, '')
  .replace(/(\d),(?=\d{3}\b)/g, '$1')
  .match(/\d+(?:\.\d+)?/g) || []).map(Number);

/** Whether a written solution disagrees with itself or with the key. */
export function explanationIssues(q) {
  const issues = [];
  if (SELF_CORRECTION.test(String(q?.fixedExplanation ?? ''))) issues.push('The explanation shows the AI correcting itself. Check the key and options');
  const stated = explanationSections(structureExplanation(q?.fixedExplanation)).find((s) => s.label === 'Answer');
  const said = numbersIn(stated?.body);
  const key = numbersIn(q?.answer);
  if (said.length && key.length && key.some((n) => !said.includes(n))) issues.push("The explanation's answer doesn't match the key");
  return issues;
}

/**
 * Issues with one generated question, as short readable strings. An empty
 * list means it is fit to send to the review queue.
 *   expectedType  'calculation' | 'conceptual' | undefined
 */
export function questionIssues(q, { expectedType } = {}) {
  const issues = [];
  if (!q || typeof q !== 'object') return ['Not a question'];
  const text = typeof q.text === 'string' ? q.text.trim() : '';
  const options = Array.isArray(q.options) ? q.options.map((o) => (typeof o === 'string' ? o.trim() : '')) : [];

  if (text.length < 15) issues.push('Question text is missing or too short');
  if (options.length !== 4) issues.push(`Has ${options.length} options, not 4`);
  if (options.some((o) => !o)) issues.push('An option is empty');
  const lower = options.map((o) => o.toLowerCase().replace(/\s+/g, ' '));
  if (new Set(lower).size !== lower.length) issues.push('Two options are the same');
  if (!options.includes(typeof q.answer === 'string' ? q.answer.trim() : q.answer)) issues.push('The answer matches none of the options');
  if (options.some((o) => BANNED_OPTION.test(o))) issues.push('Uses "all/none of the above"');
  if (!q.fixedExplanation || String(q.fixedExplanation).trim().length < 20) issues.push('No worked explanation');
  if (q.type !== 'calculation' && q.type !== 'conceptual') issues.push('Type is not calculation or conceptual');
  else if (expectedType && q.type !== expectedType) issues.push(`Asked for ${expectedType}, got ${q.type}`);
  if (![1, 2, 3].includes(Number(q.difficulty))) issues.push('Difficulty is not 1, 2 or 3');
  const fields = [text, ...options, String(q.fixedExplanation ?? '')];
  if (fields.some(unbalancedDollars)) issues.push('Unbalanced $ in the math');
  else issues.push(...new Set(fields.flatMap(mathIssues)));
  issues.push(...explanationIssues(q));
  return issues;
}


/** Cleans what models commonly get wrong in form, without changing content. */
export function normalizeGenerated(q) {
  if (!q || typeof q !== 'object') return q;
  const options = Array.isArray(q.options) ? q.options.map((o) => (typeof o === 'string' ? o.trim() : String(o ?? ''))) : [];
  let answer = typeof q.answer === 'string' ? q.answer.trim() : q.answer;
  // A bare letter ("B") for the answer: map it onto that option.
  if (typeof answer === 'string' && /^[A-D]$/i.test(answer) && !options.includes(answer)) {
    answer = options[answer.toUpperCase().charCodeAt(0) - 65] ?? answer;
  }
  // Same option up to case/spacing: use the option's own text.
  if (typeof answer === 'string' && !options.includes(answer)) {
    const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ');
    const hit = options.find((o) => norm(o) === norm(answer));
    if (hit) answer = hit;
  }
  const type = String(q.type || '').toLowerCase();
  return {
    ...q,
    text: typeof q.text === 'string' ? q.text.trim() : (q.question || ''),
    options,
    answer,
    type: type.startsWith('calc') ? 'calculation' : type.startsWith('concep') || type.startsWith('theor') ? 'conceptual' : q.type,
    difficulty: Math.min(3, Math.max(1, Number(q.difficulty) || 2)),
  };
}
