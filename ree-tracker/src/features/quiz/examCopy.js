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
  tools: 'Open calculator and units',
  mark: 'Mark for review (M)',
  unmark: 'Unmark for review',
  submit: 'Submit exam',
  submitShort: 'Submit',
  reviewAndSubmit: 'Review and submit',
  previous: 'Previous',
  next: 'Next',
  finish: 'Finish session',
  keys: 'Keyboard shortcuts',
};

export const REPORT_REASONS = [
  'The answer key looks wrong',
  'The question or a choice has a mistake',
  'It doesn’t display properly',
  'Something else',
];

// `noun`: Practice says Question; a mock says Item, as its answer sheet does.
export const itemOf = (index, total, { about = false, noun = 'Item' } = {}) => `${noun} ${index + 1} of ${about ? 'about ' : ''}${total}`;

export const LETTERS = ['A', 'B', 'C', 'D'];

/** The letter a value sits at in `options`, or null. */
export const letterIn = (options, value) => {
  if (value == null) return null;
  const i = (options || []).indexOf(value);
  return i >= 0 && i < LETTERS.length ? LETTERS[i] : null;
};

// Each session's keys, for the legend. Most of these appeared nowhere on screen.
const PICK_KEY = ['1–4 or A–D', 'Pick a choice'];
const ARROW_KEY = ['↑ ↓', 'Move between the choices'];
const CHOICE_KEYS = [PICK_KEY, ['Q W E', 'How sure you are'], ARROW_KEY];
export const KEYS = {
  exam: [...CHOICE_KEYS, ['← →', 'Previous or next item'], ['M', 'Mark for review']],
  practice: [...CHOICE_KEYS, ['Enter or →', 'Next, once answered']],
  flashcards: [['Space', 'Show the answer'], ['1–4', 'Rate how well you recalled it'], ['Enter or →', 'Next, once rated']],
  placement: [...CHOICE_KEYS, ['Enter', 'Submit your answer']],
  quizPractice: [PICK_KEY, ARROW_KEY, ['← →', 'Previous or next item'], ['Enter', 'Next, once answered']],
  quizExam: [PICK_KEY, ARROW_KEY, ['← →', 'Previous or next item'], ['M', 'Mark for review']],
};
