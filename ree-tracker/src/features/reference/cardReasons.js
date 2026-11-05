// src/features/reference/cardReasons.js
// The server's reasons for refusing a card (referenceCardRoutes), in plain words.
const WORDS = {
  duplicate: 'A card with this name is already live or in the review queue.',
  'unknown-topic': "This topic isn't in this subject's syllabus. Pick one from the list.",
  'missing-name': 'It needs a name.',
  'missing-description': 'It needs a description.',
  'missing-formula': 'It needs a formula.',
  'missing-variables': 'A formula needs its variables.',
  'missing-value-unit': 'A constant needs a value and unit, or to be marked dimensionless.',
  'constant-needs-value': 'A constant needs its value, with digits, not just a unit.',
  'latex-in-name': 'Write the name in plain words. LaTeX belongs in the symbol and the formula.',
  'unbalanced-math': 'A $ is left open, so the math after it would show as code.',
  'description-too-long': 'Shorten the description to one short sentence.',
  'tip-too-long': 'Shorten the board tip to the one trap or check that matters.',
  'invalid-subject': "The subject isn't Mathematics, ESAS or EE.",
  'create-failed': "It couldn't be saved. Try again.",
};

export function cardReasonWords(reason) {
  if (WORDS[reason]) return WORDS[reason];
  const field = String(reason).split(':')[0];
  return `The ${field || 'card'} field has a problem.`;
}
