// src/features/quiz/examCopy.js
//
// The words every session screen shares, stated once. Each of these had up to
// six variants across Practice, the mock, the Gauntlet and the placement test.
export const COPY = {
  report: 'Report a problem with this question',
  reported: 'Already reported',
  save: 'Save to bookmarks',
  saved: 'Remove from bookmarks',
  scratchpad: 'Open scratchpad',
  mark: 'Mark for review (M)',
  unmark: 'Unmark for review',
  submit: 'Submit exam',
  previous: 'Previous',
  next: 'Next',
  finish: 'Finish session',
  keys: 'Keyboard shortcuts',
};

export const itemOf = (index, total, { about = false } = {}) => `Item ${index + 1} of ${about ? 'about ' : ''}${total}`;

export const LETTERS = ['A', 'B', 'C', 'D'];

/** The letter a value sits at in `options`, or null. */
export const letterIn = (options, value) => {
  if (value == null) return null;
  const i = (options || []).indexOf(value);
  return i >= 0 && i < LETTERS.length ? LETTERS[i] : null;
};

// Each session's keys, for the legend. Most of these appeared nowhere on screen.
const CHOICE_KEYS = [
  ['1–4 or A–D', 'Pick a choice'],
  ['Q W E', 'How sure you are'],
  ['↑ ↓', 'Move between the choices'],
];
export const KEYS = {
  exam: [...CHOICE_KEYS, ['← →', 'Previous or next item'], ['M', 'Mark for review']],
  practice: [...CHOICE_KEYS, ['Enter or →', 'Next, once answered']],
  flashcards: [['Space', 'Show the answer'], ['1–4', 'Rate how well you recalled it'], ['Enter or →', 'Next, once rated']],
  placement: [...CHOICE_KEYS, ['Enter', 'Submit your answer']],
};
