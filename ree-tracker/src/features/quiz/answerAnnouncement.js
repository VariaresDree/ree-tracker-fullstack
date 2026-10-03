// src/features/quiz/answerAnnouncement.js
//
// What a screen reader hears when QuestionCard grades an answer. Letters, not
// the option text: options are often LaTeX, which reads as noise. Kept out of
// the component module so Fast Refresh still treats QuestionCard as a pure
// component boundary.
const LETTERS = ['A', 'B', 'C', 'D'];

export function answerAnnouncement({ isReviewing, selectedOption, correctAnswer, options = [] }) {
  if (!isReviewing || correctAnswer == null) return '';
  const i = options.indexOf(correctAnswer);
  const answerIs = i >= 0 ? ` The answer is ${LETTERS[i] || String.fromCharCode(65 + i)}.` : '';
  if (selectedOption == null) return `Not answered.${answerIs}`;
  if (selectedOption === correctAnswer) return 'Correct.';
  return `Incorrect.${answerIs}`;
}
