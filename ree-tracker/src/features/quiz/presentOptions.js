// src/features/quiz/presentOptions.js
//
// A question as a learner sees it in one sitting: its choices in the order
// drawn for that sitting (@ree/shared optionOrder). Grading compares the
// chosen text with the key, and the letters, hotkeys and answer sheet follow
// the array as shown, so nothing else needs to know about the order.
import { optionKey, orderOptions } from '@ree/shared';

/**
 * @param {object} question   a question with `id` and `options`
 * @param {string} sittingKey this sitting's key: the same key, the same order
 */
export function presentOptions(question, sittingKey) {
  if (!question || !Array.isArray(question.options) || question.options.length < 2) return question;
  return { ...question, options: orderOptions(question.options, optionKey(sittingKey, question.id)) };
}
