// src/features/library/editIssues.js
//
// The question editor's checks (QuestionEditModal), split into the ones that
// stop a save and the ones that only warn.
import { hasUnbalancedMath } from '@ree/shared';
import { questionIssues } from '../../utils/questionChecks';

// Checks that stop a save: the question would be ungradable, unreadable or
// render as raw LaTeX.
const BLOCKING = [
  'Question text is missing or too short',
  'An option is empty',
  'Two options are the same',
  'The answer matches none of the options',
  'Unbalanced $ in the math',
];

/** The editor's checks: { blocking, warnings }, as readable strings. */
export function editIssues(q) {
  const issues = questionIssues({ ...q, difficulty: Number(q?.difficulty) || 2 });
  if (hasUnbalancedMath(q?.fixedExplanation) && !issues.includes('Unbalanced $ in the math')) issues.push('Unbalanced $ in the math');
  return {
    blocking: issues.filter((i) => BLOCKING.includes(i)),
    // A missing type or difficulty is filled in on save; the rest only warn.
    warnings: issues.filter((i) => !BLOCKING.includes(i) && !/^Type is|^Difficulty is|^Has \d+ options/.test(i)),
  };
}
